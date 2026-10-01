// Scene-level effects: pooled particle emitters (one per ParticleKind), apparitions,
// thrown props, shock rings, puffs, screen flash and camera shake. Everything that
// moves per frame is driven from update(dt) so debug speed / pause stay consistent.

import Phaser from 'phaser';
import { ART, DEPTH } from '../config';
import { PARTICLE_KINDS, APPARITION_SIZE } from '../art/fxArt';
import type { ApparitionKind, GameCtx, IEffects, ParticleKind } from '../types';

interface KindCfg {
  life: [number, number]; // ms
  speed: [number, number];
  scale: [number, number]; // start → end (× sprite natural size)
  alpha: [number, number];
  gravity: number;
  add: boolean;
  spin: number; // deg/s range ±
  angle: [number, number]; // emission cone, degrees (Phaser: 0 = right, -90 = up)
  tint?: number;
  drag?: number;
}

const CFG: Record<ParticleKind, KindCfg> = {
  wisp: { life: [700, 1300], speed: [20, 90], scale: [0.7, 0.1], alpha: [0.85, 0], gravity: -30, add: true, spin: 0, angle: [0, 360], tint: 0xbfeaff },
  spark: { life: [350, 800], speed: [90, 300], scale: [0.9, 0.1], alpha: [1, 0], gravity: 260, add: true, spin: 0, angle: [0, 360] },
  dust: { life: [900, 1800], speed: [8, 40], scale: [0.8, 1.4], alpha: [0.75, 0], gravity: -8, add: false, spin: 0, angle: [0, 360] },
  puff: { life: [500, 900], speed: [30, 130], scale: [0.35, 1.2], alpha: [0.8, 0], gravity: -20, add: false, spin: 60, angle: [0, 360], drag: 1.6 },
  ecto: { life: [900, 1700], speed: [25, 110], scale: [0.8, 0.15], alpha: [0.9, 0], gravity: -50, add: true, spin: 0, angle: [0, 360] },
  notes: { life: [1100, 1900], speed: [30, 110], scale: [0.9, 0.7], alpha: [1, 0], gravity: -70, add: false, spin: 80, angle: [-135, -45] },
  water: { life: [600, 1000], speed: [100, 300], scale: [1, 0.7], alpha: [1, 0], gravity: 700, add: false, spin: 0, angle: [-125, -55] },
  feathers: { life: [1600, 2800], speed: [30, 130], scale: [1, 0.9], alpha: [1, 0], gravity: 55, add: false, spin: 120, angle: [-160, -20], drag: 0.8 },
  paper: { life: [1400, 2600], speed: [60, 220], scale: [1, 0.9], alpha: [1, 0], gravity: 120, add: false, spin: 200, angle: [0, 360], drag: 0.9 },
  embers: { life: [700, 1500], speed: [30, 140], scale: [0.9, 0.1], alpha: [1, 0], gravity: -70, add: true, spin: 0, angle: [-150, -30] },
  glass: { life: [800, 1400], speed: [120, 380], scale: [1, 0.8], alpha: [1, 0], gravity: 900, add: false, spin: 400, angle: [-170, -10] },
  smoke: { life: [1100, 2000], speed: [14, 50], scale: [0.3, 1.5], alpha: [0.55, 0], gravity: -40, add: false, spin: 20, angle: [-120, -60], drag: 0.6 },
  steam: { life: [700, 1300], speed: [30, 90], scale: [0.3, 1.3], alpha: [0.6, 0], gravity: -90, add: false, spin: 20, angle: [-130, -50], drag: 0.8 },
  stars: { life: [800, 1600], speed: [60, 220], scale: [1, 0.2], alpha: [1, 0], gravity: 40, add: true, spin: 240, angle: [0, 360] },
  leaves: { life: [1500, 2800], speed: [30, 120], scale: [1, 0.9], alpha: [1, 0], gravity: 70, add: false, spin: 160, angle: [-170, -10], drag: 0.8 },
  bubbles: { life: [1000, 1900], speed: [20, 80], scale: [0.5, 1.1], alpha: [0.9, 0], gravity: -80, add: false, spin: 0, angle: [-130, -50] },
  coal: { life: [700, 1200], speed: [90, 280], scale: [1, 0.8], alpha: [1, 0], gravity: 900, add: false, spin: 300, angle: [-150, -30] },
  petals: { life: [1500, 2600], speed: [20, 90], scale: [1, 0.9], alpha: [1, 0], gravity: 50, add: false, spin: 140, angle: [0, 360], drag: 0.8 },
};

