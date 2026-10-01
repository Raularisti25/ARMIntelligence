// Hollowmere audio — pure Web Audio synthesis, no sample files.
//
// Graph:  sound → [lowpass] → StereoPanner → dry bus ───────────────┐
//                                          └→ send → Convolver(IR) ─┴→ master → compressor → out
// The AudioContext is created lazily in resume() (first user input); every
// public method is a safe no-op until then (loops / ambience requested early
// are remembered and started on resume).

import type { FloorId, IAudio, LoopHandle, PlayOpts, SfxId, VoiceKind } from '../types';
import { FLOORS, FLOOR_ORDER } from '../world/layout';

// ----------------------------------------------------------------- tuning ----

const MAX_VOICES = 32;
const VOL_KEY = 'hollowmere.volume';
const MUTE_KEY = 'hollowmere.muted';
const PAN_RANGE = 700; // world units from the listener = full pan
const HALF_DIST = 520; // world units where a sound is at ~half level
const FLOOR_GAIN = 0.501; // −6 dB per floor of separation
const MASTER_PEAK = 0.85;

// ---------------------------------------------------------------- helpers ----

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const semi = (base: number, n: number): number => base * Math.pow(2, n / 12);
const smooth = (e0: number, e1: number, v: number): number => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function floorIdxAt(y: number): number {
  let i = 0;
  for (let n = 1; n < FLOOR_ORDER.length; n++) if (y >= FLOORS[FLOOR_ORDER[n]].ceil) i = n;
  return i;
}

type Vowel = readonly [number, number, number];
const V = {
  a: [800, 1150, 2800], e: [450, 1850, 2650], i: [300, 2200, 3000], o: [480, 860, 2800],
  u: [340, 780, 2400], ae: [680, 1650, 2500], mm: [260, 1100, 2200],
} as const satisfies Record<string, Vowel>;
const VOWEL_LIST: Vowel[] = [V.a, V.e, V.i, V.o, V.u, V.ae];

interface Partials { r: number[]; a: number[]; d: number[] }
const BELL: Partials = { r: [0.5, 1, 1.183, 1.506, 2, 2.514, 3.011], a: [0.55, 1, 0.65, 0.5, 0.45, 0.28, 0.16], d: [1, 0.9, 0.75, 0.6, 0.5, 0.35, 0.25] };
const METAL: Partials = { r: [1, 2.76, 5.4, 8.93], a: [1, 0.6, 0.35, 0.2], d: [1, 0.5, 0.3, 0.15] };
const GLASS: Partials = { r: [1, 2.32, 4.25, 6.63], a: [1, 0.5, 0.3, 0.15], d: [1, 0.6, 0.35, 0.2] };
const PAN: Partials = { r: [1, 2.1, 3.3, 4.6], a: [1, 0.55, 0.35, 0.2], d: [1, 0.6, 0.4, 0.25] };

interface Flt { t: BiquadFilterType; f: number; f2?: number; q?: number }

interface Wire {
  /** amplitude multiplier breakpoints [seconds, mult] */
  amp?: [number, number][];
  /** random stepped amplitude [stepSeconds, lo, hi] */
  jit?: [number, number, number];
  /** amplitude modulation [hz, depth 0..1] */
  trem?: [number, number];
  to?: AudioNode;
}
interface Tone extends Wire {
  type?: OscillatorType; f: number; f2?: number; at?: number; dur: number; vol: number;
  atk?: number; sus?: boolean; rel?: number; fl?: Flt | Flt[];
  vib?: [number, number]; det?: number; shape?: boolean;
}
interface Nz extends Wire {
  col?: 'white' | 'pink' | 'brown'; at?: number; dur: number; vol: number;
  atk?: number; sus?: boolean; rel?: number; fl?: Flt | Flt[];
}
interface Voiced {
  at: number; dur: number; f: [number, number][]; v: Vowel; v2?: Vowel; vol: number;
  vib?: [number, number]; rough?: number; breath?: number; fs?: number; atk?: number; rel?: number;
  shape?: boolean; q?: number; lp?: number;
}

/** Shared synthesis resources (one per AudioContext). */
interface Kit {
  c: AudioContext;
  white: AudioBuffer;
  pink: AudioBuffer;
  brown: AudioBuffer;
  curve: Float32Array<ArrayBuffer>;
  piano: PeriodicWave;
}

// -------------------------------------------------------------------- Snd ----
// One sound's synthesis toolbox. All `at` / `dur` arguments are in recipe
// seconds; they are divided by `tempo` (PlayOpts.rate) and frequencies are
// multiplied by `pitch` (rate × tiny random detune) so repeats never match.

class Snd {
  nodes: AudioNode[] = [];
  end: number;
  dest: AudioNode;

  constructor(readonly k: Kit, out: AudioNode, readonly t0: number, readonly pitch = 1, readonly tempo = 1) {
    this.dest = out;
    this.end = t0;
  }

  T(s: number): number { return this.t0 + s / this.tempo; }
  D(s: number): number { return s / this.tempo; }
  F(f: number): number { return f * this.pitch; }
  private reg<N extends AudioNode>(n: N): N { this.nodes.push(n); return n; }
  private mark(t: number): void { if (t > this.end) this.end = t; }

  private env(g: AudioParam, t: number, dur: number, vol: number, atk: number, sus: boolean, rel: number): void {
    const v = Math.max(0.0001, vol);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(v, t + atk);
    if (sus) {
      g.setValueAtTime(v, Math.max(t + atk, t + dur - rel));
      g.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.exponentialRampToValueAtTime(0.0001, t + dur);
    }
  }

  private filt(src: AudioNode, fl: Flt | Flt[] | undefined, t: number, dur: number): AudioNode {
    if (!fl) return src;
    let n = src;
    for (const f of Array.isArray(fl) ? fl : [fl]) {
      const b = this.reg(this.k.c.createBiquadFilter());
      b.type = f.t;
      b.Q.value = f.q ?? (f.t === 'bandpass' ? 1 : 0.7);
      b.frequency.setValueAtTime(Math.max(10, this.F(f.f)), t);
      if (f.f2) b.frequency.exponentialRampToValueAtTime(Math.max(10, this.F(f.f2)), t + dur);
      n.connect(b);
      n = b;
    }
    return n;
  }

  /** Amplitude shaping + final connection of an enveloped gain node. */
  private wire(g: GainNode, t: number, dur: number, o: Wire): void {
    const c = this.k.c;
    let tail: AudioNode = g;
    if (o.amp || o.jit) {
      const a = this.reg(c.createGain());
      if (o.amp) {
        a.gain.setValueAtTime(o.amp[0][1], t);
        for (const p of o.amp) a.gain.linearRampToValueAtTime(p[1], t + this.D(p[0]));
      } else if (o.jit) {
        const [step, lo, hi] = o.jit;
        const total = dur * this.tempo;
        for (let u = 0; u < total; u += step) a.gain.setValueAtTime(rnd(lo, hi), t + this.D(u));
      }
      tail.connect(a);
      tail = a;
    }
    if (o.trem) {
      const am = this.reg(c.createGain());
      am.gain.value = 1 - o.trem[1] / 2;
      const lfo = this.reg(c.createOscillator());
      lfo.frequency.value = o.trem[0];
      const lg = this.reg(c.createGain());
      lg.gain.value = o.trem[1] / 2;
      lfo.connect(lg);
      lg.connect(am.gain);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
      tail.connect(am);
      tail = am;
    }
    tail.connect(o.to ?? this.dest);
  }

  /** Insert a filter in front of everything that is created afterwards. */
  insert(fl: Flt): void {
    const b = this.reg(this.k.c.createBiquadFilter());
    b.type = fl.t;
    b.frequency.value = fl.f;
    b.Q.value = fl.q ?? 0.8;
    b.connect(this.dest);
    this.dest = b;
  }

  tone(o: Tone): GainNode {
    const c = this.k.c;
    const t = this.T(o.at ?? 0);
    const dur = this.D(o.dur);
    const osc = this.reg(c.createOscillator());
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(10, this.F(o.f)), t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(10, this.F(o.f2)), t + dur);
    if (o.det) osc.detune.value = o.det;
    const g = this.reg(c.createGain());
    this.env(g.gain, t, dur, o.vol, Math.min(this.D(o.atk ?? 0.004), dur * 0.5), !!o.sus, this.D(o.rel ?? 0.05));
    let head: AudioNode = osc;
    if (o.shape) {
      const sh = this.reg(c.createWaveShaper());
      sh.curve = this.k.curve;
      head.connect(sh);
      head = sh;
    }
    this.filt(head, o.fl, t, dur).connect(g);
    if (o.vib) {
      const lfo = this.reg(c.createOscillator());
      lfo.frequency.value = o.vib[0];
      const lg = this.reg(c.createGain());
      lg.gain.value = o.vib[1];
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    this.wire(g, t, dur, o);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    this.mark(t + dur + 0.05);
    return g;
  }

  noise(o: Nz): GainNode {
    const c = this.k.c;
    const t = this.T(o.at ?? 0);
    const dur = this.D(o.dur);
    const src = this.reg(c.createBufferSource());
    const buf = this.k[o.col ?? 'white'];
    src.buffer = buf;
    src.loop = true;
    const g = this.reg(c.createGain());
    this.env(g.gain, t, dur, o.vol, Math.min(this.D(o.atk ?? 0.004), dur * 0.5), !!o.sus, this.D(o.rel ?? 0.05));
    this.filt(src, o.fl, t, dur).connect(g);
    this.wire(g, t, dur, o);
    src.start(t, Math.random() * (buf.duration - 0.2));
    src.stop(t + dur + 0.03);
    this.mark(t + dur + 0.05);
    return g;
  }

  // ---- building blocks ----

  click(at: number, f: number, vol: number, dur = 0.012, q = 1.4): void {
    this.noise({ at, dur, vol, atk: 0.0008, fl: { t: 'bandpass', f, q } });
  }

  thud(at: number, f: number, vol: number, dur = 0.22, drop = 0.5): void {
    this.tone({ at, f, f2: f * drop, dur, vol, atk: 0.003 });
    this.noise({ col: 'brown', at, dur: dur * 0.6, vol: vol * 0.9, atk: 0.003, fl: { t: 'lowpass', f: f * 4 } });
  }

  partials(at: number, f: number, vol: number, dur: number, p: Partials, n = p.r.length): void {
    for (let i = 0; i < n; i++) this.tone({ at, f: f * p.r[i], dur: dur * p.d[i], vol: vol * p.a[i], atk: 0.002 });
  }

