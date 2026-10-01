// Character art for the seven residents. Everything is painted procedurally at
// boot and exposed as separate part images so NPCController can animate a
// paper-doll rig: legs, torso, arms, head (+ face overlay, hat), and per-person
// extras (apron, coat tails, cane). Figures face +x (3/4 profile); the
// controller flips the whole rig for -x.
//
// Rig coordinates (world units): root at the FEET, y up is negative.
//   upper pivot = hip joint at (0, -legLen)
//   torso origin = hip joint, shoulder joint at (0, -torsoH + 10) from the hip,
//   head origin = neck joint at (0, -torsoH + 2) from the hip.

import Phaser from 'phaser';
import type { Ctx2D } from './paint';
import { canvasTex as rawCanvasTex, ellipse, FONT_TITLE, hex, lin, mix, PAL, rad, rgba, shade } from './paint';
import type { Emote, Face, NpcDef } from '../types';
import { GUESTS, NPCS } from '../data/npcs';

export const FACES: Face[] = ['calm', 'blink', 'curious', 'skeptic', 'nervous', 'scared', 'terror', 'scream'];

export const EMOTE_KEYS: Record<Emote, string> = {
  '?': 'emote:q', '!': 'emote:ex', '!!': 'emote:exex', '…': 'emote:dots',
  sweat: 'emote:sweat', '♪': 'emote:note', zzz: 'emote:zzz',
};

// ------------------------------------------------------------------ dims ----

interface Dims {
  legLen: number; legW: number; footL: number;
  torsoH: number; chestW: number; hipW: number; skirt: number; flare: number; belly: number;
  headW: number; headH: number;
  armLen: number; armW: number;
}

const DIMS: Record<string, Dims> = {
  augustus: { legLen: 52, legW: 15, footL: 13, torsoH: 56, chestW: 46, hipW: 40, skirt: 0, flare: 0, belly: 4, headW: 47, headH: 46, armLen: 47, armW: 12 },
  marigold: { legLen: 44, legW: 10, footL: 12, torsoH: 52, chestW: 36, hipW: 32, skirt: 40, flare: 22, belly: 0, headW: 44, headH: 44, armLen: 43, armW: 10 },
  toby: { legLen: 30, legW: 11, footL: 11, torsoH: 32, chestW: 33, hipW: 31, skirt: 0, flare: 0, belly: 2, headW: 44, headH: 41, armLen: 29, armW: 9 },
  hester: { legLen: 42, legW: 10, footL: 11, torsoH: 47, chestW: 38, hipW: 36, skirt: 34, flare: 13, belly: 3, headW: 40, headH: 40, armLen: 39, armW: 10 },
  pruitt: { legLen: 68, legW: 12, footL: 14, torsoH: 64, chestW: 34, hipW: 30, skirt: 0, flare: 0, belly: 0, headW: 36, headH: 42, armLen: 58, armW: 10 },
  nell: { legLen: 46, legW: 10, footL: 12, torsoH: 47, chestW: 34, hipW: 32, skirt: 24, flare: 17, belly: 0, headW: 44, headH: 44, armLen: 41, armW: 10 },
  dobbs: { legLen: 38, legW: 12, footL: 12, torsoH: 54, chestW: 56, hipW: 58, skirt: 26, flare: 12, belly: 8, headW: 47, headH: 44, armLen: 41, armW: 12 },
};

// ------------------------------------------------------------------- rig ----

export interface PartRef { key: string; ox: number; oy: number }
export interface Rig {
  id: string;
  d: Dims;
  /** Approx. standing height incl. hair/hat (for emotes, hide cover math). */
  height: number;
  hipY: number;
  neckY: number; // relative to hip pivot
  shoulderY: number; // relative to hip pivot
  legL: PartRef; legR: PartRef;
  torso: PartRef;
  armL: PartRef; armR: PartRef;
  head: PartRef;
  hat?: PartRef;
  apron?: PartRef & { x: number; y: number };
  tails?: PartRef & { x: number; y: number };
  cane?: PartRef & { len: number };
  /** distance shoulder → hand centre */
  handLen: number;
  faceKey(f: Face): string;
}

const HEAD_PADL = 14;
const HEAD_PADR = 12;
const HEAD_PADT = 28;
const HEAD_PADB = 8;

function headBox(d: Dims) {
  const w = d.headW + HEAD_PADL + HEAD_PADR;
  const h = HEAD_PADT + d.headH + HEAD_PADB;
  const cx = HEAD_PADL + d.headW / 2;
  const cy = HEAD_PADT + d.headH / 2;
  return { w, h, cx, cy, neckY: cy + d.headH * 0.4 };
}
function torsoBox(d: Dims) {
  const half = Math.max(d.chestW, d.hipW) / 2 + d.flare + d.belly + 8;
  const w = half * 2;
  const top = d.torsoH + 10;
  const h = top + d.skirt + 6;
  return { w, h, cx: w / 2, hipY: top };
}
function legBox(d: Dims) {
  const w = d.legW + 5 + d.footL;
  const h = d.legLen + 3;
  return { w, h, cx: 2.5 + d.legW / 2 };
}
function armBox(d: Dims) {
  const w = d.armW + 12;
  const h = d.armLen + d.armW * 0.7 + 6;
  return { w, h, cx: w / 2, sy: d.armW * 0.7 };
}

// Guests reuse a resident's painters: while REMAP is set, every texture key the
// painter writes (npc:<look>:*, face:<look>:*) is renamed to the guest's id.
let REMAP: { from: string; to: string } | null = null;
const rk = (k: string): string => (REMAP ? k.replace(`:${REMAP.from}:`, `:${REMAP.to}:`) : k);
const canvasTex: typeof rawCanvasTex = (scene, key, w, h, draw) => rawCanvasTex(scene, rk(key), w, h, draw);

export const RIGS: Record<string, Rig> = {};

function buildRig(def: NpcDef): Rig {
  const d = DIMS[def.id];
  const hb = headBox(d);
  const tb = torsoBox(d);
  const lb = legBox(d);
  const ab = armBox(d);
  const id = def.id;
  const hatTall = id === 'marigold' ? 14 : id === 'hester' ? 10 : id === 'nell' ? 8 : id === 'toby' ? 6 : 3;
  const rig: Rig = {
    id, d,
    height: d.legLen + d.torsoH + d.headH * 0.9 + hatTall,
    hipY: -d.legLen,
    neckY: -d.torsoH + 2,
    shoulderY: -d.torsoH + 10,
    legL: { key: `npc:${id}:legL`, ox: lb.cx / lb.w, oy: 0 },
    legR: { key: `npc:${id}:legR`, ox: lb.cx / lb.w, oy: 0 },
    torso: { key: `npc:${id}:torso`, ox: tb.cx / tb.w, oy: tb.hipY / tb.h },
    armL: { key: `npc:${id}:armL`, ox: ab.cx / ab.w, oy: ab.sy / ab.h },
    armR: { key: `npc:${id}:armR`, ox: ab.cx / ab.w, oy: ab.sy / ab.h },
    head: { key: `npc:${id}:head`, ox: hb.cx / hb.w, oy: hb.neckY / hb.h },
    handLen: d.armLen - d.armW * 0.2,
    faceKey: (f) => `face:${id}:${f}`,
  };
  if (id === 'nell' || id === 'dobbs') {
    rig.hat = { key: `npc:${id}:hat`, ox: hb.cx / hb.w, oy: hb.neckY / hb.h };
  }
  if (id === 'nell' || id === 'dobbs') {
    rig.apron = { key: `npc:${id}:apron`, ox: 0.5, oy: 0, x: d.chestW * 0.16, y: -d.torsoH + 14 };
  }
  if (id === 'pruitt') {
    rig.tails = { key: 'npc:pruitt:tails', ox: 0.5, oy: 0, x: -d.hipW * 0.32, y: -8 };
  }
  if (id === 'hester') {
    rig.cane = { key: 'npc:hester:cane', ox: 0.5, oy: 1, len: 70 };
  }
  return rig;
}
for (const n of NPCS) RIGS[n.id] = buildRig(n);
for (const g of GUESTS) {
  const r = buildRig({ ...g, id: g.look! });
  const to = (p: PartRef): PartRef => ({ ...p, key: p.key.replace(`:${g.look}:`, `:${g.id}:`) });
  RIGS[g.id] = {
    ...r, id: g.id,
    legL: to(r.legL), legR: to(r.legR), torso: to(r.torso), armL: to(r.armL), armR: to(r.armR), head: to(r.head),
    hat: r.hat && { ...to(r.hat), ox: r.hat.ox, oy: r.hat.oy },
    apron: r.apron && { ...to(r.apron), x: r.apron.x, y: r.apron.y },
    tails: r.tails && { ...to(r.tails), x: r.tails.x, y: r.tails.y },
    cane: r.cane && { ...to(r.cane), len: r.cane.len },
    faceKey: (f) => `face:${g.id}:${f}`,
  };
}

