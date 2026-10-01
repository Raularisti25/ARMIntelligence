// Object-art kit: spec registry + shared painting helpers (split out of objectArt.ts
// so objects/artUpper.ts and objects/artLower.ts can be authored in parallel).
// Object art for Hollowmere's 29 hauntables + thrown props, painted procedurally.
//
// Every object is a list of PARTS ('obj:<id>:<part>'). Each part is painted in
// the OBJECT'S ANCHOR COORDINATES (floor/table objects: x centered, y negative
// upward from the feet; wall objects: centered on 0,0; ceiling objects: y
// positive downward from the mount), so a whole object can be authored as one
// drawing and split into separately animatable layers. A part may declare a
// pivot (hinge / neck / top of a pendulum) which becomes its sprite origin.

import {
  canvasTex, clipped, contactShadow, ellipse, fill, hex, lin, mix, PAL, poly, rad, rgba, rng, rrect, shade, speckle,
} from './paint';
import type { Ctx2D } from './paint';
import type { ObjectPart } from '../types';

// ------------------------------------------------------------------ specs ----

export interface PartSpec {
  name: string;
  box: [number, number, number, number]; // l, t, w, h in anchor coords
  pivot?: [number, number]; // anchor coords; becomes origin + position
  depth?: number;
  alpha?: number;
  /** Painted for `frames` fx only — not added as a part. */
  extra?: boolean;
  draw: (g: Ctx2D) => void;
}

export const SPECS = new Map<string, PartSpec[]>();

export function P(name: string, box: PartSpec['box'], draw: PartSpec['draw'], o: Partial<PartSpec> = {}): PartSpec {
  return { name, box, draw, ...o };
}
export function def(id: string, ...parts: PartSpec[]): void {
  SPECS.set(id, parts);
}

export const texKey = (id: string, name: string): string => `obj:${id}:${name}`;

/** Parts painted with additive blending (glows, flames, embers, eyes). */
export const ADDITIVE_PART = /^(glow|fire|flame|embers|eyes|gfire|beam)/;

/** Parts (ObjectPart[]) for ObjectDef.parts, geometry derived from the painted boxes. */
export function partsFor(id: string): ObjectPart[] {
  const specs = SPECS.get(id);
  if (!specs) throw new Error(`[objectArt] unknown object ${id}`);
  return specs.filter((s) => !s.extra).map((s) => {
    const [l, t, w, h] = s.box;
    const part: ObjectPart = { name: s.name, tex: texKey(id, s.name), x: l, y: t, originX: 0, originY: 0 };
    if (s.pivot) {
      part.x = s.pivot[0];
      part.y = s.pivot[1];
      part.originX = (s.pivot[0] - l) / w;
      part.originY = (s.pivot[1] - t) / h;
    }
    if (s.depth !== undefined) part.depthOffset = s.depth;
    if (s.alpha !== undefined) part.alpha = s.alpha;
    return part;
  });
}

export const HL = new Map<string, { key: string; l: number; t: number }>();
/** Union silhouette texture used for the proximity glow (top-left in anchor coords). */
export function highlightOf(id: string): { key: string; l: number; t: number } | undefined {
  return HL.get(id);
}

// ---------------------------------------------------------------- helpers ----

export const INK = (a = 0.82): string => rgba(PAL.ink, a);
export const W = PAL;

