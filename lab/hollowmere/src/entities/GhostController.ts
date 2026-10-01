// The player: a small sheet ghost. Free 2D float with exponential steering,
// spring squash/stretch + lean, idle bob, eye tracking, trail and halo.
// Positions are integrated with dt; camera follow happens AFTER this in GameScene.

import Phaser from 'phaser';
import { ART, DEPTH, GHOST, WORLD } from '../config';
import { GHOST_FRAMES, ghostTrailTint } from '../art/fxArt';
import { input } from '../scenes/input';
import { GHOST_START } from '../world/layout';
import type { GameCtx, IGhost, IHauntable } from '../types';

type Mode = 'free' | 'entering' | 'inside';

/** Critically-ish damped spring. */
class Spring {
  v = 0;
  vel = 0;
  constructor(public k = 190, public d = 15) {}
  step(target: number, dt: number): number {
    // sub-step for stability at low frame rates
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += ((target - this.v) * this.k - this.vel * this.d) * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
  kick(impulse: number): void {
    this.vel += impulse;
  }
}

const TRAIL_N = 10;
const BASE = 1 / ART;

export class GhostController implements IGhost {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  readonly container: Phaser.GameObjects.Container;
  possessing: IHauntable | null = null;

  /** True while a mouse seek target is active (PossessionSystem reads this). */
  seeking = false;
  /** Max reach (px of 1) tuned by shift for precise drifting. */
  precision = false;

  private ctx: GameCtx;
  private scene: Phaser.Scene;
  private mode: Mode = 'free';
  private seekX = 0;
  private seekY = 0;

  // visuals
  private halo: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private eyeL: Phaser.GameObjects.Image;
  private eyeR: Phaser.GameObjects.Image;
  private blushL: Phaser.GameObjects.Image;
  private blushR: Phaser.GameObjects.Image;
  private mouth: Phaser.GameObjects.Image;
  private rig: Phaser.GameObjects.Container; // everything that squashes / leans
  private trail: { img: Phaser.GameObjects.Image; life: number; max: number; active: boolean }[] = [];

  private sx = new Spring(210, 14);
  private sy = new Spring(210, 14);
  private lean = new Spring(120, 13);
  private pop = new Spring(260, 12); // exit pop / enter squeeze scale offset
  private t = Math.random() * 10;
  private frame = 0;
  private frameT = 0;
  private trailT = 0;
  private wispT = 0;
  private lookX = 0;
  private lookY = 0;
  private blinkT = 2 + Math.random() * 2;
  private blinkK = 0;
  private strength = 0;
  private enterT = 0;
  private enterFrom = { x: 0, y: 0 };
  private enterTo = { x: 0, y: 0 };
  private lastSpeed = 0;
  private glanceT = 3;
  private glanceX = 0;

  constructor(ctx: GameCtx) {
    this.ctx = ctx;
    this.scene = ctx.scene;
    const s = this.scene;
    this.x = GHOST_START.x;
    this.y = GHOST_START.y;

    this.halo = s.add.image(0, 2, 'fx:glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9fe8ff).setAlpha(0.35);
    this.body = s.add.image(0, 0, 'ghost:body0').setScale(BASE);
    this.blushL = s.add.image(-15, -6, 'ghost:blush').setScale(BASE).setAlpha(0.8);
    this.blushR = s.add.image(15, -6, 'ghost:blush').setScale(BASE).setAlpha(0.8);
    this.eyeL = s.add.image(-8, -15, 'ghost:eye').setScale(BASE);
    this.eyeR = s.add.image(8, -15, 'ghost:eye').setScale(BASE);
    this.mouth = s.add.image(0, -4, 'ghost:mouth').setScale(BASE);
    this.rig = s.add.container(0, 0, [this.halo, this.body, this.blushL, this.blushR, this.eyeL, this.eyeR, this.mouth]);
    this.container = s.add.container(this.x, this.y, [this.rig]).setDepth(DEPTH.ghost);

    for (let i = 0; i < TRAIL_N; i++) {
      const img = s.add.image(0, 0, 'ghost:body0').setScale(BASE).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.ghost - 0.5).setVisible(false);
      this.trail.push({ img, life: 0, max: 0.4, active: false });
    }
    // position the face on the head (body texture is GHOST_W×GHOST_H centered)
    this.applyStrength(0);
  }

  // ---------------------------------------------------------------- api ----

  seek(x: number | null, y?: number): void {
    if (x === null) {
      this.seeking = false;
      return;
    }
    this.seekX = x;
    this.seekY = y ?? this.y;
    this.seeking = true;
  }

  enterObject(o: IHauntable): void {
    this.possessing = o;
    this.mode = 'entering';
    this.enterT = 0;
    this.seeking = false;
    this.enterFrom = { x: this.x, y: this.y };
    const b = o.bounds;
    this.enterTo = { x: b.centerX, y: b.centerY };
    this.pop.kick(-3);
  }