// --------------------------------------------------------------- helpers ----

const outlineOf = (c: number): number => mix(shade(c, -0.5), PAL.ink, 0.55);

/** Smooth closed path through control points (quadratic through midpoints). */
function smooth(g: Ctx2D, pts: [number, number][]): void {
  const n = pts.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath();
  const m0 = mid(pts[n - 1], pts[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath();
}

interface BB { x: number; y: number; w: number; h: number }

/** Fill a path with a lit/shaded base, then outline it. */
function solid(
  g: Ctx2D, path: () => void, color: number, bb: BB,
  o: { outline?: number; lw?: number; shine?: number; shadow?: number } = {},
): void {
  path();
  g.fillStyle = hex(color);
  g.fill();
  g.save();
  path();
  g.clip();
  g.fillStyle = lin(g, bb.x + bb.w, bb.y, bb.x, bb.y + bb.h * 1.05, [
    [0, 0xffffff, o.shine ?? 0.2], [0.45, 0xffffff, 0], [1, 0x0a0614, o.shadow ?? 0.3],
  ]);
  g.fillRect(bb.x - 3, bb.y - 3, bb.w + 6, bb.h + 6);
  g.restore();
  path();
  g.lineJoin = 'round';
  g.strokeStyle = hex(o.outline ?? outlineOf(color));
  g.lineWidth = o.lw ?? 1.6;
  g.stroke();
}

function capsule(g: Ctx2D, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): void {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath();
  g.arc(x0, y0, r0, a + Math.PI / 2, a - Math.PI / 2);
  g.arc(x1, y1, r1, a - Math.PI / 2, a + Math.PI / 2);
  g.closePath();
}

function disc(g: Ctx2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}

const lineStyle = (g: Ctx2D, c: number, w: number, a = 1): void => {
  g.strokeStyle = rgba(c, a);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
};

// ------------------------------------------------------------------ legs ----

interface LegLook { color: number; shoe: number; sock?: number; far: boolean; thin?: boolean }

function paintLeg(scene: Phaser.Scene, key: string, d: Dims, L: LegLook): void {
  const b = legBox(d);
  canvasTex(scene, key, b.w, b.h, (g) => {
    const dk = L.far ? -0.24 : 0;
    const col = shade(L.color, dk);
    const shoe = shade(L.shoe, dk);
    const lw = d.legW;
    const cx = b.cx;
    const shoeTop = b.h - 12;
    const bb = { x: cx - lw / 2, y: 0, w: lw, h: shoeTop };
    solid(g, () => {
      g.beginPath();
      g.moveTo(cx - lw / 2, 0);
      g.lineTo(cx + lw / 2, 0);
      g.lineTo(cx + lw * 0.42, shoeTop + 1);
      g.lineTo(cx - lw * 0.42, shoeTop + 1);
      g.closePath();
    }, col, bb, { shine: 0.12 });
    if (L.sock) {
      g.fillStyle = hex(shade(L.sock, dk));
      g.fillRect(cx - lw * 0.44, shoeTop - 9, lw * 0.88, 9);
    }
    const pts: [number, number][] = [
      [cx - lw / 2 - 1, shoeTop - 1], [cx + lw / 2 + 1, shoeTop - 1], [cx + lw / 2 + 2, shoeTop + 5],
      [cx + lw / 2 + d.footL - 3, b.h - 6], [cx + lw / 2 + d.footL, b.h - 3], [cx + lw / 2 + d.footL - 2, b.h - 0.5],
      [cx - lw / 2 - 1, b.h - 0.5],
    ];
    solid(g, () => smooth(g, pts), shoe, { x: cx - lw / 2, y: shoeTop, w: lw + d.footL, h: 12 }, { shine: 0.3, shadow: 0.2 });
    // sole line
    lineStyle(g, 0x000000, 1.1, 0.35);
    g.beginPath();
    g.moveTo(cx - lw / 2, b.h - 1.2);
    g.lineTo(cx + lw / 2 + d.footL - 2, b.h - 1.2);
    g.stroke();
  });
}

// ------------------------------------------------------------------ arms ----

interface ArmLook { sleeve: number; skin: number; sleeveFrac: number; cuff?: number; glove?: boolean; puff?: number; far: boolean }

function paintArm(scene: Phaser.Scene, key: string, d: Dims, A: ArmLook): void {
  const b = armBox(d);
  canvasTex(scene, key, b.w, b.h, (g) => {
    const dk = A.far ? -0.22 : 0;
    const sleeve = shade(A.sleeve, dk);
    const skin = shade(A.skin, dk);
    const r = d.armW / 2;
    const cx = b.cx;
    const y0 = b.sy;
    const y1 = b.h - r * 1.2;
    const hand = A.glove ? shade(0xf4ecd8, dk) : skin;
    const cut = y0 + (y1 - y0) * A.sleeveFrac;
    // forearm (skin) first, then sleeve over it
    if (A.sleeveFrac < 0.95) {
      solid(g, () => capsule(g, cx, y0, r * 0.82, cx, y1, r * 0.72), skin, { x: cx - r, y: y0, w: r * 2, h: y1 - y0 }, { shine: 0.18 });
    }
    solid(g, () => capsule(g, cx, y0, r * (A.puff ? 1.15 : 1), cx, cut, r * 0.9), sleeve, { x: cx - r, y: y0, w: r * 2, h: cut - y0 }, { shine: 0.2 });
    if (A.puff) {
      solid(g, () => { ellipse(g, cx, y0 + 2, r * 1.5, r * 1.25); }, sleeve, { x: cx - r * 1.5, y: y0 - 4, w: r * 3, h: r * 2.5 }, { shine: 0.25 });
    }
    if (A.cuff) {
      g.fillStyle = hex(shade(A.cuff, dk));
      g.beginPath();
      g.roundRect(cx - r * 0.98, cut - 3, r * 1.96, 5, 2);
      g.fill();
    }
    solid(g, () => disc(g, cx, y1 + 1, r * 0.78), hand, { x: cx - r, y: y1 - r, w: r * 2, h: r * 2 }, { shine: 0.25, shadow: 0.15 });
  });
}

// ------------------------------------------------------------------ head ----

interface HeadLook {
  skin: number; hair: number;
  style: 'augustus' | 'marigold' | 'toby' | 'hester' | 'pruitt' | 'nell' | 'dobbs';
}

function paintHeadBase(g: Ctx2D, d: Dims, cx: number, cy: number, skin: number): void {
  const rx = d.headW / 2;
  const ry = d.headH / 2;
  // neck stub (hidden mostly by torso collar)
  g.fillStyle = hex(shade(skin, -0.1));
  g.fillRect(cx - rx * 0.28, cy + ry * 0.7, rx * 0.56, ry * 0.5);
  // head shape: rounded, slightly wider toward the front and cheek
  const pts: [number, number][] = [
    [cx - rx * 0.98, cy - ry * 0.1], [cx - rx * 0.8, cy - ry * 0.78], [cx - rx * 0.1, cy - ry * 1.02],
    [cx + rx * 0.62, cy - ry * 0.85], [cx + rx * 1.0, cy - ry * 0.2], [cx + rx * 0.98, cy + ry * 0.38],
    [cx + rx * 0.6, cy + ry * 0.92], [cx, cy + ry * 1.0], [cx - rx * 0.7, cy + ry * 0.7],
  ];
  solid(g, () => smooth(g, pts), skin, { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, { shine: 0.2, shadow: 0.16, outline: outlineOf(skin), lw: 1.7 });
  // nose
  solid(g, () => disc(g, cx + rx * 1.0, cy + ry * 0.2, d.headH * 0.065), shade(skin, 0.04), { x: cx + rx * 0.85, y: cy + ry * 0.05, w: 12, h: 12 }, { shine: 0.2, shadow: 0.1, lw: 1.3 });
  // ear
  solid(g, () => ellipse(g, cx - rx * 0.12, cy + ry * 0.12, d.headH * 0.075, d.headH * 0.1), shade(skin, -0.06), { x: cx - rx * 0.3, y: cy, w: 10, h: 12 }, { shine: 0.1, shadow: 0.2, lw: 1.3 });
  g.strokeStyle = rgba(shade(skin, -0.35), 0.5);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx - rx * 0.12, cy + ry * 0.14, d.headH * 0.04, -1.2, 1.6);
  g.stroke();
}

function hairPath(g: Ctx2D, pts: [number, number][]): () => void {
  return () => smooth(g, pts);
}

function paintHair(g: Ctx2D, d: Dims, cx: number, cy: number, L: HeadLook): void {
  const rx = d.headW / 2;
  const ry = d.headH / 2;
  const hair = L.hair;
  const hb = { x: cx - rx * 1.2, y: cy - ry * 1.5, w: rx * 2.4, h: ry * 1.6 };
  const hl = shade(hair, 0.22);
  const strand = (x0: number, y0: number, x1: number, y1: number, cxp: number, cyp: number): void => {
    lineStyle(g, hl, 1.2, 0.5);
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(cxp, cyp, x1, y1);
    g.stroke();
  };
  switch (L.style) {
    case 'augustus': {
      // short side-parted hair, grey at the temple
      solid(g, hairPath(g, [
        [cx - rx * 1.02, cy + ry * 0.2], [cx - rx * 1.02, cy - ry * 0.55], [cx - rx * 0.5, cy - ry * 1.12],
        [cx + rx * 0.35, cy - ry * 1.12], [cx + rx * 0.82, cy - ry * 0.75], [cx + rx * 0.9, cy - ry * 0.4],
        [cx + rx * 0.4, cy - ry * 0.62], [cx - rx * 0.1, cy - ry * 0.5], [cx - rx * 0.3, cy - ry * 0.2],
        [cx - rx * 0.4, cy + ry * 0.1],
      ]), hair, hb, { shine: 0.3 });
      strand(cx - rx * 0.6, cy - ry * 0.85, cx + rx * 0.5, cy - ry * 0.82, cx, cy - ry * 1.1);
      solid(g, () => ellipse(g, cx - rx * 0.18, cy - ry * 0.18, rx * 0.12, ry * 0.3), shade(hair, 0.45), { x: cx - rx * 0.3, y: cy - ry * 0.5, w: 8, h: 18 }, { shine: 0, shadow: 0.1, lw: 0.8 });
      break;
    }
    case 'marigold': {
      // updo: back hair + bun + side-swept fringe
      solid(g, hairPath(g, [
        [cx - rx * 1.05, cy + ry * 0.4], [cx - rx * 1.1, cy - ry * 0.4], [cx - rx * 0.7, cy - ry * 1.0],
        [cx + rx * 0.3, cy - ry * 1.12], [cx + rx * 0.85, cy - ry * 0.7], [cx + rx * 0.85, cy - ry * 0.35],
        [cx + rx * 0.25, cy - ry * 0.58], [cx - rx * 0.2, cy - ry * 0.4], [cx - rx * 0.4, cy + ry * 0.1],
        [cx - rx * 0.55, cy + ry * 0.5],
      ]), hair, hb, { shine: 0.3 });
      solid(g, () => disc(g, cx - rx * 0.42, cy - ry * 1.28, d.headH * 0.2), hair, { x: cx - rx * 0.9, y: cy - ry * 1.7, w: 20, h: 20 }, { shine: 0.35 });
      strand(cx - rx * 0.62, cy - ry * 1.34, cx - rx * 0.2, cy - ry * 1.2, cx - rx * 0.45, cy - ry * 1.5);
      strand(cx - rx * 0.4, cy - ry * 0.9, cx + rx * 0.5, cy - ry * 0.75, cx, cy - ry * 1.1);
      // gold hairpin
      lineStyle(g, PAL.gold, 2.2);
      g.beginPath();
      g.moveTo(cx - rx * 0.2, cy - ry * 1.5);
      g.lineTo(cx - rx * 0.62, cy - ry * 1.12);
      g.stroke();
      break;
    }
    case 'toby': {
      // messy tufts
      const tufts: [number, number][] = [
        [cx - rx * 1.05, cy + ry * 0.2], [cx - rx * 1.1, cy - ry * 0.5], [cx - rx * 0.95, cy - ry * 1.0],
        [cx - rx * 0.6, cy - ry * 1.35], [cx - rx * 0.35, cy - ry * 1.02], [cx - rx * 0.05, cy - ry * 1.45],
        [cx + rx * 0.25, cy - ry * 1.05], [cx + rx * 0.62, cy - ry * 1.18], [cx + rx * 0.82, cy - ry * 0.7],
        [cx + rx * 0.95, cy - ry * 0.4], [cx + rx * 0.5, cy - ry * 0.6], [cx + rx * 0.05, cy - ry * 0.45],
        [cx - rx * 0.3, cy - ry * 0.1], [cx - rx * 0.45, cy + ry * 0.35],
      ];
      solid(g, hairPath(g, tufts), hair, hb, { shine: 0.35 });
      strand(cx - rx * 0.5, cy - ry * 0.95, cx + rx * 0.4, cy - ry * 0.85, cx, cy - ry * 1.15);
      break;
    }
    case 'hester': {
      // white hair: tall bun, curls at the nape, pinned back from the forehead
      solid(g, () => disc(g, cx - rx * 0.4, cy - ry * 1.2, d.headH * 0.24), hair, { x: cx - rx * 0.9, y: cy - ry * 1.7, w: 22, h: 22 }, { shine: 0.2, shadow: 0.2, outline: 0x8f8a96 });
      solid(g, hairPath(g, [
        [cx - rx * 1.08, cy + ry * 0.45], [cx - rx * 1.12, cy - ry * 0.4], [cx - rx * 0.75, cy - ry * 1.0],
        [cx + rx * 0.25, cy - ry * 1.1], [cx + rx * 0.8, cy - ry * 0.72], [cx + rx * 0.82, cy - ry * 0.42],
        [cx + rx * 0.25, cy - ry * 0.7], [cx - rx * 0.2, cy - ry * 0.35], [cx - rx * 0.4, cy + ry * 0.2],
        [cx - rx * 0.62, cy + ry * 0.55],
      ]), hair, hb, { shine: 0.1, shadow: 0.25, outline: 0x8f8a96 });
      for (let i = 0; i < 3; i++) {
        solid(g, () => disc(g, cx - rx * (0.95 - i * 0.2), cy + ry * (0.55 + (i % 2) * 0.1), 4.4), hair, { x: 0, y: 0, w: 8, h: 8 }, { shine: 0.1, shadow: 0.2, outline: 0x8f8a96, lw: 1.1 });
      }
      strand(cx - rx * 0.5, cy - ry * 0.9, cx + rx * 0.4, cy - ry * 0.85, cx, cy - ry * 1.1);
      // ribbon
      solid(g, () => ellipse(g, cx - rx * 0.4, cy - ry * 0.9, 6, 3.6), PAL.rose, { x: cx - rx * 0.6, y: cy - ry, w: 12, h: 8 }, { shine: 0.2, lw: 1 });
      break;
    }
    case 'pruitt': {
      // slicked silver hair, sharp part, long sideburn
      solid(g, hairPath(g, [
        [cx - rx * 1.04, cy + ry * 0.3], [cx - rx * 1.04, cy - ry * 0.6], [cx - rx * 0.5, cy - ry * 1.1],
        [cx + rx * 0.4, cy - ry * 1.08], [cx + rx * 0.8, cy - ry * 0.7], [cx + rx * 0.82, cy - ry * 0.5],
        [cx + rx * 0.2, cy - ry * 0.7], [cx - rx * 0.3, cy - ry * 0.45], [cx - rx * 0.4, cy + ry * 0.05],
        [cx - rx * 0.4, cy + ry * 0.4],
      ]), hair, hb, { shine: 0.4 });
      strand(cx - rx * 0.7, cy - ry * 0.8, cx + rx * 0.6, cy - ry * 0.75, cx, cy - ry * 1.05);
      strand(cx - rx * 0.6, cy - ry * 0.55, cx + rx * 0.3, cy - ry * 0.62, cx, cy - ry * 0.8);
      break;
    }
    case 'nell': {
      // dark hair swept back under the cap, low bun, curl at the cheek
      solid(g, () => disc(g, cx - rx * 0.95, cy + ry * 0.1, d.headH * 0.19), hair, { x: cx - rx * 1.3, y: cy - ry * 0.2, w: 18, h: 18 }, { shine: 0.3 });
      solid(g, hairPath(g, [
        [cx - rx * 1.0, cy + ry * 0.45], [cx - rx * 1.06, cy - ry * 0.4], [cx - rx * 0.7, cy - ry * 1.0],
        [cx + rx * 0.3, cy - ry * 1.08], [cx + rx * 0.85, cy - ry * 0.65], [cx + rx * 0.82, cy - ry * 0.3],
        [cx + rx * 0.2, cy - ry * 0.62], [cx - rx * 0.3, cy - ry * 0.3], [cx - rx * 0.45, cy + ry * 0.3],
      ]), hair, hb, { shine: 0.3 });
      solid(g, () => disc(g, cx + rx * 0.82, cy - ry * 0.22, 4.6), hair, { x: 0, y: 0, w: 9, h: 9 }, { shine: 0.2, lw: 1 });
      break;
    }
    case 'dobbs': {
      // grey hair peeking out under the kerchief
      solid(g, hairPath(g, [
        [cx - rx * 1.03, cy + ry * 0.4], [cx - rx * 1.06, cy - ry * 0.2], [cx - rx * 0.6, cy - ry * 0.62],
        [cx + rx * 0.3, cy - ry * 0.7], [cx + rx * 0.82, cy - ry * 0.5], [cx + rx * 0.6, cy - ry * 0.34],
        [cx - rx * 0.1, cy - ry * 0.38], [cx - rx * 0.45, cy - ry * 0.05], [cx - rx * 0.55, cy + ry * 0.35],
      ]), hair, hb, { shine: 0.2, shadow: 0.2, outline: 0x85838d });
      break;
    }
  }
}

function paintHead(scene: Phaser.Scene, def: NpcDef): void {
  const d = DIMS[def.id];
  const b = headBox(d);
  canvasTex(scene, `npc:${def.id}:head`, b.w, b.h, (g) => {
    paintHeadBase(g, d, b.cx, b.cy, def.palette.skin);
    paintHair(g, d, b.cx, b.cy, { skin: def.palette.skin, hair: def.palette.hair, style: def.id as HeadLook['style'] });
  });
}

function paintHat(scene: Phaser.Scene, def: NpcDef): void {
  const d = DIMS[def.id];
  const b = headBox(d);
  const rx = d.headW / 2;
  const ry = d.headH / 2;
  const { cx, cy } = b;
  canvasTex(scene, `npc:${def.id}:hat`, b.w, b.h, (g) => {
    if (def.id === 'nell') {
      // frilled maid cap
      const cream = def.palette.accent;
      solid(g, () => smooth(g, [
        [cx - rx * 0.9, cy - ry * 0.45], [cx - rx * 0.85, cy - ry * 0.95], [cx - rx * 0.2, cy - ry * 1.38],
        [cx + rx * 0.5, cy - ry * 1.12], [cx + rx * 0.78, cy - ry * 0.72], [cx + rx * 0.3, cy - ry * 0.78],
        [cx - rx * 0.3, cy - ry * 0.62],
      ]), cream, { x: cx - rx, y: cy - ry * 1.4, w: rx * 1.8, h: ry * 1.0 }, { shine: 0.1, shadow: 0.12, outline: 0xb9ae9a });
      // ruffle band
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = cx - rx * 0.78 + t * rx * 1.5;
        const y = cy - ry * (0.62 + Math.sin(t * Math.PI) * 0.2) - 1;
        solid(g, () => disc(g, x, y, 4.2), cream, { x: x - 4, y: y - 4, w: 8, h: 8 }, { shine: 0.1, shadow: 0.1, outline: 0xb9ae9a, lw: 1 });
      }
      // tie ribbon
      lineStyle(g, def.palette.top, 1.8);
      g.beginPath();
      g.moveTo(cx - rx * 0.5, cy - ry * 1.0);
      g.quadraticCurveTo(cx - rx * 0.9, cy - ry * 0.3, cx - rx * 0.95, cy + ry * 0.2);
      g.stroke();
    } else if (def.id === 'dobbs') {
      // checked kerchief with a knot at the back
      const col = 0xb4584a;
      const path = (): void => smooth(g, [
        [cx - rx * 1.0, cy - ry * 0.05], [cx - rx * 1.02, cy - ry * 0.7], [cx - rx * 0.4, cy - ry * 1.1],
        [cx + rx * 0.4, cy - ry * 1.08], [cx + rx * 0.85, cy - ry * 0.7], [cx + rx * 0.9, cy - ry * 0.42],
        [cx + rx * 0.3, cy - ry * 0.58], [cx - rx * 0.3, cy - ry * 0.5], [cx - rx * 0.6, cy - ry * 0.1],
      ]);
      solid(g, path, col, { x: cx - rx, y: cy - ry * 1.1, w: rx * 2, h: ry * 0.9 }, { shine: 0.25 });
      g.save();
      path();
      g.clip();
      lineStyle(g, 0xf3e5cf, 1.6, 0.55);
      for (let i = -3; i < 8; i++) {
        g.beginPath();
        g.moveTo(cx - rx + i * 7, cy - ry * 1.2);
        g.lineTo(cx - rx + i * 7 + 8, cy - ry * 0.3);
        g.stroke();
        g.beginPath();
        g.moveTo(cx + rx - i * 7, cy - ry * 1.2);
        g.lineTo(cx + rx - i * 7 - 8, cy - ry * 0.3);
        g.stroke();
      }
      g.restore();
      // knot + tails
      solid(g, () => smooth(g, [[cx - rx * 1.0, cy - ry * 0.7], [cx - rx * 1.25, cy - ry * 0.95], [cx - rx * 1.4, cy - ry * 0.55], [cx - rx * 1.05, cy - ry * 0.45]]), col, { x: cx - rx * 1.4, y: cy - ry, w: 14, h: 14 }, { shine: 0.2, lw: 1.3 });
      solid(g, () => disc(g, cx - rx * 1.0, cy - ry * 0.68, 3.4), shade(col, -0.2), { x: 0, y: 0, w: 7, h: 7 }, { lw: 1 });
    }
  });
}

// ------------------------------------------------------------------ torso ----

function paintTorso(scene: Phaser.Scene, def: NpcDef): void {
  const d = DIMS[def.id];
  const b = torsoBox(d);
  const P = def.palette;
  canvasTex(scene, `npc:${def.id}:torso`, b.w, b.h, (g) => {
    g.translate(b.cx, b.hipY); // hip joint = (0,0)
    const T = d.torsoH;
    const cw = d.chestW / 2;
    const hw = d.hipW / 2;
    const S = d.skirt;
    const bf = d.belly;
    const bb: BB = { x: -b.cx, y: -T - 6, w: b.w, h: T + S + 8 };
    // neck stub
    g.fillStyle = hex(shade(P.skin, -0.12));
    g.fillRect(-d.headW * 0.12, -T - 7, d.headW * 0.28, 16);

    const body = (pts: [number, number][], color: number, shine = 0.22): void => {
      solid(g, () => smooth(g, pts), color, bb, { shine });
    };
    const clipTo = (pts: [number, number][], fn: () => void): void => {
      g.save();
      smooth(g, pts);
      g.clip();
      fn();
      g.restore();
    };

    switch (def.id) {
      case 'augustus': {
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 2, -T + 16], [cw + 3 + bf, -T * 0.4], [hw + 3 + bf, -2], [hw + bf, 7],
          [-hw, 7], [-hw - 2, -2], [-cw - 2, -T * 0.45], [-cw - 1, -T + 14],
        ];
        body(pts, P.top, 0.25);
        clipTo(pts, () => {
          // trouser band
          g.fillStyle = hex(P.bottom);
          g.fillRect(-b.cx, 0, b.w, 12);
          // shirt sleeve shoulder hint + collar
          g.fillStyle = hex(P.accent);
          g.beginPath();
          g.moveTo(-cw * 0.2, -T + 3); g.lineTo(cw * 0.7, -T + 3); g.lineTo(cw * 0.5, -T + 22); g.lineTo(cw * 0.2, -T + 12); g.closePath();
          g.fill();
          // buttons + gold chain
          g.fillStyle = hex(PAL.gold);
          for (let i = 0; i < 4; i++) { disc(g, cw * 0.62 + bf * 0.4, -T * 0.78 + i * (T * 0.17), 1.7); g.fill(); }
          lineStyle(g, PAL.gold, 1.2, 0.9);
          g.beginPath();
          g.moveTo(cw * 0.55 + bf * 0.4, -T * 0.34);
          g.quadraticCurveTo(cw * 0.1, -T * 0.12, -cw * 0.05, -T * 0.4);
          g.stroke();
          // waistcoat shadow fold
          lineStyle(g, 0x000000, 1.1, 0.22);
          g.beginPath();
          g.moveTo(-cw * 0.2, -T * 0.7); g.quadraticCurveTo(-cw * 0.3, -T * 0.4, -cw * 0.2, -T * 0.1);
          g.stroke();
        });
        // bow tie
        solid(g, () => smooth(g, [[cw * 0.2, -T + 6], [cw * 0.5, -T + 3], [cw * 0.55, -T + 11], [cw * 0.2, -T + 9]]), 0x2c2638, bb, { shine: 0.2, lw: 1 });
        break;
      }
      case 'marigold': {
        const hem = hw + d.flare;
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 1, -T + 16], [cw * 0.9, -T * 0.42], [hw * 0.8, -T * 0.18],
          [hw + 8, S * 0.45], [hem, S], [hem - 3, S + 3], [-hem + 3, S + 3], [-hem, S], [-hw - 7, S * 0.45], [-hw * 0.9, -T * 0.2],
          [-cw * 0.9, -T * 0.5], [-cw, -T + 14],
        ];
        body(pts, P.top, 0.24);
        clipTo(pts, () => {
          // gold waist trim
          g.fillStyle = hex(P.accent);
          g.fillRect(-b.cx, -T * 0.2, b.w, 4);
          // skirt folds
          lineStyle(g, 0x000000, 1.2, 0.18);
          for (let i = -2; i <= 3; i++) {
            g.beginPath();
            g.moveTo(i * 4, -T * 0.1);
            g.quadraticCurveTo(i * 8, S * 0.5, i * 11, S);
            g.stroke();
          }
          g.fillStyle = hex(shade(P.top, 0.3));
          g.fillRect(-b.cx, S - 6, b.w, 3);
          // lace collar
          g.fillStyle = hex(0xf4ecd8);
          g.beginPath();
          g.ellipse(cw * 0.2, -T + 6, cw * 0.75, 6, 0, 0, Math.PI * 2);
          g.fill();
        });
        // brooch
        solid(g, () => disc(g, cw * 0.55, -T + 17, 3.3), P.accent, bb, { shine: 0.5, lw: 1 });
        break;
      }
      case 'toby': {
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 1, -T + 14], [cw + 3, -T * 0.4], [hw + 3, -2], [hw + 1, 7],
          [-hw, 7], [-hw - 2, -2], [-cw - 2, -T * 0.45], [-cw, -T + 12],
        ];
        body(pts, P.top, 0.25);
        clipTo(pts, () => {
          g.fillStyle = rgba(P.accent, 0.9);
          for (let i = 0; i < 4; i++) g.fillRect(-b.cx, -T + 14 + i * 7, b.w, 2.6);
          g.fillStyle = hex(P.bottom);
          g.fillRect(-b.cx, -1, b.w, 12);
          // collar
          g.fillStyle = hex(shade(P.top, 0.35));
          g.beginPath();
          g.ellipse(cw * 0.15, -T + 5, cw * 0.7, 5, 0, 0, Math.PI * 2);
          g.fill();
        });
        break;
      }
      case 'hester': {
        const hem = hw + d.flare;
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 1, -T + 14], [cw * 0.95, -T * 0.4], [hw + 2, -2],
          [hem, S], [hem - 3, S + 3], [-hem + 3, S + 3], [-hem, S], [-hw - 3, -2], [-cw * 0.95, -T * 0.4], [-cw - 1, -T + 12],
        ];
        body(pts, P.top, 0.22);
        clipTo(pts, () => {
          lineStyle(g, 0x000000, 1.1, 0.16);
          for (let i = -2; i <= 2; i++) {
            g.beginPath(); g.moveTo(i * 5, -4); g.quadraticCurveTo(i * 8, S * 0.5, i * 10, S); g.stroke();
          }
          g.fillStyle = hex(shade(P.top, -0.25));
          g.fillRect(-b.cx, S - 5, b.w, 3);
          // high lace collar
          g.fillStyle = hex(0xf2e8d5);
          g.fillRect(-cw * 0.35, -T + 3, cw * 1.1, 10);
        });
        // shawl draped across the shoulders with a point down the front
        solid(g, () => smooth(g, [
          [-cw - 3, -T + 8], [-cw * 0.2, -T - 1], [cw * 0.8, -T + 3], [cw + 3, -T + 14], [cw * 0.55, -T * 0.5], [cw * 0.2, -T * 0.28],
          [-cw * 0.2, -T * 0.55], [-cw - 4, -T * 0.52],
        ]), P.accent, bb, { shine: 0.25 });
        g.fillStyle = hex(shade(P.accent, 0.35));
        for (let i = 0; i < 5; i++) { disc(g, -cw * 0.6 + i * (cw * 0.35), -T * 0.55 + (i % 2) * 2, 1.6); g.fill(); }
        // cameo
        solid(g, () => ellipse(g, cw * 0.28, -T + 14, 3.6, 4.3), 0xf1e3c6, bb, { shine: 0.3, lw: 1 });
        break;
      }
      case 'pruitt': {
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 1, -T + 14], [cw + 2, -T * 0.4], [hw + 3, -2], [hw + 1, 10],
          [-hw, 10], [-hw - 1, -2], [-cw - 2, -T * 0.45], [-cw, -T + 12],
        ];
        body(pts, P.top, 0.3);
        clipTo(pts, () => {
          // white shirt-front wedge, waistcoat stripe
          g.fillStyle = hex(P.accent);
          g.beginPath();
          g.moveTo(cw * 0.15, -T + 3); g.lineTo(cw * 0.85, -T + 3); g.lineTo(cw * 0.58, -T * 0.32); g.lineTo(cw * 0.34, -T * 0.32); g.closePath();
          g.fill();
          g.fillStyle = hex(0x4a4a58);
          g.fillRect(cw * 0.3, -T * 0.34, cw * 0.4, T * 0.34 + 10);
          // lapel lines
          lineStyle(g, 0xffffff, 1.1, 0.22);
          g.beginPath(); g.moveTo(cw * 0.1, -T + 6); g.lineTo(cw * 0.34, -T * 0.34); g.stroke();
          g.beginPath(); g.moveTo(-cw * 0.15, -T * 0.7); g.quadraticCurveTo(-cw * 0.25, -T * 0.3, -cw * 0.1, -4); g.stroke();
          g.fillStyle = hex(PAL.stone);
          for (let i = 0; i < 3; i++) { disc(g, cw * 0.46, -T * 0.26 + i * 9, 1.4); g.fill(); }
        });
        // white bow tie
        solid(g, () => smooth(g, [[cw * 0.3, -T + 5], [cw * 0.62, -T + 2], [cw * 0.66, -T + 9], [cw * 0.3, -T + 8]]), P.accent, bb, { shine: 0.1, lw: 1 });
        break;
      }
      case 'nell': {
        const hem = hw + d.flare;
        const pts: [number, number][] = [
          [-cw * 0.6, -T + 4], [cw * 0.7, -T + 4], [cw + 1, -T + 14], [cw * 0.9, -T * 0.4], [hw * 0.85, -T * 0.12],
          [hw + 6, S * 0.5], [hem, S], [hem - 3, S + 3], [-hem + 3, S + 3], [-hem, S], [-hw - 6, S * 0.5], [-hw * 0.85, -T * 0.14],
          [-cw * 0.9, -T * 0.45], [-cw - 1, -T + 12],
        ];
        body(pts, P.top, 0.25);
        clipTo(pts, () => {
          lineStyle(g, 0x000000, 1.1, 0.2);
          for (let i = -2; i <= 2; i++) {
            g.beginPath(); g.moveTo(i * 4, -2); g.quadraticCurveTo(i * 7, S * 0.5, i * 9, S); g.stroke();
          }
          // white collar
          g.fillStyle = hex(P.accent);
          g.beginPath(); g.ellipse(cw * 0.2, -T + 6, cw * 0.8, 6, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = hex(shade(P.top, 0.2));
          g.fillRect(-b.cx, S - 4, b.w, 2.5);
        });
        break;
      }
      case 'dobbs': {
        const hem = hw + d.flare;
        const pts: [number, number][] = [
          [-cw * 0.55, -T + 4], [cw * 0.55, -T + 4], [cw * 0.95, -T + 14], [cw + 4 + bf, -T * 0.55], [cw + 6 + bf, -T * 0.2],
          [hw + 7 + bf, S * 0.4], [hem + bf, S], [hem + bf - 4, S + 3], [-hem + 4, S + 3], [-hem, S], [-hw - 5, S * 0.4],
          [-cw - 3, -T * 0.2], [-cw - 2, -T * 0.55], [-cw * 0.9, -T + 12],
        ];
        body(pts, P.top, 0.22);
        clipTo(pts, () => {
          lineStyle(g, 0x000000, 1.1, 0.18);
          for (let i = -3; i <= 3; i++) {
            g.beginPath(); g.moveTo(i * 5, T * 0.0); g.quadraticCurveTo(i * 8, S * 0.5, i * 10, S); g.stroke();
          }
          g.fillStyle = hex(0xf0e4cd);
          g.beginPath(); g.ellipse(cw * 0.15, -T + 6, cw * 0.7, 6, 0, 0, Math.PI * 2); g.fill();
        });
        break;
      }
    }
  });
}