  rattle(at: number, dur: number, n: number, lo: number, hi: number, vol: number): void {
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const a = vol * (0.35 + 0.65 * Math.sin(Math.PI * u));
      this.click(at + u * dur, rnd(lo, hi), a, 0.012 + rnd(0, 0.02), 2.5);
      if (i % 3 === 0) this.tone({ at: at + u * dur, f: rnd(lo, hi) * 0.6, dur: 0.03, vol: a * 0.25, atk: 0.001 });
    }
  }

  /** Struck piano string: two detuned harmonic-rich oscillators, closing lowpass, felt thump. */
  key(f: number, at: number, vel: number, dur = 2.4): void {
    const c = this.k.c;
    const t = this.T(at);
    const d = this.D(clamp(3.4 - f / 450, 0.6, dur));
    const g = this.reg(c.createGain());
    this.env(g.gain, t, d, 0.22 * vel, 0.004, false, 0);
    const lp = this.reg(c.createBiquadFilter());
    lp.type = 'lowpass';
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(Math.min(9000, this.F(f) * (3 + 9 * vel)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, this.F(f) * 1.4), t + d * 0.6);
    for (const det of [-3, 4]) {
      const o = this.reg(c.createOscillator());
      o.setPeriodicWave(this.k.piano);
      o.frequency.value = this.F(f);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.05);
    }
    lp.connect(g);
    g.connect(this.dest);
    this.mark(t + d + 0.1);
    this.noise({ at, dur: 0.02, vol: 0.05 * vel, atk: 0.001, fl: { t: 'bandpass', f: Math.min(f * 3, 5000), q: 1 } });
  }

  /** Music-box tine. */
  tine(f: number, at: number, vol: number): void {
    this.tone({ at, f, dur: 1.2, vol, atk: 0.002 });
    this.tone({ at, f: f * 2.01, dur: 0.5, vol: vol * 0.25, atk: 0.002 });
    this.tone({ at, f: f * 5.43, dur: 0.14, vol: vol * 0.1, atk: 0.001 });
    this.click(at, 6500, vol * 0.18, 0.006, 1);
  }

  /** Stick-slip wooden creak: sawtooth with stepped jitter through resonant bandpasses. */
  creak(at: number, dur: number, f: number, vol: number, o: { rough?: number; q?: number; bf?: [number, number]; glide?: number } = {}): void {
    const c = this.k.c;
    const t = this.T(at);
    const d = this.D(dur);
    const rough = o.rough ?? 0.14;
    const glide = o.glide ?? 0.35;
    const bf = o.bf ?? [380, 900];
    const osc = this.reg(c.createOscillator());
    osc.type = 'sawtooth';
    const steps = Math.max(4, Math.round(d / 0.022));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      osc.frequency.setValueAtTime(Math.max(20, this.F(f) * (1 + glide * u) * (1 + rnd(-rough, rough))), t + u * d);
    }
    const g = this.reg(c.createGain());
    this.env(g.gain, t, d, vol, d * 0.3, true, d * 0.4);
    osc.connect(g);
    for (const [mul, q, gain] of [[1, o.q ?? 9, 1], [1.9, (o.q ?? 9) * 1.4, 0.55]] as const) {
      const b = this.reg(c.createBiquadFilter());
      b.type = 'bandpass';
      b.Q.value = q;
      b.frequency.setValueAtTime(this.F(bf[0]) * mul, t);
      b.frequency.linearRampToValueAtTime(this.F(bf[1]) * mul, t + d);
      const bg = this.reg(c.createGain());
      bg.gain.value = gain;
      g.connect(b);
      b.connect(bg);
      bg.connect(this.dest);
    }
    osc.start(t);
    osc.stop(t + d + 0.03);
    this.mark(t + d + 0.05);
  }

  /** Formant-shaped voiced source: saw → 3 parallel bandpass resonances (vowel glide). */
  voiced(o: Voiced): void {
    const c = this.k.c;
    const t = this.T(o.at);
    const dur = this.D(o.dur);
    const fs = o.fs ?? 1;
    const atk = Math.min(this.D(o.atk ?? 0.015), dur * 0.5);
    const osc = this.reg(c.createOscillator());
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.max(30, this.F(o.f[0][1])), t);
    for (let i = 1; i < o.f.length; i++) osc.frequency.linearRampToValueAtTime(Math.max(30, this.F(o.f[i][1])), t + o.f[i][0] * dur);
    const f0 = o.f.reduce((s, p) => s + p[1], 0) / o.f.length;
    const pre = this.reg(c.createGain());
    const sg = this.reg(c.createGain());
    this.env(sg.gain, t, dur, 1, atk, true, this.D(o.rel ?? 0.05));
    let head: AudioNode = osc;
    if (o.shape) {
      const sh = this.reg(c.createWaveShaper());
      sh.curve = this.k.curve;
      head.connect(sh);
      head = sh;
    }
    head.connect(sg);
    sg.connect(pre);
    if (o.breath) {
      const nsrc = this.reg(c.createBufferSource());
      nsrc.buffer = this.k.white;
      nsrc.loop = true;
      const ng = this.reg(c.createGain());
      this.env(ng.gain, t, dur, o.breath * 0.8, atk, true, this.D(o.rel ?? 0.05));
      nsrc.connect(ng);
      ng.connect(pre);
      nsrc.start(t, Math.random() * 1.5);
      nsrc.stop(t + dur + 0.03);
    }
    const vo = this.reg(c.createGain());
    vo.gain.value = o.vol * 6 * Math.pow(140 / Math.max(60, f0), 0.8);
    const v2 = o.v2 ?? o.v;
    for (let i = 0; i < 3; i++) {
      const b = this.reg(c.createBiquadFilter());
      b.type = 'bandpass';
      b.Q.value = [8, 10, 12][i] * (o.q ?? 1);
      b.frequency.setValueAtTime(o.v[i] * fs, t);
      b.frequency.linearRampToValueAtTime(v2[i] * fs, t + dur);
      const bg = this.reg(c.createGain());
      bg.gain.value = [1, 0.7, 0.4][i];
      pre.connect(b);
      b.connect(bg);
      bg.connect(vo);
    }
    if (o.vib) {
      const lfo = this.reg(c.createOscillator());
      lfo.frequency.value = o.vib[0];
      const lg = this.reg(c.createGain());
      lg.gain.value = o.vib[1];
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    let tail: AudioNode = vo;
    if (o.rough) {
      const am = this.reg(c.createGain());
      am.gain.value = 0.65;
      const lfo = this.reg(c.createOscillator());
      lfo.frequency.value = o.rough;
      const lg = this.reg(c.createGain());
      lg.gain.value = 0.35;
      lfo.connect(lg);
      lg.connect(am.gain);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
      tail.connect(am);
      tail = am;
    }
    if (o.lp) {
      const lp = this.reg(c.createBiquadFilter());
      lp.type = 'lowpass';
      lp.frequency.value = o.lp;
      tail.connect(lp);
      tail = lp;
    }
    tail.connect(this.dest);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    this.mark(t + dur + 0.05);
  }

  /** Syllable blips through vowel formants — speech-like mumbling. */
  speech(at: number, n: number, f0: number, vol: number, fs = 1): void {
    let t = at;
    for (let i = 0; i < n; i++) {
      const dur = rnd(0.07, 0.14);
      const f = f0 * rnd(0.88, 1.15);
      this.voiced({ at: t, dur, f: [[0, f * rnd(0.95, 1.05)], [1, f * rnd(0.85, 1.05)]], v: pick(VOWEL_LIST), vol, fs, atk: 0.012, rel: 0.03, breath: 0.15 });
      t += dur + rnd(0.02, 0.07) + (Math.random() < 0.2 ? 0.1 : 0);
    }
  }

  /** Formant-filtered noise syllables. */
  whisper(at: number, n: number, vol: number, fs = 1): void {
    let t = at;
    for (let i = 0; i < n; i++) {
      const dur = rnd(0.1, 0.22);
      const v = pick(VOWEL_LIST);
      if (Math.random() < 0.45) this.noise({ at: t, dur: 0.07, vol: vol * 0.5, atk: 0.01, fl: { t: 'highpass', f: 5500 } });
      for (let k = 0; k < 3; k++) {
        this.noise({ at: t + 0.03, dur, vol: vol * [1, 0.7, 0.45][k] * 5, atk: 0.03, fl: { t: 'bandpass', f: v[k] * fs * rnd(0.95, 1.05), q: 7 } });
      }
      t += dur + rnd(0.04, 0.14);
    }
  }
}

// ---------------------------------------------------------------- recipes ----

interface Rec {
  g: number; // loudness trim (calibrated so every sound peaks at a comparable level)
  w: number; // reverb send multiplier
  p: number; // voice-steal priority 0..3
  fn: (s: Snd) => void;
}
const rec = (g: number, w: number, p: number, fn: (s: Snd) => void): Rec => ({ g, w, p, fn });

