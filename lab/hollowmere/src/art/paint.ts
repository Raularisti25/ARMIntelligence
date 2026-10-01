// Procedural painting helpers. Every texture in Hollowmere is drawn here at
// boot onto a canvas at ART× resolution, then displayed at 1/ART scale.
// Module A may ADD helpers; never change existing signatures.

import Phaser from 'phaser';
import { ART } from '../config';

export type Ctx2D = CanvasRenderingContext2D;
export type DrawFn = (g: Ctx2D, w: number, h: number) => void;

const MAX_TEX = 4096; // keep under common GPU limits (w*ART and h*ART)

/**
 * Paint a texture of w×h WORLD units under `key`. `draw` receives a context
 * already scaled by ART, so draw in world units. No-op if the key exists.
 */
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: DrawFn): string {
  if (scene.textures.exists(key)) return key;
  const pw = Math.max(1, Math.ceil(w * ART));
  const ph = Math.max(1, Math.ceil(h * ART));
  if (pw > MAX_TEX || ph > MAX_TEX) {
    console.warn(`[paint] ${key} is ${pw}x${ph}px — split it (max ${MAX_TEX})`);
  }
  const tex = scene.textures.createCanvas(key, pw, ph);
  if (!tex) throw new Error(`createCanvas failed for ${key}`);
  const g = tex.getContext();
  g.save();
  g.scale(ART, ART);
  g.imageSmoothingEnabled = true;
  draw(g, w, h);
  g.restore();
  tex.refresh();
  return key;
}

/** Add an image displayed at world size (scale 1/ART). */
export function img(
  scene: Phaser.Scene, x: number, y: number, key: string,
  originX = 0.5, originY = 0.5, depth?: number,
): Phaser.GameObjects.Image {
  const im = scene.add.image(x, y, key).setOrigin(originX, originY).setScale(1 / ART);
  if (depth !== undefined) im.setDepth(depth);
  return im;
}

/** TileSprite in world units (texture painted at ART×). */
export function tile(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: string, depth?: number,
): Phaser.GameObjects.TileSprite {
  const t = scene.add.tileSprite(x, y, w * ART, h * ART, key).setOrigin(0, 0).setScale(1 / ART);
  if (depth !== undefined) t.setDepth(depth);
  return t;
}

// ------------------------------------------------------------------ color ----

export function hex(c: number): string {
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
}
export function rgba(c: number, a = 1): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}
/** Lighten (amt>0) or darken (amt<0) by amt in -1..1. */
export function shade(c: number, amt: number): number {
  const f = (v: number) => {
    const n = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(n)));
  };
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}
export function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Linear gradient from stops [[offset, color, alpha?], ...]. */
export function lin(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: [number, number, number?][]): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c, a] of stops) gr.addColorStop(o, rgba(c, a ?? 1));
  return gr;
}
export function rad(g: Ctx2D, x: number, y: number, r0: number, r1: number, stops: [number, number, number?][]): CanvasGradient {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c, a] of stops) gr.addColorStop(o, rgba(c, a ?? 1));
  return gr;
}

// ----------------------------------------------------------------- shapes ----

export function rrect(g: Ctx2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]): void {
  const [a, b, c, d] = typeof r === 'number' ? [r, r, r, r] : r;
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y);
  g.quadraticCurveTo(x + w, y, x + w, y + b);
  g.lineTo(x + w, y + h - c);
  g.quadraticCurveTo(x + w, y + h, x + w - c, y + h);
  g.lineTo(x + d, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - d);
  g.lineTo(x, y + a);
  g.quadraticCurveTo(x, y, x + a, y);
  g.closePath();
}
export function ellipse(g: Ctx2D, cx: number, cy: number, rx: number, ry: number): void {
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
}
export function poly(g: Ctx2D, pts: [number, number][]): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
/** Fill current path with color/gradient, optional stroke. */
export function fill(g: Ctx2D, style: string | CanvasGradient, stroke?: string, lw = 1): void {
  g.fillStyle = style;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}