function paintApron(scene: Phaser.Scene, def: NpcDef): void {
  const d = DIMS[def.id];
  const P = def.palette;
  const w = d.chestW * 0.78;
  const h = d.torsoH * 0.82 + d.skirt + 1;
  const col = def.id === 'nell' ? 0xf7f2e6 : P.accent;
  canvasTex(scene, `npc:${def.id}:apron`, w + 14, h + 4, (g) => {
    const ox = (w + 14) / 2;
    const flare = def.id === 'dobbs' ? 12 : 8;
    const top = 2;
    const pts: [number, number][] = [
      [ox - w * 0.28, top], [ox + w * 0.28, top], [ox + w * 0.34, top + 6], [ox + w * 0.4, top + h * 0.35],
      [ox + w * 0.5 + flare, top + h], [ox + w * 0.48, top + h + 1], [ox - w * 0.5, top + h + 1], [ox - w * 0.5 - flare + 4, top + h],
      [ox - w * 0.38, top + h * 0.35], [ox - w * 0.34, top + 6],
    ];
    solid(g, () => smooth(g, pts), col, { x: ox - w, y: top, w: w * 2, h }, { shine: 0.2, shadow: 0.14, outline: 0xb9ae9a, lw: 1.4 });
    // ruffled hem
    g.fillStyle = rgba(0xffffff, 0.5);
    g.fillRect(ox - w * 0.5, top + h - 4, w + flare, 2.5);
    if (def.id === 'dobbs') {
      // pocket
      solid(g, () => { g.beginPath(); g.roundRect(ox - w * 0.18, top + h * 0.55, w * 0.42, h * 0.22, 3); }, shade(col, -0.06), { x: ox - w * 0.2, y: top + h * 0.5, w: w * 0.5, h: h * 0.3 }, { shine: 0.1, outline: 0xb9ae9a, lw: 1.2 });
    } else {
      // bib frill
      lineStyle(g, 0xb9ae9a, 1.1, 0.8);
      g.beginPath(); g.moveTo(ox - w * 0.27, top + 7); g.lineTo(ox + w * 0.27, top + 7); g.stroke();
    }
    // waist tie
    lineStyle(g, shade(col, -0.12), 2.2);
    g.beginPath(); g.moveTo(ox - w * 0.36, top + h * 0.3); g.lineTo(ox + w * 0.38, top + h * 0.3); g.stroke();
    solid(g, () => smooth(g, [[ox - w * 0.38, top + h * 0.3], [ox - w * 0.55, top + h * 0.24], [ox - w * 0.6, top + h * 0.4], [ox - w * 0.4, top + h * 0.34]]), col, { x: 0, y: 0, w: 30, h: 30 }, { shine: 0.1, outline: 0xb9ae9a, lw: 1 });
  });
}