interface Prop {
  img: Phaser.GameObjects.Image;
  vx: number; vy: number; spin: number;
  floor: number; bounces: number; life: number; active: boolean;
}
interface Ring { img: Phaser.GameObjects.Image; t: number; dur: number; r: number; active: boolean }
interface Apparition {
  img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image;
  t: number; dur: number; x0: number; y0: number; x1: number; y1: number;
  s0: number; s1: number; a: number; toward: 'viewer' | 'npc' | 'up'; wob: number; active: boolean;
}

export class EffectsManager implements IEffects {
  /** Camera shake offset in world units; GameScene adds it to the camera each frame. */
  shakeX = 0;
  shakeY = 0;

  private ctx: GameCtx;
  private scene: Phaser.Scene;
  private emitters = new Map<ParticleKind, Phaser.GameObjects.Particles.ParticleEmitter>();
  private props: Prop[] = [];
  private rings: Ring[] = [];
  private apps: Apparition[] = [];
  private shakeAmp = 0;
  private shakeLeft = 0;
  private shakeDur = 1;
  private shakePhase = 0;
  private flashEl: HTMLDivElement;

  constructor(ctx: GameCtx) {
    this.ctx = ctx;
    this.scene = ctx.scene;
    this.flashEl = document.createElement('div');
    this.flashEl.id = 'hm-flash';
    document.body.appendChild(this.flashEl);
    this.scene.events.once('shutdown', () => this.flashEl.remove());
    // pre-warm pools so the first big scare never allocates
    for (let i = 0; i < 12; i++) this.props.push(this.makeProp());
    for (let i = 0; i < 8; i++) this.rings.push(this.makeRing());
    for (let i = 0; i < 5; i++) this.apps.push(this.makeApp());
    for (const k of PARTICLE_KINDS) this.emitter(k);
  }

  // ----------------------------------------------------------- particles ----

  private emitter(kind: ParticleKind): Phaser.GameObjects.Particles.ParticleEmitter {
    let e = this.emitters.get(kind);
    if (e) return e;
    const c = CFG[kind];
    e = this.scene.add.particles(0, 0, `fx:${kind}`, {
      emitting: false,
      lifespan: { min: c.life[0], max: c.life[1] },
      speed: { min: c.speed[0], max: c.speed[1] },
      angle: { min: c.angle[0], max: c.angle[1] },
      scale: { start: c.scale[0] / ART, end: c.scale[1] / ART },
      alpha: { start: c.alpha[0], end: c.alpha[1] },
      gravityY: c.gravity,
      rotate: c.spin ? { start: 0, end: c.spin * (Math.random() < 0.5 ? 1 : -1) } : 0,
      blendMode: c.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      maxAliveParticles: 220,
      ...(c.tint !== undefined ? { tint: c.tint } : {}),
    });
    e.setDepth(DEPTH.fx);
    this.emitters.set(kind, e);
    return e;
  }

