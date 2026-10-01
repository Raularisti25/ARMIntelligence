// HauntableObject — one possessable household object. Owns the part images,
// the idle loop, the possession feel and the Fx timeline for its three actions.
//
// Transform model: every animated thing (the outer container, the inner `root`
// and each part image) is a Rig with a fixed BASE pose. Effects never write the
// game object directly; each frame they ADD into the rig's accumulators
// (offset, rotation, scale multiplier, alpha delta) and the rig is applied once
// as base + accumulators. When an effect set ends, whatever pose remains is
// eased out as a "residual" — so no action can ever leave a part drifted.

import Phaser from 'phaser';
import { ART, DEPTH } from '../config';
import { PAL } from '../art/paint';
import { ADDITIVE_PART, highlightOf } from '../art/objectArt';
import { PLACEMENT_BY_ID } from '../world/layout';
import type {
  ActionDef, Fx, GameCtx, HauntablePlacement, IHauntable, ObjectDef, RoomId, ScareEvent,
} from '../types';

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const EZ = Phaser.Math.Easing;
const sineIO = (v: number): number => EZ.Sine.InOut(clamp01(v));

type Easer = (v: number) => number;
const FAMILY: Record<string, string> = {
  Quad: 'Quadratic', Cubic: 'Cubic', Quart: 'Quartic', Quint: 'Quintic', Circ: 'Circular',
  Sine: 'Sine', Back: 'Back', Bounce: 'Bounce', Elastic: 'Elastic', Expo: 'Expo', Linear: 'Linear',
};
/** 'Back.easeOut' / 'Sine.easeInOut' style names → easing fn (falls back to Sine.InOut). */
function easer(name?: string): Easer {
  if (!name) return sineIO;
  const [fam, kind] = name.split('.');
  const table = (EZ as unknown as Record<string, Record<string, Easer> | Easer>)[FAMILY[fam] ?? fam];
  if (typeof table === 'function') return table;
  const fn = table?.[(kind ?? 'InOut').replace(/^ease/, '') || 'InOut'];
  return fn ?? sineIO;
}

interface Rig {
  go: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image | null;
  baseTex: string | null;
  bx: number; by: number; bsx: number; bsy: number; brot: number; ba: number;
  // accumulators (rebuilt every frame while the rig is live)
  ax: number; ay: number; ar: number; asx: number; asy: number; aa: number;
  // residual easing back to base
  rs: { x: number; y: number; r: number; sx: number; sy: number; a: number } | null;
  rt: number; rd: number;
  stamp: number;
  texSwapped: boolean;
}

interface Eff {
  at: number;
  dur: number; // ms; 0 for one-shots
  rig: Rig | null;
  fn: (p: number, te: number, rig: Rig | null) => void;
  once: boolean;
  fired: boolean;
}

interface Timeline {
  effs: Eff[];
  t: number;
  loop: number; // ms, 0 = no loop
  end: number; // ms the action is allowed to finish
  hold: boolean; // keep final pose of continuous effects until the end
  emits: { at: number; scare: number; noise: number; fired: boolean }[];
}

/** Ambient positional loops started with the object (AudioManager ambience ids). */
const AMBIENT: Record<string, { id: string; vol: number }> = {
  grandfatherClock: { id: 'clock', vol: 0.55 },
  fireplace: { id: 'fire', vol: 0.6 },
  refrigerator: { id: 'fridge', vol: 0.4 },
  furnace: { id: 'furnace', vol: 0.55 },
};

const HIGHLIGHT_COLOR = 0x9fe8ff;
const SETTLE_MS = 260;

export class HauntableObject implements IHauntable {
  readonly def: ObjectDef;
  readonly id: string;
  readonly room: RoomId;
  readonly placement: HauntablePlacement;
  readonly container: Phaser.GameObjects.Container;
  readonly bounds: Phaser.Geom.Rectangle;
  possessed = false;
  busy = false;

  private readonly ctx: GameCtx;
  private readonly root: Phaser.GameObjects.Container;
  private readonly outerRig: Rig;
  private readonly rootRig: Rig;
  private readonly partRigs = new Map<string, Rig>();
  private readonly live = new Set<Rig>();
  private frame = 0;
  private readonly cx: number;
  private readonly cy: number;