export function vgrad(g: Ctx2D, y0: number, y1: number, c: number, up = 0.16, dn = -0.22): CanvasGradient {
  return lin(g, 0, y0, 0, y1, [[0, shade(c, up)], [1, shade(c, dn)]]);
}
export function hgrad(g: Ctx2D, x0: number, x1: number, c: number, l = 0.2, r = -0.22): CanvasGradient {
  return lin(g, x0, 0, x1, 0, [[0, shade(c, l)], [1, shade(c, r)]]);
}
/** Rounded slab, vertical-gradient fill, ink outline. */
export function slab(g: Ctx2D, x: number, y: number, w: number, h: number, r: number, c: number, o: { lw?: number; up?: number; dn?: number; h?: boolean; line?: boolean } = {}): void {
  rrect(g, x, y, w, h, r);
  const style = o.h ? hgrad(g, x, x + w, c, o.up ?? 0.2, o.dn ?? -0.22) : vgrad(g, y, y + h, c, o.up ?? 0.16, o.dn ?? -0.22);
  fill(g, style, o.line === false ? undefined : INK(), o.lw ?? 1.3);
}
/** Grain strokes inside a rect (call inside clipped()). */
export function grain(g: Ctx2D, x: number, y: number, w: number, h: number, c: number, seed: number, n = 8, a = 0.2, vertical = false): void {
  const r = rng(seed);
  g.lineWidth = 0.7;
  for (let i = 0; i < n; i++) {
    g.strokeStyle = rgba(shade(c, r() < 0.5 ? -0.3 : 0.2), a * (0.5 + r()));
    g.beginPath();
    if (vertical) {
      const xx = x + r() * w;
      g.moveTo(xx, y);
      g.bezierCurveTo(xx + (r() - 0.5) * 4, y + h * 0.3, xx + (r() - 0.5) * 4, y + h * 0.6, xx + (r() - 0.5) * 3, y + h);
    } else {
      const yy = y + r() * h;
      g.moveTo(x, yy);
      g.bezierCurveTo(x + w * 0.3, yy + (r() - 0.5) * 3, x + w * 0.6, yy + (r() - 0.5) * 3, x + w, yy + (r() - 0.5) * 2);
    }
    g.stroke();
  }
}
/** Wood slab with grain and a top highlight. */
export function wood(g: Ctx2D, x: number, y: number, w: number, h: number, r: number, c: number, seed = 3, vertical = false): void {
  slab(g, x, y, w, h, r, c, { line: false });
  clipped(g, () => rrect(g, x, y, w, h, r), () => grain(g, x, y, w, h, c, seed, Math.max(4, Math.round((vertical ? w : h) / 3)), 0.22, vertical));
  rrect(g, x, y, w, h, r);
  g.strokeStyle = INK();
  g.lineWidth = 1.3;
  g.stroke();
  g.strokeStyle = rgba(0xffffff, 0.16);
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(x + r * 0.6, y + 1.2);
  g.lineTo(x + w - r * 0.6, y + 1.2);
  g.stroke();
}
/** Thick rounded bar between two points with ink edge + highlight. */
export function bar(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, wd: number, c: number): void {
  g.lineCap = 'round';
  g.strokeStyle = INK();
  g.lineWidth = wd + 2.4;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = hex(c);
  g.lineWidth = wd;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = rgba(0xffffff, 0.2);
  g.lineWidth = Math.max(0.8, wd * 0.28);
  g.beginPath(); g.moveTo(x0 - wd * 0.15, y0 - wd * 0.15); g.lineTo(x1 - wd * 0.15, y1 - wd * 0.15); g.stroke();
  g.lineCap = 'butt';
}
/** Metal/brass bead with specular. */
export function bead(g: Ctx2D, x: number, y: number, r: number, c: number = PAL.brass): void {
  ellipse(g, x, y, r, r);
  fill(g, rad(g, x - r * 0.3, y - r * 0.35, 0, r * 1.15, [[0, shade(c, 0.55)], [0.45, c], [1, shade(c, -0.4)]]), INK(0.7), 0.9);
}
export function lineStroke(g: Ctx2D, pts: [number, number][], c: string, wd: number): void {
  g.strokeStyle = c;
  g.lineWidth = wd;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}
export function sheen(g: Ctx2D, x: number, y: number, w: number, h: number, a = 0.22): void {
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 0xffffff, 0], [0.5, 0xffffff, a], [1, 0xffffff, 0]]);
  g.fillRect(x, y, w, h);
}
export function softGlow(g: Ctx2D, x: number, y: number, r: number, c: number, a = 1): void {
  g.fillStyle = rad(g, x, y, 0, r, [[0, c, a], [0.45, c, a * 0.4], [1, c, 0]]);
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
/** Triangular/rounded flame shape. */
export function flameShape(g: Ctx2D, x: number, y: number, w: number, h: number, lean = 0): void {
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w * 0.62, y - h * 0.4, x - w * 0.2 + lean * 0.3, y - h * 0.55, x + lean, y - h);
  g.bezierCurveTo(x + w * 0.25 + lean * 0.3, y - h * 0.55, x + w * 0.62, y - h * 0.4, x + w / 2, y);
  g.bezierCurveTo(x + w * 0.2, y + h * 0.1, x - w * 0.2, y + h * 0.1, x - w / 2, y);
  g.closePath();
}
export function flame(g: Ctx2D, x: number, y: number, w: number, h: number, lean = 0, hot = 0xffe9a8, mid = 0xffa23a, edge = 0xd94a1a): void {
  flameShape(g, x, y, w, h, lean);
  fill(g, rad(g, x, y - h * 0.25, 0, h * 0.8, [[0, hot, 1], [0.4, mid, 0.95], [1, edge, 0.75]]));
  flameShape(g, x + lean * 0.1, y - h * 0.03, w * 0.45, h * 0.55, lean * 0.4);
  fill(g, rgba(hot, 0.9));
}
export function shadowBase(g: Ctx2D, rx: number, a = 0.32): void {
  contactShadow(g, 0, 2, rx, rx * 0.1, a);
}



// Re-exported so artUpper/artLower can import every paint helper from one place.
export { canvasTex, mix, poly, speckle };
