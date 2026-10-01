// Module E art: particle sprites, rings/glows, apparitions and the ghost itself.
// Everything is painted once at boot via canvasTex (ART× resolution).

import Phaser from 'phaser';
import type { ApparitionKind, ParticleKind } from '../types';
import {
  PAL, canvasTex, clipped, ellipse, fill, hex, lin, mix, poly, rad, rgba, rng, rrect, type Ctx2D,
} from './paint';

export const GHOST_FRAMES = 6;
/** Ghost body texture size in world units (body ≈ 70 tall, hem wave adds a little). */
export const GHOST_W = 84;
export const GHOST_H = 92;

export const PARTICLE_KINDS: ParticleKind[] = [
  'wisp', 'spark', 'dust', 'puff', 'ecto', 'notes', 'water', 'feathers', 'paper',
  'embers', 'glass', 'smoke', 'steam', 'stars', 'leaves', 'bubbles', 'coal', 'petals',
];
export const APPARITION_KINDS: ApparitionKind[] = ['figure', 'face', 'hands', 'eyes', 'shadow', 'skull', 'child'];

/** World-unit size of each particle sprite (for sensible default scales). */
export const PARTICLE_SIZE: Record<ParticleKind, [number, number]> = {
  wisp: [28, 28], spark: [18, 18], dust: [10, 10], puff: [56, 56], ecto: [28, 28], notes: [24, 30],
  water: [14, 20], feathers: [30, 14], paper: [20, 26], embers: [14, 14], glass: [16, 16], smoke: [64, 64],
  steam: [52, 52], stars: [22, 22], leaves: [22, 16], bubbles: [20, 20], coal: [14, 14], petals: [18, 14],
};

export const APPARITION_SIZE: Record<ApparitionKind, [number, number]> = {
  figure: [130, 240], face: [170, 190], hands: [210, 150], eyes: [170, 76], shadow: [150, 240], skull: [150, 170], child: [96, 156],
};

// ---------------------------------------------------------------- helpers ----