const RECIPES: Record<SfxId, Rec> = {
  // ---- piano ----
  piano_soft: rec(1.96, 1.0, 2, (s) => {
    const seq = pick([[0, 3, 7, 5], [0, -2, 3, 2], [7, 5, 3, 0], [0, 7, 3, 10]]);
    let at = 0;
    for (const n of seq.slice(0, 3 + ((Math.random() * 2) | 0))) {
      s.key(semi(220, n), at, rnd(0.35, 0.5), 2.6);
      at += rnd(0.5, 0.85);
    }
  }),
  piano_melody: rec(0.66, 1.0, 2, (s) => {
    const arp = [0, 3, 7, 12, 15, 19, 24, 19, 15, 12, 7, 3];
    let at = 0;
    let step = 0.15;
    const n = 18;
    s.key(semi(110, 0), 0, 0.7, 2.5);
    for (let i = 0; i < n; i++) {
      let nt = arp[i % arp.length];
      if (i > 7 && Math.random() < 0.18) nt += pick([1, -1, 2]);
      s.key(semi(220, nt), at + 0.05, 0.45 + 0.4 * (i / n) + rnd(-0.05, 0.05), 1.6);
      at += step;
      step = Math.max(0.075, step * 0.955) + rnd(-0.008, 0.008);
    }
    s.key(semi(110, 0), at + 0.1, 0.9, 3);
    s.key(semi(110, 7), at + 0.1, 0.8, 3);
  }),
  piano_cluster: rec(0.75, 1.1, 3, (s) => {
    const offs = [0, 1, 2, 5, 6, 7, 11, 12, 13, 18];
    const chosen = [...offs].sort(() => Math.random() - 0.5).slice(0, 7);
    chosen.forEach((o, i) => s.key(semi(98, o), i * 0.006, 1, 3.2));
    s.thud(0, 70, 0.4, 0.3);
    s.noise({ col: 'brown', dur: 0.3, vol: 0.3, atk: 0.003, fl: { t: 'lowpass', f: 300 } });
  }),

  // ---- clock ----
  clock_tick_fast: rec(1.31, 0.8, 1, (s) => {
    let at = 0;
    let iv = 0.13;
    for (let i = 0; i < 12; i++) {
      const tock = i % 2;
      s.click(at, tock ? 1100 : 1700, 0.9, 0.01, 2);
      s.tone({ at, f: tock ? 520 : 760, f2: tock ? 400 : 560, dur: 0.04, vol: 0.35 });
      at += iv;
      iv = Math.max(0.065, iv * 0.93);
    }
  }),
  clock_bong: rec(0.89, 1.4, 3, (s) => {
    s.partials(0, 196 * rnd(0.99, 1.01), 0.5, 5, BELL);
    s.click(0, 1800, 0.3, 0.02, 0.8);
  }),
  clock_chime_wild: rec(0.76, 1.3, 3, (s) => {
    const notes = [196, 247, 262, 294, 330, 392, 440];
    let at = 0;
    for (let i = 0; i < 9; i++) {
      s.partials(at, pick(notes) * rnd(0.97, 1.03) * (i > 4 ? 1.5 : 1), 0.28, 2.2, BELL, 5);
      at += rnd(0.1, 0.5) * (1 - i * 0.05);
    }
  }),

  // ---- glass ----
  glass_shimmer: rec(1.45, 1.4, 2, (s) => {
    for (let i = 0; i < 9; i++) {
      const f = rnd(2400, 6200);
      const at = rnd(0, 0.7);
      s.tone({ at, f, dur: rnd(0.5, 1), vol: 0.1, atk: 0.003, trem: [rnd(6, 11), 0.5] });
      s.tone({ at, f: f * 2.32, dur: 0.3, vol: 0.04 });
    }
    s.noise({ dur: 1, vol: 0.04, atk: 0.2, sus: true, rel: 0.6, fl: { t: 'highpass', f: 6000 } });
  }),
  glass_crack: rec(2.40, 1.0, 2, (s) => {
    s.click(0, 4500, 0.9, 0.02, 0.7);
    s.tone({ f: 3100, f2: 2800, dur: 0.09, vol: 0.3 });
    for (let i = 0; i < 4; i++) s.click(rnd(0.03, 0.35), rnd(3000, 7000), rnd(0.2, 0.5), 0.006);
    s.tone({ at: 0.01, f: 5200, dur: 0.5, vol: 0.1 });
  }),
  glass_shatter: rec(2.31, 1.2, 3, (s) => {
    s.noise({ dur: 0.12, vol: 0.7, atk: 0.001, fl: { t: 'highpass', f: 1800 } });
    s.noise({ dur: 0.35, vol: 0.4, atk: 0.001, fl: { t: 'bandpass', f: 2500, q: 0.6 } });
    s.thud(0, 160, 0.3, 0.12);
    for (let i = 0; i < 26; i++) {
      const u = Math.pow(Math.random(), 1.8);
      const at = 0.03 + u * 0.9;
      const f = rnd(1800, 8000);
      s.tone({ at, f, dur: rnd(0.05, 0.2), vol: rnd(0.04, 0.14) * (1 - u * 0.6), atk: 0.001 });
      if (i % 3 === 0) s.click(at, f, 0.2, 0.01);
    }
  }),

  // ---- water ----
  water_drip: rec(2.48, 1.6, 1, (s) => {
    const f = rnd(700, 1200);
    s.tone({ f, f2: f * 2.2, dur: 0.11, vol: 0.5, atk: 0.003 });
    s.tone({ f: f * 2, f2: f * 4, dur: 0.05, vol: 0.1 });
    s.tone({ at: 0.35, f: f * 0.95, f2: f * 2.1, dur: 0.09, vol: 0.12 });
  }),
  water_gurgle: rec(1.84, 1.0, 1, (s) => {
    s.noise({ col: 'pink', dur: 1.4, vol: 0.3, atk: 0.1, sus: true, rel: 0.4, fl: { t: 'bandpass', f: 420, f2: 650, q: 4 }, jit: [0.045, 0.3, 1] });
    for (let i = 0; i < 14; i++) {
      const f = rnd(250, 600);
      s.tone({ at: rnd(0, 1.2), f, f2: f * rnd(1.3, 1.9), dur: rnd(0.05, 0.11), vol: rnd(0.08, 0.2), atk: 0.006 });
    }
  }),
  water_splash: rec(1.66, 1.1, 2, (s) => {
    s.noise({ col: 'pink', dur: 0.7, vol: 0.7, atk: 0.008, fl: { t: 'bandpass', f: 2200, f2: 500, q: 0.9 } });
    s.noise({ dur: 0.4, vol: 0.35, atk: 0.01, fl: { t: 'highpass', f: 4500 } });
    s.thud(0, 140, 0.45, 0.25, 0.4);
    for (let i = 0; i < 8; i++) {
      const f = rnd(900, 2600);
      s.tone({ at: rnd(0.1, 0.8), f, f2: f * 1.8, dur: 0.07, vol: rnd(0.05, 0.12), atk: 0.003 });
    }
  }),

  // ---- wood / impacts ----
  creak_soft: rec(2.97, 1.1, 1, (s) => {
    s.creak(0, rnd(0.55, 0.9), rnd(70, 100), 0.5);
    if (Math.random() < 0.5) s.creak(rnd(0.7, 1), rnd(0.2, 0.35), rnd(90, 120), 0.3);
  }),
  creak_loud: rec(1.27, 1.3, 2, (s) => {
    s.creak(0, 1.5, rnd(48, 62), 1, { rough: 0.2, q: 11, bf: [260, 700] });
    s.creak(0.1, 1.2, 140, 0.4, { rough: 0.2, q: 12, bf: [600, 1500] });
    s.tone({ f: 55, dur: 1.4, vol: 0.12, atk: 0.3, sus: true, rel: 0.6, vib: [5, 40] });
  }),
  wood_knock: rec(0.80, 0.9, 2, (s) => {
    let at = 0;
    for (let i = 0; i < 3; i++) {
      s.tone({ at, f: rnd(170, 210), f2: 100, dur: 0.09, vol: 0.6, atk: 0.002 });
      s.click(at, rnd(700, 1100), 0.7, 0.03, 1.5);
      s.tone({ at, f: 420, dur: 0.05, vol: 0.1 });
      at += rnd(0.17, 0.3);
    }
  }),
  thump: rec(1.80, 0.8, 2, (s) => {
    s.thud(0, rnd(75, 95), 0.9, 0.3, 0.45);
    s.noise({ col: 'brown', dur: 0.25, vol: 0.4, fl: { t: 'lowpass', f: 240 } });
  }),
  bang: rec(2.19, 1.2, 3, (s) => {
    s.click(0, 3500, 0.6, 0.02, 0.6);
    s.noise({ dur: 0.5, vol: 0.55, atk: 0.001, fl: { t: 'lowpass', f: 2500, f2: 300 } });
    s.thud(0, 120, 0.8, 0.35, 0.35);
  }),
  slam: rec(3.40, 1.0, 3, (s) => {
    s.thud(0, 105, 0.7, 0.22);
    s.noise({ col: 'pink', dur: 0.3, vol: 0.6, atk: 0.002, fl: { t: 'bandpass', f: 650, q: 1.2 } });
    s.rattle(0.06, 0.35, 8, 400, 1600, 0.3);
  }),
  rattle: rec(2.56, 0.9, 2, (s) => {
    s.rattle(0, rnd(0.5, 0.8), 18, 700, 3200, 0.5);
  }),

  // ---- crystal ----
  crystal_tinkle: rec(1.47, 1.5, 2, (s) => {
    const sc = [0, 2, 4, 7, 9, 12, 14, 16];
    let at = 0;
    for (let i = 0; i < 7; i++) {
      s.partials(at, semi(1568, pick(sc) - 12), 0.14, 0.9, GLASS, 3);
      at += rnd(0.06, 0.14);
    }
  }),
  crystal_crash: rec(1.21, 1.4, 3, (s) => {
    s.noise({ dur: 0.15, vol: 0.7, atk: 0.001, fl: { t: 'highpass', f: 1500 } });
    s.thud(0, 90, 0.5, 0.3);
    for (let i = 0; i < 22; i++) {
      const u = Math.pow(Math.random(), 1.6);
      s.partials(0.03 + u * 1.2, rnd(1400, 5200), rnd(0.05, 0.14) * (1 - u * 0.5), rnd(0.2, 0.7), GLASS, 2);
    }
    for (let i = 0; i < 4; i++) s.partials(rnd(0, 0.3), rnd(700, 1400), 0.12, 1.8, GLASS, 3);
  }),

  // ---- fire ----
  fire_whoosh: rec(2.48, 1.0, 2, (s) => {
    s.noise({ col: 'pink', dur: 0.9, vol: 0.7, atk: 0.15, fl: { t: 'bandpass', f: 250, f2: 1700, q: 0.7 }, amp: [[0, 0.2], [0.3, 1], [0.9, 0.1]] });
    s.noise({ col: 'brown', dur: 0.9, vol: 0.5, atk: 0.12, fl: { t: 'lowpass', f: 300 } });
    for (let i = 0; i < 5; i++) s.click(rnd(0.2, 0.8), rnd(2000, 5500), rnd(0.1, 0.3), 0.01);
  }),
  fire_roar: rec(1.28, 1.0, 3, (s) => {
    s.noise({ col: 'brown', dur: 2, vol: 0.9, atk: 0.25, sus: true, rel: 0.8, fl: { t: 'lowpass', f: 600 }, jit: [0.04, 0.5, 1] });
    s.noise({ col: 'pink', dur: 2, vol: 0.5, atk: 0.3, sus: true, rel: 0.8, fl: { t: 'bandpass', f: 700, f2: 400, q: 0.6 }, jit: [0.05, 0.4, 1] });
    for (let i = 0; i < 12; i++) s.click(rnd(0, 1.8), rnd(1500, 5000), rnd(0.2, 0.6), 0.01);
  }),

  // ---- tv / phone ----
  tv_static: rec(0.67, 0.7, 2, (s) => {
    s.thud(0, 80, 0.3, 0.1, 0.6);
    s.click(0, 1200, 0.5, 0.02);
    s.noise({ dur: 1, vol: 0.55, atk: 0.005, sus: true, rel: 0.25, fl: { t: 'bandpass', f: 3800, q: 0.35 }, jit: [0.03, 0.45, 1] });
    s.noise({ dur: 1, vol: 0.2, atk: 0.01, sus: true, rel: 0.25, fl: { t: 'highpass', f: 7000 }, jit: [0.03, 0.3, 1] });
    s.tone({ type: 'sawtooth', f: 60, dur: 1, vol: 0.04, atk: 0.02, sus: true, rel: 0.2, fl: { t: 'lowpass', f: 400 } });
  }),
  tv_voice: rec(0.88, 0.7, 2, (s) => {
    s.insert({ t: 'bandpass', f: 1700, q: 0.9 });
    s.insert({ t: 'highpass', f: 350, q: 0.7 });
    s.speech(0, 9, rnd(110, 200), 0.5);
    s.noise({ dur: 1.4, vol: 0.12, atk: 0.05, sus: true, rel: 0.3, fl: { t: 'bandpass', f: 3500, q: 0.4 }, jit: [0.04, 0.4, 1] });
  }),
  phone_ring: rec(1.75, 1.0, 2, (s) => {
    const burst = (at: number): void => {
      for (let i = 0; i < 14; i++) {
        const f = i % 2 ? 1370 : 1480;
        s.tone({ at: at + i * 0.028, f, dur: 0.07, vol: 0.22, atk: 0.002 });
        s.tone({ at: at + i * 0.028, f: f * 2.4, dur: 0.04, vol: 0.05, atk: 0.001 });
      }
      s.click(at, 3200, 0.1, 0.01);
    };
    burst(0);
    burst(0.55);
  }),
  phone_whisper: rec(0.80, 1.2, 2, (s) => {
    s.insert({ t: 'bandpass', f: 1400, q: 0.6 });
    s.insert({ t: 'highpass', f: 300, q: 0.7 });
    s.click(0, 900, 0.4, 0.03, 0.8);
    s.whisper(0.15, 5, 0.6);
    s.noise({ at: 0.1, dur: 1.2, vol: 0.03, atk: 0.1, sus: true, rel: 0.3, fl: { t: 'highpass', f: 2500 }, jit: [0.02, 0, 1] });
  }),

  // ---- paper / books / typing ----
  typewriter: rec(1.03, 0.8, 2, (s) => {
    let at = 0;
    const n = 10 + ((Math.random() * 5) | 0);
    for (let i = 0; i < n; i++) {
      s.click(at, rnd(1800, 3200), 0.6 + rnd(0, 0.3), 0.008, 1.8);
      s.tone({ at, f: rnd(240, 300), f2: 130, dur: 0.03, vol: 0.3, atk: 0.001 });
      at += rnd(0.07, 0.16) + (i % 5 === 4 ? 0.12 : 0);
    }
    s.thud(at, 150, 0.25, 0.06);
    s.noise({ at: at + 0.1, dur: 0.22, vol: 0.35, atk: 0.01, fl: { t: 'bandpass', f: 2600, q: 3 }, jit: [0.012, 0.2, 1] });
    s.partials(at + 0.35, 2637, 0.25, 0.9, METAL, 3);
  }),
  paper_flutter: rec(0.73, 0.8, 1, (s) => {
    s.noise({ dur: 0.55, vol: 0.5, atk: 0.02, sus: true, rel: 0.25, fl: [{ t: 'bandpass', f: 4200, q: 0.6 }, { t: 'highpass', f: 1800 }], jit: [0.022, 0, 1] });
    for (let i = 0; i < 4; i++) s.click(rnd(0, 0.5), rnd(3000, 6000), 0.15, 0.008);
  }),
  book_thud: rec(1.79, 0.8, 2, (s) => {
    s.thud(0, 95, 0.8, 0.2, 0.55);
    s.noise({ dur: 0.08, vol: 0.4, atk: 0.002, fl: { t: 'bandpass', f: 1800, q: 0.7 } });
  }),

  // ---- metal ----
  metal_clank: rec(1.79, 1.0, 2, (s) => {
    s.partials(0, rnd(480, 720), 0.45, 0.7, METAL);
    s.click(0, 3000, 0.5, 0.01);
  }),
  armor_march: rec(1, 1.0, 2, (s) => {
    for (let k = 0; k < 4; k++) {
      const at = k * 0.34 + rnd(-0.02, 0.02);
      s.thud(at, 90, 0.5, 0.12);
      s.partials(at + 0.01, rnd(380, 520), 0.22, 0.35, METAL);
      s.rattle(at, 0.15, 5, 1500, 4500, 0.22);
    }
  }),
  sword_swing: rec(1.34, 0.9, 2, (s) => {
    s.noise({ dur: 0.3, vol: 0.6, atk: 0.04, fl: { t: 'bandpass', f: 500, f2: 3500, q: 1.5 }, amp: [[0, 0.1], [0.12, 1], [0.3, 0]] });
    s.partials(0.22, 2300, 0.18, 0.8, METAL, 3);
    s.click(0.2, 5000, 0.2, 0.006);
  }),

  // ---- creatures ----
  growl: rec(0.37, 1.0, 3, (s) => {
    s.voiced({ at: 0, dur: 1.3, f: [[0, 78], [0.25, 92], [0.7, 70], [1, 52]], v: [400, 800, 2400], v2: [350, 700, 2300], vol: 0.9, rough: 32, breath: 0.9, shape: true, vib: [5.5, 35], atk: 0.1, rel: 0.4, q: 0.5 });
    s.noise({ col: 'brown', dur: 1.3, vol: 0.4, atk: 0.1, sus: true, rel: 0.4, fl: { t: 'lowpass', f: 250 } });
  }),
  roar: rec(0.41, 1.2, 3, (s) => {
    s.voiced({ at: 0, dur: 2, f: [[0, 90], [0.15, 160], [0.5, 140], [1, 70]], v: [700, 1100, 2600], v2: [560, 950, 2400], vol: 1, rough: 40, breath: 1.2, shape: true, vib: [6, 45], atk: 0.08, rel: 0.7, q: 0.55 });
    s.noise({ dur: 2, vol: 0.3, atk: 0.1, sus: true, rel: 0.7, fl: { t: 'bandpass', f: 900, q: 0.5 }, jit: [0.03, 0.5, 1] });
    s.thud(0.05, 55, 0.5, 0.4);
  }),

  // ---- lamp ----
  lamp_buzz: rec(1.07, 0.8, 2, (s) => {
    s.tone({ type: 'sawtooth', f: 100, f2: 96, dur: 1, vol: 0.3, atk: 0.03, sus: true, rel: 0.3, fl: { t: 'lowpass', f: 1500, q: 3 }, jit: [0.03, 0.2, 1] });
    s.tone({ type: 'sawtooth', f: 300, dur: 1, vol: 0.08, atk: 0.03, sus: true, rel: 0.3, fl: { t: 'lowpass', f: 1800 }, jit: [0.04, 0.2, 1] });
    s.noise({ dur: 1, vol: 0.06, atk: 0.05, sus: true, rel: 0.3, fl: { t: 'highpass', f: 3500 }, jit: [0.03, 0.2, 1] });
  }),
  lamp_pop: rec(2.80, 0.9, 3, (s) => {
    s.click(0, 5200, 1, 0.006, 0.6);
    s.tone({ f: 2200, f2: 300, dur: 0.05, vol: 0.4 });
    s.tone({ at: 0.01, f: 3600, dur: 0.25, vol: 0.12 });
    s.tone({ at: 0.02, type: 'sawtooth', f: 110, f2: 40, dur: 0.2, vol: 0.15, fl: { t: 'lowpass', f: 800 } });
  }),

  // ---- air / cloth ----
  cloth_flutter: rec(2.25, 0.8, 1, (s) => {
    s.noise({ col: 'pink', dur: 0.9, vol: 0.5, atk: 0.1, sus: true, rel: 0.4, fl: { t: 'bandpass', f: 900, f2: 500, q: 0.5 }, amp: [[0, 0.3], [0.15, 1], [0.3, 0.35], [0.5, 0.9], [0.65, 0.3], [0.8, 0.7], [0.9, 0.1]] });
  }),
  wind_whoosh: rec(6.00, 1.2, 1, (s) => {
    s.noise({ col: 'pink', dur: 1.5, vol: 0.7, atk: 0.2, fl: { t: 'bandpass', f: 350, f2: 1300, q: 1.6 }, amp: [[0, 0], [0.6, 1], [1.5, 0]] });
    s.noise({ col: 'pink', dur: 1.5, vol: 0.15, atk: 0.2, fl: { t: 'bandpass', f: 1600, q: 8 }, amp: [[0, 0], [0.7, 1], [1.5, 0]] });
  }),

  // ---- toys ----
  music_box: rec(0.72, 1.3, 2, (s) => {
    const phr = pick([[0, 3, 7, 12, 10, 7, 3, 5, 2, 0], [7, 5, 3, 0, 3, 7, 12, 10, 8, 7], [0, 0, 7, 7, 8, 8, 7, 5, 5, 3, 3, 2, 2, 0]]);
    const base = semi(523.25, pick([0, 2, 5]));
    let at = 0;
    let step = 0.26;
    for (const n of phr) {
      s.tine(semi(base, n + (Math.random() < 0.1 ? -1 : 0)) * rnd(0.995, 1.005), at, 0.5);
      at += step * (1 + rnd(-0.1, 0.15));
      step *= 1.03;
    }
  }),
  jack_pop: rec(1.75, 1.0, 3, (s) => {
    s.click(0, 2500, 0.8, 0.012, 0.8);
    s.tone({ type: 'triangle', f: 140, f2: 600, dur: 0.12, vol: 0.5 });
    s.tone({ f: 200, f2: 900, dur: 0.28, vol: 0.5, vib: [16, 500] });
    s.tone({ at: 0.28, f: 900, f2: 350, dur: 0.5, vol: 0.35, vib: [14, 400] });
    s.rattle(0.05, 0.35, 10, 2000, 5000, 0.3);
    for (let i = 0; i < 3; i++) s.tone({ at: 0.1 + i * 0.07, f: rnd(1600, 2400), dur: 0.15, vol: 0.08 });
  }),
  giggle: rec(1.86, 1.1, 2, (s) => {
    const f = 620 * rnd(0.92, 1.1);
    let at = 0;
    const n = 5 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const up = i % 2 ? 1.2 : 1;
      s.voiced({ at, dur: i === n - 1 ? 0.14 : 0.075, f: [[0, f * up * rnd(0.95, 1.05)], [1, f * up * rnd(1.1, 1.3)]], v: V.i, v2: V.e, vol: 0.5, atk: 0.008, rel: 0.02, breath: 0.3 });
      at += rnd(0.085, 0.11);
    }
  }),
  doll_laugh: rec(1.42, 1.5, 3, (s) => {
    s.insert({ t: 'bandpass', f: 1700, q: 1.2 });
    const f = 470;
    for (let i = 0; i < 4; i++) {
      const m = 1 - 0.06 * i;
      for (const [d, vol] of [[1, 0.6], [1.02, 0.4]] as const) {
        s.voiced({ at: i * 0.34, dur: 0.22, f: [[0, f * m * d], [0.5, f * m * d * 1.05], [1, f * m * d * 0.9]], v: V.ae, v2: V.i, vol, vib: [6, 60], atk: 0.02, rel: 0.06, breath: 0.2 });
      }
    }
  }),
  rock_creak: rec(1.47, 1.1, 1, (s) => {
    s.creak(0, 0.5, 150, 0.5, { rough: 0.1, q: 8, bf: [500, 850] });
    s.creak(0.62, 0.5, 130, 0.45, { rough: 0.1, q: 8, bf: [800, 480], glide: -0.3 });
    s.tone({ at: 0.55, f: 200, f2: 120, dur: 0.06, vol: 0.25 });
  }),
  horse_neigh: rec(0.78, 1.2, 3, (s) => {
    s.voiced({ at: 0, dur: 0.9, f: [[0, 380], [0.2, 980], [0.4, 760], [0.55, 900], [0.75, 620], [1, 380]], v: [650, 1400, 2700], v2: [800, 1500, 2800], vol: 0.6, vib: [11, 90], breath: 0.5, shape: true, atk: 0.03, rel: 0.2 });
  }),
  bed_bounce: rec(1.08, 0.9, 2, (s) => {
    let at = 0;
    for (let i = 0; i < 4; i++) {
      const v = 1 - i * 0.2;
      s.thud(at, 100, 0.4 * v, 0.14, 0.6);
      s.tone({ at, f: 310 * rnd(0.9, 1.1), f2: 180, dur: 0.4, vol: 0.28 * v, vib: [22, 350] });
      s.rattle(at, 0.15, 6, 900, 2400, 0.12 * v);
      at += 0.27 - i * 0.03;
    }
  }),
  wardrobe_rattle: rec(0.98, 1.0, 2, (s) => {
    s.rattle(0, 1, 22, 220, 900, 0.6);
    s.creak(0.1, 0.8, 90, 0.35, { rough: 0.12, q: 7, bf: [300, 600] });
    for (const at of [0.25, 0.55]) s.tone({ at, f: 150, f2: 90, dur: 0.1, vol: 0.5 });
  }),

  // ---- kitchen ----
  fridge_hum: rec(0.77, 0.8, 1, (s) => {
    s.click(0, 300, 0.6, 0.03, 0.8);
    s.tone({ f: 60, dur: 1.8, vol: 0.4, atk: 0.15, sus: true, rel: 0.7, trem: [9, 0.35] });
    s.tone({ f: 120, dur: 1.8, vol: 0.25, atk: 0.15, sus: true, rel: 0.7 });
    s.tone({ type: 'sawtooth', f: 60, dur: 1.8, vol: 0.12, atk: 0.15, sus: true, rel: 0.7, fl: { t: 'lowpass', f: 260 } });
  }),
  fridge_open: rec(1.13, 0.9, 2, (s) => {
    s.noise({ dur: 0.18, vol: 0.6, atk: 0.01, fl: { t: 'bandpass', f: 180, f2: 900, q: 1 } });
    s.thud(0.12, 140, 0.3, 0.1);
    s.noise({ at: 0.1, dur: 0.25, vol: 0.15, atk: 0.02, fl: { t: 'highpass', f: 3500 } });
    s.partials(0.28, 2300, 0.08, 0.3, GLASS, 3);
  }),
  pot_bang: rec(0.88, 1.0, 2, (s) => {
    s.partials(0, rnd(380, 480), 0.5, 0.9, PAN);
    s.click(0, 2500, 0.4, 0.01);
    s.partials(0.17, rnd(520, 640), 0.3, 0.6, PAN);
  }),
  sizzle: rec(0.78, 0.7, 1, (s) => {
    s.noise({ dur: 1.4, vol: 0.5, atk: 0.04, sus: true, rel: 0.5, fl: [{ t: 'highpass', f: 3000 }, { t: 'bandpass', f: 6500, q: 0.5 }], jit: [0.012, 0.2, 1] });
    for (let i = 0; i < 10; i++) s.click(rnd(0, 1.2), rnd(2000, 6000), rnd(0.2, 0.5), 0.006);
  }),

  // ---- cellar ----
  bottle_clink: rec(1.54, 1.1, 1, (s) => {
    s.partials(0, rnd(2000, 2600), 0.3, 0.5, GLASS);
    s.click(0, 4800, 0.4, 0.006);
    s.partials(0.06, rnd(2400, 3100), 0.2, 0.4, GLASS, 3);
  }),
  bottle_pop: rec(2.42, 0.9, 2, (s) => {
    s.noise({ dur: 0.06, vol: 0.5, atk: 0.001, fl: { t: 'lowpass', f: 1800 } });
    s.tone({ f: 520, f2: 260, dur: 0.12, vol: 0.6, atk: 0.002 });
    s.noise({ at: 0.08, dur: 0.7, vol: 0.14, atk: 0.03, fl: { t: 'highpass', f: 6000 }, jit: [0.02, 0.3, 1] });
  }),
  furnace_roar: rec(0.88, 1.0, 3, (s) => {
    s.thud(0, 60, 0.6, 0.3, 0.5);
    s.noise({ col: 'brown', dur: 2.2, vol: 1, atk: 0.5, sus: true, rel: 0.9, fl: { t: 'lowpass', f: 300, f2: 160 } });
    s.tone({ f: 42, f2: 36, dur: 2.2, vol: 0.5, atk: 0.4, sus: true, rel: 0.9, trem: [7, 0.5] });
    s.noise({ col: 'pink', dur: 2.2, vol: 0.35, atk: 0.5, sus: true, rel: 0.9, fl: { t: 'bandpass', f: 400, q: 0.5 }, jit: [0.05, 0.4, 1] });
  }),
  steam_hiss: rec(0.91, 0.9, 1, (s) => {
    s.noise({ dur: 1.5, vol: 0.45, atk: 0.08, sus: true, rel: 0.6, fl: [{ t: 'highpass', f: 2800 }, { t: 'bandpass', f: 6000, q: 0.5 }], jit: [0.03, 0.6, 1] });
    s.tone({ f: 3100, f2: 2900, dur: 1.2, vol: 0.025, atk: 0.2, sus: true, rel: 0.4 });
  }),
  chain_rattle: rec(1.24, 1.1, 2, (s) => {
    for (let i = 0; i < 18; i++) {
      const u = Math.pow(Math.random(), 1.3);
      const f = rnd(900, 2600);
      const at = u * 1.2;
      s.partials(at, f, rnd(0.08, 0.2) * (1 - u * 0.5), rnd(0.08, 0.2), METAL, 3);
      s.click(at, f * 1.5, 0.15, 0.005);
    }
    s.thud(0.05, 120, 0.25, 0.1);
  }),

  // ---- the ghost's own voice ----
  whisper: rec(0.52, 1.6, 2, (s) => {
    const n = 6 + ((Math.random() * 4) | 0);
    s.whisper(0, n, 1);
    s.whisper(0.17, n, 0.45, 0.9);
  }),
  moan: rec(0.54, 1.4, 3, (s) => {
    s.voiced({ at: 0, dur: 1.8, f: [[0, 130], [0.25, 150], [0.7, 125], [1, 95]], v: V.o, v2: V.u, vol: 0.7, vib: [4.6, 45], breath: 0.5, atk: 0.35, rel: 0.6, fs: 0.95 });
    s.voiced({ at: 0, dur: 1.8, f: [[0, 131], [0.25, 151], [0.7, 126], [1, 96]], v: V.o, v2: V.u, vol: 0.5, vib: [4.9, 45], atk: 0.35, rel: 0.6, fs: 0.95 });
  }),
  wail: rec(0.74, 1.6, 3, (s) => {
    for (const [d, vol, at] of [[1, 0.6, 0], [1.012, 0.45, 0.05]] as const) {
      s.voiced({ at, dur: 2.6, f: [[0, 290 * d], [0.3, 540 * d], [0.55, 430 * d], [0.8, 520 * d], [1, 300 * d]], v: V.a, v2: V.o, vol, vib: [5.2, 90], breath: 0.4, atk: 0.3, rel: 0.9 });
    }
  }),
  heartbeat: rec(0.82, 0.6, 2, (s) => {
    let at = 0;
    let iv = 0.95;
    for (let i = 0; i < 3; i++) {
      s.tone({ at, f: 62, f2: 42, dur: 0.16, vol: 0.8 });
      s.noise({ col: 'brown', at, dur: 0.1, vol: 0.5, fl: { t: 'lowpass', f: 180 } });
      s.tone({ at: at + 0.17, f: 70, f2: 48, dur: 0.13, vol: 0.55 });
      at += iv;
      iv *= 0.92;
    }
  }),
  ghost_laugh: rec(0.79, 1.7, 3, (s) => {
    const n = 3 + ((Math.random() * 2) | 0);
    let f = 330 * rnd(0.95, 1.08);
    let at = 0;
    for (let i = 0; i < n; i++) {
      s.voiced({ at, dur: 0.26, f: [[0, f * 0.8], [0.45, f * 1.25], [1, f]], v: V.u, v2: V.o, vol: 0.7, vib: [7, 60], breath: 0.7, atk: 0.05, rel: 0.12 });
      s.voiced({ at, dur: 0.26, f: [[0, f * 0.806], [0.45, f * 1.26], [1, f * 1.008]], v: V.u, v2: V.o, vol: 0.4, vib: [6.5, 60], atk: 0.05, rel: 0.12 });
      at += 0.3;
      f *= 0.88;
    }
    s.noise({ dur: n * 0.3, vol: 0.04, atk: 0.1, sus: true, rel: 0.3, fl: { t: 'highpass', f: 3000 } });
  }),
  sting_low: rec(1.02, 1.2, 3, (s) => {
    for (const f of [55, 58.3, 77.8]) {
      s.tone({ type: 'sawtooth', f, f2: f * 0.87, dur: 1.8, vol: 0.5, atk: 0.02, fl: { t: 'lowpass', f: 1400, f2: 120, q: 2 } });
    }
    s.thud(0, 50, 0.7, 0.4, 0.5);
    s.noise({ col: 'brown', dur: 1.2, vol: 0.4, atk: 0.02, fl: { t: 'lowpass', f: 300 } });
  }),
  sting_high: rec(1.90, 1.2, 3, (s) => {
    s.tone({ type: 'sawtooth', f: 900, f2: 1600, dur: 0.2, vol: 0.18, atk: 0.01, fl: { t: 'lowpass', f: 4500 } });
    for (const f of [1480, 1568]) {
      s.tone({ at: 0.15, type: 'sawtooth', f, dur: 1.1, vol: 0.18, atk: 0.01, vib: [7, 45], fl: { t: 'lowpass', f: 4500 } });
    }
    s.noise({ at: 0.1, dur: 0.6, vol: 0.05, atk: 0.02, fl: { t: 'highpass', f: 6000 } });
  }),
  boing: rec(1.99, 0.9, 2, (s) => {
    s.tone({ type: 'triangle', f: 260, f2: 200, dur: 0.6, vol: 0.5, vib: [17, 650] });
    s.click(0, 1800, 0.25, 0.008);
  }),

  // ---- possession / ui ----
  possess_in: rec(2.63, 1.3, 2, (s) => {
    s.noise({ col: 'pink', dur: 0.42, vol: 0.5, atk: 0.12, fl: { t: 'bandpass', f: 500, f2: 2800, q: 1.1 }, amp: [[0, 0.2], [0.2, 1], [0.42, 0]] });
    s.tone({ f: 300, f2: 760, dur: 0.4, vol: 0.14, atk: 0.1, trem: [14, 0.4] });
    s.tone({ at: 0.2, f: 1500, f2: 2400, dur: 0.3, vol: 0.04 });
  }),
  possess_out: rec(3.26, 1.4, 2, (s) => {
    s.noise({ col: 'pink', dur: 0.5, vol: 0.5, atk: 0.06, fl: { t: 'bandpass', f: 2600, f2: 380, q: 1 }, amp: [[0, 0.3], [0.12, 1], [0.5, 0]] });
    s.tone({ f: 820, f2: 240, dur: 0.45, vol: 0.14, atk: 0.04 });
    for (let i = 0; i < 4; i++) s.tone({ at: rnd(0.2, 0.55), f: rnd(2000, 4000), dur: 0.2, vol: 0.05 });
  }),
  unlock: rec(1.05, 1.6, 3, (s) => {
    [0, 7, 12, 16, 19].forEach((n, i) => {
      const f = semi(220, n);
      s.tone({ at: i * 0.07, type: i % 2 ? 'sine' : 'triangle', f, dur: 2.6, vol: 0.13, atk: 0.12, sus: true, rel: 1.6, trem: [rnd(3, 5), 0.3] });
      s.tone({ at: i * 0.07, f: f * 1.004, dur: 2.6, vol: 0.08, atk: 0.12, sus: true, rel: 1.6 });
    });
    for (const n of [0, 7, 12, 16]) s.tone({ at: 0.3 + rnd(0, 0.5), f: semi(880, n), dur: 0.7, vol: 0.05, atk: 0.003 });
  }),
  ui_tick: rec(1.83, 0.3, 0, (s) => {
    s.tone({ f: 1900, f2: 1300, dur: 0.03, vol: 0.4, atk: 0.001 });
    s.click(0, 3500, 0.15, 0.004);
  }),
  door_slam: rec(1.67, 1.2, 3, (s) => {
    s.thud(0, 70, 1, 0.45, 0.45);
    s.noise({ col: 'pink', dur: 0.5, vol: 0.7, atk: 0.002, fl: { t: 'bandpass', f: 380, q: 0.8 } });
    s.noise({ dur: 0.04, vol: 0.6, atk: 0.001, fl: { t: 'highpass', f: 1500 } });
    s.rattle(0.1, 0.5, 12, 500, 1800, 0.25);
  }),
  thunder: rec(1.12, 1.4, 3, (s) => {
    s.noise({ dur: 0.18, vol: 0.9, atk: 0.002, fl: { t: 'highpass', f: 800 } });
    s.noise({ dur: 0.5, vol: 0.7, atk: 0.002, fl: { t: 'lowpass', f: 3000, f2: 400 } });
    s.noise({ col: 'brown', at: 0.12, dur: 4.2, vol: 1.1, atk: 0.15, fl: { t: 'lowpass', f: 500, f2: 90 }, amp: [[0, 1], [0.6, 0.5], [1.1, 0.95], [1.8, 0.4], [2.6, 0.7], [3.4, 0.2], [4.2, 0]] });
    s.tone({ at: 0.15, f: 44, f2: 34, dur: 3.8, vol: 0.4, atk: 0.3 });
  }),
};

