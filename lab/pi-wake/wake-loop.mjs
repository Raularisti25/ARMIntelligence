#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const env = process.env;
const WATCH_SECONDS = numberEnv('ARM_LAB_WAKE_SECONDS', 900, 1);
const SETTLE_SECONDS = numberEnv('ARM_LAB_SETTLE_SECONDS', 120, 0);
const STOP_GRACE_SECONDS = numberEnv('ARM_LAB_STOP_GRACE_SECONDS', 1200, 0);
const IDLE_EXIT_CODE = numberEnv('ARM_LAB_IDLE_EXIT_CODE', 75, 0);
const PROGRAM = env.ARM_LAB_WAKE_PROGRAM || 'node';
const ARGS = jsonArgs(env.ARM_LAB_WAKE_ARGS_JSON || '[]');
const STATE_DIR = expandHome(env.ARM_LAB_STATE_DIR || '~/.arm-intelligence/pi-wake');
const HEALTH_FILE = path.join(STATE_DIR, 'health.json');
const LOCK_DIR = path.join(STATE_DIR, 'wake.lock');

let stopping = false;
let activeChild = null;
let forceStopTimer = null;

fs.mkdirSync(STATE_DIR, { recursive: true });
acquireLock();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => requestStop(signal));
}

process.on('exit', releaseLock);

await main();

async function main() {
  writeHealth({ status: 'starting', pid: process.pid, host: os.hostname() });

  while (!stopping) {
    const startedAt = new Date().toISOString();
    writeHealth({ status: 'running', pid: process.pid, host: os.hostname(), startedAt });

    const result = await runWake();
    const finishedAt = new Date().toISOString();

    if (stopping) {
      writeHealth({ status: 'stopped', pid: process.pid, host: os.hostname(), startedAt, finishedAt, ...result });
      break;
    }

    const idle = result.code === IDLE_EXIT_CODE;
    const success = result.code === 0;
    const sleepSeconds = success ? SETTLE_SECONDS : WATCH_SECONDS;

    writeHealth({
      status: idle ? 'idle' : success ? 'settling' : 'failed',
      pid: process.pid,
      host: os.hostname(),
      startedAt,
      finishedAt,
      nextAttemptInSeconds: sleepSeconds,
      ...result,
    });

    await sleepInterruptibly(sleepSeconds * 1000);
  }
}

function runWake() {
  return new Promise((resolve) => {
    const child = spawn(PROGRAM, ARGS, {
      env,
      stdio: 'inherit',
      detached: false,
    });
    activeChild = child;

    child.once('error', (error) => {
      activeChild = null;
      resolve({ code: 127, signal: null, error: error.message });
    });

    child.once('exit', (code, signal) => {
      activeChild = null;
      if (forceStopTimer) {
        clearTimeout(forceStopTimer);
        forceStopTimer = null;
      }
      resolve({ code: Number.isInteger(code) ? code : 1, signal: signal || null });
    });
  });
}

function requestStop(signal) {
  if (stopping) return;
  stopping = true;
  writeHealth({ status: 'stopping', pid: process.pid, host: os.hostname(), signal });

  if (!activeChild) return;
  if (STOP_GRACE_SECONDS === 0) {
    activeChild.kill('SIGTERM');
    return;
  }

  forceStopTimer = setTimeout(() => {
    if (activeChild) activeChild.kill('SIGTERM');
  }, STOP_GRACE_SECONDS * 1000);
  forceStopTimer.unref?.();
}

function sleepInterruptibly(ms) {
  if (ms <= 0 || stopping) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const poll = setInterval(() => {
      if (!stopping) return;
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    }, Math.min(250, ms));
    timer.unref?.();
    poll.unref?.();
  });
}

function acquireLock() {
  try {
    fs.mkdirSync(LOCK_DIR);
    fs.writeFileSync(path.join(LOCK_DIR, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const owner = readJson(path.join(LOCK_DIR, 'owner.json'));
    if (owner?.pid && pidAlive(owner.pid)) {
      console.error(`pi-wake: another wake loop is active (pid ${owner.pid})`);
      process.exit(75);
    }
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
    fs.mkdirSync(LOCK_DIR);
    fs.writeFileSync(path.join(LOCK_DIR, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n');
  }
}

function releaseLock() {
  try {
    const owner = readJson(path.join(LOCK_DIR, 'owner.json'));
    if (!owner || owner.pid === process.pid) fs.rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch {}
}

function pidAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function writeHealth(patch) {
  const previous = readJson(HEALTH_FILE) || {};
  const next = { ...previous, ...patch, updatedAt: new Date().toISOString() };
  const tmp = `${HEALTH_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
  fs.renameSync(tmp, HEALTH_FILE);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function jsonArgs(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ARM_LAB_WAKE_ARGS_JSON must be valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
    throw new Error('ARM_LAB_WAKE_ARGS_JSON must be a JSON array of strings');
  }
  return parsed;
}

function numberEnv(name, fallback, minimum) {
  const value = Number(env[name]);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function expandHome(value) {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}