  exitObject(o: IHauntable): void {
    if (this.possessing === o || this.possessing === null) this.possessing = null;
    this.mode = 'free';
    this.container.setVisible(true).setAlpha(1);
    const b = o.bounds;
    this.x = b.centerX;
    this.y = Math.max(WORLD.y0 + 60, b.top - 24);
    // spring out upward
    this.vx = (Math.random() - 0.5) * 120;
    this.vy = -330;
    this.pop.v = -0.55;
    this.pop.vel = 6;
    this.sy.kick(5);
    this.container.setPosition(this.x, this.y);
  }

  // ------------------------------------------------------------- update ----

  update(dt: number): void {
    this.t += dt;
    const intensity = this.ctx.intensity.value;
    this.strength += (intensity - this.strength) * Math.min(1, dt * 1.5);

    if (this.mode === 'entering') {
      this.enterT += dt / 0.12;
      const u = Math.min(1, this.enterT);
      const e = u * u * (3 - 2 * u);
      this.x = this.enterFrom.x + (this.enterTo.x - this.enterFrom.x) * e;
      this.y = this.enterFrom.y + (this.enterTo.y - this.enterFrom.y) * e;
      this.rig.setScale(1 - 0.86 * e, 1 - 0.7 * e);
      this.container.setPosition(this.x, this.y).setAlpha(1 - e);
      this.vx = this.vy = 0;
      if (u >= 1) {
        this.mode = 'inside';
        this.container.setVisible(false);
      }
      this.fadeTrail(dt);
      return;
    }
    if (this.mode === 'inside') {
      const b = this.possessing?.bounds;
      if (b) {
        this.x = b.centerX;
        this.y = b.centerY;
      }
      this.vx = this.vy = 0;
      this.fadeTrail(dt);
      return;
    }

    // ---- steering ----
    let ix = 0;
    let iy = 0;
    if (input.held('KeyA', 'ArrowLeft')) ix -= 1;
    if (input.held('KeyD', 'ArrowRight')) ix += 1;
    if (input.held('KeyW', 'ArrowUp')) iy -= 1;
    if (input.held('KeyS', 'ArrowDown')) iy += 1;
    const slow = input.held('ShiftLeft', 'ShiftRight') ? 0.45 : 1;
    const maxV = GHOST.maxSpeed;
    let tvx = 0;
    let tvy = 0;
    let steering = false;
    if (ix !== 0 || iy !== 0) {
      if (this.seeking) this.seeking = false; // keyboard cancels seek
      const inv = 1 / Math.hypot(ix, iy);
      tvx = ix * inv * maxV * slow;
      tvy = iy * inv * maxV * slow;
      steering = true;
    } else if (this.seeking) {
      const dx = this.seekX - this.x;
      const dy = this.seekY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6 && Math.hypot(this.vx, this.vy) < 40) {
        this.seeking = false;
      } else {
        // proportional approach: fast far away, easing into the target
        const sp = Math.min(maxV, dist * 3.2 + 30);
        tvx = (dx / (dist || 1)) * sp;
        tvy = (dy / (dist || 1)) * sp;
        steering = true;
      }
    }
    // exponential smoothing — frame-rate independent
    const k = steering ? GHOST.response : GHOST.glide;
    const a = 1 - Math.exp(-k * dt);
    this.vx += (tvx - this.vx) * a;
    this.vy += (tvy - this.vy) * a;
    // integrate
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // soft world bounds
    const pad = 50;
    if (this.x < WORLD.x0 + pad) { this.x = WORLD.x0 + pad; this.vx = Math.max(0, this.vx); }
    if (this.x > WORLD.x1 - pad) { this.x = WORLD.x1 - pad; this.vx = Math.min(0, this.vx); }
    if (this.y < WORLD.y0 + pad) { this.y = WORLD.y0 + pad; this.vy = Math.max(0, this.vy); }
    if (this.y > WORLD.y1 - pad) { this.y = WORLD.y1 - pad; this.vy = Math.min(0, this.vy); }

    const speed = Math.hypot(this.vx, this.vy);
    const norm = speed / maxV;

    // ---- squash / stretch / lean springs ----
    const ax = (Math.abs(this.vx) / maxV);
    const ay = (Math.abs(this.vy) / maxV);
    // acceleration kick: sudden speed changes snap the body
    const dSpeed = speed - this.lastSpeed;
    this.lastSpeed = speed;
    if (Math.abs(dSpeed) > 14) {
      const imp = Phaser.Math.Clamp(dSpeed / 60, -2.2, 2.2);
      if (Math.abs(this.vx) > Math.abs(this.vy)) this.sx.kick(imp * 0.7);
      else this.sy.kick(imp * 0.7);
    }
    const stx = this.sx.step(ax * 0.2, dt);
    const sty = this.sy.step(ay * 0.2, dt);
    const lean = this.lean.step(Phaser.Math.Clamp(this.vx / maxV, -1, 1) * 0.3, dt);
    const pop = this.pop.step(0, dt);
    const grow = 1 + 0.2 * this.strength;
    const scaleX = (1 + stx - 0.55 * sty - pop * 0.5) * grow;
    const scaleY = (1 + sty - 0.55 * stx + pop) * grow;