function softBlob(g: Ctx2D, cx: number, cy: number, r: number, color: number, a: number): void {
  g.fillStyle = rad(g, cx, cy, 0, r, [[0, color, a], [0.55, color, a * 0.45], [1, color, 0]]);
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

function star(g: Ctx2D, cx: number, cy: number, r1: number, r2: number, n: number, rot = -Math.PI / 2): void {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

// ------------------------------------------------------------- ghost body ----

/**
 * Traces the sheet-ghost silhouette into the current path. Wavy hem phase in radians.
 * cx = horizontal center. Head dome top at y=8, hem near y=h-6.
 */
function ghostPath(g: Ctx2D, cx: number, w: number, h: number, phase: number): void {
  const top = 8;
  const hemY = h - 10;
  const half = 29; // body half-width at the hem
  const steps = 14;
  g.beginPath();
  g.moveTo(cx - 17, 34);
  // head dome
  g.bezierCurveTo(cx - 19, top + 2, cx - 9, top - 2, cx, top - 2);
  g.bezierCurveTo(cx + 9, top - 2, cx + 19, top + 2, cx + 17, 34);
  // right flank, widening like a draped sheet
  g.bezierCurveTo(cx + 20, 52, cx + half - 3, 62, cx + half, hemY - 6);
  // wavy hem, right → left
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = cx + half - u * half * 2;
    const amp = 5.2 * (0.55 + 0.45 * Math.sin(u * Math.PI));
    const y = hemY + Math.sin(u * Math.PI * 3.2 + phase) * amp + Math.sin(u * 9 + phase * 2) * 1.2;
    g.lineTo(x, y);
  }
  // left flank
  g.bezierCurveTo(cx - half + 3, 62, cx - 20, 52, cx - 17, 34);
  g.closePath();
  void w;
}

function paintGhostBody(g: Ctx2D, w: number, h: number, frame: number): void {
  const cx = w / 2;
  const phase = (frame / GHOST_FRAMES) * Math.PI * 2;
  // soft outer aura baked in (cheap, keeps edges feathered)
  g.save();
  g.shadowColor = rgba(PAL.ghostCyan, 0.55);
  g.shadowBlur = 9;
  ghostPath(g, cx, w, h, phase);
  g.fillStyle = rgba(PAL.ghost, 0.5);
  g.fill();
  g.restore();

  // little nub arms (behind the sheet, drawn first so the body overlaps)
  const armSway = Math.sin(phase) * 1.6;
  for (const s of [-1, 1]) {
    g.save();
    g.translate(cx + s * 27, 56 + armSway * s);
    g.rotate(s * (0.5 + Math.sin(phase + s) * 0.08));
    ellipse(g, 0, 0, 6.5, 11);
    fill(g, lin(g, 0, -10, 0, 10, [[0, 0xf4feff, 0.96], [1, 0xc9efff, 0.9]]), rgba(PAL.ghostCyan, 0.5), 0.9);
    g.restore();
  }

  ghostPath(g, cx, w, h, phase);
  fill(g, lin(g, 0, 6, 0, h, [[0, 0xffffff, 0.98], [0.45, 0xeefcff, 0.96], [0.85, 0xc3ecfb, 0.9], [1, 0xa9e0f4, 0.78]]), rgba(PAL.ghostCyan, 0.65), 1.1);

  clipped(g, () => ghostPath(g, cx, w, h, phase), () => {
    // cool belly shade on the right, warm rim on the left (candlelight)
    g.fillStyle = lin(g, cx - 34, 0, cx + 34, 0, [[0, 0xffe9c8, 0.22], [0.3, 0xffffff, 0], [0.65, 0x8fc7e6, 0], [1, 0x7fb4dc, 0.32]]);
    g.fillRect(0, 0, w, h);
    // head highlight
    g.fillStyle = rad(g, cx - 6, 20, 0, 24, [[0, 0xffffff, 0.85], [1, 0xffffff, 0]]);
    g.fillRect(0, 0, w, 60);
    // fabric folds
    g.strokeStyle = rgba(0x7fb4dc, 0.22);
    g.lineWidth = 1.1;
    for (const [x0, x1] of [[-7, -13], [4, 8], [13, 22]] as [number, number][]) {
      g.beginPath();
      g.moveTo(cx + x0, 54);
      g.quadraticCurveTo(cx + (x0 + x1) / 2 + 2, 70, cx + x1, h - 12);
      g.stroke();
    }
    // hem fade
    g.fillStyle = lin(g, 0, h - 22, 0, h, [[0, 0xffffff, 0], [1, 0xa9e0f4, 0.45]]);
    g.fillRect(0, h - 22, w, 22);
  });
}

function paintGhostParts(scene: Phaser.Scene): void {
  for (let i = 0; i < GHOST_FRAMES; i++) {
    canvasTex(scene, `ghost:body${i}`, GHOST_W, GHOST_H, (g, w, h) => paintGhostBody(g, w, h, i));
  }
  // one big dark oval eye with two highlights
  canvasTex(scene, 'ghost:eye', 14, 20, (g) => {
    ellipse(g, 7, 10, 5.4, 8.2);
    fill(g, lin(g, 0, 2, 0, 18, [[0, 0x2a2142], [1, PAL.ink]]));
    g.fillStyle = rgba(0xffffff, 0.96);
    ellipse(g, 5.2, 6.4, 1.9, 2.3);
    g.fill();
    g.fillStyle = rgba(0xffffff, 0.7);
    ellipse(g, 8.6, 12.4, 0.9, 1);
    g.fill();
  });
  canvasTex(scene, 'ghost:blush', 16, 10, (g) => {
    g.fillStyle = rad(g, 8, 5, 0, 8, [[0, PAL.rose, 0.55], [1, PAL.rose, 0]]);
    g.fillRect(0, 0, 16, 10);
  });
  // tiny mischievous smile
  canvasTex(scene, 'ghost:mouth', 16, 10, (g) => {
    g.strokeStyle = hex(PAL.ink);
    g.lineWidth = 1.7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(3, 3);
    g.quadraticCurveTo(8, 9, 13, 3);
    g.stroke();
    g.fillStyle = rgba(PAL.rose, 0.7);
    g.beginPath();
    g.moveTo(5.2, 4.8);
    g.quadraticCurveTo(8, 8.4, 10.8, 4.8);
    g.quadraticCurveTo(8, 6.2, 5.2, 4.8);
    g.fill();
  });
}

// ------------------------------------------------------------- particles ----

function paintParticle(scene: Phaser.Scene, kind: ParticleKind): void {
  const [w, h] = PARTICLE_SIZE[kind];
  const cx = w / 2;
  const cy = h / 2;
  canvasTex(scene, `fx:${kind}`, w, h, (g) => {
    switch (kind) {
      case 'wisp': {
        softBlob(g, cx, cy, w / 2, 0xffffff, 0.95);
        g.fillStyle = rad(g, cx, cy, 0, w * 0.2, [[0, 0xffffff, 1], [1, 0xffffff, 0]]);
        g.beginPath();
        g.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'spark': {
        softBlob(g, cx, cy, w / 2, 0xffd9a0, 0.55);
        star(g, cx, cy, w / 2 - 0.5, 1.6, 4);
        fill(g, '#fff6dc');
        break;
      }
      case 'dust': {
        softBlob(g, cx, cy, w / 2, 0xfff1d6, 0.9);
        break;
      }
      case 'puff':
      case 'smoke':
      case 'steam': {
        const col = kind === 'smoke' ? 0x9a94a6 : 0xffffff;
        const a = kind === 'smoke' ? 0.7 : 0.55;
        const r = rng(kind.length * 31 + 5);
        for (let i = 0; i < 7; i++) {
          const ang = r() * Math.PI * 2;
          const d = r() * w * 0.2;
          softBlob(g, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, w * (0.22 + r() * 0.18), col, a);
        }
        break;
      }
      case 'ecto': {
        softBlob(g, cx, cy, w / 2, PAL.ecto, 0.9);
        softBlob(g, cx, cy, w * 0.22, 0xffffff, 0.95);
        break;
      }
      case 'notes': {
        g.fillStyle = hex(PAL.gold);
        g.strokeStyle = hex(PAL.gold);
        ellipse(g, 8, 23, 5.4, 4);
        g.save();
        g.translate(8, 23);
        g.rotate(-0.4);
        g.translate(-8, -23);
        ellipse(g, 8, 23, 5.6, 3.9);
        g.fill();
        g.restore();
        g.lineWidth = 2.1;
        g.beginPath();
        g.moveTo(12.6, 22);
        g.lineTo(12.6, 4);
        g.stroke();
        g.beginPath();
        g.moveTo(12.6, 4);
        g.bezierCurveTo(16, 8, 21, 9, 19, 16);
        g.bezierCurveTo(18.5, 12, 15.5, 11.5, 12.6, 11);
        g.fill();
        break;
      }
      case 'water': {
        g.beginPath();
        g.moveTo(7, 1.5);
        g.bezierCurveTo(10, 8, 13, 11, 13, 14);
        g.bezierCurveTo(13, 17.4, 10.3, 19, 7, 19);
        g.bezierCurveTo(3.7, 19, 1, 17.4, 1, 14);
        g.bezierCurveTo(1, 11, 4, 8, 7, 1.5);
        fill(g, lin(g, 0, 2, 0, 19, [[0, 0xd8f4ff, 0.95], [1, 0x6fc3e8, 0.95]]), rgba(0xffffff, 0.5), 0.8);
        g.fillStyle = rgba(0xffffff, 0.8);
        ellipse(g, 4.8, 13, 1.1, 2.2);
        g.fill();
        break;
      }
      case 'feathers': {
        g.save();
        g.translate(cx, cy);
        g.rotate(-0.25);
        g.beginPath();
        g.moveTo(-14, 0);
        g.bezierCurveTo(-8, -7.5, 8, -7.5, 14, 0);
        g.bezierCurveTo(8, 6, -8, 6.5, -14, 0);
        fill(g, lin(g, 0, -7, 0, 6, [[0, 0xffffff], [1, 0xe4dccb]]), rgba(0xb9ad98, 0.8), 0.7);
        g.strokeStyle = rgba(0xb9ad98, 0.9);
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(-14, 0);
        g.lineTo(13, 0);
        g.stroke();
        g.restore();
        break;
      }
      case 'paper': {
        g.save();
        g.translate(cx, cy);
        g.rotate(0.12);
        poly(g, [[-8, -11], [8, -12], [9, 11], [-9, 12]]);
        fill(g, lin(g, -8, -11, 8, 12, [[0, 0xfffaf0], [1, 0xe9dec0]]), rgba(0x8a7a5a, 0.6), 0.7);
        g.strokeStyle = rgba(0x6b5d44, 0.55);
        g.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.moveTo(-5, -6 + i * 4.2);
          g.lineTo(5 - (i % 2) * 2, -6 + i * 4.2);
          g.stroke();
        }
        g.restore();
        break;
      }
      case 'embers': {
        softBlob(g, cx, cy, w / 2, 0xff7a30, 0.9);
        softBlob(g, cx, cy, w * 0.2, 0xffe2a0, 1);
        break;
      }
      case 'glass': {
        poly(g, [[8, 1], [15, 11], [9, 15], [1, 9]]);
        fill(g, lin(g, 1, 1, 15, 15, [[0, 0xffffff, 0.95], [0.6, 0xbfe6f5, 0.75], [1, 0x8fc4dc, 0.8]]), rgba(0xffffff, 0.8), 0.7);
        break;
      }
      case 'stars': {
        softBlob(g, cx, cy, w / 2, PAL.gold, 0.45);
        star(g, cx, cy, w / 2 - 2, 4, 5);
        fill(g, lin(g, 0, 0, w, h, [[0, 0xfff3c8], [1, PAL.gold]]), rgba(0xffffff, 0.7), 0.7);
        break;
      }
      case 'leaves': {
        g.save();
        g.translate(cx, cy);
        g.rotate(-0.3);
        g.beginPath();
        g.moveTo(-10, 0);
        g.bezierCurveTo(-5, -8, 6, -8, 10, 0);
        g.bezierCurveTo(6, 7, -5, 7, -10, 0);
        fill(g, lin(g, 0, -7, 0, 7, [[0, 0xc2883f], [1, 0x7b4a22]]), rgba(0x4a2a12, 0.6), 0.7);
        g.strokeStyle = rgba(0x4a2a12, 0.6);
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(9, 0);
        g.stroke();
        g.restore();
        break;
      }
      case 'bubbles': {
        ellipse(g, cx, cy, w / 2 - 1.2, h / 2 - 1.2);
        fill(g, rad(g, cx, cy, 2, 9, [[0, 0xffffff, 0.05], [0.8, 0xbfe9ff, 0.18], [1, 0xe9fbff, 0.7]]), rgba(0xffffff, 0.75), 0.9);
        g.fillStyle = rgba(0xffffff, 0.9);
        ellipse(g, 6.5, 6.2, 2.2, 1.3);
        g.fill();
        break;
      }
      case 'coal': {
        poly(g, [[3, 4], [9, 1.5], [12.5, 6], [11, 11.5], [5, 12.5], [1.5, 8]]);
        fill(g, lin(g, 0, 0, 12, 12, [[0, 0x4a4553], [1, 0x14111b]]), rgba(0x000000, 0.5), 0.7);
        g.fillStyle = rgba(0xffffff, 0.3);
        poly(g, [[4, 4.4], [8, 2.8], [8.6, 4.6], [5, 6]]);
        g.fill();
        break;
      }
      case 'petals': {
        g.save();
        g.translate(cx, cy);
        g.rotate(0.35);
        g.beginPath();
        g.moveTo(-8, 1);
        g.bezierCurveTo(-7, -7, 6, -7.5, 8.5, 0);
        g.bezierCurveTo(6, 6.5, -6, 6.5, -8, 1);
        fill(g, lin(g, 0, -6, 0, 6, [[0, 0xe9a3ae], [1, PAL.rose]]), rgba(0x8a3a4a, 0.5), 0.6);
        g.restore();
        break;
      }
    }
  });
}

// ----------------------------------------------------------- apparitions ----

/** Glowy hollow-eyed face used by several apparitions. */
function hollowEye(g: Ctx2D, x: number, y: number, rx: number, ry: number, glow = 0xbfeaff): void {
  ellipse(g, x, y, rx, ry);
  fill(g, lin(g, 0, y - ry, 0, y + ry, [[0, 0x0d0a18], [1, 0x241a3a]]));
  g.fillStyle = rgba(glow, 0.9);
  ellipse(g, x - rx * 0.3, y - ry * 0.25, rx * 0.22, ry * 0.2);
  g.fill();
}

function ghostFill(g: Ctx2D, y0: number, y1: number, alpha = 0.88): CanvasGradient {
  return lin(g, 0, y0, 0, y1, [[0, 0xffffff, alpha], [0.6, 0xdff6ff, alpha * 0.92], [1, 0xa9d9ee, alpha * 0.55]]);
}

function paintApparition(scene: Phaser.Scene, kind: ApparitionKind): void {
  const [w, h] = APPARITION_SIZE[kind];
  const cx = w / 2;
  canvasTex(scene, `app:${kind}`, w, h, (g) => {
    g.shadowColor = rgba(PAL.ghostCyan, 0.7);
    g.shadowBlur = 14;
    switch (kind) {
      case 'figure': {
        // tall draped sheet figure, arms hanging, wavy hem fading to nothing
        g.beginPath();
        g.moveTo(cx - 20, 58);
        g.bezierCurveTo(cx - 26, 8, cx + 26, 8, cx + 20, 58);
        g.bezierCurveTo(cx + 30, 110, cx + 50, 160, cx + 50, h - 26);
        for (let i = 0; i <= 10; i++) {
          const u = i / 10;
          g.lineTo(cx + 50 - u * 100, h - 20 + Math.sin(u * Math.PI * 4) * 9);
        }
        g.bezierCurveTo(cx - 50, 160, cx - 30, 110, cx - 20, 58);
        g.closePath();
        fill(g, ghostFill(g, 10, h), rgba(PAL.ghostCyan, 0.8), 1.4);
        g.shadowBlur = 0;
        // long thin arms
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + s * 22, 78);
          g.bezierCurveTo(cx + s * 52, 100, cx + s * 58, 138, cx + s * 54, 168);
          g.lineWidth = 8;
          g.lineCap = 'round';
          g.strokeStyle = rgba(0xeafcff, 0.7);
          g.stroke();
        }
        hollowEye(g, cx - 10, 42, 5.4, 10);
        hollowEye(g, cx + 10, 42, 5.4, 10);
        ellipse(g, cx, 66, 5, 8);
        fill(g, '#140f24');
        break;
      }
      case 'face': {
        // big round ghost face rushing at the viewer
        ellipse(g, cx, h / 2 - 4, w / 2 - 14, h / 2 - 12);
        fill(g, rad(g, cx, h / 2 - 20, 6, w / 2, [[0, 0xffffff, 0.92], [0.7, 0xdff6ff, 0.84], [1, 0xa6dcf0, 0.5]]), rgba(PAL.ghostCyan, 0.8), 1.5);
        g.shadowBlur = 0;
        hollowEye(g, cx - 34, h / 2 - 24, 14, 22);
        hollowEye(g, cx + 34, h / 2 - 24, 14, 22);
        // gaping "O" mouth
        ellipse(g, cx, h / 2 + 38, 20, 28);
        fill(g, lin(g, 0, h / 2 + 10, 0, h / 2 + 66, [[0, 0x0d0a18], [1, 0x2a1f44]]));
        g.fillStyle = rgba(PAL.rose, 0.45);
        ellipse(g, cx - 60, h / 2 + 4, 14, 8);
        g.fill();
        ellipse(g, cx + 60, h / 2 + 4, 14, 8);
        g.fill();
        break;
      }
      case 'hands': {
        for (const s of [-1, 1]) {
          g.save();
          g.translate(cx + s * 52, h - 20);
          g.rotate(s * 0.22);
          // arm
          g.beginPath();
          g.moveTo(-14, 20);
          g.lineTo(-11, -52);
          g.lineTo(11, -52);
          g.lineTo(14, 20);
          g.closePath();
          fill(g, ghostFill(g, -52, 20, 0.7));
          // palm + fingers
          rrect(g, -17, -92, 34, 44, 12);
          fill(g, ghostFill(g, -92, -48), rgba(PAL.ghostCyan, 0.75), 1.2);
          for (let i = 0; i < 4; i++) {
            const fx = -14 + i * 9.4;
            const fh = 30 - Math.abs(i - 1.5) * 4;
            rrect(g, fx, -92 - fh + 6, 7.6, fh, 3.6);
            fill(g, ghostFill(g, -120, -90), rgba(PAL.ghostCyan, 0.7), 1);
          }
          rrect(g, s * 14 - (s > 0 ? 0 : 14), -76, 14, 24, 6);
          fill(g, ghostFill(g, -76, -50, 0.85), rgba(PAL.ghostCyan, 0.7), 1);
          g.restore();
        }
        break;
      }
      case 'eyes': {
        // pair of glowing eyes out of the dark
        g.shadowBlur = 0;
        for (const s of [-1, 1]) {
          const ex = cx + s * 38;
          const ey = h / 2;
          g.fillStyle = rad(g, ex, ey, 0, 40, [[0, 0xfff2b0, 0.55], [1, 0xfff2b0, 0]]);
          g.fillRect(ex - 42, ey - 42, 84, 84);
          g.beginPath();
          g.moveTo(ex - 26, ey + 4 * s);
          g.quadraticCurveTo(ex, ey - 24, ex + 26, ey + 4 * s * -1);
          g.quadraticCurveTo(ex, ey + 14, ex - 26, ey + 4 * s);
          g.closePath();
          fill(g, lin(g, ex, ey - 20, ex, ey + 14, [[0, 0xfffbe0], [1, 0xffd36a]]), rgba(0xffe9a0, 0.9), 1);
          ellipse(g, ex + s * -2, ey - 3, 5, 9);
          fill(g, '#140f24');
        }
        break;
      }
      case 'shadow': {
        // tall hunched silhouette, ink violet, two pale eyes
        g.shadowColor = rgba(PAL.violet, 0.6);
        g.shadowBlur = 16;
        g.beginPath();
        g.moveTo(cx - 14, 40);
        g.bezierCurveTo(cx - 30, 6, cx + 30, 6, cx + 16, 44);
        g.bezierCurveTo(cx + 42, 76, cx + 58, 150, cx + 56, h - 14);
        for (let i = 0; i <= 12; i++) {
          const u = i / 12;
          g.lineTo(cx + 56 - u * 112, h - 12 + Math.sin(u * Math.PI * 5) * 10);
        }
        g.bezierCurveTo(cx - 60, 150, cx - 40, 76, cx - 14, 40);
        g.closePath();
        fill(g, lin(g, 0, 0, 0, h, [[0, 0x2a1f48, 0.96], [1, 0x0d0a18, 0.78]]));
        g.shadowBlur = 0;
        for (const s of [-1, 1]) {
          ellipse(g, cx + s * 9, 34, 4.2, 7);
          fill(g, '#fffbe6');
        }
        break;
      }
      case 'skull': {
        // cute, cartoon skull (round, big sockets) — spooky not gory
        g.beginPath();
        g.moveTo(cx - 52, 78);
        g.bezierCurveTo(cx - 60, 10, cx + 60, 10, cx + 52, 78);
        g.bezierCurveTo(cx + 50, 100, cx + 34, 104, cx + 32, 116);
        g.lineTo(cx + 32, 138);
        g.quadraticCurveTo(cx + 32, 148, cx + 22, 148);
        g.lineTo(cx - 22, 148);
        g.quadraticCurveTo(cx - 32, 148, cx - 32, 138);
        g.lineTo(cx - 32, 116);
        g.bezierCurveTo(cx - 34, 104, cx - 50, 100, cx - 52, 78);
        g.closePath();
        fill(g, lin(g, 0, 10, 0, 150, [[0, 0xfffaf0, 0.95], [1, 0xd8d0bc, 0.85]]), rgba(0x9a9078, 0.9), 1.4);
        g.shadowBlur = 0;
        hollowEye(g, cx - 22, 76, 15, 17, 0xffb0a0);
        hollowEye(g, cx + 22, 76, 15, 17, 0xffb0a0);
        poly(g, [[cx, 96], [cx - 6, 112], [cx + 6, 112]]);
        fill(g, '#140f24');
        g.strokeStyle = rgba(0x6b6048, 0.8);
        g.lineWidth = 1.6;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(cx + i * 10, 126);
          g.lineTo(cx + i * 10, 148);
          g.stroke();
        }
        break;
      }
      case 'child': {
        // small ghost-child: round head, tiny nub arms, wobbly hem, sad big eyes
        g.beginPath();
        g.moveTo(cx - 24, 52);
        g.bezierCurveTo(cx - 28, 4, cx + 28, 4, cx + 24, 52);
        g.bezierCurveTo(cx + 30, 90, cx + 40, 120, cx + 40, h - 14);
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          g.lineTo(cx + 40 - u * 80, h - 10 + Math.sin(u * Math.PI * 3) * 8);
        }
        g.bezierCurveTo(cx - 40, 120, cx - 30, 90, cx - 24, 52);
        g.closePath();
        fill(g, ghostFill(g, 6, h, 0.85), rgba(PAL.ghostCyan, 0.8), 1.3);
        g.shadowBlur = 0;
        hollowEye(g, cx - 11, 40, 6.4, 10);
        hollowEye(g, cx + 11, 40, 6.4, 10);
        g.strokeStyle = '#140f24';
        g.lineWidth = 1.6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx - 5, 62);
        g.quadraticCurveTo(cx, 58, cx + 5, 62);
        g.stroke();
        for (const s of [-1, 1]) {
          ellipse(g, cx + s * 34, 82, 7, 13);
          fill(g, rgba(0xeafcff, 0.85));
        }
        break;
      }
    }
  });
}