  particles(
    kind: ParticleKind, x: number, y: number, count: number,
    opts?: { spread?: number; speed?: number; color?: number; gravity?: number; depth?: number },
  ): void {
    if (count <= 0) return;
    const e = this.emitter(kind);
    const c = CFG[kind];
    const n = Math.min(count, 60);
    const spread = opts?.spread ?? 14;
    const speed = opts?.speed;
    if (speed !== undefined) e.setParticleSpeed(speed * 0.4, speed);
    else e.setParticleSpeed(c.speed[0], c.speed[1]);
    e.setParticleGravity(0, opts?.gravity ?? c.gravity);
    if (opts?.color !== undefined) e.setParticleTint(opts.color);
    else if (c.tint !== undefined) e.setParticleTint(c.tint);
    else e.setParticleTint(0xffffff);
    e.setDepth(opts?.depth ?? DEPTH.fx);
    // spread = radius of the emission area; sprinkle in small batches so the cloud isn't a point
    const batches = spread > 6 && n > 1 ? Math.min(n, 6) : 1;
    let left = n;
    for (let b = 0; b < batches; b++) {
      const q = b === batches - 1 ? left : Math.ceil(n / batches);
      left -= q;
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * spread;
      if (q > 0) e.explode(q, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
    }
  }

  puff(x: number, y: number, color?: number): void {
    this.particles('puff', x, y, 7, { spread: 16, color: color ?? 0xf6efe0, speed: 120 });
    this.particles('dust', x, y, 6, { spread: 20 });
    this.ring(x, y, color ?? 0xe9fbff, 70);
  }

  // --------------------------------------------------------------- rings ----

  private makeRing(): Ring {
    const img = this.scene.add.image(0, 0, 'fx:ring').setScale(0.1).setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    return { img, t: 0, dur: 1, r: 1, active: false };
  }

  ring(x: number, y: number, color: number, radius: number): void {
    let r = this.rings.find((q) => !q.active);
    if (!r) {
      r = this.makeRing();
      this.rings.push(r);
    }
    r.active = true;
    r.t = 0;
    r.dur = 0.55;
    r.r = radius;
    r.img.setPosition(x, y).setTint(color).setVisible(true).setAlpha(0.9).setScale(0.1);
  }

  // ---------------------------------------------------------- apparitions ----

  private makeApp(): Apparition {
    const glow = this.scene.add.image(0, 0, 'fx:glow').setDepth(DEPTH.apparition - 0.1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    const img = this.scene.add.image(0, 0, 'app:figure').setDepth(DEPTH.apparition).setVisible(false);
    return { img, glow, t: 0, dur: 1, x0: 0, y0: 0, x1: 0, y1: 0, s0: 1, s1: 1, a: 1, toward: 'up', wob: 0, active: false };
  }

  apparition(kind: ApparitionKind, x: number, y: number, durMs: number, toward: 'viewer' | 'npc' | 'up' = 'up'): void {
    let a = this.apps.find((q) => !q.active);
    if (!a) {
      a = this.makeApp();
      this.apps.push(a);
    }
    const [, h] = APPARITION_SIZE[kind];
    a.active = true;
    a.t = 0;
    a.dur = Math.max(0.3, durMs / 1000);
    a.toward = toward;
    a.a = kind === 'shadow' ? 0.92 : 0.82;
    a.wob = Math.random() * 6.28;
    a.x0 = x;
    a.y0 = y;
    const base = 1 / ART;
    if (toward === 'viewer') {
      // grows toward the camera: scale up + fade at the end
      a.s0 = base * 0.55;
      a.s1 = base * 3.1;
      a.x1 = x;
      a.y1 = y + h * 0.1;
    } else if (toward === 'npc') {
      const target = this.nearestNpc(x, y);
      a.s0 = base * 0.8;
      a.s1 = base * 1.2;
      a.x1 = target ? target.x : x + 120;
      a.y1 = target ? target.y - 70 : y;
    } else {
      a.s0 = base * 0.7;
      a.s1 = base * 1.1;
      a.x1 = x;
      a.y1 = y - 90;
    }
    const isShadow = kind === 'shadow' || kind === 'eyes';
    a.img.setTexture(`app:${kind}`).setPosition(x, y).setScale(a.s0).setAlpha(0).setVisible(true).setBlendMode(isShadow ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.NORMAL);
    a.glow.setPosition(x, y).setScale(h / 128 * 1.1).setAlpha(0).setVisible(true).setTint(kind === 'shadow' ? 0x9b7bff : 0x9fe8ff);
    this.ctx.audio.play(kind === 'face' || toward === 'viewer' ? 'sting_high' : 'wail', { x, y, vol: 0.5 });
  }

  private nearestNpc(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const n of this.ctx.npcs) {
      if (n.fled) continue;
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  // ---------------------------------------------------------- thrown props ----

  private makeProp(): Prop {
    const img = this.scene.add.image(0, 0, 'fx:dust').setScale(1 / ART).setDepth(DEPTH.fx + 0.5).setVisible(false);
    return { img, vx: 0, vy: 0, spin: 0, floor: 0, bounces: 0, life: 0, active: false };
  }

  throwProp(tex: string, x: number, y: number, count: number, power = 1): void {
    const key = this.scene.textures.exists(tex) ? tex : 'fx:paper';
    const room = this.ctx.rooms.at(x, y);
    const floorY = room ? this.ctx.rooms.get(room).floorY - 6 : y + 220;
    for (let i = 0; i < Math.min(count, 12); i++) {
      let p = this.props.find((q) => !q.active);
      if (!p) {
        p = this.makeProp();
        this.props.push(p);
      }
      p.active = true;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.0;
      const sp = (260 + Math.random() * 380) * power;
      p.vx = Math.cos(ang) * sp * 0.9;
      p.vy = Math.sin(ang) * sp;
      p.spin = (Math.random() - 0.5) * 18;
      p.floor = Math.max(floorY, y - 4);
      p.bounces = 0;
      p.life = 0;
      p.img.setTexture(key).setPosition(x + (Math.random() - 0.5) * 24, y - 10).setAlpha(1).setRotation(Math.random() * 6.28).setVisible(true);
    }
  }

  // ----------------------------------------------------------- flash / shake ----

  flash(color: number, durMs: number, alpha = 0.5): void {
    const el = this.flashEl;
    el.style.background = '#' + (color & 0xffffff).toString(16).padStart(6, '0');
    el.animate([{ opacity: alpha }, { opacity: 0 }], { duration: Math.max(60, durMs), easing: 'ease-out' });
  }

  shakeCam(amp: number, durMs: number): void {
    // keep the stronger of overlapping shakes
    const left = this.shakeLeft;
    if (amp >= this.shakeAmp * (left / this.shakeDur) || left <= 0) {
      this.shakeAmp = amp;
      this.shakeDur = Math.max(0.05, durMs / 1000);
      this.shakeLeft = this.shakeDur;
    }
  }

  /** Freeze / resume every pooled emitter (pause overlay). */
  setPaused(p: boolean): void {
    for (const e of this.emitters.values()) {
      if (p) e.pause();
      else e.resume();
    }
  }

  // --------------------------------------------------------------- update ----

  update(dt: number): void {
    // props: gravity arcs, spin, bounce, fade
    for (const p of this.props) {
      if (!p.active) continue;
      p.life += dt;
      p.vy += 1500 * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.rotation += p.spin * dt;
      if (p.img.y > p.floor && p.vy > 0) {
        p.img.y = p.floor;
        if (p.bounces < 2 && Math.abs(p.vy) > 140) {
          p.vy *= -0.38;
          p.vx *= 0.7;
          p.spin *= 0.6;
          p.bounces++;
          this.ctx.audio.play('thump', { x: p.img.x, y: p.img.y, vol: 0.25 });
        } else {
          p.vy = 0;
          p.vx *= Math.max(0, 1 - 6 * dt);
          p.spin *= Math.max(0, 1 - 6 * dt);
        }
      }
      if (p.life > 1.5) p.img.alpha = Math.max(0, 1 - (p.life - 1.5) / 0.9);
      if (p.life > 2.4) {
        p.active = false;
        p.img.setVisible(false);
      }
    }
    // rings
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const u = r.t / r.dur;
      if (u >= 1) {
        r.active = false;
        r.img.setVisible(false);
        continue;
      }
      const e = 1 - (1 - u) * (1 - u);
      r.img.setScale(((r.r * 2) / 128) * (0.12 + 0.88 * e));
      r.img.setAlpha(0.9 * (1 - u) * (1 - u));
    }
    // apparitions
    for (const a of this.apps) {
      if (!a.active) continue;
      a.t += dt;
      const u = a.t / a.dur;
      if (u >= 1) {
        a.active = false;
        a.img.setVisible(false);
        a.glow.setVisible(false);
        continue;
      }
      let alpha: number;
      let pos: number;
      let sc: number;
      if (a.toward === 'viewer') {
        // slow fade in, then rush + dissolve
        alpha = (u < 0.25 ? u / 0.25 : u > 0.78 ? (1 - u) / 0.22 : 1) * a.a;
        pos = u * u;
        sc = a.s0 + (a.s1 - a.s0) * u * u * u;
      } else {
        alpha = (u < 0.2 ? u / 0.2 : u > 0.65 ? (1 - u) / 0.35 : 1) * a.a;
        pos = 1 - (1 - u) * (1 - u);
        sc = a.s0 + (a.s1 - a.s0) * u;
      }
      const wob = Math.sin(a.t * 5 + a.wob) * (a.toward === 'viewer' ? 3 : 7);
      const px = a.x0 + (a.x1 - a.x0) * pos + wob;
      const py = a.y0 + (a.y1 - a.y0) * pos + Math.sin(a.t * 3.1 + a.wob) * 4;
      a.img.setPosition(px, py).setScale(sc).setAlpha(alpha);
      a.glow.setPosition(px, py).setAlpha(alpha * 0.5);
    }
    // camera shake (decaying, smooth noise)
    if (this.shakeLeft > 0) {
      this.shakeLeft = Math.max(0, this.shakeLeft - dt);
      const k = (this.shakeLeft / this.shakeDur) ** 1.5;
      this.shakePhase += dt * 60;
      const a = this.shakeAmp * k;
      this.shakeX = (Math.sin(this.shakePhase * 1.7) + Math.sin(this.shakePhase * 2.9 + 1.3) * 0.6) * a * 0.62;
      this.shakeY = (Math.cos(this.shakePhase * 2.1) + Math.sin(this.shakePhase * 3.3 + 0.4) * 0.6) * a * 0.62;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
}

