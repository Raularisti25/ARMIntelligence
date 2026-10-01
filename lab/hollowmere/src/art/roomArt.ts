// World runtime (module A-run): places everything structureArt painted, and animates it.
// buildWorld(scene, ctx) -> IWorldView. Textures + placement come from paintStructureTextures().
import Phaser from 'phaser';
import type { GameCtx, IWorldView, RoomId } from '../types';
import { ART, DEPTH, WORLD } from '../config';
import { ROOMS, ATTIC_POLY, LIGHTS, WALLS, FRONT_DOOR } from '../world/layout';
import { clamp, lerp, inPoly } from './paint';
import { paintStructureTextures } from './structureArt';
import type { DoorSprite } from './worldManifest';

const S = 1 / ART;
const hash = (n: number): number => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
const rr = (a: number, b: number): number => a + Math.random() * (b - a);
const ease = (cur: number, target: number, k: number, dt: number): number => cur + (target - cur) * (1 - Math.exp(-k * dt));
const tintMix = (a: number, b: number, t: number): number => {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (g << 8) | bl;
};

interface RoomFx {
  mode: 'none' | 'flicker' | 'off' | 'surge';
  t: number; dur: number; // seconds
  level: number; // smoothed light level (0 off .. ~1.7 surge)
  jit: number; jitT: number; // flicker sample + its timer
  darkCur: number; darkTarget: number; darkAmount: number; darkAge: number; darkDur: number;
}
interface GlowRt {
  glow: Phaser.GameObjects.Image; fixture?: Phaser.GameObjects.Image;
  room: RoomId | 'outside'; phase: number; fireLike: boolean; fixed: boolean;
  x: number; y: number; w: number; h: number; // world rect for culling
}
interface DoorRt {
  img: Phaser.GameObjects.Image; def: DoorSprite;
  o: number; v: number; target: number; rest: number; hold: number; wallX: number; slam: boolean; wallIdx: number;
}
interface StaticRt { img: Phaser.GameObjects.Image; bx: number; by: number; f: number; base: number; room?: RoomId }
interface Mote { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; age: number; life: number; room: RoomId | null; ph: number; base: number }
interface Bat { img: Phaser.GameObjects.Image; on: boolean; x: number; y0: number; vx: number; t: number; wait: number }
interface Cloud { img: Phaser.GameObjects.Image; bx: number; y: number; sp: number; base: number }
interface Star { img: Phaser.GameObjects.Image; u: number; v: number; sz: number; ph: number; spd: number; base: number }

