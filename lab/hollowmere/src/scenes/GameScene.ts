// Builds ctx in the EXACT construction order of types.ts and runs the per-frame
// update order. Owns camera (zoom + smooth follow), pause, win detection and the
// window.__hollow debug hook.

import Phaser from 'phaser';
import { CAMERA, WORLD } from '../config';
import { input } from './input';
import { buildWorld } from '../art/roomArt';
import { OBJECTS } from '../data/objects';
import { GUEST_ARRIVALS, NPCS, TOTAL_PEOPLE } from '../data/npcs';
import { HauntableObject } from '../entities/HauntableObject';
import { NPCController } from '../entities/NPCController';
import { GhostController } from '../entities/GhostController';
import { FearSystem } from '../systems/FearSystem';
import { RoomSystem } from '../systems/RoomSystem';
import { AudioManager } from '../systems/AudioManager';
import { EffectsManager } from '../systems/EffectsManager';
import { HauntingIntensitySystem } from '../systems/HauntingIntensitySystem';
import { PossessionSystem } from '../systems/PossessionSystem';
import { HUD } from '../ui/HUD';
import type { GameCtx, GameStats } from '../types';

const SKIP_INTRO_KEY = 'hollowmere-skip-intro';

export class GameScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private ghost!: GhostController;
  private possession!: PossessionSystem;
  private hud!: HUD;
  private fx!: EffectsManager;
  private clockMs = 0;
  private speed = 1;
  private paused = false;
  private won = false;
  private started = false;
  private pendingGuests = [...GUEST_ARRIVALS];
  private camX = 0;
  private camY = 0;
  private visH = CAMERA.visibleH;
  private targetVisH = CAMERA.visibleH;

  constructor() {
    super('Game');
  }

  create(): void {
    const stats: GameStats = { startMs: 0, haunts: 0, screams: 0, fled: [], perObject: {} };
    const ctx = {
      scene: this,
      events: new Phaser.Events.EventEmitter(),
      stats,
      now: () => this.clockMs,
    } as unknown as GameCtx;
    this.ctx = ctx;
    this.cameras.main.setBackgroundColor(0x141a33);

    ctx.rooms = new RoomSystem(); // 1
    ctx.audio = new AudioManager(); // 2
    // 3: textures were painted by BootScene
    ctx.world = buildWorld(this, ctx); // 4
    this.fx = new EffectsManager(ctx); // 5
    ctx.fx = this.fx;
    ctx.intensity = new HauntingIntensitySystem(ctx); // 6
    ctx.fear = new FearSystem(ctx); // 7
    ctx.objects = OBJECTS.map((d) => new HauntableObject(ctx, d)); // 8
    ctx.npcs = NPCS.map((d) => new NPCController(ctx, d)); // 9
    this.ghost = new GhostController(ctx); // 10
    ctx.ghost = this.ghost;
    this.possession = new PossessionSystem(ctx); // 11
    this.hud = new HUD(ctx, {
      onAct: (i) => this.possession.act(i),
      onLeave: () => this.possession.leave(),
      onResume: () => this.setPaused(false),
      onRestart: () => this.restart(),
    });
    this.possession.hud = this.hud;

    // ---- stats + win ----
    ctx.events.on('npc:fled', (e: { npcId: string }) => {
      if (!stats.fled.includes(e.npcId)) stats.fled.push(e.npcId);
      if (!this.won && stats.fled.length >= TOTAL_PEOPLE) {
        this.won = true;
        ctx.events.emit('win', { timeMs: this.clockMs - stats.startMs });
      }
    });
    ctx.events.on('win', () => { this.won = true; });
    ctx.events.on('npc:scream', () => { stats.screams++; });

    // ---- camera ----
    this.camX = this.ghost.x;
    this.camY = this.ghost.y;
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.targetVisH = Phaser.Math.Clamp(this.targetVisH * Math.exp(dy * 0.0012), CAMERA.minVisibleH, CAMERA.maxVisibleH);
    });
    input.onPress((code) => {
      if (code === 'Escape') this.setPaused(!this.paused);
      else if (code === 'Equal' || code === 'NumpadAdd') this.zoomStep(1 / 1.15);
      else if (code === 'Minus' || code === 'NumpadSubtract') this.zoomStep(1.15);
    });
    this.applyCamera(0, true);

    input.onFirstInput(() => {
      stats.startMs = this.clockMs;
      this.started = true;
      ctx.audio.resume();
      ctx.audio.startAmbience();
      this.hud.dismissIntro();
    });

    this.installDebug();
    document.getElementById('boot')?.classList.add('gone');
    window.setTimeout(() => document.getElementById('boot')?.remove(), 1000);
  }

  private zoomStep(f: number): void {
    this.targetVisH = Phaser.Math.Clamp(this.targetVisH * f, CAMERA.minVisibleH, CAMERA.maxVisibleH);
  }

  private setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.paused = p;
    input.locked = p;
    this.hud.setPaused(p);
    this.tweens.timeScale = p ? 0 : this.speed;
    this.time.timeScale = p ? 0 : this.speed;
    if (p) this.anims.pauseAll();
    else this.anims.resumeAll();
    this.fx.setPaused(p);
  }

  private restart(): void {
    try { sessionStorage.setItem(SKIP_INTRO_KEY, '1'); } catch { /* ignore */ }
    window.location.reload();
  }

  // --------------------------------------------------------------- camera ----

  private applyCamera(dt: number, snap = false): void {
    const cam = this.cameras.main;
    const g = this.ghost;
    const k = snap ? 1 : 1 - Math.exp(-CAMERA.follow * dt);
    const tx = g.x + Phaser.Math.Clamp(g.vx * 0.32, -170, 170);
    const ty = g.y + Phaser.Math.Clamp(g.vy * 0.26, -120, 120);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.visH += (this.targetVisH - this.visH) * (snap ? 1 : 1 - Math.exp(-7 * dt));
    const zoom = cam.height / this.visH;
    cam.setZoom(zoom);
    const hw = cam.width / zoom / 2;
    const hh = cam.height / zoom / 2;
    const cx = WORLD.x1 - WORLD.x0 > hw * 2 ? Phaser.Math.Clamp(this.camX, WORLD.x0 + hw, WORLD.x1 - hw) : (WORLD.x0 + WORLD.x1) / 2;
    const cy = WORLD.y1 - WORLD.y0 > hh * 2 ? Phaser.Math.Clamp(this.camY, WORLD.y0 + hh, WORLD.y1 - hh) : (WORLD.y0 + WORLD.y1) / 2;
    cam.centerOn(cx + this.fx.shakeX, cy + this.fx.shakeY);
    const v = this.hud.view;
    v.cx = cx; v.cy = cy; v.zoom = zoom; v.w = cam.width; v.h = cam.height; v.dpr = this.scale.zoom ? 1 / this.scale.zoom : 1;
    this.camView = { cx, cy };
  }
  private camView = { cx: 0, cy: 0 };

  // --------------------------------------------------------------- update ----

  update(_time: number, delta: number): void {
    if (this.paused) return;
    const dt = Math.min(delta / 1000, 0.05) * this.speed;
    this.clockMs += dt * 1000;
    const c = this.ctx;
    this.ghost.update(dt);
    this.possession.update(dt);
    this.applyCamera(dt);
    for (const o of c.objects) o.update(dt);
    c.fear.update(dt);
    this.spawnGuests();
    for (const n of c.npcs) n.update(dt);
    c.intensity.update(dt);
    c.world.update(dt, this.cameras.main, c.intensity.value);
    const room = c.rooms.at(this.camView.cx, this.camView.cy);
    c.audio.setListener(this.camView.cx, this.camView.cy, room ? c.rooms.floorOf(room) : null);
    c.audio.update(dt);
    c.fx.update(dt);
    this.hud.near = this.possession.near;
    this.hud.update(dt);
  }

  /** Party guests knock, walk in through the front door, and join the house. */
  private spawnGuests(): void {
    if (!this.started || !this.pendingGuests.length) return;
    const t = (this.clockMs - this.ctx.stats.startMs) / 1000;
    while (this.pendingGuests.length && this.pendingGuests[0].at <= t) {
      const { def } = this.pendingGuests.shift()!;
      const n = new NPCController(this.ctx, def, true);
      this.ctx.npcs.push(n);
      this.ctx.audio.play('wood_knock', { x: 3250, y: 1250, vol: 0.55 });
      this.ctx.events.emit('npc:arrived', { npcId: def.id, name: def.name });
    }
  }

  // ---------------------------------------------------------------- debug ----

  private installDebug(): void {
    const c = this.ctx;
    const api = {
      game: this.game,
      scene: this,
      ctx: c,
      teleport: (x: number, y: number) => {
        this.ghost.x = x; this.ghost.y = y; this.ghost.vx = this.ghost.vy = 0;
        this.ghost.container.setPosition(x, y);
        this.applyCamera(0, true);
      },
      possess: (id: string) => {
        const o = c.objects.find((q) => q.id === id);
        if (!o) return false;
        if (c.ghost.possessing) this.possession.leave();
        api.teleport(o.bounds.centerX, o.bounds.centerY);
        this.possession.possess(o);
        return true;
      },
      act: (n: number) => this.possession.act(Math.max(0, n - 1)),
      guests: () => this.pendingGuests.map((g) => g.def.id),
      npcs: () => c.npcs.map((n) => ({ id: n.id, room: n.room, x: Math.round(n.x), y: Math.round(n.y), fear: Math.round(n.fear), panic: Math.round(n.panic), state: n.state, fled: n.fled })),
      intensity: (v?: number) => { if (v !== undefined) c.intensity.set(v); return { value: c.intensity.value, level: c.intensity.level }; },
      speed: (m: number) => {
        this.speed = Math.max(0, m);
        if (!this.paused) { this.tweens.timeScale = this.speed; this.time.timeScale = this.speed; }
        return this.speed;
      },
    };
    (window as unknown as { __hollow: typeof api }).__hollow = api;
  }
}