// ------------------------------------------------------------------ entry ----

export function paintFxTextures(scene: Phaser.Scene): void {
  canvasTex(scene, 'fx:glow', 128, 128, (g, w, h) => {
    g.fillStyle = rad(g, w / 2, h / 2, 0, w / 2, [
      [0, 0xffffff, 1], [0.18, 0xffffff, 0.62], [0.45, 0xffffff, 0.2], [0.75, 0xffffff, 0.05], [1, 0xffffff, 0],
    ]);
    g.fillRect(0, 0, w, h);
  });
  canvasTex(scene, 'fx:ring', 128, 128, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = rad(g, c, c, c * 0.62, c, [
      [0, 0xffffff, 0], [0.5, 0xffffff, 0.12], [0.72, 0xffffff, 0.95], [0.82, 0xffffff, 0.3], [1, 0xffffff, 0],
    ]);
    g.fillRect(0, 0, w, h);
  });
  for (const k of PARTICLE_KINDS) paintParticle(scene, k);
  for (const k of APPARITION_KINDS) paintApparition(scene, k);
  paintGhostParts(scene);
}

/** Tint helpers for the ghost trail (cyan → violet with intensity). */
export function ghostTrailTint(strength: number): number {
  return mix(PAL.ghostCyan, PAL.violet, Math.max(0, Math.min(1, strength)));
}