// ------------------------------------------------------------ voice kinds ----

interface VoiceRec { g: number; p: number; fn: (s: Snd, pitch: number) => void }

const VOICES: Record<VoiceKind, VoiceRec> = {
  mumble: { g: 1, p: 0, fn: (s, p) => s.speech(0, 3 + ((Math.random() * 4) | 0), p, 0.35, clamp(Math.pow(p / 130, 0.3), 0.85, 1.35)) },
  hmm: {
    g: 1, p: 1, fn: (s, p) => {
      const fs = clamp(Math.pow(p / 130, 0.3), 0.85, 1.35);
      s.voiced({ at: 0, dur: 0.55, f: [[0, p * 0.95], [0.5, p * 1.1], [1, p * 0.98]], v: V.mm, vol: 0.4, vib: [5, 15], breath: 0.1, atk: 0.06, rel: 0.15, fs });
      if (Math.random() < 0.15) s.voiced({ at: 0.65, dur: 0.3, f: [[0, p * 1.0], [1, p * 1.12]], v: V.mm, vol: 0.3, atk: 0.04, rel: 0.1, fs });
    },
  },
  gasp: {
    g: 4, p: 1, fn: (s, p) => {
      s.noise({ dur: 0.22, vol: 0.6, atk: 0.03, fl: [{ t: 'bandpass', f: 700, f2: 2200, q: 1.1 }, { t: 'highpass', f: 400 }] });
      s.noise({ dur: 0.2, vol: 0.3, atk: 0.03, fl: { t: 'bandpass', f: 1100, f2: 2800, q: 2 } });
      s.voiced({ at: 0.18, dur: 0.07, f: [[0, p * 1.8], [1, p * 1.7]], v: V.a, vol: 0.15, atk: 0.01, rel: 0.03, breath: 0.4 });
    },
  },
  yelp: {
    g: 2, p: 2, fn: (s, p) => {
      s.voiced({ at: 0, dur: 0.16, f: [[0, p * 1.6], [0.35, p * 2.3], [1, p * 1.9]], v: V.ae, v2: V.a, vol: 0.5, atk: 0.008, rel: 0.05, breath: 0.1, vib: [9, 25] });
      if (Math.random() < 0.75) s.voiced({ at: 0.2, dur: 0.12, f: [[0, p * 2], [1, p * 2.4]], v: V.e, v2: V.ae, vol: 0.35, atk: 0.008, rel: 0.04, breath: 0.1 });
    },
  },
  scream: {
    g: 1.5, p: 3, fn: (s, p) => {
      const fs = clamp(Math.pow(p / 130, 0.3), 0.85, 1.35);
      const c = (m: number): number => Math.min(1100, p * m);
      const dur = rnd(0.75, 1);
      const contour = (m: number): [number, number][] => [[0, c(1.8 * m)], [0.12, c(2.9 * m)], [0.5, c(3.1 * m)], [1, c(2.3 * m)]];
      s.voiced({ at: 0, dur, f: contour(1), v: [900, 1300, 2900], v2: [800, 1200, 2800], vol: 0.45, vib: [6.2, 60], rough: 55, breath: 0.35, shape: true, atk: 0.04, rel: 0.25, fs, lp: 5500 });
      s.voiced({ at: 0, dur, f: contour(1.012), v: [900, 1300, 2900], v2: [800, 1200, 2800], vol: 0.27, vib: [5.6, 55], atk: 0.05, rel: 0.25, fs, lp: 5500 });
    },
  },
  whimper: {
    g: 1.1, p: 1, fn: (s, p) => {
      const fs = clamp(Math.pow(p / 130, 0.3), 0.85, 1.35);
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n; i++) {
        s.voiced({ at: i * 0.32, dur: 0.26, f: [[0, p * 1.7], [0.5, p * 1.5], [1, p * 1.25]], v: V.i, v2: V.u, vol: 0.3 - i * 0.05, vib: [8, 40], breath: 0.3, atk: 0.04, rel: 0.08, fs });
      }
    },
  },
  laugh: {
    g: 1.3, p: 1, fn: (s, p) => {
      const n = 3 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const m = 1 - 0.05 * i;
        const at = i * rnd(0.15, 0.18);
        s.noise({ at, dur: 0.03, vol: 0.2, atk: 0.005, fl: { t: 'bandpass', f: 1500, q: 1 } });
        s.voiced({ at: at + 0.02, dur: i === n - 1 ? 0.2 : 0.1, f: [[0, p * 1.3 * m], [1, p * 1.1 * m]], v: V.a, vol: 0.35 - i * 0.03, atk: 0.01, rel: 0.04, breath: 0.2 });
      }
    },
  },
  huff: {
    g: 4, p: 1, fn: (s, p) => {
      s.noise({ dur: 0.2, vol: 0.5, atk: 0.02, fl: { t: 'bandpass', f: 900, f2: 500, q: 0.9 } });
      s.voiced({ at: 0.02, dur: 0.12, f: [[0, p * 0.9], [1, p * 0.85]], v: V.a, vol: 0.08, atk: 0.02, rel: 0.05, breath: 0.2 });
    },
  },
};