function paintTails(scene: Phaser.Scene, def: NpcDef): void {
  const P = def.palette;
  canvasTex(scene, 'npc:pruitt:tails', 26, 50, (g) => {
    const pts: [number, number][] = [[4, 0], [22, 0], [20, 18], [17, 46], [13, 48], [9, 34], [5, 46], [1, 44], [3, 16]];
    solid(g, () => smooth(g, pts), shade(P.top, -0.1), { x: 0, y: 0, w: 26, h: 50 }, { shine: 0.1, shadow: 0.35 });
    lineStyle(g, 0xffffff, 1, 0.12);
    g.beginPath(); g.moveTo(9, 4); g.lineTo(9, 32); g.stroke();
  });
}

function paintCane(scene: Phaser.Scene): void {
  canvasTex(scene, 'npc:hester:cane', 20, 80, (g) => {
    // shaft (tip at bottom-center), curved brass handle at the top
    const grad = lin(g, 8, 0, 12, 0, [[0, 0x8a5a36], [1, 0x4c2e1b]]);
    g.fillStyle = grad;
    g.beginPath(); g.roundRect(8, 10, 4, 69, 2); g.fill();
    lineStyle(g, outlineOf(0x6b4127), 0.9, 0.7);
    g.beginPath(); g.roundRect(8, 10, 4, 69, 2); g.stroke();
    g.fillStyle = hex(PAL.brass);
    g.beginPath(); g.roundRect(7.5, 60, 5, 4, 1.5); g.fill();
    lineStyle(g, PAL.brass, 4);
    g.beginPath();
    g.moveTo(10, 12);
    g.quadraticCurveTo(10, 2, 15, 3);
    g.quadraticCurveTo(19, 4, 18, 8);
    g.stroke();
    lineStyle(g, shade(PAL.brass, 0.5), 1.2, 0.7);
    g.beginPath(); g.moveTo(11, 9); g.quadraticCurveTo(12, 4, 15, 4.4); g.stroke();
  });
}