  private readonly cd = [0, 0, 0];
  private readonly cdTotal = [1, 1, 1];

  private idle: Timeline | null = null;
  private action: Timeline | null = null;
  private actionIndex = -1;
  private readonly misc: Timeline[] = [];

  // highlight
  private hl: Phaser.GameObjects.Image | null = null;
  private hlGlow: Phaser.FX.Glow | null = null;
  private hlTarget = 0;
  private hlLevel = 0;

  // aura (possession + `aura` fx)
  private aura: Phaser.GameObjects.Image | null = null;
  private auraFx: { color: number; t: number; dur: number; str: number } | null = null;
  private auraBase = 0;
  private breathW = 0;
  private clock = 0;
  private idleT = 0;
  private readonly rand: () => number;

  constructor(ctx: GameCtx, def: ObjectDef) {
    this.ctx = ctx;
    this.def = def;
    this.id = def.id;
    const placement = PLACEMENT_BY_ID[def.id];
    if (!placement) throw new Error(`[HauntableObject] no placement for ${def.id}`);
    this.placement = placement;
    this.room = placement.room;
    this.rand = Phaser.Math.RND.frac.bind(Phaser.Math.RND);

    const { x, y, mount } = placement;
    const { w, h } = def;
    this.bounds = mount === 'wall'
      ? new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h)
      : mount === 'ceiling'
        ? new Phaser.Geom.Rectangle(x - w / 2, y, w, h)
        : new Phaser.Geom.Rectangle(x - w / 2, y - h, w, h);
    this.cx = this.bounds.centerX;
    this.cy = this.bounds.centerY;

    const scene = ctx.scene;
    this.container = scene.add.container(x, y).setDepth(DEPTH.object);
    this.root = scene.add.container(0, 0);

    // highlight silhouette sits under the parts (glow bleeds outside the shape)
    const hlInfo = highlightOf(def.id);
    if (hlInfo && scene.textures.exists(hlInfo.key)) {
      this.hl = scene.add.image(hlInfo.l, hlInfo.t, hlInfo.key).setOrigin(0, 0).setScale(1 / ART).setVisible(false);
      this.container.add(this.hl);
    }
    this.container.add(this.root);

    const defaultOy = mount === 'wall' ? 0.5 : mount === 'ceiling' ? 0 : 1;
    const order = def.parts
      .map((p, i) => ({ p, i }))
      .sort((a, b) => ((a.p.depthOffset ?? 0) - (b.p.depthOffset ?? 0)) || a.i - b.i);
    for (const { p } of order) {
      const im = scene.add.image(p.x, p.y, p.tex).setOrigin(p.originX ?? 0.5, p.originY ?? defaultOy).setScale(1 / ART);
      im.setAlpha(p.alpha ?? 1);
      if (ADDITIVE_PART.test(p.name)) im.setBlendMode(Phaser.BlendModes.ADD);
      im.setVisible(im.alpha > 0.003);
      this.root.add(im);
      this.partRigs.set(p.name, this.makeRig(im, p.tex));
    }

    // faint aura above the parts
    if (scene.textures.exists('obj:aura')) {
      const s = Math.max(w, h) * 1.5 / 128;
      this.aura = scene.add.image(this.cx - x, this.cy - y, 'obj:aura').setScale(s).setAlpha(0).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
      this.container.add(this.aura);
    }

    this.outerRig = this.makeRig(this.container, null);
    this.rootRig = this.makeRig(this.root, null);

    if (def.idle && def.idle.length) {
      const loop = def.idleLoopMs ?? 4000;
      this.idle = { effs: [], t: 0, loop, end: loop, hold: false, emits: [] };
      for (const fx of def.idle) this.idle.effs.push(...this.build(fx, true, loop));
      this.idleT = this.rand() * loop; // de-sync neighbours
    }