// ------------------------------------------------------------------ loops ----

/** Continuous positional loop under construction. */
class LoopBuild {
  nodes: AudioNode[] = [];
  srcs: AudioScheduledSourceNode[] = [];
  tick?: (now: number, audible: boolean) => void;
  constructor(readonly k: Kit, readonly out: AudioNode, private readonly reap: (s: Snd) => void) {}

  gain(v: number): GainNode {
    const g = this.k.c.createGain();
    g.gain.value = v;
    this.nodes.push(g);
    return g;
  }
  filt(t: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
    const b = this.k.c.createBiquadFilter();
    b.type = t;
    b.frequency.value = f;
    b.Q.value = q;
    this.nodes.push(b);
    return b;
  }
  noise(col: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
    const s = this.k.c.createBufferSource();
    s.buffer = this.k[col];
    s.loop = true;
    s.start(0, Math.random() * 1.5);
    this.srcs.push(s);
    this.nodes.push(s);
    return s;
  }
  osc(type: OscillatorType, f: number): OscillatorNode {
    const o = this.k.c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start();
    this.srcs.push(o);
    this.nodes.push(o);
    return o;
  }
  snd(t: number): Snd { return new Snd(this.k, this.out, t); }
  done(s: Snd): void { this.reap(s); }
}

const LOOPS: Record<string, (L: LoopBuild) => void> = {
  fire: (L) => {
    const body = L.gain(0.55);
    L.noise('brown').connect(L.filt('lowpass', 480)).connect(body);
    body.connect(L.out);
    const hiss = L.gain(0.05);
    L.noise('white').connect(L.filt('bandpass', 3200, 0.6)).connect(hiss);
    hiss.connect(L.out);
    let nf = 0;
    let np = 0;
    L.tick = (now, aud) => {
      if (now >= nf) { nf = now + rnd(0.07, 0.22); body.gain.setTargetAtTime(rnd(0.3, 0.75), now, 0.06); }
      if (aud && now >= np) {
        np = now + rnd(0.04, 0.35);
        const s = L.snd(now + 0.01);
        s.click(0, rnd(1400, 5200), rnd(0.12, 0.5), rnd(0.006, 0.02), 1.2);
        if (Math.random() < 0.2) s.thud(0, rnd(200, 300), 0.1, 0.04, 0.5);
        L.done(s);
      }
    };
  },
  clock: (L) => {
    let next = 0;
    let flip = false;
    L.tick = (now, aud) => {
      if (next < now - 0.3 || !aud) next = Math.max(next, now);
      if (!aud) return;
      while (next < now + 0.1) {
        const s = L.snd(Math.max(next, now + 0.005));
        s.click(0, flip ? 1050 : 1500, 0.55, 0.014, 2.2);
        s.tone({ f: flip ? 310 : 430, f2: flip ? 240 : 330, dur: 0.07, vol: 0.35, atk: 0.001 });
        s.tone({ f: flip ? 1900 : 2600, dur: 0.03, vol: 0.08 });
        L.done(s);
        flip = !flip;
        next += 0.5 + rnd(-0.003, 0.003);
      }
    };
  },
  furnace: (L) => {
    const rum = L.gain(0.55);
    L.noise('brown').connect(L.filt('lowpass', 150)).connect(rum);
    rum.connect(L.out);
    const sg = L.gain(0.2);
    L.osc('sine', 41).connect(sg);
    sg.connect(L.out);
    const lg = L.gain(0.12);
    L.osc('sine', 0.35).connect(lg);
    lg.connect(sg.gain);
    const roar = L.gain(0.1);
    L.noise('pink').connect(L.filt('bandpass', 380, 0.5)).connect(roar);
    roar.connect(L.out);
    let nf = 0;
    let nw = 0;
    L.tick = (now) => {
      if (now >= nf) { nf = now + rnd(0.1, 0.3); roar.gain.setTargetAtTime(rnd(0.04, 0.2), now, 0.08); }
      if (now >= nw) {
        nw = now + rnd(6, 14);
        rum.gain.setTargetAtTime(0.8, now, 0.15);
        rum.gain.setTargetAtTime(0.55, now + 0.5, 0.6);
      }
    };
  },
  tv: (L) => {
    const h = L.gain(0.1);
    L.noise('white').connect(L.filt('bandpass', 4200, 0.35)).connect(h);
    h.connect(L.out);
    const h2 = L.gain(0.04);
    L.noise('white').connect(L.filt('highpass', 8000)).connect(h2);
    h2.connect(L.out);
    const bz = L.gain(0.03);
    L.osc('sawtooth', 50).connect(L.filt('lowpass', 300)).connect(bz);
    bz.connect(L.out);
    let nf = 0;
    L.tick = (now) => {
      if (now >= nf) { nf = now + rnd(0.05, 0.3); h.gain.setTargetAtTime(rnd(0.06, 0.12), now, 0.02); }
    };
  },
  fridge: (L) => {
    const mg = L.gain(1);
    mg.connect(L.out);
    for (const [type, f, g] of [['sine', 60, 0.5], ['sine', 120, 0.22]] as const) {
      const gn = L.gain(g);
      L.osc(type, f).connect(gn);
      gn.connect(mg);
    }
    const sg = L.gain(0.12);
    L.osc('sawtooth', 60).connect(L.filt('lowpass', 220)).connect(sg);
    sg.connect(mg);
    let nf = 0;
    let nc = 0;
    let on = true;
    L.tick = (now) => {
      if (now >= nc) {
        on = !on;
        nc = now + (on ? rnd(25, 50) : rnd(6, 10));
        mg.gain.setTargetAtTime(on ? 1 : 0.2, now, 0.8);
      } else if (on && now >= nf) {
        nf = now + rnd(0.6, 1.4);
        mg.gain.setTargetAtTime(rnd(0.8, 1), now, 0.4);
      }
    };
  },
  water: (L) => {
    const g1 = L.gain(0.5);
    L.noise('pink').connect(L.filt('bandpass', 1100, 0.8)).connect(g1);
    g1.connect(L.out);
    const g2 = L.gain(0.25);
    L.noise('white').connect(L.filt('highpass', 4800)).connect(g2);
    g2.connect(L.out);
    let nf = 0;
    L.tick = (now) => {
      if (now >= nf) {
        nf = now + rnd(0.05, 0.13);
        g1.gain.setTargetAtTime(rnd(0.3, 0.65), now, 0.03);
        g2.gain.setTargetAtTime(rnd(0.1, 0.3), now, 0.03);
      }
    };
  },
  drip: (L) => {
    let nd = -1;
    L.tick = (now, aud) => {
      if (nd < 0) nd = now + rnd(0.3, 2);
      if (aud && now >= nd) {
        nd = now + rnd(1.3, 3.8);
        const s = L.snd(now + 0.01);
        const f = rnd(800, 1500);
        s.tone({ f, f2: f * 2.1, dur: 0.1, vol: 0.5, atk: 0.003 });
        s.tone({ at: 0.26, f: f * 0.96, f2: f * 2, dur: 0.08, vol: 0.12 });
        L.done(s);
      } else if (now >= nd) {
        nd = now + rnd(1.3, 3.8);
      }
    };
  },
  hum: (L) => {
    const mg = L.gain(0.4);
    mg.connect(L.out);
    for (const [type, f, g] of [['sine', 110, 0.35], ['sine', 110.9, 0.3], ['sine', 55, 0.35], ['triangle', 165, 0.1]] as const) {
      const gn = L.gain(g);
      L.osc(type, f).connect(gn);
      gn.connect(mg);
    }
    const lg = L.gain(0.3);
    L.osc('sine', 0.13).connect(lg);
    lg.connect(mg.gain);
  },
};