// ------------------------------------------------------------------ faces ----

interface FaceLook { skin: number; hair: number; id: string }

function paintFace(scene: Phaser.Scene, def: NpcDef, face: Face): void {
  const d = DIMS[def.id];
  const b = headBox(d);
  const L: FaceLook = { skin: def.palette.skin, hair: def.palette.hair, id: def.id };
  canvasTex(scene, `face:${def.id}:${face}`, b.w, b.h, (g) => drawFace(g, d, b.cx, b.cy, L, face));
}

function drawFace(g: Ctx2D, d: Dims, cx: number, cy: number, L: FaceLook, face: Face): void {
  const rx = d.headW / 2;
  const ry = d.headH / 2;
  const hh = d.headH;
  const ink = PAL.ink;
  const brow = shade(mix(L.hair, PAL.ink, 0.35), -0.1);
  const lowMouth = L.id === 'augustus' ? 0.1 : 0;
  // eye anchor points: near eye and far eye (3/4 view)
  const e1x = cx + rx * 0.2;
  const e2x = cx + rx * 0.66;
  const ey = cy + ry * 0.08;
  const er = hh * 0.1;
  const mx = cx + rx * 0.5;
  const my = cy + ry * (0.56 + lowMouth);

  // cheeks (blush) — stronger for Dobbs/Nell/Toby
  const blush = L.id === 'dobbs' ? 0.5 : L.id === 'toby' || L.id === 'nell' ? 0.4 : 0.28;
  g.fillStyle = rad(g, cx + rx * 0.3, cy + ry * 0.5, 0, hh * 0.13, [[0, 0xff7a8a, blush], [1, 0xff7a8a, 0]]);
  g.fillRect(cx - rx * 0.2, cy + ry * 0.1, rx * 1.2, ry * 0.9);
  if (face === 'scared' || face === 'terror' || face === 'nervous') {
    // blanched, cool tint
    g.fillStyle = rgba(0xcfe3ff, face === 'terror' ? 0.16 : 0.09);
    ellipse(g, cx + rx * 0.1, cy, rx * 0.9, ry * 0.9);
    g.fill();
  }

  const eyeOpen = (x: number, y: number, r: number, scale = 1, look = 0, sclera = 0): void => {
    const rr = r * scale;
    if (sclera > 0) {
      g.fillStyle = '#fbf7ee';
      ellipse(g, x, y, rr * 1.2 * sclera, rr * 1.32 * sclera);
      g.fill();
      lineStyle(g, ink, 1.3, 0.85);
      ellipse(g, x, y, rr * 1.2 * sclera, rr * 1.32 * sclera);
      g.stroke();
      const pr = rr * (sclera > 1 ? 0.5 : 0.62);
      g.fillStyle = hex(ink);
      disc(g, x + look * rr * 0.4, y, pr);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      disc(g, x + look * rr * 0.4 + pr * 0.35, y - pr * 0.35, pr * 0.32);
      g.fill();
      return;
    }
    g.fillStyle = hex(ink);
    ellipse(g, x + look * 1.2, y, rr * 0.84, rr * 1.06);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    disc(g, x + look * 1.2 + rr * 0.28, y - rr * 0.38, rr * 0.3);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    disc(g, x + look * 1.2 - rr * 0.25, y + rr * 0.35, rr * 0.14);
    g.fill();
  };
  const eyeClosedArc = (x: number, y: number, r: number, up = false): void => {
    lineStyle(g, ink, 2);
    g.beginPath();
    if (up) g.arc(x, y + r * 0.2, r * 0.8, Math.PI * 1.1, Math.PI * 1.9);
    else g.arc(x, y - r * 0.2, r * 0.8, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  };
  const browLine = (x: number, y: number, len: number, tilt: number, w = 2.6): void => {
    lineStyle(g, brow, w);
    g.beginPath();
    g.moveTo(x - len / 2, y + tilt * -len * 0.5);
    g.quadraticCurveTo(x, y - Math.abs(tilt) * 2 - 1.2, x + len / 2, y + tilt * len * 0.5);
    g.stroke();
  };
  const mouthOval = (x: number, y: number, w: number, h: number, tongue = false): void => {
    g.fillStyle = '#5a2230';
    ellipse(g, x, y, w, h);
    g.fill();
    if (tongue) {
      g.save();
      ellipse(g, x, y, w, h);
      g.clip();
      g.fillStyle = '#d9707e';
      ellipse(g, x, y + h * 0.65, w * 0.7, h * 0.5);
      g.fill();
      g.restore();
    }
    lineStyle(g, ink, 1.3, 0.9);
    ellipse(g, x, y, w, h);
    g.stroke();
  };
  const browY = ey - er * 2.1;

  switch (face) {
    case 'calm': {
      eyeOpen(e1x, ey, er);
      eyeOpen(e2x, ey, er * 0.88);
      browLine(e1x, browY, er * 2.2, 0.05);
      browLine(e2x, browY + 0.5, er * 1.9, 0.05);
      lineStyle(g, ink, 1.8, 0.9);
      g.beginPath(); g.arc(mx, my - 3, hh * 0.085, 0.25, Math.PI - 0.25); g.stroke();
      break;
    }
    case 'blink': {
      eyeClosedArc(e1x, ey, er);
      eyeClosedArc(e2x, ey, er * 0.88);
      browLine(e1x, browY + 1, er * 2.2, 0.05);
      browLine(e2x, browY + 1.5, er * 1.9, 0.05);
      lineStyle(g, ink, 1.8, 0.9);
      g.beginPath(); g.arc(mx, my - 3, hh * 0.085, 0.25, Math.PI - 0.25); g.stroke();
      break;
    }
    case 'curious': {
      eyeOpen(e1x, ey, er, 1.12);
      eyeOpen(e2x, ey, er * 0.88, 1.12);
      browLine(e1x, browY - 2, er * 2.2, -0.12);
      browLine(e2x, browY - 5, er * 1.9, -0.28);
      mouthOval(mx, my - 1, hh * 0.05, hh * 0.06);
      break;
    }
    case 'skeptic': {
      // half-lidded eyes, one brow cocked, a flat smirk
      eyeOpen(e1x, ey, er, 0.95);
      eyeOpen(e2x, ey, er * 0.88, 0.95);
      g.save();
      g.fillStyle = hex(shade(L.skin, -0.04));
      for (const [ex, rr] of [[e1x, er], [e2x, er * 0.88]]) {
        g.beginPath();
        g.rect(ex - rr * 1.2, ey - rr * 1.4, rr * 2.4, rr * 1.4);
        g.fill();
        lineStyle(g, ink, 1.8, 0.95);
        g.beginPath(); g.moveTo(ex - rr * 1.0, ey - rr * 0.1); g.lineTo(ex + rr * 1.0, ey - rr * 0.1); g.stroke();
      }
      g.restore();
      browLine(e1x, browY + 1, er * 2.3, 0.18);
      browLine(e2x, browY - 4, er * 2.0, -0.3);
      lineStyle(g, ink, 1.9, 0.9);
      g.beginPath(); g.moveTo(mx - hh * 0.09, my); g.quadraticCurveTo(mx, my + 1, mx + hh * 0.1, my - 3); g.stroke();
      break;
    }
    case 'nervous': {
      eyeOpen(e1x, ey, er, 1.0, -1);
      eyeOpen(e2x, ey, er * 0.88, 1.0, -1);
      browLine(e1x, browY - 2, er * 2.1, -0.32);
      browLine(e2x, browY - 3, er * 1.9, 0.3);
      lineStyle(g, ink, 1.8, 0.9);
      g.beginPath();
      g.moveTo(mx - hh * 0.1, my);
      for (let i = 1; i <= 6; i++) g.lineTo(mx - hh * 0.1 + (hh * 0.2 * i) / 6, my + (i % 2 ? -1.8 : 1.4));
      g.stroke();
      break;
    }
    case 'scared': {
      eyeOpen(e1x, ey, er, 1.0, 0, 1.0);
      eyeOpen(e2x, ey, er * 0.88, 1.0, 0, 1.0);
      browLine(e1x, browY - 4, er * 2.2, -0.42);
      browLine(e2x, browY - 5, er * 1.9, 0.42);
      mouthOval(mx, my + 1, hh * 0.06, hh * 0.075);
      break;
    }
    case 'terror': {
      eyeOpen(e1x, ey, er, 1.05, 0, 1.2);
      eyeOpen(e2x, ey, er * 0.88, 1.05, 0, 1.2);
      browLine(e1x, browY - 7, er * 2.4, -0.5);
      browLine(e2x, browY - 8, er * 2.0, 0.5);
      mouthOval(mx, my + 2, hh * 0.1, hh * 0.13, false);
      // sweat bead
      g.fillStyle = 'rgba(160,210,255,0.9)';
      g.beginPath();
      g.moveTo(cx - rx * 0.05, cy - ry * 0.55);
      g.quadraticCurveTo(cx - rx * 0.16, cy - ry * 0.3, cx - rx * 0.05, cy - ry * 0.24);
      g.quadraticCurveTo(cx + rx * 0.06, cy - ry * 0.3, cx - rx * 0.05, cy - ry * 0.55);
      g.fill();
      break;
    }
    case 'scream': {
      // squeezed-shut ^ ^ eyes, huge mouth
      for (const [ex, rr] of [[e1x, er], [e2x, er * 0.88]]) {
        lineStyle(g, ink, 2.3);
        g.beginPath();
        g.moveTo(ex - rr * 1.0, ey + rr * 0.55);
        g.lineTo(ex + rr * 0.1, ey - rr * 0.1);
        g.lineTo(ex - rr * 1.0, ey - rr * 0.75);
        g.stroke();
      }
      browLine(e1x, browY - 6, er * 2.4, -0.4);
      browLine(e2x, browY - 7, er * 2.0, 0.4);
      mouthOval(mx, my + 3, hh * 0.115, hh * 0.19, true);
      break;
    }
  }

  // ---- per-person fixtures (always on top of the expression) ----
  if (L.id === 'augustus') {
    // handlebar moustache
    g.fillStyle = hex(shade(L.hair, -0.05));
    lineStyle(g, outlineOf(L.hair), 1.2);
    const my2 = cy + ry * 0.42;
    g.beginPath();
    g.moveTo(mx - hh * 0.2, my2 + 3);
    g.quadraticCurveTo(mx - hh * 0.12, my2 - 2, mx, my2 - 1);
    g.quadraticCurveTo(mx + hh * 0.14, my2 - 3, mx + hh * 0.26, my2 + 2);
    g.quadraticCurveTo(mx + hh * 0.14, my2 + 4, mx, my2 + 3);
    g.quadraticCurveTo(mx - hh * 0.12, my2 + 5, mx - hh * 0.2, my2 + 3);
    g.closePath();
    g.fill();
    g.stroke();
    lineStyle(g, hex(shade(L.hair, 0.3)) as unknown as number, 0);
  }
  if (L.id === 'hester') {
    // round spectacles
    lineStyle(g, PAL.brass, 1.6, 0.95);
    for (const [ex, rr] of [[e1x, er], [e2x, er * 0.88]]) {
      ellipse(g, ex, ey, rr * 1.7, rr * 1.7);
      g.stroke();
      g.fillStyle = 'rgba(200,225,255,0.18)';
      ellipse(g, ex, ey, rr * 1.7, rr * 1.7);
      g.fill();
    }
    g.beginPath(); g.moveTo(e1x + er * 1.6, ey - 1); g.quadraticCurveTo((e1x + e2x) / 2, ey - er * 1.1, e2x - er * 1.4, ey - 1); g.stroke();
    g.beginPath(); g.moveTo(e1x - er * 1.7, ey); g.lineTo(cx - rx * 0.3, ey - 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(e1x, ey, er * 1.4, 3.6, 4.4); g.stroke();
  }
  if (L.id === 'toby') {
    g.fillStyle = rgba(0xb5683f, 0.55);
    for (const [fx, fy] of [[0.1, 0.4], [0.25, 0.46], [0.4, 0.38], [0.55, 0.45], [0.7, 0.4]]) {
      disc(g, cx + rx * fx, cy + ry * fy, 1.2);
      g.fill();
    }
  }
  if (L.id === 'nell' || L.id === 'marigold') {
    lineStyle(g, ink, 1.4, 0.9);
    g.beginPath(); g.moveTo(e1x - er * 0.9, ey - er * 0.5); g.lineTo(e1x - er * 1.4, ey - er * 0.95); g.stroke();
    g.beginPath(); g.moveTo(e2x + er * 0.8, ey - er * 0.55); g.lineTo(e2x + er * 1.3, ey - er * 0.95); g.stroke();
  }
  if (L.id === 'pruitt') {
    // heavier, severe brows
    lineStyle(g, brow, 1.5, 0.8);
    g.beginPath(); g.moveTo(e1x - er * 1.2, browY + 1); g.lineTo(e1x + er * 1.1, browY - 1); g.stroke();
  }
}

// ----------------------------------------------------------------- props ----

function paintProps(scene: Phaser.Scene): void {
  canvasTex(scene, 'npc:shadow', 90, 22, (g) => {
    g.fillStyle = rad(g, 45, 11, 0, 44, [[0, 0x0a0614, 0.5], [0.6, 0x0a0614, 0.2], [1, 0x0a0614, 0]]);
    g.save();
    g.translate(45, 11); g.scale(1, 0.24); g.translate(-45, -11);
    g.beginPath(); g.arc(45, 11, 44, 0, Math.PI * 2); g.fill();
    g.restore();
  });
  canvasTex(scene, 'npc:prop:book', 22, 16, (g) => {
    solid(g, () => { g.beginPath(); g.roundRect(1, 2, 20, 12, 2); }, 0x7a2f3a, { x: 1, y: 2, w: 20, h: 12 }, { shine: 0.25, lw: 1.1 });
    g.fillStyle = '#f1e3c6';
    g.beginPath(); g.roundRect(3, 3, 16, 9, 1.5); g.fill();
    lineStyle(g, 0x6b4127, 0.9, 0.55);
    g.beginPath(); g.moveTo(11, 3); g.lineTo(11, 12); g.stroke();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(4.5, 5 + i * 2.4); g.lineTo(9.5, 5 + i * 2.4); g.stroke(); g.beginPath(); g.moveTo(12.5, 5 + i * 2.4); g.lineTo(17.5, 5 + i * 2.4); g.stroke(); }
  });
  canvasTex(scene, 'npc:prop:spoon', 12, 30, (g) => {
    lineStyle(g, 0x8a5a36, 2.4);
    g.beginPath(); g.moveTo(6, 28); g.lineTo(6, 8); g.stroke();
    solid(g, () => ellipse(g, 6, 6, 4.2, 5.6), 0xa8754a, { x: 1, y: 0, w: 10, h: 12 }, { shine: 0.3, lw: 1 });
  });
  canvasTex(scene, 'npc:prop:duster', 18, 38, (g) => {
    lineStyle(g, 0x8a5a36, 2.2);
    g.beginPath(); g.moveTo(9, 36); g.lineTo(9, 14); g.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + (i / 8) * 1.8;
      lineStyle(g, i % 2 ? 0xe9dcc2 : 0xf5ecd8, 2.2, 0.95);
      g.beginPath(); g.moveTo(9, 14); g.quadraticCurveTo(9 + Math.sin(a) * 5, 8, 9 + Math.sin(a) * 8, 1 + Math.abs(a) * 3); g.stroke();
    }
  });
  canvasTex(scene, 'npc:prop:toy', 16, 16, (g) => {
    solid(g, () => { g.beginPath(); g.roundRect(1, 1, 14, 14, 3); }, 0xd9534f, { x: 1, y: 1, w: 14, h: 14 }, { shine: 0.35, lw: 1.1 });
    g.fillStyle = hex(0xf2c14e);
    g.font = `bold 9px ${FONT_TITLE}`;
    g.textAlign = 'center';
    g.fillText('A', 8, 12);
  });
  canvasTex(scene, 'npc:chair', 56, 60, (g) => {
    const wood = PAL.wood;
    // back post, seat, legs (side view, facing +x)
    solid(g, () => { g.beginPath(); g.roundRect(8, 4, 5, 56, 2); }, shade(wood, -0.1), { x: 8, y: 4, w: 5, h: 56 }, { shine: 0.2, lw: 1.2 });
    solid(g, () => { g.beginPath(); g.roundRect(8, 10, 4, 20, 2); }, shade(wood, 0.05), { x: 8, y: 10, w: 4, h: 20 }, { shine: 0.2, lw: 1 });
    solid(g, () => { g.beginPath(); g.roundRect(8, 34, 38, 8, 3); }, PAL.woodLight, { x: 8, y: 34, w: 38, h: 8 }, { shine: 0.3, lw: 1.3 });
    solid(g, () => { g.beginPath(); g.roundRect(40, 42, 5, 18, 2); }, shade(wood, -0.1), { x: 40, y: 42, w: 5, h: 18 }, { shine: 0.2, lw: 1.1 });
    solid(g, () => { g.beginPath(); g.roundRect(10, 42, 5, 18, 2); }, shade(wood, -0.1), { x: 10, y: 42, w: 5, h: 18 }, { shine: 0.2, lw: 1.1 });
  });
}