    const amb = AMBIENT[def.id];
    if (amb) ctx.audio.loop(amb.id, this.cx, this.cy, amb.vol);
  }

  // ------------------------------------------------------------- IHauntable ---

  setHighlight(on: boolean): void {
    this.hlTarget = on ? 1 : 0;
  }

  possess(): void {
    if (this.possessed) return;
    this.possessed = true;
    const c = this.ctx;
    c.audio.play('possess_in', { x: this.cx, y: this.cy });
    c.fx.puff(this.cx, this.cy, PAL.ghostCyan);
    this.addMisc([
      { k: 'squash', at: 0, amt: 0.2, dur: 420 },
      { k: 'hop', at: 0, h: 9, dur: 300 },
    ], this.outerRig, 440);
  }

  release(): void {
    if (!this.possessed) return;
    this.possessed = false;
    const c = this.ctx;
    c.audio.play('possess_out', { x: this.cx, y: this.cy });
    c.fx.puff(this.cx, this.cy - this.def.h * 0.1, PAL.ghostCyan);
    this.addMisc([{ k: 'squash', at: 0, amt: 0.1, dur: 300 }], this.outerRig, 320);
  }

  unlocked(index: number): boolean {
    const a = this.def.actions[index];
    if (!a) return false;
    return this.ctx.intensity.level >= a.tier - 1;
  }

  cooldownLeft(index: number): number {
    return this.cd[index] ?? 0;
  }

  cooldownFrac(index: number): number {
    const t = this.cdTotal[index] ?? 1;
    return t > 0 ? clamp01((this.cd[index] ?? 0) / t) : 0;
  }

  act(index: number): boolean {
    const a: ActionDef | undefined = this.def.actions[index];
    if (!a || !this.unlocked(index) || this.busy || this.cd[index] > 0) return false;
    const c = this.ctx;

    // idle gives way to the action: its last pose eases out instead of snapping
    this.capture(160);
    this.busy = true;
    this.actionIndex = index;
    const tl: Timeline = { effs: [], t: 0, loop: 0, end: a.duration, hold: true, emits: [] };
    for (const fx of a.fx) {
      for (const e of this.build(fx, false, 0)) {
        tl.effs.push(e);
        if (!e.once) tl.end = Math.max(tl.end, e.at + e.dur + 60);
      }
    }
    for (const em of a.emits ?? []) tl.emits.push({ ...em, fired: false });
    this.action = tl;

    this.cdTotal[index] = a.cooldown + a.duration / 1000;
    this.cd[index] = this.cdTotal[index];

    c.stats.haunts++;
    c.stats.perObject[this.id] = (c.stats.perObject[this.id] ?? 0) + 1;
    this.emitScare(a, a.scare, a.noise, index);
    c.events.emit('action', { objectId: this.id, index, tier: a.tier });
    return true;
  }

  jostle(): void {
    this.ctx.audio.play(this.id === 'wardrobe' ? 'wardrobe_rattle' : 'rattle', { x: this.cx, y: this.cy, vol: 0.4 });
    this.addMisc([
      { k: 'shake', at: 0, dur: 420, amp: 3.2, freq: 22 },
      { k: 'wobble', at: 0, dur: 420, deg: 0.7, freq: 14 },
    ], this.rootRig, 440);
  }

  update(dt: number): void {
    const ms = Math.min(dt * 1000, 80);
    for (let i = 0; i < 3; i++) if (this.cd[i] > 0) this.cd[i] = Math.max(0, this.cd[i] - dt);

    this.clock += ms;
    this.updateHighlight(dt);

    const view = this.ctx.scene.cameras.main.worldView;
    const onScreen = this.action !== null || this.possessed
      || (this.bounds.right > view.x - 140 && this.bounds.x < view.right + 140
        && this.bounds.bottom > view.y - 140 && this.bounds.y < view.bottom + 140);

    const idleRuns = this.idle !== null && this.action === null && onScreen;
    const breathing = this.possessed || this.breathW > 0.001;
    this.updateAura(ms);
    if (!idleRuns && this.action === null && this.misc.length === 0 && this.live.size === 0 && !breathing) {
      this.idleT += ms;
      return;
    }

    this.frame++;
    for (const r of this.live) {
      r.ax = 0; r.ay = 0; r.ar = 0; r.asx = 1; r.asy = 1; r.aa = 0;
    }

    if (idleRuns && this.idle) {
      this.idleT += ms;
      this.runTimeline(this.idle, this.idleT % this.idle.loop, true);
    } else {
      this.idleT = 0; // idle restarts from a neutral pose after an action
    }

    let finished = false;
    if (this.action) {
      const tl = this.action;
      tl.t += ms;
      this.runTimeline(tl, tl.t, false);
      for (const em of tl.emits) {
        if (!em.fired && tl.t >= em.at) {
          em.fired = true;
          this.emitScare(this.def.actions[this.actionIndex], em.scare, em.noise, this.actionIndex);
        }
      }
      if (tl.t >= tl.end) finished = true;
    }

    for (let i = this.misc.length - 1; i >= 0; i--) {
      const tl = this.misc[i];
      tl.t += ms;
      this.runTimeline(tl, tl.t, false);
      if (tl.t >= tl.end) this.misc.splice(i, 1);
    }

    // possession breathing (outer container, whole-object scale about the anchor)
    this.breathW += ((this.possessed ? 1 : 0) - this.breathW) * Math.min(1, dt * 6);
    if (this.breathW > 0.001) {
      const s = Math.sin((this.clock / 1000) * (TAU / 2.7));
      this.touch(this.outerRig);
      this.outerRig.asx *= 1 + 0.009 * s * this.breathW;
      this.outerRig.asy *= 1 + 0.015 * s * this.breathW;
    }

    // residuals ease back to base
    for (const r of this.live) {
      if (!r.rs) continue;
      r.rt -= ms;
      if (r.rt <= 0) { r.rs = null; continue; }
      const w = 1 - sineIO(1 - r.rt / r.rd);
      r.stamp = this.frame;
      r.ax += r.rs.x * w; r.ay += r.rs.y * w; r.ar += r.rs.r * w; r.aa += r.rs.a * w;
      r.asx *= 1 + (r.rs.sx - 1) * w; r.asy *= 1 + (r.rs.sy - 1) * w;
    }

    for (const r of this.live) {
      const g = r.go;
      g.x = r.bx + r.ax;
      g.y = r.by + r.ay;
      g.rotation = r.brot + r.ar;
      g.setScale(r.bsx * r.asx, r.bsy * r.asy);
      if (r.image) {
        const a = clamp01(r.ba + r.aa);
        g.setAlpha(a);
        g.setVisible(a > 0.003);
      }
      if (r.stamp !== this.frame) this.live.delete(r);
    }

    if (finished) this.endAction();
  }

  destroy(): void {
    this.container.destroy();
  }

  // ------------------------------------------------------------- internals ---

  private makeRig(go: Rig['go'], tex: string | null): Rig {
    const image = go instanceof Phaser.GameObjects.Image ? go : null;
    return {
      go, image, baseTex: tex,
      bx: go.x, by: go.y, bsx: go.scaleX, bsy: go.scaleY, brot: go.rotation, ba: go.alpha,
      ax: 0, ay: 0, ar: 0, asx: 1, asy: 1, aa: 0,
      rs: null, rt: 0, rd: 1, stamp: 0, texSwapped: false,
    };
  }

  private touch(r: Rig): void {
    r.stamp = this.frame;
    this.live.add(r);
  }

  /** Freeze the current pose of every live rig and ease it back to base. */
  private capture(ms: number): void {
    for (const r of this.live) {
      let rot = r.ar % TAU;
      if (rot > Math.PI) rot -= TAU;
      if (rot < -Math.PI) rot += TAU;
      if (Math.abs(r.ax) + Math.abs(r.ay) + Math.abs(rot) + Math.abs(r.asx - 1) + Math.abs(r.asy - 1) + Math.abs(r.aa) < 0.002) continue;
      r.rs = { x: r.ax, y: r.ay, r: rot, sx: r.asx, sy: r.asy, a: r.aa };
      r.rt = ms;
      r.rd = ms;
      r.stamp = this.frame + 1;
    }
  }

  private endAction(): void {
    this.capture(SETTLE_MS);
    for (const r of this.partRigs.values()) {
      if (r.texSwapped && r.image && r.baseTex) {
        r.image.setTexture(r.baseTex);
        r.texSwapped = false;
      }
    }
    this.action = null;
    this.actionIndex = -1;
    this.busy = false;
    this.idleT = 0;
  }

  private emitScare(a: ActionDef, scare: number, noise: number, index: number): void {
    const tags = a.tags ?? [];
    const ev: ScareEvent = {
      kind: 'haunt',
      x: this.cx,
      y: this.cy,
      room: this.room,
      scare: Math.min(1, scare * this.ctx.intensity.scareMult),
      noise,
      sourceId: this.id,
      visual: tags.includes('visual'),
      dark: tags.includes('dark') || undefined,
      tier: a.tier,
      signature: `${this.id}:${index}`,
    };
    this.ctx.events.emit('scare', ev);
  }

  private addMisc(fx: Fx[], rig: Rig, ms: number): void {
    const tl: Timeline = { effs: [], t: 0, loop: 0, end: ms, hold: false, emits: [] };
    for (const f of fx) tl.effs.push(...this.build(f, false, 0, rig));
    this.misc.push(tl);
  }

  private runTimeline(tl: Timeline, t: number, idle: boolean): void {
    for (const e of tl.effs) {
      if (t < e.at) continue;
      if (e.once) {
        if (!e.fired && !idle) { e.fired = true; e.fn(1, 0, null); }
        continue;
      }
      let p = e.dur > 0 ? (t - e.at) / e.dur : 1;
      if (p > 1) {
        if (idle || !tl.hold) continue;
        p = 1;
      }
      if (e.rig) this.touch(e.rig);
      e.fn(p, t - e.at, e.rig);
    }
  }

  private rigsFor(part?: string): Rig[] {
    if (!part) return [this.rootRig];
    const out: Rig[] = [];
    for (const n of part.split(',')) {
      const r = this.partRigs.get(n.trim());
      if (r) out.push(r);
    }
    return out;
  }

  private nearestNpcSign(): { sign: number; str: number } {
    let best: { x: number; d: number } | null = null;
    for (const n of this.ctx.npcs) {
      if (n.fled) continue;
      const dx = n.x - this.cx;
      const d = Math.abs(dx) + (n.room === this.room ? 0 : 700);
      if (!best || d < best.d) best = { x: dx, d };
    }
    if (!best) return { sign: 1, str: 0.4 };
    return { sign: best.x < 0 ? -1 : 1, str: clamp01(1 - Math.abs(best.x) / 900) * 0.7 + 0.3 };
  }

  /** Turn one Fx into engine effects (one per targeted rig, or one one-shot). */
  private build(fx: Fx, idle: boolean, loopMs: number, forceRig?: Rig): Eff[] {
    const c = this.ctx;
    const out: Eff[] = [];
    const rigs = forceRig ? [forceRig] : this.rigsFor('part' in fx ? fx.part : undefined);
    const per = (dur: number, fn: (r: Rig) => Eff['fn']): void => {
      for (const r of rigs) out.push({ at: fx.at, dur, rig: r, fn: fn(r), once: false, fired: false });
    };
    const one = (fn: () => void): void => {
      out.push({ at: fx.at, dur: 0, rig: null, fn, once: true, fired: false });
    };
    const cx = this.cx;
    const cy = this.cy;

    switch (fx.k) {
      case 'shake': {
        const f = (fx.freq ?? 14) * TAU / 1000;
        per(fx.dur, () => (p, te, r) => {
          if (!r) return;
          const env = idle ? 1 : Math.min(1, p * 6, (1 - p) * 3);
          r.ax += fx.amp * env * (Math.sin(te * f) * 0.7 + Math.sin(te * f * 1.73 + 1.3) * 0.3);
          r.ay += fx.amp * 0.55 * env * Math.sin(te * f * 1.31 + 0.7);
          r.ar += fx.amp * 0.0026 * env * Math.sin(te * f * 0.8);
        });
        break;
      }
      case 'wobble': {
        const f = (fx.freq ?? 5) * TAU / 1000;
        per(fx.dur, () => (p, te, r) => {
          if (!r) return;
          const env = idle ? 1 : Math.min(1, p * 10) * Math.pow(1 - p, 0.6);
          r.ar += fx.deg * RAD * env * Math.sin(te * f);
        });
        break;
      }
      case 'hop': {
        const hopMs = fx.dur ?? 380;
        const count = fx.count ?? 1;
        per(hopMs * count, () => (p, te, r) => {
          if (!r) return;
          const q = p >= 1 ? 0 : (te / hopMs) % 1;
          const arc = 4 * q * (1 - q);
          r.ay -= fx.h * arc;
          r.asy *= 1 + 0.05 * arc;
          r.asx *= 1 - 0.03 * arc;
        });
        break;
      }
      case 'float': {
        per(fx.dur, () => (p, te, r) => {
          if (!r) return;
          const lift = sineIO(Math.min(p / 0.22, (1 - p) / 0.3, 1));
          r.ay -= fx.h * lift + Math.sin(te * 0.0034) * fx.h * 0.035 * lift;
          r.ar += Math.sin(te * 0.0025) * 0.012 * lift;
        });
        break;
      }
      case 'squash': {
        const dur = fx.dur ?? 320;
        per(dur, () => (p, _te, r) => {
          if (!r) return;
          const k = Math.exp(-3.2 * p) * (1 - p) * Math.cos(TAU * 1.4 * p);
          r.asy *= 1 - fx.amt * k;
          if (Math.abs(fx.amt) < 0.5) r.asx *= 1 + fx.amt * 0.5 * k;
        });
        break;
      }
      case 'rotate': {
        per(fx.dur, () => (p, _te, r) => {
          if (!r) return;
          r.ar += fx.deg * RAD * (fx.yoyo ? Math.sin(Math.PI * p) : sineIO(p));
        });
        break;
      }
      case 'scaleX': {
        per(fx.dur, () => (p, _te, r) => {
          if (!r) return;
          r.asx *= 1 + (fx.to - 1) * (fx.yoyo ? Math.sin(Math.PI * p) : sineIO(p));
        });
        break;
      }
      case 'move': {
        const ez = easer(fx.ease);
        per(fx.dur, () => (p, _te, r) => {
          if (!r) return;
          const e = ez(fx.yoyo ? 1 - Math.abs(2 * p - 1) : p);
          r.ax += fx.dx * e;
          r.ay += fx.dy * e;
        });
        break;
      }
      case 'spin': {
        per(fx.dur, () => (p, _te, r) => {
          if (!r) return;
          r.ar += fx.turns * TAU * sineIO(p);
        });
        break;
      }
      case 'show': {
        const din = fx.dur ?? 200;
        const hold = fx.hold;
        const total = hold === undefined ? din : idle ? din * 2 : din * 2 + hold;
        per(total, (r) => (p, te) => {
          let w: number;
          if (hold === undefined) w = EZ.Sine.Out(p);
          else w = clamp01(Math.min(te / din, (total - te) / din));
          r.aa += (fx.alpha - r.ba) * w;
        });
        break;
      }
      case 'frames': {
        const frameMs = 1000 / fx.fps;
        const cycle = fx.keys.length * frameMs;
        const dur = idle ? Math.max(100, loopMs - fx.at) : cycle * (fx.loops ?? 1);
        per(dur, (r) => (p, te) => {
          if (!r.image) return;
          if (p >= 1 && !idle) {
            if (r.baseTex && r.texSwapped) { r.image.setTexture(r.baseTex); r.texSwapped = false; }
            return;
          }
          const key = fx.keys[Math.floor(te / frameMs) % fx.keys.length];
          if (r.image.texture.key !== key) r.image.setTexture(key);
          r.texSwapped = true;
        });
        break;
      }
      case 'light':
        one(() => c.world.lights(this.room, fx.mode, fx.dur));
        break;
      case 'aura':
        one(() => { this.auraFx = { color: fx.color, t: 0, dur: fx.dur, str: fx.strength ?? 1 }; });
        break;
      case 'particles':
        one(() => c.fx.particles(fx.kind, cx + (fx.dx ?? 0), cy + (fx.dy ?? 0), fx.count, {
          spread: fx.spread, speed: fx.speed, color: fx.color,
        }));
        break;
      case 'apparition':
        one(() => c.fx.apparition(fx.kind, cx + (fx.dx ?? 0), cy + (fx.dy ?? 0), fx.dur, fx.toward));
        break;
      case 'throw':
        one(() => c.fx.throwProp(fx.tex, cx + (fx.dx ?? 0), cy + (fx.dy ?? 0), fx.count, fx.power));
        break;
      case 'dark':
        one(() => c.world.darkenRoom(this.room, fx.amount, fx.dur));
        break;
      case 'shakeCam':
        one(() => c.fx.shakeCam(fx.amp, fx.dur));
        break;
      case 'flash':
        one(() => c.fx.flash(fx.color, fx.dur, fx.alpha));
        break;
      case 'sfx':
        one(() => c.audio.play(fx.id, { x: cx, y: cy, vol: fx.vol, rate: fx.rate }));
        break;
      case 'lunge': {
        const k = fx.dist * 0.0045;
        per(fx.dur, () => (p, _te, r) => {
          if (!r) return;
          const e = p < 0.3 ? EZ.Quadratic.Out(p / 0.3) : sineIO((1 - p) / 0.7);
          r.asx *= 1 + k * e;
          r.asy *= 1 + k * e;
          r.ay -= fx.dist * 0.08 * e;
        });
        break;
      }
      case 'lookAtNpc': {
        per(fx.dur, () => {
          let look: { sign: number; str: number } | null = null;
          return (p, _te, r) => {
            if (!r) return;
            look ??= this.nearestNpcSign();
            const e = sineIO(Math.min(p / 0.18, (1 - p) / 0.22, 1));
            r.ar += look.sign * 0.14 * e * look.str;
            r.ax += look.sign * 4 * e * look.str;
          };
        });
        break;
      }
    }
    return out;
  }

  private updateHighlight(dt: number): void {
    const hl = this.hl;
    if (!hl) return;
    this.hlLevel += (this.hlTarget - this.hlLevel) * Math.min(1, dt * 9);
    if (this.hlTarget === 0 && this.hlLevel < 0.01) {
      if (hl.visible) {
        hl.setVisible(false);
        if (this.hlGlow) this.hlGlow.setActive(false);
      }
      this.hlLevel = 0;
      return;
    }
    if (!hl.visible) {
      hl.setVisible(true);
      this.ensureGlow(hl);
      if (this.hlGlow) this.hlGlow.setActive(true);
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 0.0042);
    if (this.hlGlow) {
      this.hlGlow.outerStrength = this.hlLevel * (2.2 + 2.4 * pulse);
    } else {
      hl.setAlpha(this.hlLevel * (0.16 + 0.2 * pulse));
    }
  }

  private ensureGlow(hl: Phaser.GameObjects.Image): void {
    if (this.hlGlow !== null || (hl as unknown as { __noFx?: boolean }).__noFx) return;
    const fxHost = (hl as unknown as { preFX?: Phaser.GameObjects.Image['preFX'] }).preFX;
    if (fxHost && this.ctx.scene.sys.game.config.renderType === Phaser.WEBGL) {
      try {
        fxHost.setPadding(28);
        this.hlGlow = fxHost.addGlow(HIGHLIGHT_COLOR, 0, 0, true, 0.1, 16);
        return;
      } catch {
        this.hlGlow = null;
      }
    }
    // canvas / no-FX fallback: additive cyan copy of the silhouette
    (hl as unknown as { __noFx?: boolean }).__noFx = true;
    hl.setBlendMode(Phaser.BlendModes.ADD).setTint(HIGHLIGHT_COLOR);
  }

  private updateAura(ms: number): void {
    const a = this.aura;
    if (!a) return;
    this.auraBase += ((this.possessed ? 1 : 0) - this.auraBase) * Math.min(1, ms * 0.008);
    let alpha = this.auraBase * (0.14 + 0.05 * Math.sin(this.clock * 0.003));
    let color = PAL.ghostCyan;
    const fx = this.auraFx;
    if (fx) {
      fx.t += ms;
      const p = fx.t / fx.dur;
      if (p >= 1) this.auraFx = null;
      else {
        const bell = Math.min(p / 0.2, (1 - p) / 0.5, 1);
        const v = clamp01(bell) * 0.5 * fx.str;
        if (v > alpha) { alpha = v; color = fx.color; }
      }
    }
    if (alpha < 0.004) {
      if (a.visible) a.setVisible(false);
      return;
    }
    a.setVisible(true).setAlpha(alpha).setTint(color);
  }
}