// ------------------------------------------------------------ noise & IR ----

function makeNoise(c: BaseAudioContext, seconds: number, kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === 'white') {
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } else if (kind === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = clamp(last * 3.5, -1, 1);
    }
  }
  // seamless loop: short crossfade of the tail into the head
  const f = Math.min(Math.floor(c.sampleRate * 0.05), n >> 2);
  for (let i = 0; i < f; i++) {
    const u = i / f;
    d[i] = d[i] * u + d[n - f + i] * (1 - u);
  }
  return buf;
}

/** Roomy, wooden impulse response: early reflections + darkening exponential noise tail. */
function makeIR(c: BaseAudioContext): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.floor(sr * 2.6);
  const ir = c.createBuffer(2, len, sr);
  const taps = [0.011, 0.019, 0.027, 0.041, 0.057, 0.073];
  const amps = [0.8, 0.6, 0.5, 0.4, 0.3, 0.25];
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const k = 0.55 - 0.45 * Math.min(1, t / 1.8);
      lp += (Math.random() * 2 - 1 - lp) * k;
      d[i] = t < 0.012 ? 0 : lp * Math.exp(-t * 3) * 0.5;
    }
    taps.forEach((tp, j) => {
      const idx = Math.floor(tp * sr) + ch * 13;
      if (idx < len) d[idx] += amps[j] * (Math.random() < 0.5 ? -1 : 1);
    });
  }
  return ir;
}