// ---------------------------------------------------------------- emotes ----

function paintEmotes(scene: Phaser.Scene): void {
  const glyph = (key: string, text: string, color: number, size: number, w = 44): void => {
    canvasTex(scene, key, w, 48, (g) => {
      g.font = `700 ${size}px ${FONT_TITLE}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 7;
      g.strokeStyle = rgba(PAL.ink, 0.95);
      g.strokeText(text, w / 2, 25);
      g.lineWidth = 3;
      g.strokeStyle = hex(shade(color, -0.35));
      g.strokeText(text, w / 2, 25);
      g.fillStyle = lin(g, 0, 8, 0, 42, [[0, shade(color, 0.35)], [1, color]]);
      g.fillText(text, w / 2, 25);
    });
  };
  glyph('emote:q', '?', 0xffd36b, 38);
  glyph('emote:ex', '!', 0xffa24d, 40);
  glyph('emote:exex', '!!', 0xff6b57, 36, 52);
  // ellipsis bubble
  canvasTex(scene, 'emote:dots', 48, 40, (g) => {
    solid(g, () => smooth(g, [[6, 8], [42, 8], [44, 24], [30, 28], [24, 36], [20, 28], [6, 26]]), 0xf6efdc, { x: 4, y: 6, w: 40, h: 30 }, { shine: 0.1, shadow: 0.1, outline: PAL.ink, lw: 2 });
    g.fillStyle = hex(PAL.ink);
    for (let i = 0; i < 3; i++) { disc(g, 14 + i * 10, 17, 2.6); g.fill(); }
  });
  canvasTex(scene, 'emote:sweat', 30, 44, (g) => {
    g.beginPath();
    g.moveTo(15, 4);
    g.bezierCurveTo(24, 16, 27, 24, 15, 38);
    g.bezierCurveTo(3, 24, 6, 16, 15, 4);
    g.closePath();
    g.fillStyle = lin(g, 0, 4, 0, 38, [[0, 0xbfe4ff], [1, 0x5aa9e8]]);
    g.fill();
    lineStyle(g, 0x1f4b7a, 2.2, 0.95);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(g, 11, 26, 2.2, 4);
    g.fill();
  });
  glyph('emote:note', '♪', 0xa6e3ff, 38);
  glyph('emote:zzz', 'z', 0xc9c4ff, 34);
}

// ---------------------------------------------------------------- entry ----

export function paintCharacterTextures(scene: Phaser.Scene): void {
  const all: { def: NpcDef; remap: typeof REMAP }[] = [
    ...NPCS.map((def) => ({ def, remap: null })),
    ...GUESTS.map((g) => ({ def: { ...g, id: g.look! } as NpcDef, remap: { from: g.look!, to: g.id } })),
  ];
  for (const { def, remap } of all) {
    REMAP = remap;
    const d = DIMS[def.id];
    const P = def.palette;
    const dress = d.skirt > 0;
    const legColor =
      def.id === 'augustus' || def.id === 'toby' || def.id === 'pruitt' ? P.bottom
        : def.id === 'nell' ? 0x2b2433
          : def.id === 'hester' ? 0x5b5662
            : def.id === 'dobbs' ? 0xb8aa98
              : 0xd9c9b5;
    const shoe = def.id === 'pruitt' ? 0x14101c : def.id === 'toby' ? 0x8a3b2e : def.id === 'nell' ? 0x1c1722 : 0x3a2418;
    const sock = def.id === 'toby' ? 0xf1ead8 : undefined;
    paintLeg(scene, `npc:${def.id}:legL`, d, { color: legColor, shoe, sock, far: true, thin: dress });
    paintLeg(scene, `npc:${def.id}:legR`, d, { color: legColor, shoe, sock, far: false, thin: dress });

    const arm: Omit<ArmLook, 'far'> = (() => {
      switch (def.id) {
        case 'augustus': return { sleeve: P.accent, skin: P.skin, sleeveFrac: 0.86, cuff: 0xe9dcbf };
        case 'marigold': return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.8, cuff: 0xf4ecd8, puff: 1 };
        case 'toby': return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.84 };
        case 'hester': return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.88, cuff: 0xf2e8d5 };
        case 'pruitt': return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.9, glove: true };
        case 'nell': return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.42, cuff: P.accent, puff: 1 };
        default: return { sleeve: P.top, skin: P.skin, sleeveFrac: 0.4 }; // dobbs: rolled sleeves
      }
    })();
    paintArm(scene, `npc:${def.id}:armL`, d, { ...arm, far: true });
    paintArm(scene, `npc:${def.id}:armR`, d, { ...arm, far: false });

    paintTorso(scene, def);
    paintHead(scene, def);
    if (def.id === 'nell' || def.id === 'dobbs') {
      paintHat(scene, def);
      paintApron(scene, def);
    }
    if (def.id === 'pruitt') paintTails(scene, def);
    if (def.id === 'hester') paintCane(scene);
    for (const f of FACES) paintFace(scene, def, f);
  }
  REMAP = null;
  paintProps(scene);
  paintEmotes(scene);
}