    // idle bob (fades out while moving fast)
    const bobAmp = 4.5 * (1 - Math.min(1, norm * 2.2));
    const bob = Math.sin(this.t * 2.3) * bobAmp + Math.sin(this.t * 1.1) * 1.2;
    this.rig.setScale(scaleX, scaleY);
    this.rig.setRotation(lean);
    this.rig.y = bob;
    this.container.setPosition(this.x, this.y);

    // ---- hem animation: faster flutter when moving ----
    this.frameT += dt * (6 + norm * 14);
    if (this.frameT >= 1) {
      this.frameT -= 1;
      this.frame = (this.frame + 1) % GHOST_FRAMES;
      this.body.setTexture(`ghost:body${this.frame}`);
    }

    // ---- face ----
    this.glanceT -= dt;
    if (this.glanceT <= 0) {
      this.glanceT = 1.6 + Math.random() * 3.2;
      this.glanceX = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 2.2;
    }
    const lx = Phaser.Math.Clamp(this.vx / 140, -1, 1) * 2.4 + this.glanceX * (1 - norm);
    const ly = Phaser.Math.Clamp(this.vy / 140, -1, 1) * 2.0;
    const la = 1 - Math.exp(-14 * dt);
    this.lookX += (lx - this.lookX) * la;
    this.lookY += (ly - this.lookY) * la;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blinkK = 1;
      this.blinkT = 2.2 + Math.random() * 3.6;
    }
    if (this.blinkK > 0) this.blinkK = Math.max(0, this.blinkK - dt / 0.16);
    const eyeScaleY = BASE * (1 - 0.92 * Math.sin(this.blinkK * Math.PI));
    this.eyeL.setPosition(-8 + this.lookX, -15 + this.lookY).setScale(BASE, eyeScaleY);
    this.eyeR.setPosition(8 + this.lookX, -15 + this.lookY).setScale(BASE, eyeScaleY);
    this.mouth.setPosition(this.lookX * 0.6, -4 + this.lookY * 0.5);
    this.blushL.setPosition(-15 + this.lookX * 0.4, -6 + this.lookY * 0.4);
    this.blushR.setPosition(15 + this.lookX * 0.4, -6 + this.lookY * 0.4);

    // halo pulse
    const pulse = 1 + Math.sin(this.t * 2.0) * 0.06;
    this.halo.setScale((2.0 + this.strength * 0.7) * pulse);
    this.halo.setAlpha(0.35 + this.strength * 0.4 + norm * 0.1);
    this.applyStrength(this.strength);

    // ---- trail + wisps when fast ----
    this.trailT -= dt;
    if (speed > 170 && this.trailT <= 0) {
      this.trailT = 0.034;
      this.spawnTrail(speed);
    }
    this.fadeTrail(dt);
    this.wispT -= dt;
    if (speed > 300 && this.wispT <= 0) {
      this.wispT = 0.08 - Math.min(0.04, (norm - 0.6) * 0.1);
      const bx = this.x - (this.vx / speed) * 18 + (Math.random() - 0.5) * 22;
      const by = this.y - (this.vy / speed) * 14 + (Math.random() - 0.5) * 22 + 10;
      this.ctx.fx.particles('wisp', bx, by, 1, { spread: 4, color: ghostTrailTint(this.strength), speed: 30, gravity: -20 });
    }
  }

  // ------------------------------------------------------------- helpers ----

  private applyStrength(s: number): void {
    this.halo.setTint(ghostTrailTint(s * 0.6));
  }

  private spawnTrail(speed: number): void {
    const slot = this.trail.find((q) => !q.active) ?? this.trail.reduce((a, b) => (a.life > b.life ? a : b));
    slot.active = true;
    slot.life = 0;
    slot.max = 0.28 + 0.2 * Math.min(1, speed / GHOST.maxSpeed);
    slot.img
      .setTexture(`ghost:body${this.frame}`)
      .setPosition(this.x, this.y + this.rig.y)
      .setScale(this.rig.scaleX * BASE, this.rig.scaleY * BASE)
      .setRotation(this.rig.rotation)
      .setTint(ghostTrailTint(this.strength))
      .setAlpha(0.3)
      .setVisible(true);
  }

  private fadeTrail(dt: number): void {
    for (const q of this.trail) {
      if (!q.active) continue;
      q.life += dt;
      const u = q.life / q.max;
      if (u >= 1) {
        q.active = false;
        q.img.setVisible(false);
        continue;
      }
      q.img.setAlpha(0.3 * (1 - u) * (1 - u));
    }
  }
}