function pianoWave(c: BaseAudioContext): PeriodicWave {
  const amps = [0, 1, 0.62, 0.38, 0.5, 0.22, 0.16, 0.1, 0.07, 0.05, 0.035, 0.025, 0.02];
  return c.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps));
}

function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 1024;
  const cv = new Float32Array(n);
  for (let i = 0; i < n; i++) cv[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 2.4);
  return cv;
}

// ------------------------------------------------------------ AudioManager ----

interface Spat { g: number; pan: number; lp: number; send: number }
interface Chain { out: GainNode; lp: BiquadFilterNode | null; pn: StereoPannerNode; send: GainNode; nodes: AudioNode[] }
interface Active { end: number; out: GainNode; prio: number }

class LoopImpl implements LoopHandle {
  built: { chain: Chain; srcs: AudioScheduledSourceNode[]; nodes: AudioNode[]; tick?: (now: number, audible: boolean) => void } | null = null;
  stopped = false;
  constructor(
    readonly id: string,
    public x: number,
    public y: number,
    public vol: number,
    private readonly onStop: (l: LoopImpl, fadeMs: number) => void,
  ) {}
  stop(fadeMs = 300): void {
    if (this.stopped) return;
    this.stopped = true;
    this.onStop(this, fadeMs);
  }
  setPos(x: number, y: number): void { this.x = x; this.y = y; }
  setVol(v: number): void { this.vol = v; }
}

interface AmbienceNodes {
  w1: GainNode; w1f: BiquadFilterNode; w2: GainNode; w3: GainNode;
  layers: { g: GainNode; base: number; thr: number }[];
  droneG: GainNode; droneLp: BiquadFilterNode; tremLfo: OscillatorNode; tremDepth: GainNode; tremBase: GainNode;
}

export class AudioManager implements IAudio {
  private c: AudioContext | null = null;
  private kit!: Kit;
  private master!: GainNode;
  private dry!: GainNode;
  private rin!: GainNode;
  private amb!: GainNode;
  private vol = 0.8;
  private mute = false;
  private lx = 2000;
  private ly = 900;
  private lfloor = 2;
  private active: Active[] = [];
  private reapQ: { t: number; nodes: AudioNode[] }[] = [];
  private lastPlay: Partial<Record<string, number>> = {};
  private loops = new Set<LoopImpl>();
  private acc = 0;
  private reapAcc = 0;
  private iTarget = 0;
  private iSm = 0;
  private ambWanted = false;
  private A: AmbienceNodes | null = null;
  private gustT = 0;
  private gustMul = 1;
  private creakT = rnd(4, 9);
  private whisperT = rnd(16, 34);
  private warned = new Set<string>();

  constructor() {
    try {
      const v = localStorage.getItem(VOL_KEY);
      if (v !== null && !Number.isNaN(parseFloat(v))) this.vol = clamp(parseFloat(v), 0, 1);
      this.mute = localStorage.getItem(MUTE_KEY) === '1';
    } catch { /* storage unavailable */ }
  }

  // ------------------------------------------------------------ settings ----

  get volume(): number { return this.vol; }
  get muted(): boolean { return this.mute; }
  set muted(m: boolean) {
    this.mute = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
    this.applyMaster();
  }

  setVolume(v: number): void {
    this.vol = clamp(Number.isFinite(v) ? v : 0, 0, 1);
    try { localStorage.setItem(VOL_KEY, String(this.vol)); } catch { /* ignore */ }
    this.applyMaster();
  }

  private applyMaster(): void {
    if (!this.c) return;
    this.master.gain.setTargetAtTime(this.mute ? 0 : MASTER_PEAK * this.vol * this.vol, this.c.currentTime, 0.03);
  }

  // ----------------------------------------------------------- lifecycle ----