export function buildWorld(scene: Phaser.Scene, ctx: GameCtx): IWorldView {
  const man = paintStructureTextures(scene);
  const bd = man.backdrop;
  const ADD = Phaser.BlendModes.ADD;
  const cam0 = scene.cameras.main;

  // ------------------------------------------------------------ room state
  const rooms = {} as Record<RoomId, RoomFx>;
  for (const r of ROOMS) {
    rooms[r.id] = { mode: 'none', t: 0, dur: 0, level: 1, jit: 1, jitT: 0, darkCur: 0, darkTarget: 0, darkAmount: 0, darkAge: 0, darkDur: 0 };
  }
  const roomLevel = (r: RoomId | 'outside'): number => (r === 'outside' ? 1 : rooms[r].level);

  // ------------------------------------------------------- screen backdrop
  const sky = scene.add.image(0, 0, bd.sky).setScrollFactor(0).setDepth(DEPTH.sky);
  const flashRect = scene.add.rectangle(0, 0, 1, 1, 0x9fb4ff).setScrollFactor(0).setDepth(DEPTH.sky + 0.5).setBlendMode(ADD).setAlpha(0).setVisible(false);
  const moon = scene.add.image(0, 0, bd.moon).setScrollFactor(0).setDepth(DEPTH.sky + 0.2);
  const stars: Star[] = [];
  for (let i = 0; i < 72; i++) {
    const im = scene.add.image(0, 0, bd.star).setScrollFactor(0).setDepth(DEPTH.sky + 0.1);
    const u = hash(i * 3.1 + 1), v = Math.pow(hash(i * 7.7 + 2), 1.25) * 0.66;
    stars.push({ img: im, u, v, sz: 0.5 + hash(i * 5.3 + 3) * 0.75, ph: hash(i * 9.1 + 4) * 6.28, spd: 0.6 + hash(i * 2.9 + 5) * 2.2, base: 0.45 + hash(i * 4.4 + 6) * 0.55 });
  }
  let lastSig = '';
  const layoutScreen = (cam: Phaser.Cameras.Scene2D.Camera): void => {
    const z = cam.zoom, w = cam.width, h = cam.height;
    const sig = `${w}|${h}|${z}`;
    if (sig === lastSig) return;
    lastSig = sig;
    const mx = w / 2, my = h / 2;
    const px = (sx: number): number => mx + (sx - mx) / z;
    const py = (sy: number): number => my + (sy - my) / z;
    sky.setPosition(mx, my).setDisplaySize(w / z + 4, h / z + 4);
    flashRect.setPosition(mx, my).setDisplaySize(w / z + 4, h / z + 4);
    moon.setPosition(px(w * 0.84), py(h * 0.17));
    moon.setScale(1); moon.setDisplaySize((0.1 * h) / z, ((0.1 * h) / z) * (moon.height / moon.width));
    for (const s of stars) {
      s.img.setPosition(px(s.u * w), py(s.v * h));
      const dw = (h * 0.011 * s.sz) / z;
      s.img.setDisplaySize(dw, dw * (s.img.height / s.img.width));
    }
  };
  layoutScreen(cam0);

  // ------------------------------------------------------------ statics
  const statics: StaticRt[] = [];
  for (const s of man.statics) {
    const im = scene.add.image(s.x, s.y, s.key).setOrigin(s.ox ?? 0, s.oy ?? 0).setScale(S).setDepth(s.depth);
    const base = s.alpha ?? 1;
    im.setAlpha(base);
    if (s.add) im.setBlendMode(ADD);
    statics.push({ img: im, bx: s.x, by: s.y, f: s.scroll ?? 1, base, room: s.room });
  }
  const parallax = statics.filter((s) => s.f !== 1);
  const roomStatics = statics.filter((s) => s.room);

  // clouds (drifting, parallax 0.25)
  const clouds: Cloud[] = [];
  const CLOUD_F = 0.25, CLOUD_MIN = -1200, CLOUD_MAX = 5200;
  for (let i = 0; i < 10; i++) {
    const key = bd.clouds[i % bd.clouds.length];
    const base = 0.4 + hash(i * 3.3 + 9) * 0.4;
    const im = scene.add.image(0, 0, key).setScale(S * (0.8 + hash(i * 1.7) * 0.8)).setDepth(DEPTH.sky + 1).setAlpha(base);
    clouds.push({ img: im, bx: lerp(CLOUD_MIN, CLOUD_MAX, (i + hash(i * 6.1)) / 10), y: -170 + hash(i * 8.8 + 1) * 480, sp: 4 + hash(i * 2.2 + 7) * 9, base });
  }

  // bats
  const bats: Bat[] = [];
  for (let i = 0; i < 3; i++) {
    const im = scene.add.image(0, 0, bd.bat).setScale(S).setDepth(DEPTH.near + 1).setVisible(false);
    bats.push({ img: im, on: false, x: 0, y0: 0, vx: 0, t: 0, wait: 6 + i * 9 + rr(0, 10) });
  }

  // chimney smoke (stateless: position is a function of time)
  const SMOKE_N = 7, SMOKE_LIFE = 5;
  const smoke: { img: Phaser.GameObjects.Image; c: number; i: number }[] = [];
  man.chimneySmoke.forEach((c, ci) => {
    for (let i = 0; i < SMOKE_N; i++) {
      smoke.push({ img: scene.add.image(c.x, c.y, bd.smoke).setScale(S * 0.4).setDepth(DEPTH.structure - 1).setAlpha(0), c: ci, i });
    }
  });

  // dust motes
  const MOTES = 80;
  const motes: Mote[] = [];
  for (let i = 0; i < MOTES; i++) {
    const im = scene.add.image(0, 0, bd.mote).setScale(S).setDepth(DEPTH.fx - 1).setBlendMode(ADD).setVisible(false);
    motes.push({ img: im, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, room: null, ph: rr(0, 6.28), base: rr(0.25, 0.7) });
  }

  // ---------------------------------------------------------------- lights
  const lightDefs = new Map(LIGHTS.map((l) => [l.id, l]));
  const glows: GlowRt[] = [];
  for (const l of man.lights) {
    const def = lightDefs.get(l.lightId);
    const glow = scene.add.image(l.x, l.y, l.glowKey).setOrigin(0, 0).setScale(S).setDepth(DEPTH.light).setBlendMode(ADD).setAlpha(0.75);
    let fixture: Phaser.GameObjects.Image | undefined;
    if (l.fixtureKey) fixture = scene.add.image(l.fx ?? l.x, l.fy ?? l.y, l.fixtureKey).setOrigin(0, 0).setScale(S).setDepth(DEPTH.structure - 1);
    const kind = def?.kind;
    glows.push({
      glow, fixture, room: l.room, phase: hash(glows.length * 4.7 + 1) * 100,
      fireLike: kind === 'fire' || kind === 'candle' || kind === 'lantern', fixed: kind === 'window',
      x: l.x, y: l.y, w: glow.width * S, h: glow.height * S,
    });
  }

  // dark overlays (full-darkness per room, alpha set at runtime)
  const darks = new Map<RoomId, Phaser.GameObjects.Image[]>();
  for (const d of man.dark) {
    const im = scene.add.image(d.x, d.y, d.key).setOrigin(0, 0).setScale(S).setDepth(DEPTH.dark).setAlpha(0).setVisible(false);
    const arr = darks.get(d.room) ?? []; arr.push(im); darks.set(d.room, arr);
  }

  // ----------------------------------------------------------------- doors
  const mkDoor = (def: DoorSprite, rest: number, wallIdx: number): DoorRt => {
    const im = scene.add.image(def.hingeX, def.hingeY, def.key).setScale(S).setDepth(DEPTH.door);
    im.setOrigin((def.hingeX - def.x) / (im.width * S), (def.hingeY - def.y) / (im.height * S));
    const d: DoorRt = { img: im, def, o: rest, v: 0, target: rest, rest, hold: 0, wallX: wallIdx >= 0 ? WALLS[wallIdx].x : FRONT_DOOR.x1, slam: false, wallIdx };
    applyDoor(d);
    return d;
  };
  const applyDoor = (d: DoorRt): void => { d.img.setScale(S * (1 - 0.9 * clamp(d.o, 0, 1)), S); };
  const doors: DoorRt[] = [];
  for (const d of man.doors) if (d.wallIndex >= 0 && d.wallIndex < WALLS.length) doors.push(mkDoor(d, 1, d.wallIndex));
  const front = mkDoor(man.frontDoor, 0, -1);
  const doorsByRoom = new Map<RoomId, DoorRt[]>();
  for (const d of doors) {
    const w = WALLS[d.wallIdx];
    for (const r of [w.left, w.right]) if (r) { const a = doorsByRoom.get(r) ?? []; a.push(d); doorsByRoom.set(r, a); }
  }
  let frontHold = 0;

  const stepDoor = (d: DoorRt, dt: number): void => {
    const a = 90 * (d.target - d.o) - 9 * d.v;
    d.v += a * dt;
    d.o += d.v * dt;
    if (d.o < 0) { // hit the frame
      if (d.v < -2.5 && d.slam) { ctx.audio?.play('door_slam', { x: d.def.hingeX, y: d.def.hingeY, vol: clamp(-d.v / 8, 0.25, 0.7) }); d.slam = false; }
      d.o = 0; d.v = -d.v * 0.3;
    } else if (d.o > 1) { d.o = 1; d.v = -d.v * 0.25; }
    if (Math.abs(d.o - d.target) < 0.002 && Math.abs(d.v) < 0.05) { d.o = d.target; d.v = 0; }
    applyDoor(d);
  };

  // -------------------------------------------------------------- lightning
  const panes: Phaser.GameObjects.Image[] = man.windows.map((w) =>
    scene.add.image(w.x, w.y, w.key).setOrigin(0, 0).setScale(S).setDepth(DEPTH.door + 1).setBlendMode(ADD).setAlpha(0).setVisible(false));
  let bolt = -1; // seconds since lightning(), -1 = idle
  // brightness keyframes: [t, v]
  const BOLT: [number, number][] = [[0, 0], [0.04, 1], [0.12, 0.25], [0.2, 0.85], [0.3, 0.12], [0.5, 0.35], [0.9, 0]];
  const boltVal = (t: number): number => {
    for (let i = 1; i < BOLT.length; i++) if (t <= BOLT[i][0]) { const [t0, v0] = BOLT[i - 1], [t1, v1] = BOLT[i]; return lerp(v0, v1, (t - t0) / (t1 - t0)); }
    return 0;
  };

  // ------------------------------------------------------------------ update
  let T = 0;
  const startMote = (m: Mote, view: Phaser.Geom.Rectangle): void => {
    for (let k = 0; k < 6; k++) {
      const x = clamp(view.x + Math.random() * view.width, WORLD.x0, WORLD.x1);
      const y = clamp(view.y + Math.random() * view.height, WORLD.y0, WORLD.y1);
      for (const r of ROOMS) {
        if (x > r.x0 && x < r.x1 && y > r.ceil && y < r.floorY && (r.floor !== 'attic' || inPoly(x, y, ATTIC_POLY))) {
          m.x = x; m.y = y; m.room = r.id; m.age = 0; m.life = rr(5, 11);
          m.vx = rr(-7, 7); m.vy = rr(-5, 3);
          return;
        }
      }
    }
    m.room = null;
  };
  const rectsOverlap = (v: Phaser.Geom.Rectangle, x: number, y: number, w: number, h: number): boolean =>
    x < v.right && x + w > v.x && y < v.bottom && y + h > v.y;

  const world: IWorldView = {
    darkenRoom(room, amount, durMs) {
      const r = rooms[room]; if (!r) return;
      const active = r.darkAge < r.darkDur;
      r.darkAmount = active ? Math.max(r.darkAmount, amount) : amount;
      r.darkDur = active ? Math.max(r.darkDur - r.darkAge, durMs / 1000) : durMs / 1000;
      r.darkAge = 0;
      r.darkTarget = r.darkAmount;
    },
    lights(room, mode, durMs) {
      const r = rooms[room]; if (!r) return;
      r.mode = mode; r.t = 0; r.dur = durMs / 1000; r.jitT = 0;
    },
    touch(room) {
      const rm = ROOMS.find((q) => q.id === room);
      if (!rm) return null;
      const npcs = ctx.npcs ?? [];
      const cands = (doorsByRoom.get(room) ?? []).filter((d) => d.hold <= 0 && !npcs.some((n) => !n.fled && n.room && (n.room === WALLS[d.wallIdx].left || n.room === WALLS[d.wallIdx].right) && Math.abs(n.x - d.wallX) < 120));
      if (cands.length) {
        const d = cands[Math.floor(Math.random() * cands.length)];
        d.target = 0; d.hold = rr(1.2, 2.4); d.slam = true; d.v -= 2;
        return { x: d.wallX, y: rm.floorY - 118 };
      }
      // no door to swing: stir the room's dust
      const x = rr(rm.walk[0], rm.walk[1]), y = rm.floorY - 110;
      ctx.fx?.particles('dust', x, y, 6, { spread: 40 });
      return { x, y };
    },
    lightning() {
      bolt = 0;
      const delay = rr(250, 900);
      scene.time.delayedCall(delay, () => ctx.audio?.play('thunder', { vol: 0.9 }));
    },
    isDark(room) {
      const r = rooms[room]; if (!r) return false;
      return r.darkCur > 0.3 || r.darkTarget > 0.3 || (r.mode === 'off' && r.level < 0.3);
    },
    update(dt, cam, intensity) {
      T += dt;
      const iv = clamp(intensity, 0, 1);
      const z = cam.zoom;
      const view = cam.worldView;
      const shift = cam.scrollX + cam.width / 2 - 2000;

      layoutScreen(cam);

      // parallax layers
      for (const p of parallax) p.img.x = p.bx + shift * (1 - p.f);

      // sky: colder with intensity, stars twinkle, lightning flash
      const cold = tintMix(0xffffff, 0x9aa4c8, iv * 0.7);
      sky.setTint(cold);
      const bv = bolt >= 0 ? boltVal(bolt) : 0;
      if (bolt >= 0) { bolt += dt; if (bolt > BOLT[BOLT.length - 1][0]) bolt = -1; }
      flashRect.setVisible(bv > 0.01).setAlpha(bv * 0.5);
      for (const s of stars) s.img.setAlpha(s.base * (0.4 + 0.6 * Math.sin(T * s.spd + s.ph) * 0.5 + 0.3) * (1 - bv * 0.8));
      moon.setAlpha(1 - bv * 0.3);
      for (const p of panes) { p.setVisible(bv > 0.01); if (bv > 0.01) p.setAlpha(bv * 0.9); }

      // clouds
      const cspeed = 1 + iv * 1.4;
      const ctint = tintMix(0xffffff, 0x7f86a0, iv * 0.8);
      for (const c of clouds) {
        c.bx += c.sp * cspeed * dt;
        if (c.bx > CLOUD_MAX) c.bx = CLOUD_MIN;
        c.img.setPosition(c.bx + shift * (1 - CLOUD_F), c.y).setTint(ctint).setAlpha(c.base * (1 - bv * 0.2) + bv * 0.25);
      }

      // bats
      for (const b of bats) {
        if (!b.on) {
          b.wait -= dt;
          if (b.wait <= 0) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            b.on = true; b.x = dir > 0 ? -120 : WORLD.x1 + 120; b.vx = dir * rr(150, 250); b.y0 = rr(-100, 300); b.t = rr(0, 6);
            b.img.setVisible(true);
          }
          continue;
        }
        b.t += dt; b.x += b.vx * dt;
        const y = b.y0 + Math.sin(b.t * 2.3) * 55 + Math.sin(b.t * 5.1) * 14;
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(b.t * 17));
        b.img.setPosition(b.x, y).setScale(S * (b.vx > 0 ? 1 : -1), S * flap);
        if (b.x < -160 || b.x > WORLD.x1 + 160) { b.on = false; b.img.setVisible(false); b.wait = lerp(34, 7, iv) * rr(0.6, 1.4); }
      }

      // chimney smoke
      for (const s of smoke) {
        const c = man.chimneySmoke[s.c];
        const vis = rectsOverlap(view, c.x - 150, c.y - 260, 420, 300);
        s.img.setVisible(vis);
        if (!vis) continue;
        const p = ((T / SMOKE_LIFE + s.i / SMOKE_N + s.c * 0.31) % 1);
        const wob = Math.sin(p * 9 + s.i * 1.7 + s.c) * 10 * p;
        s.img.setPosition(c.x + wob + p * 60, c.y - p * 190);
        s.img.setScale(S * (0.35 + 1.1 * p));
        s.img.setAlpha(Math.min(p * 6, 1) * (1 - p) * 0.5);
      }

      // light state per room
      for (const r of ROOMS) {
        const s = rooms[r.id];
        let target = 1, k = 6;
        if (s.mode !== 'none') {
          s.t += dt;
          if (s.t >= s.dur) { s.mode = 'none'; s.t = 0; }
          else if (s.mode === 'off') { target = 0; k = 14; }
          else if (s.mode === 'flicker') {
            s.jitT -= dt;
            if (s.jitT <= 0) { s.jitT = rr(0.04, 0.12); s.jit = [0.05, 0.2, 0.55, 1, 0.35, 0.8][Math.floor(Math.random() * 6)]; }
            target = s.jit; k = 45;
          } else { target = 1 + 0.7 * Math.sin(Math.min(1, s.t / Math.max(0.3, s.dur)) * Math.PI); k = 20; }
        }
        s.level = ease(s.level, target, k, dt);
        // dark overlay envelope
        s.darkAge += dt;
        s.darkTarget = s.darkAge < s.darkDur ? s.darkAmount : 0;
        s.darkCur = ease(s.darkCur, s.darkTarget, s.darkAge < s.darkDur ? 14 : 2.8, dt);
        if (s.darkCur < 0.002) s.darkCur = 0;
        const arr = darks.get(r.id);
        if (arr) {
          const a = clamp(s.darkCur * 0.92 + (1 - Math.min(s.level, 1)) * 0.55, 0, 0.96);
          for (const im of arr) { const v = a > 0.01; im.setVisible(v); if (v) im.setAlpha(a); }
        }
        // spontaneous cosmetic flicker starts at level 1+ — handled per light below
      }

      // lights
      const dipThr = 0.004 + 0.12 * iv * iv;
      const glowTint = tintMix(0xffffff, 0xb8c8ff, iv * 0.45);
      for (const g of glows) {
        const vis = rectsOverlap(view, g.x, g.y, g.w, g.h);
        g.glow.setVisible(vis); g.fixture?.setVisible(vis);
        if (!vis) continue;
        const lvl = roomLevel(g.room);
        let amb = 1;
        if (!g.fixed) {
          if (g.fireLike) amb = 0.93 + 0.05 * Math.sin(T * 9 + g.phase) + 0.04 * Math.sin(T * 23 + g.phase * 2);
          const step = Math.floor(T * 18);
          if (hash(step * 0.37 + g.phase) < dipThr) amb *= 0.35 + 0.4 * hash(step + g.phase);
        }
        const v = lvl * amb;
        g.glow.setAlpha(clamp(v * 0.75, 0, 1));
        if (!g.fireLike) g.glow.setTint(glowTint);
        if (g.fixture) g.fixture.setAlpha(clamp(v, 0, 1));
      }
      for (const s of roomStatics) s.img.setAlpha(clamp(s.base * Math.min(roomLevel(s.room as RoomId), 1.2), 0, 1));

      // doors
      for (const d of doors) {
        if (d.hold > 0) { d.hold -= dt; if (d.hold <= 0) { d.target = d.rest; d.slam = false; } }
        if (d.target !== d.o || Math.abs(d.v) > 0.01) stepDoor(d, dt);
      }
      // front door: opens for a fleeing NPC nearby
      let near = false;
      for (const n of ctx.npcs ?? []) {
        if ((n.state === 'flee' || n.arriving) && !n.fled && n.y > 1100 && Math.abs(n.x - FRONT_DOOR.x0) < 320) { near = true; break; }
      }
      if (near) frontHold = 0.9; else frontHold -= dt;
      const want = frontHold > 0 ? 1 : 0;
      if (want !== front.target) {
        front.target = want;
        if (want === 1) ctx.audio?.play('creak_soft', { x: FRONT_DOOR.x0, y: FRONT_DOOR.floorY - 100, vol: 0.5 });
      }
      if (front.target !== front.o || Math.abs(front.v) > 0.01) stepDoor(front, dt);

      // dust motes (culled by cam.worldView)
      const active = Math.round(lerp(28, MOTES, iv));
      const ms = clamp(1 / (z * 1000 / Math.max(1, cam.height)), 1, 2);
      for (let i = 0; i < MOTES; i++) {
        const m = motes[i];
        if (i >= active || view.width <= 0) { if (m.img.visible) m.img.setVisible(false); m.room = null; continue; }
        m.age += dt;
        const gone = m.room === null || m.age > m.life || m.x < view.x - 60 || m.x > view.right + 60 || m.y < view.y - 60 || m.y > view.bottom + 60;
        if (gone) {
          startMote(m, view);
          if (m.room === null) { m.img.setVisible(false); continue; }
          m.img.setVisible(true);
        }
        m.x += (m.vx + Math.sin(T * 0.8 + m.ph) * 5) * dt;
        m.y += (m.vy + Math.cos(T * 0.6 + m.ph) * 4) * dt;
        const t = m.age / m.life;
        const fade = Math.min(t * 5, 1) * Math.min((1 - t) * 5, 1);
        m.img.setPosition(m.x, m.y).setScale(S * ms).setAlpha(m.base * fade * clamp(roomLevel(m.room ?? 'outside'), 0, 1));
      }
    },
  };
  return world;
}