/** Soft ambient-occlusion shadow ellipse (contact shadow under furniture). */
export function contactShadow(g: Ctx2D, cx: number, cy: number, rx: number, ry: number, a = 0.35): void {
  g.save();
  g.fillStyle = rad(g, cx, cy, 0, rx, [[0, 0x000000, a], [1, 0x000000, 0]]);
  g.translate(cx, cy);
  g.scale(1, ry / rx);
  g.translate(-cx, -cy);
  g.beginPath();
  g.arc(cx, cy, rx, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Soft inner rim light / top highlight band on a rect (for volume). */
export function rimLight(g: Ctx2D, x: number, y: number, w: number, h: number, a = 0.18): void {
  g.fillStyle = lin(g, x, y, x, y + h, [[0, 0xffffff, a], [0.25, 0xffffff, 0], [0.8, 0x000000, 0], [1, 0x000000, a * 1.2]]);
  g.fillRect(x, y, w, h);
}

// ------------------------------------------------------------------ noise ----

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sprinkle tiny specks for painterly texture. */
export function speckle(g: Ctx2D, x: number, y: number, w: number, h: number, count: number, color: number, alpha: number, seed = 1, size = 1.2): void {
  const r = rng(seed);
  g.fillStyle = rgba(color, alpha);
  for (let i = 0; i < count; i++) {
    const s = size * (0.4 + r());
    g.fillRect(x + r() * w, y + r() * h, s, s);
  }
}

/** Horizontal wood-grain streaks across a rect. */
export function woodGrain(g: Ctx2D, x: number, y: number, w: number, h: number, base: number, seed = 7, lines = 18): void {
  g.fillStyle = hex(base);
  g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < lines; i++) {
    const yy = y + r() * h;
    g.strokeStyle = rgba(shade(base, r() < 0.5 ? -0.25 : 0.15), 0.25 + r() * 0.25);
    g.lineWidth = 0.6 + r() * 1.2;
    g.beginPath();
    g.moveTo(x, yy);
    const segs = 6;
    for (let s = 1; s <= segs; s++) g.lineTo(x + (w * s) / segs, yy + (r() - 0.5) * 3);
    g.stroke();
  }
}

/** Vertical clipping helper: run fn with the current path as a clip. */
export function clipped(g: Ctx2D, path: () => void, fn: () => void): void {
  g.save();
  path();
  g.clip();
  fn();
  g.restore();
}

// ---------------------------------------------------------------- palette ----

/** Shared palette so every module's art reads as one world. */
export const PAL = {
  ink: 0x1a1426, // outlines / deepest shadow (warm violet-black, never pure black)
  night: 0x141a33,
  nightDeep: 0x0b0f22,
  moon: 0xf3ecd2,
  moonGlow: 0xbfd4ff,
  wallWarm: 0x7a4e3a,
  wood: 0x6b4127,
  woodDark: 0x43271a,
  woodLight: 0x9a6a43,
  brass: 0xd6a85a,
  gold: 0xe8c372,
  cream: 0xf1e3c6,
  candle: 0xffc66b,
  ghost: 0xe9fbff,
  ghostCyan: 0x9fe8ff,
  ecto: 0x8ff5d2,
  violet: 0x9b7bff,
  blood: 0x8a2335, // used sparingly (cute-eerie, not gore)
  stone: 0x5d5a66,
  brick: 0x6e3f35,
  green: 0x3f6b4a,
  teal: 0x2f6a6f,
  rose: 0xc77d8a,
};

export const FONT_TITLE = '"Iowan Old Style", Palatino, Georgia, serif';
export const FONT_UI = '-apple-system, "SF Pro Text", system-ui, sans-serif';

// ------------------------------------------------- module A (world art) ----

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * Paint a soft / distant texture at `res` pixels per WORLD unit (not ART).
 * Display it at scale 1/res. Used for backdrops, glows and overlays so big
 * low-detail layers stay far under the GPU texture limit.
 */
export function softTex(scene: Phaser.Scene, key: string, w: number, h: number, res: number, draw: DrawFn): string {
  if (scene.textures.exists(key)) return key;
  const pw = Math.max(1, Math.ceil(w * res));
  const ph = Math.max(1, Math.ceil(h * res));
  const tex = scene.textures.createCanvas(key, pw, ph);
  if (!tex) throw new Error(`createCanvas failed for ${key}`);
  const g = tex.getContext();
  g.save();
  g.scale(res, res);
  g.imageSmoothingEnabled = true;
  draw(g, w, h);
  g.restore();
  tex.refresh();
  return key;
}

/** Stroke a polyline (open path). */
export function polyline(g: Ctx2D, pts: [number, number][]): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
}

/** Point-in-polygon (even-odd). */
export function inPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Fish-scale / scallop shingle rows filling a rect (used by roofs, spires). */
export function shingles(g: Ctx2D, x: number, y: number, w: number, h: number, sw: number, sh: number, base: number, seed = 3): void {
  const r = rng(seed);
  const rows = Math.ceil(h / (sh * 0.5)) + 1;
  for (let row = rows; row >= 0; row--) {
    const yy = y + row * sh * 0.5;
    const off = row % 2 ? sw / 2 : 0;
    for (let cx = x - sw; cx < x + w + sw; cx += sw) {
      const c = shade(base, (r() - 0.5) * 0.22);
      g.fillStyle = hex(c);
      g.beginPath();
      g.moveTo(cx + off, yy);
      g.lineTo(cx + off + sw, yy);
      g.lineTo(cx + off + sw, yy + sh * 0.45);
      g.quadraticCurveTo(cx + off + sw * 0.5, yy + sh * 1.15, cx + off, yy + sh * 0.45);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.45);
      g.lineWidth = 0.7;
      g.stroke();
      g.strokeStyle = rgba(0xffffff, 0.1);
      g.beginPath();
      g.moveTo(cx + off + 1, yy + sh * 0.3);
      g.quadraticCurveTo(cx + off + sw * 0.5, yy + sh * 0.95, cx + off + sw - 1, yy + sh * 0.3);
      g.stroke();
    }
  }
}