  resume(): void {
    if (!this.c) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.c = new Ctor({ latencyHint: 'interactive' });
        this.build();
      } catch {
        this.c = null;
        return;
      }
    }
    if (this.c.state !== 'running') void this.c.resume().catch(() => undefined);
  }

  private build(): void {
    const c = this.c!;
    this.master = c.createGain();
    this.master.gain.value = this.mute ? 0 : MASTER_PEAK * this.vol * this.vol;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;
    this.master.connect(comp);
    comp.connect(c.destination);

    this.dry = c.createGain();
    this.dry.connect(this.master);

    const conv = c.createConvolver();
    conv.buffer = makeIR(c);
    this.rin = c.createGain();
    const wetLp = c.createBiquadFilter();
    wetLp.type = 'lowpass';
    wetLp.frequency.value = 5500;
    const wet = c.createGain();
    wet.gain.value = 0.5;
    this.rin.connect(conv);
    conv.connect(wetLp);
    wetLp.connect(wet);
    wet.connect(this.master);

    this.amb = c.createGain();
    this.amb.connect(this.dry);
    const ambSend = c.createGain();
    ambSend.gain.value = 0.2;
    this.amb.connect(ambSend);
    ambSend.connect(this.rin);

    this.kit = {
      c,
      white: makeNoise(c, 2.5, 'white'),
      pink: makeNoise(c, 4, 'pink'),
      brown: makeNoise(c, 4, 'brown'),
      curve: softClipCurve(),
      piano: pianoWave(c),
    };

    for (const l of this.loops) if (!l.built && !l.stopped) this.startLoop(l);
    if (this.ambWanted) this.buildAmbience();
  }

  setListener(x: number, y: number, floor: FloorId | null): void {
    this.lx = x;
    this.ly = y;
    this.lfloor = floor ? FLOOR_ORDER.indexOf(floor) : floorIdxAt(y);
  }

  setIntensity(v: number): void { this.iTarget = clamp(Number.isFinite(v) ? v : 0, 0, 1); }

  startAmbience(): void {
    this.ambWanted = true;
    if (this.c) this.buildAmbience();
  }

  // ---------------------------------------------------------- positional ----

  private spatial(x: number | undefined, y: number | undefined, ui: boolean | undefined, pan: number | undefined): Spat | null {
    if (ui || x === undefined) return { g: 1, pan: pan ?? 0, lp: 20000, send: 0.22 };
    const yy = y ?? this.ly;
    const dx = x - this.lx;
    const dist = Math.hypot(dx, (yy - this.ly) * 0.4);
    const sep = Math.abs(floorIdxAt(yy) - this.lfloor);
    const g = (1 / (1 + Math.pow(dist / HALF_DIST, 1.6))) * Math.pow(FLOOR_GAIN, sep);
    if (g < 0.012) return null;
    return {
      g,
      pan: pan ?? clamp(dx / PAN_RANGE, -1, 1) * 0.9,
      lp: clamp(18000 / (1 + dist / 320 + sep * 2.2), 650, 18000),
      send: clamp(0.16 + (1 - g) * 0.35, 0.16, 0.5),
    };
  }

  private chain(sp: Spat, vol: number, wet: number, forceLp = false): Chain {
    const c = this.c!;
    const nodes: AudioNode[] = [];
    const out = c.createGain();
    out.gain.value = vol * sp.g;
    nodes.push(out);
    let head: AudioNode = out;
    let lp: BiquadFilterNode | null = null;
    if (sp.lp < 19000 || forceLp) {
      lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = sp.lp;
      lp.Q.value = 0.5;
      head.connect(lp);
      head = lp;
      nodes.push(lp);
    }
    const pn = c.createStereoPanner();
    pn.pan.value = sp.pan;
    head.connect(pn);
    pn.connect(this.dry);
    const send = c.createGain();
    send.gain.value = sp.send * wet;
    pn.connect(send);
    send.connect(this.rin);
    nodes.push(pn, send);
    return { out, lp, pn, send, nodes };
  }

  // ------------------------------------------------------------- one-shots ----

  private ready(): AudioContext | null {
    const c = this.c;
    return c && c.state === 'running' ? c : null;
  }

  private prune(now: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) if (this.active[i].end < now) this.active.splice(i, 1);
  }

  /** Free a voice slot by fading out the oldest sound of equal-or-lower priority. */
  private steal(prio: number, now: number): boolean {
    let best = -1;
    for (let i = 0; i < this.active.length; i++) {
      const a = this.active[i];
      if (a.prio > prio) continue;
      if (best < 0 || a.prio < this.active[best].prio || (a.prio === this.active[best].prio && a.end < this.active[best].end)) best = i;
    }
    if (best < 0) return false;
    const a = this.active[best];
    a.out.gain.cancelScheduledValues(now);
    a.out.gain.setTargetAtTime(0, now, 0.02);
    this.active.splice(best, 1);
    return true;
  }

  private trigger(sp: Spat, vol: number, prio: number, rate: number, wet: number, label: string, fn: (s: Snd) => void, detune = 0.03): void {
    const c = this.c!;
    const now = c.currentTime;
    this.prune(now);
    if (this.active.length >= MAX_VOICES && !this.steal(prio, now)) return;
    const ch = this.chain(sp, vol, wet);
    const s = new Snd(this.kit, ch.out, now + 0.01, rate * (1 + rnd(-detune, detune)), rate);
    try {
      fn(s);
    } catch (err) {
      if (!this.warned.has(label)) { this.warned.add(label); console.warn('[hollowmere audio] recipe failed:', label, err); }
    }
    const end = s.end + 0.15;
    this.active.push({ end, out: ch.out, prio });
    this.reapQ.push({ t: end + 0.05, nodes: [...s.nodes, ...ch.nodes] });
  }

  play(id: SfxId, o: PlayOpts = {}): void {
    const c = this.ready();
    if (!c) return;
    const r = RECIPES[id];
    if (!r) return;
    const now = c.currentTime;
    const last = this.lastPlay[id];
    if (last !== undefined && now - last < 0.03) return;
    const sp = this.spatial(o.x, o.y, o.ui, o.pan);
    if (!sp) return;
    this.lastPlay[id] = now;
    this.trigger(sp, (o.vol ?? 1) * r.g, r.p, clamp(o.rate ?? 1, 0.4, 2.5), r.w, id, r.fn);
  }

  voice(kind: VoiceKind, pitch: number, x: number, y: number, vol = 1): void {
    if (!this.ready()) return;
    const r = VOICES[kind];
    if (!r) return;
    const sp = this.spatial(x, y, false, undefined);
    if (!sp) return;
    this.trigger(sp, vol * r.g, r.p, 1, 1.1, `voice:${kind}`, (s) => r.fn(s, clamp(pitch, 60, 600)), 0.015);
  }

  footstep(x: number, y: number, weight: number, running: boolean): void {
    if (!this.ready()) return;
    const sp = this.spatial(x, y, false, undefined);
    if (!sp) return;
    const w = clamp(weight, 0.3, 1.8);
    this.trigger(sp, (0.35 + 0.3 * w) * (running ? 1.3 : 1) * 2.5, 0, 1, 0.8, 'footstep', (s) => {
      const f = 125 / (0.6 + 0.4 * w);
      s.tone({ f, f2: f * 0.55, dur: running ? 0.09 : 0.13, vol: 0.55, atk: 0.002 });
      s.noise({ col: 'brown', dur: 0.07, vol: 0.5, atk: 0.002, fl: { t: 'lowpass', f: 500 } });
      s.click(0.004, rnd(1100, 1900), running ? 0.38 : 0.26, 0.012, 1.4);
      s.tone({ f: rnd(190, 260), dur: 0.07, vol: 0.12, atk: 0.001 });
      if (running) s.noise({ at: 0.02, dur: 0.03, vol: 0.12, atk: 0.002, fl: { t: 'bandpass', f: 2500, q: 1 } });
    }, 0.08);
  }

  // ----------------------------------------------------------------- loops ----

  loop(id: string, x: number, y: number, vol = 1): LoopHandle {
    const l = new LoopImpl(id, x, y, vol, (loop, fade) => this.endLoop(loop, fade));
    this.loops.add(l);
    if (this.c) this.startLoop(l);
    return l;
  }

  private startLoop(l: LoopImpl): void {
    const c = this.c!;
    const build = LOOPS[l.id] ?? LOOPS.hum;
    const sp: Spat = this.spatial(l.x, l.y, false, undefined) ?? { g: 0, pan: 0, lp: 650, send: 0.16 };
    const ch = this.chain(sp, l.vol, 1, true);
    const b = new LoopBuild(this.kit, ch.out, (s) => this.reapQ.push({ t: s.end + 0.2, nodes: s.nodes }));
    try {
      build(b);
    } catch (err) {
      if (!this.warned.has(l.id)) { this.warned.add(l.id); console.warn('[hollowmere audio] loop failed:', l.id, err); }
    }
    ch.out.gain.value = 0;
    ch.out.gain.setTargetAtTime(l.vol * sp.g, c.currentTime, 0.15);
    l.built = { chain: ch, srcs: b.srcs, nodes: b.nodes, tick: b.tick };
  }

  private endLoop(l: LoopImpl, fadeMs: number): void {
    this.loops.delete(l);
    const c = this.c;
    const b = l.built;
    if (!c || !b) return;
    const now = c.currentTime;
    const fade = Math.max(0.02, fadeMs / 1000);
    b.chain.out.gain.cancelScheduledValues(now);
    b.chain.out.gain.setTargetAtTime(0, now, fade / 3);
    for (const s of b.srcs) { try { s.stop(now + fade + 0.1); } catch { /* already stopped */ } }
    this.reapQ.push({ t: now + fade + 0.4, nodes: [...b.nodes, ...b.chain.nodes] });
    l.built = null;
  }

  private refreshLoops(now: number): void {
    for (const l of this.loops) {
      const b = l.built;
      if (!b) continue;
      const sp = this.spatial(l.x, l.y, false, undefined);
      const ch = b.chain;
      ch.out.gain.setTargetAtTime(sp ? l.vol * sp.g : 0, now, 0.08);
      if (sp) {
        ch.pn.pan.setTargetAtTime(sp.pan, now, 0.08);
        ch.send.gain.setTargetAtTime(sp.send, now, 0.08);
        if (ch.lp) ch.lp.frequency.setTargetAtTime(sp.lp, now, 0.08);
      }
      b.tick?.(now, !!sp);
    }
  }

  // --------------------------------------------------------------- ambience ----

  private buildAmbience(): void {
    if (this.A || !this.c) return;
    const c = this.c;
    const k = this.kit;
    const bus = c.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, c.currentTime, 1.2);
    bus.connect(this.amb);

    const noiseSrc = (col: 'pink' | 'brown'): AudioBufferSourceNode => {
      const s = c.createBufferSource();
      s.buffer = k[col];
      s.loop = true;
      s.start(0, Math.random() * 2);
      return s;
    };
    const filt = (t: BiquadFilterType, f: number, q: number): BiquadFilterNode => {
      const b = c.createBiquadFilter();
      b.type = t;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const panner = (p: number): StereoPannerNode => {
      const n = c.createStereoPanner();
      n.pan.value = p;
      n.connect(bus);
      return n;
    };

    // wind: two filtered pink layers (low howl, thin whistle) panned apart + a low body
    const w1f = filt('bandpass', 380, 1.4);
    const w1 = c.createGain();
    w1.gain.value = 0.03;
    noiseSrc('pink').connect(w1f).connect(w1).connect(panner(-0.5));
    const w2 = c.createGain();
    w2.gain.value = 0.004;
    noiseSrc('pink').connect(filt('bandpass', 1100, 5)).connect(w2).connect(panner(0.5));
    const w3 = c.createGain();
    w3.gain.value = 0.05;
    noiseSrc('brown').connect(filt('lowpass', 160, 0.7)).connect(w3).connect(panner(0));

    // drone: dissonant layers that open up with intensity, behind a shared tremolo + lowpass
    const droneLp = filt('lowpass', 180, 0.8);
    const tremBase = c.createGain();
    tremBase.gain.value = 0.9;
    const tremLfo = c.createOscillator();
    tremLfo.frequency.value = 0.25;
    const tremDepth = c.createGain();
    tremDepth.gain.value = 0.08;
    tremLfo.connect(tremDepth);
    tremDepth.connect(tremBase.gain);
    tremLfo.start();
    const droneG = c.createGain();
    droneG.gain.value = 0.05;
    droneLp.connect(tremBase);
    tremBase.connect(droneG);
    droneG.connect(bus);
    const layerDefs: [OscillatorType, number, number, number][] = [
      ['sine', 55, 0.55, -1], ['triangle', 110, 0.18, -1], ['sine', 58.27, 0.5, 0.12], ['triangle', 77.78, 0.35, 0.32],
      ['sawtooth', 233.1, 0.07, 0.5], ['sawtooth', 246.9, 0.06, 0.5], ['sine', 1108.7, 0.012, 0.72], ['sine', 1174.7, 0.008, 0.78],
    ];
    const layers = layerDefs.map(([type, f, base, thr]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = thr < 0 ? base : 0;
      o.connect(g);
      g.connect(droneLp);
      o.start();
      return { g, base, thr };
    });

    this.A = { w1, w1f, w2, w3, layers, droneG, droneLp, tremLfo, tremDepth, tremBase };
  }

  private updateAmbience(now: number, step: number): void {
    const A = this.A;
    if (!A) return;
    const v = this.iSm;
    this.gustT -= step;
    if (this.gustT <= 0) {
      this.gustT = rnd(2.5, 7);
      this.gustMul = rnd(0.35, 1.7);
    }
    A.w1.gain.setTargetAtTime((0.035 + 0.06 * v) * this.gustMul, now, 1.2);
    A.w1f.frequency.setTargetAtTime(320 + 180 * this.gustMul, now, 1.5);
    A.w2.gain.setTargetAtTime((0.004 + 0.03 * v * v) * this.gustMul, now, 1.2);
    A.w3.gain.setTargetAtTime(0.04 + 0.05 * v, now, 1.5);
    A.droneG.gain.setTargetAtTime(0.05 + 0.12 * v, now, 0.6);
    A.droneLp.frequency.setTargetAtTime(180 + 520 * v, now, 0.6);
    A.tremLfo.frequency.setTargetAtTime(0.25 + 2.4 * v, now, 0.6);
    A.tremDepth.gain.setTargetAtTime(0.08 + 0.3 * v, now, 0.6);
    for (const l of A.layers) if (l.thr >= 0) l.g.gain.setTargetAtTime(l.base * smooth(l.thr, l.thr + 0.25, v), now, 0.8);

    this.creakT -= step;
    if (this.creakT <= 0) {
      this.creakT = rnd(7, 20) / (1 + 1.5 * v);
      const roll = Math.random();
      const id: SfxId = roll < 0.12 ? 'thump' : roll > 0.82 && v > 0.3 ? 'creak_loud' : 'creak_soft';
      const side = Math.random() < 0.5 ? -1 : 1;
      this.play(id, { x: this.lx + side * rnd(400, 1600), y: this.ly + rnd(-300, 300), vol: id === 'thump' ? 0.35 : rnd(0.35, 0.8) });
    }
    if (v > 0.55) {
      this.whisperT -= step;
      if (this.whisperT <= 0) {
        this.whisperT = rnd(14, 38) / (0.6 + v);
        this.play('whisper', { x: this.lx + rnd(-700, 700), y: this.ly + rnd(-120, 120), vol: 0.4 + 0.3 * v });
      }
    }
  }

  // ----------------------------------------------------------------- update ----

  update(dt: number): void {
    const c = this.c;
    if (!c || c.state !== 'running') return;
    this.acc += dt;
    if (this.acc < 0.05) return;
    const step = Math.min(this.acc, 0.5);
    this.acc = 0;
    const now = c.currentTime;
    this.iSm += (this.iTarget - this.iSm) * (1 - Math.exp(-step * 1.2));
    this.reapAcc += step;
    if (this.reapAcc > 0.4) { this.reapAcc = 0; this.flush(now); }
    this.refreshLoops(now);
    this.updateAmbience(now, step);
  }

  /** Disconnect nodes of finished sounds so the graph never accumulates. */
  private flush(now: number): void {
    for (let i = this.reapQ.length - 1; i >= 0; i--) {
      const q = this.reapQ[i];
      if (q.t >= now) continue;
      for (const n of q.nodes) { try { n.disconnect(); } catch { /* already gone */ } }
      this.reapQ.splice(i, 1);
    }
  }
}
