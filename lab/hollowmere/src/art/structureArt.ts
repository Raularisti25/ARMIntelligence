// Hollowmere — world art painters (module A, internal helpers for roomArt.ts).
// Everything here paints canvases once at boot; roomArt.ts places + animates them.

import type Phaser from 'phaser';
import type { LightDef, RoomDef, RoomId, WindowDef } from '../types';
import type { DarkSprite, DoorSprite, LightSprite, StaticSprite, WindowSprite, WorldManifest } from './worldManifest';
import { DEPTH, DOOR_H, HOUSE, WORLD } from '../config';
import {
  BASEMENT_SOLID, CHIMNEYS, DECOR, FLOORS, FRONT_DOOR, GARDEN_Y, LIGHTS, ROOF_OUTLINE, ROOMS, ROOM_BY_ID, STAIRS, TURRET, WALLS,
} from '../world/layout';
import {
  PAL, canvasTex, clipped, contactShadow, ellipse, fill, hex, lin, mix, poly, polyline, rad,
  rgba, rng, rrect, shade, shingles, softTex, speckle, woodGrain,
} from './paint';
import type { Ctx2D } from './paint';

const TAU = Math.PI * 2;

// =========================================================== backdrops ====

/** Parallax layer span (local x). Layers are positioned so local x == world x when camCX == 2000. */
export const LAYER_X0 = -700;
export const LAYER_X1 = 4700;

/** Moon direction on screen is upper right: all rim lights come from +x, -y. */
const RIM = 0x9db4ff;

export function paintSkyTextures(scene: Phaser.Scene): void {
  softTex(scene, 'st:sky', 4, 256, 2, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, 0, h, [
      [0, 0x060914], [0.3, 0x0d1334], [0.62, 0x1b2556], [0.84, 0x2f3470], [1, 0x4a4580],
    ]);
    g.fillRect(0, 0, w, h);
  });
  softTex(scene, 'st:skyFlash', 8, 8, 4, (g, w, h) => {
    g.fillStyle = hex(0xdfe8ff);
    g.fillRect(0, 0, w, h);
  });
  canvasTex(scene, 'st:moon', 360, 360, (g) => {
    g.fillStyle = rad(g, 180, 180, 40, 180, [[0, 0xbfd4ff, 0.42], [0.35, 0x8fa8f0, 0.16], [1, 0x6a7ad0, 0]]);
    g.fillRect(0, 0, 360, 360);
    ellipse(g, 180, 180, 78, 78);
    fill(g, rad(g, 160, 156, 4, 84, [[0, 0xfffbe8], [0.7, PAL.moon], [1, 0xd6cfae]]));
    clipped(g, () => ellipse(g, 180, 180, 78, 78), () => {
      const r = rng(11);
      const craters: [number, number, number][] = [[150, 150, 16], [196, 170, 12], [168, 204, 14], [206, 132, 8], [142, 188, 7], [214, 206, 9]];
      for (const [cx, cy, cr] of craters) {
        g.fillStyle = rgba(0x9a9378, 0.28 + r() * 0.1);
        ellipse(g, cx, cy, cr, cr * 0.92);
        g.fill();
        g.fillStyle = rgba(0xfffbe8, 0.25);
        ellipse(g, cx - cr * 0.22, cy - cr * 0.25, cr * 0.7, cr * 0.6);
        g.fill();
      }
      g.fillStyle = lin(g, 120, 120, 250, 250, [[0, 0x000000, 0], [0.62, 0x000000, 0], [1, 0x2a2f5e, 0.4]]);
      g.fillRect(100, 100, 160, 160);
    });
    g.strokeStyle = rgba(0xffffff, 0.35);
    g.lineWidth = 1.2;
    ellipse(g, 180, 180, 78, 78);
    g.stroke();
  });
  canvasTex(scene, 'st:star', 28, 28, (g) => {
    g.fillStyle = rad(g, 14, 14, 0, 14, [[0, 0xffffff, 0.95], [0.18, 0xdbe6ff, 0.5], [1, 0xaec4ff, 0]]);
    g.fillRect(0, 0, 28, 28);
    g.strokeStyle = rgba(0xffffff, 0.7);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(14, 2); g.lineTo(14, 26); g.moveTo(2, 14); g.lineTo(26, 14);
    g.stroke();
  });
  canvasTex(scene, 'st:bat', 64, 34, (g) => {
    g.fillStyle = hex(0x070914);
    g.beginPath();
    g.moveTo(32, 12);
    g.quadraticCurveTo(24, 2, 8, 4);
    g.quadraticCurveTo(14, 10, 12, 16);
    g.quadraticCurveTo(18, 14, 21, 20);
    g.quadraticCurveTo(25, 16, 29, 22);
    g.lineTo(32, 26);
    g.lineTo(35, 22);
    g.quadraticCurveTo(39, 16, 43, 20);
    g.quadraticCurveTo(46, 14, 52, 16);
    g.quadraticCurveTo(50, 10, 56, 4);
    g.quadraticCurveTo(40, 2, 32, 12);
    g.fill();
    ellipse(g, 32, 17, 4.5, 7);
    g.fill();
    g.beginPath(); g.moveTo(29, 11); g.lineTo(28, 5); g.lineTo(32, 9); g.lineTo(36, 5); g.lineTo(35, 11); g.fill();
  });
  softTex(scene, 'st:cloudSoft', 64, 64, 2, (g) => {
    g.fillStyle = rad(g, 32, 32, 0, 32, [[0, 0xffffff, 0.5], [0.5, 0xffffff, 0.2], [1, 0xffffff, 0]]);
    g.fillRect(0, 0, 64, 64);
  });
  for (let i = 0; i < 3; i++) {
    canvasTex(scene, `st:cloud:${i}`, 560, 190, (g, w, h) => {
      const r = rng(40 + i * 17);
      const puffs: [number, number, number][] = [];
      const n = 9 + i * 2;
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const px = 70 + t * (w - 140);
        const hump = Math.sin(t * Math.PI);
        puffs.push([px, h * 0.72 - hump * (30 + r() * 38) - r() * 10, 34 + hump * 40 + r() * 22]);
      }
      // body
      for (const [px, py, pr] of puffs) {
        g.fillStyle = rad(g, px + pr * 0.25, py - pr * 0.3, 0, pr * 1.05, [[0, 0x4a5590, 0.8], [0.6, 0x2c346a, 0.78], [1, 0x1a2050, 0.7]]);
        ellipse(g, px, py, pr, pr * 0.82);
        g.fill();
      }
      // flat belly shadow
      g.fillStyle = lin(g, 0, h * 0.62, 0, h * 0.9, [[0, 0x0e1230, 0], [1, 0x0e1230, 0.5]]);
      g.fillRect(40, h * 0.62, w - 80, h * 0.3);
      // moonlit rim (upper right of each puff)
      g.strokeStyle = rgba(0xc7d6ff, 0.5);
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      for (const [px, py, pr] of puffs) {
        g.beginPath();
        g.arc(px, py, pr * 0.86, -Math.PI * 0.62, -Math.PI * 0.12);
        g.stroke();
      }
      // clean the bottom edge to a soft line
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = lin(g, 0, h * 0.8, 0, h, [[0, 0x000000, 0], [1, 0x000000, 1]]);
      g.fillRect(0, h * 0.8, w, h * 0.2);
      g.globalCompositeOperation = 'source-over';
    });
  }
}

/** Absolute-x ridge function so adjacent hill chunks join seamlessly. */
function ridge(x: number, base: number, amp: number, seed: number): number {
  return base
    - amp * (0.55 * Math.sin(x * 0.0021 + seed) + 0.3 * Math.sin(x * 0.0057 + seed * 2.3) + 0.15 * Math.sin(x * 0.013 + seed * 4.1));
}

export const HILL_CHUNK_W = 1300;
export const HILL_CHUNKS = 5;
export const HILL_TOP = 640; // world y of chunk top
export const HILL_H = 700; // chunk height (to y 1340)

export function paintHillTextures(scene: Phaser.Scene): void {
  for (let c = 0; c < HILL_CHUNKS; c++) {
    const ox = LAYER_X0 + c * HILL_CHUNK_W;
    softTex(scene, `st:hills:${c}`, HILL_CHUNK_W + 2, HILL_H, 0.85, (g, w, h) => {
      const ridges: { base: number; amp: number; seed: number; col: number; top: number }[] = [
        { base: 330, amp: 190, seed: 1.3, col: 0x252c5c, top: 0x39427c },
        { base: 440, amp: 150, seed: 4.2, col: 0x1b2248, top: 0x2b3566 },
        { base: 540, amp: 110, seed: 7.7, col: 0x131938, top: 0x222b58 },
      ];
      ridges.forEach((rd, idx) => {
        g.beginPath();
        g.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) g.lineTo(x, ridge(ox + x, rd.base, rd.amp, rd.seed));
        g.lineTo(w, h);
        g.closePath();
        g.fillStyle = lin(g, 0, rd.base - rd.amp, 0, h, [[0, rd.top], [0.35, rd.col], [1, mix(rd.col, 0x2c3470, 0.35)]]);
        g.fill();
        // rim light
        g.strokeStyle = rgba(RIM, 0.22 - idx * 0.05);
        g.lineWidth = 1.5;
        g.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = ridge(ox + x, rd.base, rd.amp, rd.seed);
          if (x) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
        // pines on the ridge
        const r = rng(500 + idx * 31 + Math.floor(ox));
        g.fillStyle = hex(shade(rd.col, -0.35));
        for (let k = 0; k < 26; k++) {
          const px = r() * w;
          const py = ridge(ox + px, rd.base, rd.amp, rd.seed);
          const ph = 16 + r() * 26;
          g.beginPath();
          g.moveTo(px, py - ph);
          g.lineTo(px - ph * 0.22, py + 2);
          g.lineTo(px + ph * 0.22, py + 2);
          g.fill();
        }
      });
      // hamlet: tiny cottages with lit windows on the mid ridge
      const hr = rng(900 + Math.floor(ox));
      const cottages = 5;
      for (let k = 0; k < cottages; k++) {
        const px = 40 + hr() * (w - 80);
        const py = ridge(ox + px, 440, 150, 4.2) + 6;
        const cw = 18 + hr() * 14;
        const ch = 12 + hr() * 8;
        g.fillStyle = hex(0x0d1130);
        g.fillRect(px - cw / 2, py - ch, cw, ch);
        g.beginPath();
        g.moveTo(px - cw / 2 - 3, py - ch);
        g.lineTo(px, py - ch - 11);
        g.lineTo(px + cw / 2 + 3, py - ch);
        g.fill();
        const wins = 1 + Math.floor(hr() * 2.5);
        for (let wi = 0; wi < wins; wi++) {
          const wx = px - cw / 2 + 3 + wi * (cw - 6) / Math.max(1, wins);
          g.fillStyle = rad(g, wx + 1.4, py - ch * 0.55, 0, 7, [[0, 0xffd27a, 0.55], [1, 0xffb060, 0]]);
          g.fillRect(wx - 6, py - ch * 0.55 - 6, 14, 14);
          g.fillStyle = hex(hr() < 0.5 ? 0xffe3a0 : 0xffcf7a);
          g.fillRect(wx, py - ch * 0.7, 2.8, 3.6);
        }
      }
      // fog at the foot
      g.fillStyle = lin(g, 0, h - 150, 0, h, [[0, 0x4a5aa0, 0], [1, 0x5b68aa, 0.45]]);
      g.fillRect(0, h - 150, w, 150);
    });
  }
}

function bareTree(g: Ctx2D, x: number, y: number, ang: number, len: number, wid: number, depth: number, r: () => number, col: string, ox: number, oy: number): void {
  if (depth <= 0 || len < 6) return;
  const bend = (r() - 0.5) * 0.5;
  const x2 = x + Math.cos(ang + bend) * len;
  const y2 = y + Math.sin(ang + bend) * len;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineWidth = wid;
  g.beginPath();
  g.moveTo(x + ox, y + oy);
  g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.25 + ox, (y + y2) / 2 + oy, x2 + ox, y2 + oy);
  g.stroke();
  const kids = depth > 2 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
  for (let k = 0; k < kids; k++) {
    const spread = (k - (kids - 1) / 2) * (0.5 + r() * 0.5) + (r() - 0.5) * 0.3;
    bareTree(g, x2, y2, ang + bend + spread, len * (0.68 + r() * 0.14), wid * 0.64, depth - 1, r, col, ox, oy);
  }
}

export function paintTreeTextures(scene: Phaser.Scene): void {
  for (let i = 0; i < 4; i++) {
    canvasTex(scene, `st:tree:${i}`, 420, 800, (g, w, h) => {
      const draw = (col: string, ox: number, oy: number, seed: number) => {
        const r = rng(seed);
        // trunk with flare
        g.strokeStyle = col;
        g.lineCap = 'round';
        g.lineWidth = 22 + i * 3;
        g.beginPath();
        g.moveTo(w / 2 + ox, h);
        g.quadraticCurveTo(w / 2 + (r() - 0.5) * 30 + ox, h - 150 + oy, w / 2 + (r() - 0.5) * 20 + ox, h - 270 + oy);
        g.stroke();
        bareTree(g, w / 2 + ox * 0, h - 265, -Math.PI / 2 + (r() - 0.5) * 0.3, 150 + i * 14, 15 + i * 2, 6, r, col, ox, oy);
        for (let k = 0; k < 2; k++) {
          bareTree(g, w / 2, h - 190 - k * 40, -Math.PI / 2 + (k ? 0.9 : -0.9), 90, 9, 4, r, col, ox, oy);
        }
      };
      draw(rgba(0x9db4ff, 0.32), 1.8, -1.2, 70 + i * 13); // moon rim (right/up)
      draw(hex(0x0b0f26), 0, 0, 70 + i * 13);
    });
  }
}

export function paintForegroundTextures(scene: Phaser.Scene): void {
  canvasTex(scene, 'st:fgGrass', 640, 120, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = hex(0x070a15);
    for (let x = 0; x < w; x += 2.2) {
      const bh = 22 + r() * 56 * (0.4 + 0.6 * Math.sin(x * 0.011 + 1) ** 2);
      const lean = (r() - 0.5) * 18;
      g.beginPath();
      g.moveTo(x - 2.5, h);
      g.quadraticCurveTo(x + lean * 0.3, h - bh * 0.6, x + lean, h - bh);
      g.quadraticCurveTo(x + lean * 0.3 + 1.4, h - bh * 0.5, x + 2.5, h);
      g.fill();
    }
    // wheat stalks with soft seed heads
    for (let k = 0; k < 9; k++) {
      const x = 20 + r() * (w - 40);
      const bh = 70 + r() * 34;
      g.strokeStyle = hex(0x070a15);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, h);
      g.quadraticCurveTo(x + 6, h - bh * 0.5, x + 10, h - bh);
      g.stroke();
      g.fillStyle = hex(0x070a15);
      ellipse(g, x + 10, h - bh - 6, 2.4, 7);
      g.fill();
    }
    g.fillStyle = lin(g, 0, h - 10, 0, h, [[0, 0x070a15, 0], [1, 0x070a15, 1]]);
    g.fillRect(0, h - 10, w, 10);
  });
  softTex(scene, 'st:mote', 16, 16, 3, (g) => {
    g.fillStyle = rad(g, 8, 8, 0, 8, [[0, 0xffffff, 1], [0.4, 0xffffff, 0.35], [1, 0xffffff, 0]]);
    g.fillRect(0, 0, 16, 16);
  });
  softTex(scene, 'st:smoke', 64, 64, 1.5, (g) => {
    g.fillStyle = rad(g, 32, 32, 0, 32, [[0, 0xc7d0ee, 0.5], [0.55, 0x9aa6d0, 0.22], [1, 0x7a86b8, 0]]);
    g.fillRect(0, 0, 64, 64);
  });
  softTex(scene, 'st:px', 4, 4, 1, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
  });
}


// ============================================================ exterior ====

/** Siding / trim colours of the house exterior (cool teal-slate against warm interiors). */
const SIDING = 0x3b4d5e;
const TRIM = 0xd9c9a8;

export function outlineY(x: number): number {
  // roof outline slope on the east/west mansard faces
  if (x >= 2880) return 170 + (x - 2880);
  if (x <= 520) return 170 + (520 - x);
  return 170;
}

/** Iron / brass lantern body (unlit look; roomArt adds the lit core as an ADD glow). */
export function lantern(g: Ctx2D, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  // cap
  g.fillStyle = hex(PAL.ink);
  g.beginPath();
  g.moveTo(x0 - 4, y0 + 4);
  g.lineTo(cx, y0 - 14);
  g.lineTo(x0 + w + 4, y0 + 4);
  g.closePath();
  g.fill();
  g.fillStyle = hex(0x2a2030);
  g.fillRect(x0 - 3, y0 + 3, w + 6, 4);
  // glass
  rrect(g, x0, y0 + 7, w, h - 14, 3);
  fill(g, lin(g, x0, 0, x0 + w, 0, [[0, 0xd9c79a], [0.5, 0xf5e6b8], [1, 0xcfba88]]), hex(PAL.ink), 1.2);
  // frame bars
  g.strokeStyle = hex(PAL.ink);
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx, y0 + 7); g.lineTo(cx, y0 + h - 7);
  g.moveTo(x0 + w * 0.3, y0 + 7); g.lineTo(x0 + w * 0.3, y0 + h - 7);
  g.moveTo(x0 + w * 0.7, y0 + 7); g.lineTo(x0 + w * 0.7, y0 + h - 7);
  g.stroke();
  // base + drop
  g.fillStyle = hex(PAL.ink);
  g.fillRect(x0 - 2, y0 + h - 8, w + 4, 5);
  g.beginPath();
  g.moveTo(cx - 4, y0 + h - 3); g.lineTo(cx, y0 + h + 7); g.lineTo(cx + 4, y0 + h - 3);
  g.fill();
  // brass rim light
  g.strokeStyle = rgba(PAL.gold, 0.7);
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(x0 + w + 4, y0 + 4); g.lineTo(cx, y0 - 14);
  g.stroke();
}

export function paintRoof(scene: Phaser.Scene): void {
  const X0 = 150;
  const Y0 = 150;
  canvasTex(scene, 'st:roof', 3110, 390, (g) => {
    g.translate(-X0, -Y0);
    const hole: [number, number][] = [[240, 522], [240, 510], [540, 205], [2860, 205], [3160, 510], [3160, 522]];
    const path = () => {
      g.beginPath();
      ROOF_OUTLINE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      hole.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };
    g.save();
    path();
    g.clip('evenodd');
    // slate base
    g.fillStyle = lin(g, 0, 165, 0, 525, [[0, 0x3a4378], [1, 0x232a52]]);
    g.fillRect(150, 150, 3110, 390);
    // flat top courses
    g.save();
    g.beginPath(); g.rect(480, 165, 2440, 50); g.clip();
    shingles(g, 470, 166, 2460, 46, 20, 13, 0x2e3768, 5);
    g.restore();
    // decorative band: lighter slate diamonds on the flat top
    g.fillStyle = rgba(0x6a78c0, 0.28);
    for (let x = 540; x < 2880; x += 26) {
      g.beginPath();
      g.moveTo(x, 188); g.lineTo(x + 7, 182); g.lineTo(x + 14, 188); g.lineTo(x + 7, 194);
      g.fill();
    }
    // slopes — rotate into slope space so shingle rows follow the roof
    for (const side of [0, 1]) {
      g.save();
      if (side === 0) {
        g.translate(170, 520);
        g.rotate(-Math.PI / 4);
        g.beginPath(); g.rect(-30, -8, 620, 76); g.clip();
        shingles(g, -30, -8, 620, 76, 20, 13, 0x2e3768, 9);
        g.fillStyle = rgba(0x6a78c0, 0.26);
        for (let x = 0; x < 600; x += 26) {
          g.beginPath();
          g.moveTo(x, 20); g.lineTo(x + 7, 14); g.lineTo(x + 14, 20); g.lineTo(x + 7, 26);
          g.fill();
        }
      } else {
        g.translate(3230, 520);
        g.rotate(Math.PI / 4);
        g.beginPath(); g.rect(-620, -8, 650, 76); g.clip();
        shingles(g, -620, -8, 650, 76, 20, 13, 0x2e3768, 19);
        g.fillStyle = rgba(0x6a78c0, 0.26);
        for (let x = -600; x < 0; x += 26) {
          g.beginPath();
          g.moveTo(x, 20); g.lineTo(x + 7, 14); g.lineTo(x + 14, 20); g.lineTo(x + 7, 26);
          g.fill();
        }
      }
      g.restore();
    }
    // moon-side lighting: right slope reads brighter, left slightly darker
    g.fillStyle = lin(g, 150, 0, 3260, 0, [[0, 0x000000, 0.22], [0.5, 0x000000, 0], [1, 0x9db4ff, 0.12]]);
    g.fillRect(150, 150, 3110, 390);
    g.restore();

    // outer fascia + rim light along the outline
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = hex(PAL.woodDark);
    g.lineWidth = 7;
    polyline(g, ROOF_OUTLINE);
    g.stroke();
    g.strokeStyle = hex(0x7a5a3c);
    g.lineWidth = 2.2;
    g.save();
    g.translate(0, -2.4);
    polyline(g, ROOF_OUTLINE);
    g.stroke();
    g.restore();
    g.strokeStyle = rgba(0xc7d6ff, 0.5);
    g.lineWidth = 1.2;
    g.save();
    g.translate(0, -4.4);
    polyline(g, ROOF_OUTLINE.slice(1, 3));
    g.stroke();
    g.restore();

    // inner trim (against the attic interior)
    g.strokeStyle = hex(PAL.woodDark);
    g.lineWidth = 5;
    polyline(g, [[240, 510], [540, 205], [2860, 205], [3160, 510]]);
    g.stroke();
    g.strokeStyle = rgba(TRIM, 0.55);
    g.lineWidth = 1.2;
    g.save();
    g.translate(0, 3);
    polyline(g, [[540, 205], [2860, 205]]);
    g.stroke();
    g.restore();

    // iron cresting along the ridge
    g.fillStyle = hex(PAL.ink);
    g.strokeStyle = hex(PAL.ink);
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(530, 170); g.lineTo(2870, 170); g.stroke();
    for (let x = 548; x < 2860; x += 34) {
      g.beginPath(); g.moveTo(x, 170); g.lineTo(x, 156); g.stroke();
      g.beginPath();
      g.moveTo(x, 150); g.lineTo(x + 4, 156); g.lineTo(x, 162); g.lineTo(x - 4, 156);
      g.fill();
      g.beginPath(); g.arc(x, 148, 1.8, 0, TAU); g.fill();
    }
    for (const fx of [520, 2880]) {
      g.beginPath(); g.moveTo(fx, 170); g.lineTo(fx, 140); g.stroke();
      g.beginPath(); g.arc(fx, 138, 5, 0, TAU); g.fill();
      g.strokeStyle = rgba(PAL.gold, 0.6);
      g.beginPath(); g.arc(fx, 138, 5, -2.4, -0.7); g.stroke();
      g.strokeStyle = hex(PAL.ink);
    }
    // brass-green gutter stubs where the slopes meet the slab
    for (const gx of [[168, 246], [3154, 3232]]) {
      g.fillStyle = hex(0x2f6a6f);
      g.fillRect(gx[0], 518, gx[1] - gx[0], 8);
      g.fillStyle = rgba(0xffffff, 0.2);
      g.fillRect(gx[0], 518, gx[1] - gx[0], 1.6);
      g.fillStyle = rgba(0x000000, 0.35);
      g.fillRect(gx[0], 524, gx[1] - gx[0], 2);
    }
  });
}

export function paintTurret(scene: Phaser.Scene): void {
  const X0 = 2920;
  const Y0 = -112;
  canvasTex(scene, 'st:turret', 260, 596, (g) => {
    g.translate(-X0, -Y0);
    const tx0 = TURRET.x0;
    const tx1 = TURRET.x1;
    const cx = (tx0 + tx1) / 2;
    const top = 14;
    const bodyPath = () => {
      g.beginPath();
      g.moveTo(tx0, top);
      g.lineTo(tx1, top);
      g.lineTo(tx1, outlineY(tx1) + 10);
      g.lineTo(tx0, outlineY(tx0) + 10);
      g.closePath();
    };
    bodyPath();
    fill(g, lin(g, tx0, 0, tx1, 0, [[0, 0x1f2a38], [0.3, 0x32465a], [0.7, 0x4a6179], [0.9, 0x5d7690], [1, 0x34475c]]));
    clipped(g, bodyPath, () => {
      // clapboard curves around the cylinder
      for (let y = top + 12; y < 480; y += 11) {
        g.strokeStyle = rgba(PAL.ink, 0.38);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(tx0, y);
        g.quadraticCurveTo(cx, y + 5, tx1, y);
        g.stroke();
        g.strokeStyle = rgba(0xc7d6ff, 0.08);
        g.beginPath();
        g.moveTo(tx0, y + 1.5);
        g.quadraticCurveTo(cx, y + 6.5, tx1, y + 1.5);
        g.stroke();
      }
      // belt courses with fish-scale band
      for (const by of [118, 232]) {
        g.fillStyle = hex(0x2a3946);
        g.fillRect(tx0, by, tx1 - tx0, 26);
        g.save();
        g.beginPath(); g.rect(tx0, by, tx1 - tx0, 26); g.clip();
        shingles(g, tx0, by, tx1 - tx0, 26, 14, 10, 0x3d5468, 31 + by);
        g.restore();
        g.fillStyle = hex(TRIM);
        g.fillRect(tx0 - 4, by - 4, tx1 - tx0 + 8, 5);
        g.fillStyle = rgba(0x000000, 0.4);
        g.fillRect(tx0, by + 26, tx1 - tx0, 3);
      }
      // cylinder lighting
      g.fillStyle = lin(g, tx0, 0, tx1, 0, [[0, 0x05060f, 0.5], [0.35, 0x05060f, 0], [0.78, 0xbfd4ff, 0.06], [1, 0xbfd4ff, 0.26]]);
      g.fillRect(tx0, top, tx1 - tx0, 480);
      // slit windows, lit
      for (const [sx, sy] of [[cx - 38, 176], [cx + 34, 300]]) {
        rrect(g, sx - 7, sy, 14, 40, [7, 7, 1, 1]);
        fill(g, lin(g, 0, sy, 0, sy + 40, [[0, 0xffe6a8], [1, 0xffb868]]), hex(PAL.ink), 1.6);
        g.fillStyle = hex(PAL.ink);
        g.fillRect(sx - 0.7, sy + 3, 1.4, 36);
        g.fillRect(sx - 7, sy + 17, 14, 1.4);
      }
    });
    // eave ring under the spire
    g.fillStyle = hex(0x232f3d);
    g.beginPath();
    g.moveTo(tx0 - 14, top - 2);
    g.lineTo(tx1 + 14, top - 2);
    g.lineTo(tx1 + 6, top + 14);
    g.lineTo(tx0 - 6, top + 14);
    g.closePath();
    g.fill();
    g.fillStyle = hex(TRIM);
    g.fillRect(tx0 - 15, top - 4, tx1 - tx0 + 30, 3.4);
    for (let x = tx0 - 6; x < tx1 + 6; x += 12) {
      g.fillStyle = hex(0x3a2a22);
      g.fillRect(x, top + 2, 6, 10);
    }
    // spire
    const spirePath = () => {
      g.beginPath();
      g.moveTo(tx0 - 14, top - 4);
      g.quadraticCurveTo(cx - 22, top - 20, cx - 3, TURRET.spireTop + 4);
      g.lineTo(cx + 3, TURRET.spireTop + 4);
      g.quadraticCurveTo(cx + 22, top - 20, tx1 + 14, top - 4);
      g.closePath();
    };
    spirePath();
    fill(g, lin(g, tx0 - 14, 0, tx1 + 14, 0, [[0, 0x1a2046], [0.55, 0x2e3768], [0.9, 0x4a5aa0], [1, 0x2c3560]]));
    clipped(g, spirePath, () => {
      shingles(g, tx0 - 20, TURRET.spireTop, 260, top - TURRET.spireTop + 6, 13, 9, 0x2e3768, 61);
      g.fillStyle = lin(g, tx0, 0, tx1, 0, [[0, 0x05060f, 0.5], [0.6, 0x05060f, 0], [1, 0xbfd4ff, 0.3]]);
      g.fillRect(tx0 - 20, TURRET.spireTop, 260, 90);
    });
    g.strokeStyle = rgba(0xc7d6ff, 0.55);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx + 3, TURRET.spireTop + 4);
    g.quadraticCurveTo(cx + 22, top - 20, tx1 + 14, top - 4);
    g.stroke();
    // finial + weathervane
    g.strokeStyle = hex(PAL.ink);
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(cx, TURRET.spireTop + 6); g.lineTo(cx, TURRET.spireTop - 46); g.stroke();
    g.fillStyle = hex(PAL.ink);
    g.beginPath(); g.arc(cx, TURRET.spireTop - 6, 5, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx, TURRET.spireTop - 48, 3, 0, TAU); g.fill();
    g.beginPath();
    g.moveTo(cx, TURRET.spireTop - 34);
    g.lineTo(cx + 26, TURRET.spireTop - 30);
    g.lineTo(cx + 18, TURRET.spireTop - 25);
    g.lineTo(cx + 26, TURRET.spireTop - 20);
    g.lineTo(cx, TURRET.spireTop - 24);
    g.fill();
    g.strokeStyle = rgba(PAL.gold, 0.6);
    g.lineWidth = 0.9;
    g.beginPath(); g.arc(cx, TURRET.spireTop - 6, 5, -2.4, -0.7); g.stroke();

    // round lit window with arched stone surround
    const wx = TURRET.window.x;
    const wy = TURRET.window.y;
    const wr = TURRET.window.r;
    g.fillStyle = hex(0x1c2733);
    g.beginPath(); g.arc(wx, wy, wr + 9, 0, TAU); g.fill();
    g.fillStyle = hex(TRIM);
    g.beginPath(); g.arc(wx, wy, wr + 6, 0, TAU); g.fill();
    g.fillStyle = hex(PAL.woodDark);
    g.beginPath(); g.arc(wx, wy, wr + 2, 0, TAU); g.fill();
    g.fillStyle = rad(g, wx + 4, wy + 6, 0, wr, [[0, 0xfff0c4], [0.55, 0xffcf80], [1, 0xe9953e]]);
    g.beginPath(); g.arc(wx, wy, wr - 1, 0, TAU); g.fill();
    // little silhouette of a rocking chair + curtain, because someone left the light on
    g.fillStyle = rgba(0x5a2f20, 0.75);
    g.beginPath();
    g.moveTo(wx - wr + 2, wy - wr + 6);
    g.quadraticCurveTo(wx - 12, wy, wx - 8, wy + wr - 2);
    g.lineTo(wx - wr + 2, wy + wr - 8);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(wx + wr - 2, wy - wr + 6);
    g.quadraticCurveTo(wx + 12, wy, wx + 8, wy + wr - 2);
    g.lineTo(wx + wr - 2, wy + wr - 8);
    g.closePath();
    g.fill();
    g.strokeStyle = hex(PAL.woodDark);
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(wx - wr, wy); g.lineTo(wx + wr, wy);
    g.moveTo(wx, wy - wr); g.lineTo(wx, wy + wr);
    g.stroke();
    g.strokeStyle = hex(PAL.brass);
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.stroke();
    g.strokeStyle = rgba(0xffffff, 0.5);
    g.lineWidth = 1;
    g.beginPath(); g.arc(wx, wy, wr - 4, -2.6, -1.4); g.stroke();
    // keystone studs around the surround
    g.fillStyle = hex(shade(TRIM, -0.2));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      g.beginPath(); g.arc(wx + Math.cos(a) * (wr + 7.5), wy + Math.sin(a) * (wr + 7.5), 2, 0, TAU); g.fill();
    }
  });
}

export function paintChimneys(scene: Phaser.Scene): void {
  CHIMNEYS.forEach((c, idx) => {
    const H = 218 - c.top; // texture spans y (top-28 .. 190)
    canvasTex(scene, `st:chimney:${idx}`, 100, H, (g, w, h) => {
      const r = rng(210 + idx);
      const cx = w / 2;
      const hw = c.w / 2;
      const shaftTop = 28;
      const base = hex(shade(PAL.brick, -0.18));
      g.fillStyle = base;
      g.fillRect(cx - hw, shaftTop, c.w, h - shaftTop);
      for (let y = shaftTop, row = 0; y < h; y += 8, row++) {
        const off = row % 2 ? 9 : 0;
        for (let x = cx - hw - 18 + off; x < cx + hw; x += 18) {
          const bx = Math.max(x, cx - hw);
          const bw = Math.min(x + 17, cx + hw) - bx;
          if (bw <= 0) continue;
          g.fillStyle = hex(shade(PAL.brick, -0.35 + r() * 0.3));
          g.fillRect(bx, y + 0.6, bw, 6.8);
        }
      }
      g.fillStyle = lin(g, cx - hw, 0, cx + hw, 0, [[0, 0x05060f, 0.5], [0.55, 0x05060f, 0], [1, 0xbfd4ff, 0.32]]);
      g.fillRect(cx - hw, shaftTop, c.w, h - shaftTop);
      g.fillStyle = lin(g, 0, shaftTop, 0, shaftTop + 70, [[0, 0x000000, 0.5], [1, 0x000000, 0]]);
      g.fillRect(cx - hw, shaftTop, c.w, 70);
      // moss on the shady side
      speckle(g, cx - hw, h - 90, 18, 80, 40, 0x3f6b4a, 0.5, 5 + idx, 1.8);
      // cap
      g.fillStyle = hex(0x5a5668);
      g.fillRect(cx - hw - 7, shaftTop - 12, c.w + 14, 12);
      g.fillStyle = hex(0x726d86);
      g.fillRect(cx - hw - 7, shaftTop - 12, c.w + 14, 4);
      g.fillStyle = rgba(0x000000, 0.4);
      g.fillRect(cx - hw - 7, shaftTop - 2, c.w + 14, 2);
      // flue pots
      for (const px of [cx - 17, cx + 17]) {
        g.fillStyle = lin(g, px - 11, 0, px + 11, 0, [[0, 0x6b2f1f], [0.6, 0xb5603a], [1, 0xd98a58]]);
        rrect(g, px - 11, 8, 22, 18, [3, 3, 0, 0]);
        g.fill();
        g.fillStyle = hex(0x130d10);
        ellipse(g, px, 9, 8.5, 2.6);
        g.fill();
        g.fillStyle = hex(0x8a4a2e);
        g.fillRect(px - 13, 20, 26, 6);
      }
      // soot
      g.fillStyle = lin(g, 0, 0, 0, 40, [[0, 0x000000, 0.45], [1, 0x000000, 0]]);
      g.fillRect(cx - hw, shaftTop - 2, c.w, 30);
    });
  });
}

// ------------------------------------------------------------- porch ----

export function paintPorch(scene: Phaser.Scene): void {
  // roof (drawn in front, DEPTH.structure)
  canvasTex(scene, 'st:porchRoof', 340, 130, (g) => {
    g.translate(-3180, -1000);
    const roofPath = () => {
      g.beginPath();
      g.moveTo(3188, 1010); g.lineTo(3514, 1076); g.lineTo(3514, 1106); g.lineTo(3188, 1040);
      g.closePath();
    };
    roofPath();
    fill(g, lin(g, 0, 1010, 0, 1100, [[0, 0x3a4378], [1, 0x232a52]]));
    clipped(g, roofPath, () => {
      g.save();
      g.translate(3188, 1010);
      g.rotate(Math.atan(66 / 326));
      shingles(g, -4, -2, 340, 34, 16, 11, 0x2e3768, 71);
      g.restore();
      g.fillStyle = lin(g, 3188, 0, 3514, 0, [[0, 0x000000, 0.2], [1, 0x9db4ff, 0.1]]);
      g.fillRect(3180, 1000, 340, 120);
    });
    g.strokeStyle = hex(PAL.woodDark);
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(3188, 1040); g.lineTo(3514, 1106); g.stroke();
    g.strokeStyle = hex(TRIM);
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(3188, 1037.5); g.lineTo(3514, 1103.5); g.stroke();
    g.strokeStyle = rgba(0xc7d6ff, 0.5);
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(3188, 1009); g.lineTo(3514, 1075); g.stroke();
    // fretwork brackets under the eave
    g.fillStyle = hex(PAL.woodDark);
    for (const bx of [3462, 3330]) {
      const by = 1040 + (bx - 3188) * 0.2;
      g.beginPath();
      g.moveTo(bx - 34, by);
      g.quadraticCurveTo(bx - 8, by + 4, bx - 2, by + 32);
      g.lineTo(bx + 2, by + 32);
      g.lineTo(bx + 2, by);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(TRIM, 0.4);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(bx - 30, by + 2);
      g.quadraticCurveTo(bx - 9, by + 7, bx - 3, by + 28);
      g.stroke();
    }
    // icicle-ish drip trim
    g.fillStyle = hex(PAL.woodDark);
    for (let x = 3200; x < 3510; x += 16) {
      const y = 1040 + (x - 3188) * 0.2 + 3;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y + 7); g.lineTo(x + 14, y); g.fill();
    }
  });

  // deck, railing, posts, lantern, steps (behind NPCs)
  canvasTex(scene, 'st:porchBody', 380, 330, (g) => {
    g.translate(-3195, -1030);
    // deck face
    g.fillStyle = hex(PAL.woodDark);
    g.fillRect(3200, 1320, 290, 22);
    woodGrain(g, 3200, 1320, 282, 8, PAL.woodLight, 12, 7);
    g.fillStyle = rgba(0xc7d6ff, 0.35);
    g.fillRect(3200, 1319.2, 282, 1.4);
    g.fillStyle = rgba(0x000000, 0.35);
    g.fillRect(3200, 1334, 290, 8);
    for (let x = 3222; x < 3482; x += 38) {
      g.fillStyle = rgba(0x000000, 0.4);
      g.fillRect(x, 1320, 1.4, 9);
    }
    // piers under the deck
    for (const px of [3214, 3340, 3474]) {
      g.fillStyle = hex(PAL.stone);
      g.fillRect(px - 8, 1340, 16, 12);
      g.fillStyle = rgba(0x000000, 0.3);
      g.fillRect(px - 8, 1346, 16, 6);
    }
    // railing (balusters + rails) between wall and the end post
    const rail = (x0: number, x1: number) => {
      g.fillStyle = hex(PAL.woodDark);
      for (let x = x0 + 8; x < x1 - 6; x += 15) {
        g.beginPath();
        g.moveTo(x - 2.4, 1262); g.lineTo(x + 2.4, 1262);
        g.lineTo(x + 1.4, 1280); g.lineTo(x + 3, 1288); g.lineTo(x + 1.4, 1296); g.lineTo(x + 2.4, 1308);
        g.lineTo(x - 2.4, 1308); g.lineTo(x - 1.4, 1296); g.lineTo(x - 3, 1288); g.lineTo(x - 1.4, 1280);
        g.closePath();
        g.fill();
      }
      g.fillStyle = hex(shade(PAL.woodDark, 0.12));
      g.fillRect(x0, 1304, x1 - x0, 6);
      rrect(g, x0, 1254, x1 - x0, 9, 3);
      fill(g, hex(PAL.wood));
      g.fillStyle = rgba(0xc7d6ff, 0.35);
      g.fillRect(x0 + 2, 1254.6, x1 - x0 - 4, 1.2);
    };
    rail(3214, 3330);
    rail(3348, 3466);
    // posts
    for (const px of [3340, 3471]) {
      g.fillStyle = hex(PAL.woodDark);
      g.fillRect(px - 8, 1304, 16, 16);
      g.fillStyle = lin(g, px - 6, 0, px + 6, 0, [[0, PAL.woodDark], [0.6, PAL.wood], [1, PAL.woodLight]]);
      g.fillRect(px - 6, 1100, 12, 206);
      g.fillStyle = hex(PAL.woodDark);
      g.fillRect(px - 9, 1092, 18, 12);
      g.fillRect(px - 8, 1250, 16, 6);
      g.fillStyle = rgba(0xc7d6ff, 0.35);
      g.fillRect(px + 4, 1104, 1.4, 196);
      for (const ty of [1140, 1185]) {
        g.fillStyle = hex(shade(PAL.woodDark, -0.1));
        ellipse(g, px, ty, 8, 3);
        g.fill();
      }
    }
    // hanging lantern (light itself is an ADD glow added at runtime)
    g.strokeStyle = hex(PAL.ink);
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(3260, 1050); g.lineTo(3260, 1156); g.stroke();
    for (let y = 1056; y < 1152; y += 10) {
      g.beginPath(); ellipse(g, 3260, y, 2.2, 3.4); g.stroke();
    }
    lantern(g, 3260, 1180, 22, 40);
    // welcome mat + dead potted fern
    g.fillStyle = hex(0x5a2f2f);
    g.beginPath();
    g.moveTo(3214, 1319); g.lineTo(3292, 1319); g.lineTo(3298, 1328); g.lineTo(3208, 1328);
    g.closePath(); g.fill();
    g.fillStyle = rgba(TRIM, 0.4);
    g.fillRect(3224, 1322, 58, 1.4);
    contactShadow(g, 3420, 1318, 30, 5, 0.5);
    g.fillStyle = lin(g, 3402, 0, 3438, 0, [[0, 0x6b2f1f], [0.6, 0xb5603a], [1, 0xd98a58]]);
    g.beginPath();
    g.moveTo(3402, 1280); g.lineTo(3438, 1280); g.lineTo(3432, 1318); g.lineTo(3408, 1318);
    g.closePath(); g.fill();
    g.fillStyle = hex(0x8a4a2e);
    g.fillRect(3399, 1276, 42, 8);
    g.strokeStyle = hex(0x35412f);
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.42;
      g.beginPath();
      g.moveTo(3420, 1278);
      g.quadraticCurveTo(3420 + Math.cos(a) * 20, 1278 + Math.sin(a) * 26, 3420 + Math.cos(a) * 34, 1278 + Math.sin(a) * 30 + 14);
      g.stroke();
    }
    // steps down to the garden
    g.fillStyle = hex(PAL.stone);
    rrect(g, 3482, 1329, 32, 14, 2);
    g.fill();
    g.fillStyle = rgba(0xc7d6ff, 0.35);
    g.fillRect(3484, 1329.4, 28, 1.4);
    g.fillStyle = hex(shade(PAL.stone, -0.25));
    rrect(g, 3514, 1338, 34, 14, 2);
    g.fill();
    g.fillStyle = rgba(0xc7d6ff, 0.3);
    g.fillRect(3516, 1338.4, 30, 1.4);
  });

  // front door leaf (edge-on slab in the east exterior wall)
  canvasTex(scene, 'st:frontDoor', FRONT_DOOR.x1 - FRONT_DOOR.x0, FRONT_DOOR.h, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x1d3a3a], [0.5, 0x2f5a58], [1, 0x3d7370]]);
    g.fillRect(0, 0, w, h);
    woodGrain(g, 0, 0, w, h, 0x2f5a58, 41, 26);
    g.fillStyle = rgba(0x000000, 0.18);
    g.fillRect(0, 0, w, h);
    // raised panels seen edge-on: bands
    for (const [y0, y1] of [[18, 92], [104, 138], [150, 218]]) {
      g.fillStyle = rgba(0x000000, 0.28);
      g.fillRect(4, y0, w - 8, y1 - y0);
      g.fillStyle = rgba(0xffffff, 0.12);
      g.fillRect(4, y0, w - 8, 1.4);
      g.fillStyle = rgba(0x000000, 0.4);
      g.fillRect(4, y1 - 1.4, w - 8, 1.4);
    }
    // brass hinge plates, knocker ring, mail slot
    g.fillStyle = hex(PAL.brass);
    for (const hy of [26, 118, 204]) g.fillRect(0, hy, 7, 14);
    g.fillRect(w - 9, 124, 8, 4);
    g.strokeStyle = hex(PAL.brass);
    g.lineWidth = 2;
    g.beginPath(); g.arc(w - 7, 70, 6, 0.5, TAU - 0.5); g.stroke();
    g.fillStyle = hex(PAL.gold);
    g.beginPath(); g.arc(w - 10, 82, 2.6, 0, TAU); g.fill();
    g.fillStyle = hex(PAL.ink);
    g.fillRect(8, 108, w - 16, 3);
    g.fillStyle = rgba(0xc7d6ff, 0.35);
    g.fillRect(w - 1.6, 0, 1.6, h);
  });
}

// ---------------------------------------------------- walls / slabs / tiles ----

export function paintTileTextures(scene: Phaser.Scene): void {
  // exterior siding (32×64 world units = 64×128 px, power of two)
  canvasTex(scene, 'st:wallExt', 32, 64, (g, w, h) => {
    const r = rng(101);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = hex(shade(SIDING, (r() - 0.5) * 0.12));
      g.fillRect(0, i * 8, w, 8);
      g.fillStyle = rgba(0xc7d6ff, 0.16);
      g.fillRect(0, i * 8, w, 1.2);
      g.fillStyle = rgba(0x000000, 0.4);
      g.fillRect(0, i * 8 + 6.4, w, 1.6);
    }
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x05060f, 0.35], [0.12, 0x05060f, 0], [0.9, 0xbfd4ff, 0], [1, 0xbfd4ff, 0.28]]);
    g.fillRect(0, 0, w, h);
    g.fillStyle = hex(TRIM);
    g.fillRect(0, 0, 3, h);
    g.fillRect(27, 0, 3, h);
    g.fillStyle = rgba(0x000000, 0.25);
    g.fillRect(0, 0, 3, h);
    g.fillStyle = rgba(0xffffff, 0.2);
    g.fillRect(27, 0, 1.4, h);
  });
  canvasTex(scene, 'st:wallFound', 32, 64, (g, w, h) => {
    const r = rng(103);
    g.fillStyle = hex(0x4e4a58);
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      const y = row * 16;
      const off = row % 2 ? 9 : 0;
      for (let x = -off; x < w + 8; x += 18) {
        g.fillStyle = hex(shade(0x5d5a66, (r() - 0.5) * 0.28));
        rrect(g, x + 0.8, y + 0.8, 16.4, 14.4, 2.5);
        g.fill();
        g.fillStyle = rgba(0xc7d6ff, 0.14);
        g.fillRect(x + 2, y + 1, 13, 1.2);
      }
    }
    speckle(g, 0, 0, w, h, 24, 0x3f6b4a, 0.35, 8, 1.6);
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x05060f, 0.3], [1, 0xbfd4ff, 0.14]]);
    g.fillRect(0, 0, w, h);
  });
  canvasTex(scene, 'st:wallInt', 32, 64, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, 20, 0, [[0, 0x8a5e3c], [0.12, 0x6b4730], [0.5, 0x4d3220], [0.88, 0x6b4730], [1, 0x8a5e3c]]);
    g.fillRect(0, 0, w, h);
    woodGrain(g, 3, 0, 14, h, 0x4d3220, 17, 16);
    g.fillStyle = rgba(0xffe2b0, 0.22);
    g.fillRect(0, 0, 1.4, h);
    g.fillRect(18.6, 0, 1.4, h);
    for (let y = 8; y < h; y += 32) {
      g.fillStyle = rgba(0x000000, 0.22);
      g.fillRect(2, y, 16, 1.2);
    }
  });
  // floor slab: joist cross-section, plank edge on top, plaster ceiling underside
  canvasTex(scene, 'st:slab', 64, 32, (g, w) => {
    g.fillStyle = hex(0x3a2418);
    g.fillRect(0, 0, w, 32);
    g.fillStyle = hex(PAL.woodLight);
    g.fillRect(0, 0, w, 4);
    g.fillStyle = rgba(0xffffff, 0.22);
    g.fillRect(0, 0, w, 1.2);
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = rgba(0x000000, 0.4);
      g.fillRect(x, 0, 1.2, 4);
    }
    g.fillStyle = rgba(0x000000, 0.45);
    g.fillRect(0, 4, w, 3);
    for (let x = 4; x < w; x += 16) {
      g.fillStyle = hex(0x5a3a24);
      g.fillRect(x, 8, 10, 13);
      g.fillStyle = rgba(0xffffff, 0.12);
      g.fillRect(x, 8, 10, 1.2);
      g.fillStyle = rgba(0x000000, 0.35);
      g.fillRect(x + 8.8, 8, 1.2, 13);
    }
    g.fillStyle = hex(0xcdb894);
    g.fillRect(0, 22, w, 4);
    g.fillStyle = rgba(0x000000, 0.25);
    g.fillRect(0, 24.6, w, 1.4);
  });
  canvasTex(scene, 'st:slabStone', 64, 32, (g, w) => {
    const r = rng(107);
    g.fillStyle = hex(0x45414f);
    g.fillRect(0, 0, w, 32);
    for (let x = 0; x < w; x += 22) {
      g.fillStyle = hex(shade(0x5d5a66, (r() - 0.5) * 0.25));
      rrect(g, x + 0.8, 2, 20, 22, 3);
      g.fill();
      g.fillStyle = rgba(0xc7d6ff, 0.16);
      g.fillRect(x + 2, 2.6, 17, 1.2);
    }
    g.fillStyle = rgba(0x000000, 0.35);
    g.fillRect(0, 22, w, 4);
  });
  // earth cross-section (tiles horizontally; features wrap)
  canvasTex(scene, 'st:soil', 512, 512, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, 0, h, [[0, 0x3a2b26], [0.18, 0x2f2321], [0.55, 0x241b21], [1, 0x171220]]);
    g.fillRect(0, 0, w, h);
    const r = rng(113);
    // strata
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 70 + r() * 20;
      g.strokeStyle = rgba(k % 2 ? 0x000000 : 0x6a4a3a, 0.16);
      g.lineWidth = 3 + r() * 5;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.03 + k) * 8);
      g.stroke();
    }
    speckle(g, 0, 0, w, h, 900, 0x000000, 0.18, 3, 2.2);
    speckle(g, 0, 0, w, h, 500, 0x7a5a48, 0.14, 4, 1.6);
    // stones
    for (let k = 0; k < 26; k++) {
      const x = r() * w;
      const y = 20 + r() * (h - 40);
      const sr = 4 + r() * 12;
      for (const ox of [0, -w, w]) {
        g.fillStyle = hex(shade(0x4a4655, (r() - 0.5) * 0.3));
        ellipse(g, x + ox, y, sr, sr * 0.72);
        g.fill();
        g.fillStyle = rgba(0xc7d6ff, 0.18);
        ellipse(g, x + ox + sr * 0.2, y - sr * 0.25, sr * 0.55, sr * 0.3);
        g.fill();
      }
    }
    // roots hanging from the surface
    g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const x = r() * w;
      let cx = x;
      let cy = 0;
      g.strokeStyle = rgba(0x6b4a30, 0.5);
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) {
        cx += (r() - 0.5) * 22;
        cy += 14 + r() * 18;
        g.lineTo(cx, cy);
      }
      g.stroke();
    }
    // dark pockets / burrows
    for (let k = 0; k < 4; k++) {
      const x = r() * w;
      const y = 120 + r() * 300;
      g.fillStyle = rgba(0x000000, 0.3);
      ellipse(g, x, y, 16 + r() * 14, 6 + r() * 5);
      g.fill();
    }
  });
  canvasTex(scene, 'st:grassLip', 128, 32, (g, w, h) => {
    const r = rng(127);
    g.fillStyle = lin(g, 0, 10, 0, h, [[0, 0x2c4a36], [1, 0x1f3328]]);
    g.fillRect(0, 12, w, 12);
    for (const ox of [-w, 0, w]) {
      for (let x = 0; x < w; x += 2.4) {
        const bh = 8 + r() * 16;
        const lean = (r() - 0.5) * 8;
        g.fillStyle = hex(shade(0x2f5a3c, (r() - 0.5) * 0.3));
        g.beginPath();
        g.moveTo(x + ox - 1.6, 14);
        g.quadraticCurveTo(x + ox + lean * 0.4, 14 - bh * 0.6, x + ox + lean, 14 - bh);
        g.quadraticCurveTo(x + ox + lean * 0.4 + 1, 14 - bh * 0.4, x + ox + 1.8, 14);
        g.fill();
        if (r() < 0.25) {
          g.fillStyle = rgba(0xc7d6ff, 0.35);
          g.fillRect(x + ox + lean - 0.4, 14 - bh, 0.9, 3);
        }
      }
    }
    g.fillStyle = lin(g, 0, 20, 0, h, [[0, 0x171220, 0], [1, 0x171220, 0.8]]);
    g.fillRect(0, 20, w, 12);
  });
  canvasTex(scene, 'st:fence', 64, 64, (g, w, h) => {
    const r = rng(131);
    g.fillStyle = hex(shade(0x8f8b9a, -0.3));
    g.fillRect(0, 20, w, 5);
    g.fillRect(0, 46, w, 5);
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 16;
      const tilt = i === 2 ? 0.05 : 0;
      g.save();
      g.translate(x + 4.5, h);
      g.rotate(tilt);
      g.translate(-(x + 4.5), -h);
      g.fillStyle = lin(g, x, 0, x + 9, 0, [[0, 0x6e6a7e], [0.7, 0xa6a2b4], [1, 0xc7d6ff]]);
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x, 12);
      g.lineTo(x + 4.5, 4 + (i === 2 ? 3 : 0));
      g.lineTo(x + 9, 12);
      g.lineTo(x + 9, h);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.5);
      g.lineWidth = 0.8;
      g.stroke();
      g.restore();
      g.fillStyle = rgba(0x000000, 0.18 + r() * 0.1);
      g.fillRect(x + 1, 25, 7, 3);
    }
    g.fillStyle = rgba(0xc7d6ff, 0.28);
    g.fillRect(0, 20, w, 1);
    g.fillRect(0, 46, w, 1);
  });
}

export function paintExteriorProps(scene: Phaser.Scene): void {
  // lamp post — origin x 3665, y 1105; lantern centre (3700,1150)
  canvasTex(scene, 'st:lamppost', 70, 244, (g, w, h) => {
    const cx = w / 2;
    contactShadow(g, cx, h - 4, 22, 4, 0.5);
    // plinth + flared base
    g.fillStyle = hex(PAL.ink);
    g.fillRect(cx - 13, h - 18, 26, 14);
    g.beginPath();
    g.moveTo(cx - 12, h - 18); g.quadraticCurveTo(cx - 6, h - 30, cx - 4.5, h - 56);
    g.lineTo(cx + 4.5, h - 56); g.quadraticCurveTo(cx + 6, h - 30, cx + 12, h - 18);
    g.closePath(); g.fill();
    g.fillRect(cx - 4.5, 70, 9, h - 126);
    for (const ry of [h - 70, h - 120, 78]) {
      g.beginPath(); g.ellipse(cx, ry, 8, 3.4, 0, 0, TAU); g.fill();
    }
    g.fillStyle = rgba(0xc7d6ff, 0.5);
    g.fillRect(cx + 2.6, 70, 1.4, h - 126);
    // scroll arms
    g.strokeStyle = hex(PAL.ink);
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx, 76);
      g.bezierCurveTo(cx + s * 16, 80, cx + s * 20, 66, cx + s * 12, 62);
      g.stroke();
      g.beginPath(); g.arc(cx + s * 11, 62, 3, 0, TAU); g.stroke();
    }
    lantern(g, cx, 45, 24, 46);
  });
  // gate posts + open leaf (origin x 3850, y 1255)
  canvasTex(scene, 'st:gate', 110, 96, (g, w, h) => {
    const post = (px: number) => {
      g.fillStyle = lin(g, px - 8, 0, px + 8, 0, [[0, 0x4e4a58], [0.7, 0x78748a], [1, 0xa8b4da]]);
      g.fillRect(px - 8, 20, 16, h - 20);
      g.fillStyle = hex(0x8a869c);
      g.fillRect(px - 11, 14, 22, 8);
      g.beginPath(); g.arc(px, 10, 7, 0, TAU); g.fill();
      g.fillStyle = rgba(0xffffff, 0.3);
      g.beginPath(); g.arc(px + 2, 8, 2.4, 0, TAU); g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.5);
      g.lineWidth = 0.8;
      g.strokeRect(px - 8, 22, 16, h - 22);
    };
    post(10);
    post(w - 10);
    // open leaf swung toward the viewer, foreshortened
    g.save();
    g.translate(w - 18, 0);
    for (let k = 0; k < 4; k++) {
      const x = -6 - k * 6;
      g.fillStyle = hex(k % 2 ? 0x9a96a8 : 0xb4b0c0);
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x, 34 + k * 2);
      g.lineTo(x + 2.5, 28 + k * 2);
      g.lineTo(x + 5, 34 + k * 2);
      g.lineTo(x + 5, h);
      g.fill();
    }
    g.fillStyle = hex(0x7d7a8e);
    g.fillRect(-28, 46, 30, 3.6);
    g.fillRect(-28, 78, 30, 3.6);
    g.restore();
  });
  // shrubs
  for (let i = 0; i < 2; i++) {
    canvasTex(scene, `st:shrub:${i}`, 150, 100, (g, w, h) => {
      const r = rng(300 + i);
      contactShadow(g, w / 2, h - 3, 60, 6, 0.45);
      const leafs = 70;
      for (let k = 0; k < leafs; k++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * 52;
        const lx = w / 2 + Math.cos(a) * d;
        const ly = h - 44 + Math.sin(a) * d * 0.62;
        const lr = 9 + r() * 12;
        g.fillStyle = hex(shade(0x1f4030, (r() - 0.5) * 0.3 + (lx > w / 2 ? 0.08 : -0.05)));
        ellipse(g, lx, ly, lr, lr * 0.8);
        g.fill();
      }
      g.fillStyle = rgba(0xc7d6ff, 0.12);
      ellipse(g, w / 2 + 22, h - 70, 24, 10);
      g.fill();
      // roses / berries
      for (let k = 0; k < 9; k++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * 46;
        const bx = w / 2 + Math.cos(a) * d;
        const by = h - 44 + Math.sin(a) * d * 0.62;
        g.fillStyle = hex(i ? 0xc77d8a : 0x9b7bff);
        g.beginPath(); g.arc(bx, by, 3.4, 0, TAU); g.fill();
        g.fillStyle = rgba(0xffffff, 0.35);
        g.beginPath(); g.arc(bx - 0.8, by - 0.9, 1.2, 0, TAU); g.fill();
      }
    });
  }
  canvasTex(scene, 'st:flowerbed', 190, 60, (g, w, h) => {
    const r = rng(333);
    contactShadow(g, w / 2, h - 4, 80, 5, 0.4);
    g.fillStyle = hex(0x2a1c1c);
    rrect(g, 8, h - 20, w - 16, 18, 6);
    g.fill();
    g.fillStyle = rgba(0x6a4a3a, 0.5);
    g.fillRect(10, h - 20, w - 20, 2);
    for (let k = 0; k < 26; k++) {
      const x = 16 + r() * (w - 32);
      const fh = 14 + r() * 24;
      g.strokeStyle = hex(0x2e5a3a);
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, h - 18);
      g.quadraticCurveTo(x + (r() - 0.5) * 8, h - 18 - fh * 0.5, x + (r() - 0.5) * 6, h - 18 - fh);
      g.stroke();
      const colr = [PAL.rose, PAL.violet, PAL.gold, 0xe8e0f4][Math.floor(r() * 4)];
      g.fillStyle = hex(colr);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * TAU;
        g.beginPath();
        g.arc(x + Math.cos(pa) * 3, h - 18 - fh + Math.sin(pa) * 3, 2.2, 0, TAU);
        g.fill();
      }
      g.fillStyle = hex(0xffe9a8);
      g.beginPath(); g.arc(x, h - 18 - fh, 1.4, 0, TAU); g.fill();
    }
  });
  canvasTex(scene, 'st:sign', 130, 100, (g, w, h) => {
    contactShadow(g, 30, h - 3, 18, 3, 0.45);
    g.fillStyle = hex(PAL.woodDark);
    g.fillRect(26, 22, 8, h - 24);
    g.save();
    g.translate(w / 2 + 6, 42);
    g.rotate(-0.04);
    rrect(g, -52, -22, 104, 40, 5);
    fill(g, lin(g, 0, -22, 0, 18, [[0, 0x7a5a3c], [1, 0x4a2e1e]]), hex(PAL.ink), 1.4);
    g.fillStyle = rgba(0xc7d6ff, 0.3);
    g.fillRect(-48, -20, 96, 1.4);
    g.fillStyle = hex(PAL.cream);
    g.font = 'italic 600 14px "Iowan Old Style", Palatino, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HOLLOWMERE', 0, -4);
    g.font = 'italic 8px "Iowan Old Style", Palatino, Georgia, serif';
    g.fillStyle = rgba(PAL.cream, 0.6);
    g.fillText('est. 1887 — no visitors', 0, 9);
    g.restore();
  });
  // gnarled dead tree, west of the house (origin x −140, y 480)
  canvasTex(scene, 'st:deadTree', 460, 880, (g, w, h) => {
    const draw = (col: string, ox: number, oy: number) => {
      const r = rng(777);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = col;
      // trunk
      const tx = 230;
      g.lineWidth = 46;
      g.beginPath();
      g.moveTo(tx - 4 + ox, h);
      g.bezierCurveTo(tx - 30 + ox, h - 160 + oy, tx + 26 + ox, h - 300 + oy, tx - 6 + ox, h - 470 + oy);
      g.stroke();
      // roots
      g.lineWidth = 16;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(tx + ox, h - 40 + oy);
        g.quadraticCurveTo(tx + s * 40 + ox, h - 14 + oy, tx + s * 84 + ox, h + oy);
        g.stroke();
      }
      const limb = (x: number, y: number, ang: number, len: number, wid: number, d: number) => {
        if (d <= 0 || wid < 1) return;
        const bend = (r() - 0.5) * 0.9;
        const x2 = x + Math.cos(ang + bend) * len;
        const y2 = y + Math.sin(ang + bend) * len;
        g.lineWidth = wid;
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.5 + ox, (y + y2) / 2 + (r() - 0.5) * len * 0.3 + oy, x2 + ox, y2 + oy);
        g.stroke();
        const kids = 2 + (r() < 0.3 ? 1 : 0);
        for (let k = 0; k < kids; k++) {
          limb(x2, y2, ang + bend + (k - (kids - 1) / 2) * (0.55 + r() * 0.5), len * (0.66 + r() * 0.16), wid * 0.62, d - 1);
        }
      };
      limb(tx - 6, h - 460, -Math.PI / 2 - 0.5, 150, 26, 6);
      limb(tx - 6, h - 460, -Math.PI / 2 + 0.55, 160, 26, 6);
      limb(tx - 2, h - 330, -Math.PI + 0.35, 120, 18, 5);
      limb(tx + 2, h - 300, -0.35, 130, 18, 5);
      limb(tx, h - 400, -Math.PI / 2 + 0.05, 130, 20, 5);
    };
    draw(rgba(0x9db4ff, 0.34), 2.2, -1.4);
    draw(hex(0x0a0d20), 0, 0);
    // hollow with two sleepy eyes (cute-eerie)
    g.fillStyle = hex(0x03040a);
    ellipse(g, 226, h - 300, 15, 26);
    g.fill();
    g.fillStyle = hex(0xffd27a);
    ellipse(g, 221, h - 304, 3, 4.4);
    g.fill();
    ellipse(g, 232, h - 304, 3, 4.4);
    g.fill();
    // a crow keeping watch
    g.fillStyle = hex(0x05060d);
    const bx = 330;
    const by = h - 560;
    ellipse(g, bx, by, 15, 9);
    g.fill();
    g.beginPath(); g.arc(bx + 13, by - 8, 6.4, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(bx + 18, by - 9); g.lineTo(bx + 29, by - 6); g.lineTo(bx + 18, by - 4); g.fill();
    g.beginPath(); g.moveTo(bx - 12, by); g.lineTo(bx - 32, by + 12); g.lineTo(bx - 8, by + 5); g.fill();
    g.fillStyle = hex(0xffd27a);
    g.beginPath(); g.arc(bx + 15, by - 9, 1.3, 0, TAU); g.fill();
  });
  // basement solid earth / foundation block (origin 2500,1346)
  const sw = BASEMENT_SOLID.x1 - BASEMENT_SOLID.x0;
  canvasTex(scene, 'st:solid', sw, 344, (g, w, h) => {
    const r = rng(909);
    g.fillStyle = hex(0x3c3846);
    g.fillRect(0, 0, w, h);
    let y = 0;
    let row = 0;
    while (y < h) {
      const bh = 34 + Math.floor(r() * 12);
      let x = row % 2 ? -50 : 0;
      while (x < w) {
        const bw = 70 + r() * 70;
        g.fillStyle = hex(shade(0x5d5a66, (r() - 0.5) * 0.26 - (y / h) * 0.12));
        rrect(g, x + 1.5, y + 1.5, bw - 3, bh - 3, 4);
        g.fill();
        g.fillStyle = rgba(0xc7d6ff, 0.14);
        g.fillRect(x + 4, y + 2, bw - 10, 1.4);
        g.fillStyle = rgba(0x000000, 0.28);
        g.fillRect(x + 3, y + bh - 4, bw - 6, 2);
        x += bw;
      }
      y += bh;
      row++;
    }
    speckle(g, 0, 0, w, h, 160, 0x3f6b4a, 0.4, 14, 2.4);
    // bricked-up arch with a crack of cold light (something is behind it)
    const ax = w * 0.55;
    const ay = h - 6;
    g.fillStyle = hex(0x1d1a26);
    g.beginPath();
    g.moveTo(ax - 48, ay); g.lineTo(ax - 48, ay - 96);
    g.arc(ax, ay - 96, 48, Math.PI, 0);
    g.lineTo(ax + 48, ay); g.closePath(); g.fill();
    g.strokeStyle = hex(0x8a869c);
    g.lineWidth = 3;
    g.stroke();
    for (let yy = ay - 138; yy < ay; yy += 12) {
      g.strokeStyle = rgba(0x000000, 0.4);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(ax - 48, yy); g.lineTo(ax + 48, yy); g.stroke();
    }
    g.strokeStyle = hex(0x9ff8e0);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(ax - 4, ay - 120); g.lineTo(ax + 2, ay - 98); g.lineTo(ax - 3, ay - 74); g.lineTo(ax + 3, ay - 44);
    g.stroke();
    g.strokeStyle = rgba(0x9ff8e0, 0.25);
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = lin(g, 0, 0, 0, 34, [[0, 0x000000, 0.5], [1, 0x000000, 0]]);
    g.fillRect(0, 0, w, 34);
  });
  // things buried in the garden soil
  canvasTex(scene, 'st:buried:0', 70, 50, (g) => {
    g.fillStyle = hex(0x4a2e1e);
    rrect(g, 6, 14, 58, 30, 4);
    g.fill();
    g.fillStyle = hex(0x6b4127);
    g.beginPath(); g.moveTo(6, 22); g.quadraticCurveTo(35, -2, 64, 22); g.lineTo(64, 28); g.lineTo(6, 28); g.fill();
    g.strokeStyle = hex(PAL.brass);
    g.lineWidth = 3;
    g.strokeRect(6, 14, 58, 30);
    g.fillStyle = hex(PAL.gold);
    g.fillRect(31, 24, 8, 10);
    g.fillStyle = rgba(PAL.gold, 0.4);
    g.beginPath(); g.arc(35, 29, 16, 0, TAU); g.fill();
  });
  canvasTex(scene, 'st:buried:1', 60, 40, (g) => {
    g.fillStyle = hex(0xd8d0bc);
    ellipse(g, 30, 18, 15, 13);
    g.fill();
    rrect(g, 21, 24, 18, 12, 3);
    g.fill();
    g.fillStyle = hex(0x161220);
    ellipse(g, 24.5, 18, 4, 4.6); g.fill();
    ellipse(g, 35.5, 18, 4, 4.6); g.fill();
    g.fillRect(29, 24, 2, 4);
    g.fillRect(25, 31, 1.4, 5); g.fillRect(29.3, 31, 1.4, 5); g.fillRect(33.6, 31, 1.4, 5);
    g.fillStyle = rgba(0x9ff8e0, 0.7);
    g.beginPath(); g.arc(24.5, 18.4, 1.3, 0, TAU); g.fill();
    g.beginPath(); g.arc(35.5, 18.4, 1.3, 0, TAU); g.fill();
  });
  canvasTex(scene, 'st:buried:2', 70, 40, (g) => {
    const r = rng(55);
    for (let k = 0; k < 5; k++) {
      const x = 12 + k * 11;
      const mh = 12 + r() * 14;
      g.fillStyle = hex(0xe8e0f4);
      g.fillRect(x - 1.4, 40 - mh, 2.8, mh);
      g.fillStyle = hex(0x9ff8e0);
      ellipse(g, x, 40 - mh, 7, 4.6);
      g.fill();
      g.fillStyle = rgba(0x9ff8e0, 0.22);
      g.beginPath(); g.arc(x, 40 - mh, 12, 0, TAU); g.fill();
    }
  });
}

// ================================================================ rooms ====

/** Attic interior clip: ATTIC_POLY with the bottom pushed down to the floor line. */
const ATTIC_CLIP: [number, number][] = [[240, 520], [240, 510], [540, 205], [2860, 205], [3160, 510], [3160, 520]];
const FLOOR_BAND = 22; // visible floor planks above floorY
const isAttic = (r: { id: RoomId }): boolean => r.id === 'attic' || r.id === 'nursery';
const rectPath = (g: Ctx2D, x: number, y: number, w: number, h: number): void => { g.beginPath(); g.rect(x, y, w, h); };

/** Paint a room texture in ABSOLUTE world coords (translated so the texture origin is the room's top-left). */
function roomTex(scene: Phaser.Scene, key: string, r: RoomDef, draw: (g: Ctx2D) => void): void {
  canvasTex(scene, key, r.x1 - r.x0, r.floorY - r.ceil, (g) => {
    g.translate(-r.x0, -r.ceil);
    if (isAttic(r)) {
      clipped(g, () => { g.beginPath(); ATTIC_CLIP.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }, () => draw(g));
    } else draw(g);
  });
}

function wallpaper(g: Ctx2D, r: RoomDef): void {
  const { x0, x1, ceil: y0, floorY } = r;
  const y1 = floorY - FLOOR_BAND;
  const w = x1 - x0;
  const h = y1 - y0;
  const rnd = rng(x0 * 3 + 11);
  const base = (top: number, bot: number): void => { g.fillStyle = lin(g, 0, y0, 0, y1, [[0, top], [1, bot]]); g.fillRect(x0, y0, w, h); };
  switch (r.wallpaper) {
    case 'atticBoards': {
      base(0x3a2a20, 0x5a4332);
      for (let x = x0; x < x1; x += 34) {
        g.fillStyle = rgba(rnd() < 0.5 ? 0x000000 : 0xffffff, 0.04 + rnd() * 0.07); g.fillRect(x, y0, 34, h);
        g.fillStyle = rgba(0x000000, 0.5); g.fillRect(x, y0, 1.6, h);
        for (let k = 0; k < 2; k++) { g.fillStyle = rgba(0x15100c, 0.8); g.fillRect(x + 6 + rnd() * 20, y0 + 20 + rnd() * h, 1.6, 1.6); }
      }
      // rafters
      g.fillStyle = hex(0x2a1d15);
      for (const rx of [x0 + 150, x0 + 560, x0 + 980, x0 + 1380]) { g.fillRect(rx, y0, 16, h); g.fillStyle = rgba(0xffffff, 0.06); g.fillRect(rx, y0, 2, h); g.fillStyle = hex(0x2a1d15); }
      break;
    }
    case 'stars': {
      base(0x2c2a5e, 0x3d3a78);
      for (let i = 0; i < 90; i++) {
        const sx = x0 + rnd() * w; const sy = y0 + 8 + rnd() * (h - 60); const s = 3 + rnd() * 4;
        g.fillStyle = rgba(rnd() < 0.7 ? 0xf2d27a : 0xcfd6ff, 0.55 + rnd() * 0.4);
        g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const rr = k % 2 ? s * 0.42 : s; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      }
      for (let x = x0 + 120; x < x1; x += 330) { g.fillStyle = hex(0xe8d29a); g.beginPath(); g.arc(x, y0 + 130, 11, 0, TAU); g.fill(); g.fillStyle = hex(0x35336b); g.beginPath(); g.arc(x + 5, y0 + 127, 10, 0, TAU); g.fill(); }
      g.fillStyle = hex(0xd9a1b8); g.fillRect(x0, y1 - 70, w, 70); // pink wainscot
      g.fillStyle = rgba(0xffffff, 0.35); for (let x = x0; x < x1; x += 22) g.fillRect(x, y1 - 70, 2, 70);
      break;
    }
    case 'tiles': {
      base(0x9bb0b0, 0xc4d6d4);
      const th = y1 - y0 - 70;
      g.fillStyle = hex(0xe9f1ee); g.fillRect(x0, y0 + 70, w, th);
      g.strokeStyle = rgba(0x6c8a8a, 0.55); g.lineWidth = 1;
      for (let x = x0; x <= x1; x += 22) { g.beginPath(); g.moveTo(x, y0 + 70); g.lineTo(x, y1); g.stroke(); }
      for (let y = y0 + 70; y <= y1; y += 22) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      g.fillStyle = hex(0x2f6a6f); g.fillRect(x0, y0 + 70, w, 8); g.fillRect(x0, y0 + 70 + th * 0.45, w, 6);
      break;
    }
    case 'damask': {
      base(0x6b2a38, 0x7f3745);
      g.fillStyle = rgba(0xe8b4a0, 0.2);
      for (let x = x0; x < x1 + 40; x += 40) for (let y = y0; y < y1 + 60; y += 60) {
        const oy = ((x - x0) / 40) % 2 ? 30 : 0;
        const cx = x; const cy = y + oy;
        g.beginPath(); g.moveTo(cx, cy - 22); g.quadraticCurveTo(cx + 14, cy - 6, cx, cy + 22); g.quadraticCurveTo(cx - 14, cy - 6, cx, cy - 22); g.fill();
        g.beginPath(); g.arc(cx, cy, 3, 0, TAU); g.fill();
      }
      g.fillStyle = hex(0x3d1a22); g.fillRect(x0, y1 - 110, w, 110);
      g.fillStyle = hex(0xc9a35e); g.fillRect(x0, y1 - 112, w, 4);
      break;
    }
    case 'woodPanel': {
      base(0x3a2517, 0x4c3220);
      for (let x = x0 + 10; x < x1 - 40; x += 74) {
        g.fillStyle = hex(shade(0x4d3322, (rnd() - 0.5) * 0.14)); rrect(g, x, y0 + 40, 64, h - 50, 3); g.fill();
        g.strokeStyle = rgba(0x000000, 0.55); g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = rgba(0xffffff, 0.09); g.lineWidth = 1; g.strokeRect(x + 2, y0 + 42, 60, h - 54);
      }
      g.fillStyle = hex(0x2a190f); g.fillRect(x0, y0 + 30, w, 10);
      break;
    }
    case 'stripes': {
      base(0x4a6a6a, 0x587878);
      for (let x = x0; x < x1; x += 36) { g.fillStyle = rgba(0xe6dcc0, 0.16); g.fillRect(x, y0, 18, h); g.fillStyle = rgba(0x000000, 0.1); g.fillRect(x + 18, y0, 1.4, h); }
      g.fillStyle = hex(0x2f4545); g.fillRect(x0, y1 - 96, w, 96);
      g.fillStyle = hex(0x93826a); g.fillRect(x0, y1 - 99, w, 4);
      break;
    }
    case 'kitchenTile': {
      base(0xe0cf9a, 0xd6c48a);
      const ty = y0 + 110;
      g.fillStyle = hex(0xeef0e4); g.fillRect(x0, ty, w, y1 - ty);
      g.strokeStyle = rgba(0x7a8a7a, 0.5); g.lineWidth = 1;
      for (let x = x0; x <= x1; x += 18) { g.beginPath(); g.moveTo(x, ty); g.lineTo(x, y1); g.stroke(); }
      for (let y = ty; y <= y1; y += 18) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      g.fillStyle = hex(0x4f9a8a); g.fillRect(x0, ty - 6, w, 8);
      break;
    }
    case 'dining': {
      base(0x244a3a, 0x2f5c48);
      for (let x = x0 + 14; x < x1; x += 56) { g.fillStyle = rgba(0xd9b86a, 0.14); g.fillRect(x, y0, 3, h); g.fillStyle = rgba(0xd9b86a, 0.09); g.fillRect(x + 8, y0, 1.2, h); }
      g.fillStyle = hex(0x3a2a1a); g.fillRect(x0, y1 - 118, w, 118);
      g.strokeStyle = rgba(0xd9b86a, 0.5); g.lineWidth = 1.4;
      for (let x = x0 + 12; x < x1 - 60; x += 78) g.strokeRect(x, y1 - 104, 64, 88);
      g.fillStyle = hex(0xd9b86a); g.fillRect(x0, y1 - 121, w, 3.5);
      break;
    }
    case 'parlor': {
      base(0x5c3a52, 0x6e4862);
      g.strokeStyle = rgba(0xe8c9d8, 0.16); g.lineWidth = 1.6;
      for (let x = x0 + 20; x < x1; x += 60) for (let y = y0 + 20; y < y1; y += 60) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); }
      g.fillStyle = hex(0x35212f); g.fillRect(x0, y1 - 100, w, 100);
      g.fillStyle = hex(0xb78f5a); g.fillRect(x0, y1 - 103, w, 4);
      break;
    }
    case 'foyer': {
      base(0x3c2c3e, 0x4b3750);
      for (let x = x0 + 30; x < x1 - 30; x += 130) {
        g.strokeStyle = rgba(0xd9b86a, 0.5); g.lineWidth = 2; g.strokeRect(x, y0 + 36, 100, h - 64);
        g.strokeStyle = rgba(0xd9b86a, 0.22); g.strokeRect(x + 7, y0 + 43, 86, h - 78);
      }
      g.fillStyle = hex(0x2a1c2a); g.fillRect(x0, y1 - 54, w, 54);
      break;
    }
    case 'stone': {
      base(0x4a4856, 0x3a3846);
      for (let y = y0; y < y1; y += 30) {
        const off = ((y - y0) / 30) % 2 ? 30 : 0;
        for (let x = x0 - off; x < x1; x += 60 + ((x * 7) % 3) * 6) {
          const bw = 56 + rnd() * 10;
          g.fillStyle = hex(shade(0x504d5e, (rnd() - 0.5) * 0.3)); g.fillRect(x + 1.5, y + 1.5, bw - 3, 27);
          g.fillStyle = rgba(0xffffff, 0.06); g.fillRect(x + 1.5, y + 1.5, bw - 3, 2);
        }
      }
      break;
    }
    case 'brick': {
      base(0x6a3a30, 0x4e2a24);
      for (let y = y0; y < y1; y += 18) {
        const off = ((y - y0) / 18) % 2 ? 22 : 0;
        for (let x = x0 - off; x < x1; x += 44) {
          g.fillStyle = hex(shade(PAL.brick, (rnd() - 0.5) * 0.35)); g.fillRect(x + 1.5, y + 1.5, 41, 15);
          g.fillStyle = rgba(0x000000, 0.2); g.fillRect(x + 1.5, y + 14, 41, 3);
        }
      }
      break;
    }
  }
}

/** Crown molding, baseboard, optional soot/shade; floor planks/tiles in the bottom band. */
function trimAndFloor(g: Ctx2D, r: RoomDef): void {
  const { x0, x1, ceil: y0, floorY } = r;
  const w = x1 - x0;
  const fy = floorY - FLOOR_BAND;
  const rnd = rng(x1 + 5);
  const cellar = r.floor === 'basement';
  if (!isAttic(r)) {
    g.fillStyle = hex(cellar ? 0x2a2832 : 0xcdbb98); g.fillRect(x0, y0, w, 9);
    g.fillStyle = rgba(0x000000, 0.35); g.fillRect(x0, y0 + 9, w, 5);
  }
  // floor band
  const kind = r.wallpaper === 'tiles' || r.wallpaper === 'kitchenTile' ? 'checker' : r.wallpaper === 'foyer' ? 'marble' : cellar ? 'flag' : 'plank';
  const c0 = kind === 'plank' ? PAL.woodLight : kind === 'flag' ? 0x4a4856 : 0xd9d4c8;
  g.fillStyle = lin(g, 0, fy, 0, floorY, [[0, shade(c0, -0.35)], [1, shade(c0, -0.1)]]);
  g.fillRect(x0, fy, w, FLOOR_BAND);
  if (kind === 'plank') {
    for (let x = x0 + 0; x < x1; x += 46 + ((x * 13) % 5) * 8) { g.fillStyle = rgba(0x000000, 0.35); g.fillRect(x, fy, 1.4, FLOOR_BAND); }
    g.fillStyle = rgba(0x000000, 0.22); g.fillRect(x0, fy + 9, w, 1.2);
  } else if (kind === 'flag') {
    for (let x = x0; x < x1; x += 60 + rnd() * 20) { g.fillStyle = rgba(0x000000, 0.4); g.fillRect(x, fy, 1.6, FLOOR_BAND); }
  } else {
    for (let x = x0, i = 0; x < x1; x += 22, i++) {
      g.fillStyle = (i % 2) ? hex(kind === 'marble' ? 0x2b2433 : 0x2f6a6f) : rgba(0xffffff, 0.0);
      g.fillRect(x, fy, 22, FLOOR_BAND / 2);
      g.fillStyle = (i % 2) ? rgba(0xffffff, 0) : hex(kind === 'marble' ? 0x2b2433 : 0x2f6a6f);
      g.fillRect(x, fy + FLOOR_BAND / 2, 22, FLOOR_BAND / 2);
    }
  }
  // baseboard
  g.fillStyle = hex(cellar ? 0x2a2832 : 0xcdbb98); g.fillRect(x0, fy - 9, w, 9);
  g.fillStyle = rgba(0xffffff, 0.2); g.fillRect(x0, fy - 9, w, 1.4);
  g.fillStyle = rgba(0x000000, 0.45); g.fillRect(x0, fy, w, 2.4);
}

/** Cobwebs in the top corners of the dusty rooms. */
function cobweb(g: Ctx2D, cx: number, cy: number, dir: 1 | -1, sz: number): void {
  g.strokeStyle = rgba(0xdfe6ff, 0.35); g.lineWidth = 0.9;
  for (let k = 0; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dir * Math.cos(a) * sz, cy + Math.sin(a) * sz); g.stroke(); }
  for (let rr = 0.3; rr <= 1; rr += 0.23) {
    g.beginPath();
    for (let k = 0; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2); const px = cx + dir * Math.cos(a) * sz * rr; const py = cy + Math.sin(a) * sz * rr; if (k) g.quadraticCurveTo(cx + dir * Math.cos(a - 0.2) * sz * rr * 0.8, cy + Math.sin(a - 0.2) * sz * rr * 0.8, px, py); else g.moveTo(px, py); }
    g.stroke();
  }
}

// ---- windows ----

/** Glass outline of a window (center x,y). */
function winPath(g: Ctx2D, wd: WindowDef): void {
  const x = wd.x - wd.w / 2;
  const y = wd.y - wd.h / 2;
  g.beginPath();
  if (wd.kind === 'round') g.arc(wd.x, wd.y, wd.w / 2, 0, TAU);
  else if (wd.kind === 'arched') { g.moveTo(x, y + wd.h); g.lineTo(x, y + wd.w / 2); g.arc(wd.x, y + wd.w / 2, wd.w / 2, Math.PI, 0); g.lineTo(x + wd.w, y + wd.h); g.closePath(); }
  else if (wd.kind === 'bay') {
    const s = wd.w * 0.22;
    g.moveTo(x, y + 14); g.lineTo(x + s, y); g.lineTo(x + wd.w - s, y); g.lineTo(x + wd.w, y + 14);
    g.lineTo(x + wd.w, y + wd.h - 14); g.lineTo(x + wd.w - s, y + wd.h); g.lineTo(x + s, y + wd.h); g.lineTo(x, y + wd.h - 14); g.closePath();
  } else g.rect(x, y, wd.w, wd.h);
}

/** The night outside, seen through a window. `low` = basement window at grass level. */
function nightView(g: Ctx2D, wd: WindowDef, low: boolean, seed: number): void {
  const x = wd.x - wd.w / 2;
  const y = wd.y - wd.h / 2;
  const rnd = rng(seed);
  g.fillStyle = lin(g, 0, y, 0, y + wd.h, [[0, 0x0a1030], [0.6, 0x1c2658], [1, 0x34396f]]);
  g.fillRect(x - 2, y - 2, wd.w + 4, wd.h + 4);
  g.fillStyle = rad(g, x + wd.w * 0.72, y + wd.h * 0.3, 0, wd.w * 0.5, [[0, 0xf3ecd2, 0.95], [0.12, 0xf3ecd2, 0.7], [0.3, 0x9db4ff, 0.25], [1, 0x9db4ff, 0]]);
  g.fillRect(x, y, wd.w, wd.h);
  for (let i = 0; i < 6 + wd.w / 14; i++) { g.fillStyle = rgba(0xffffff, 0.35 + rnd() * 0.5); g.fillRect(x + rnd() * wd.w, y + rnd() * wd.h * 0.6, 1.3, 1.3); }
  if (low) { // lawn level: grass blades + dark ground
    g.fillStyle = hex(0x0d1520); g.fillRect(x - 2, y + wd.h * 0.55, wd.w + 4, wd.h);
    for (let k = x; k < x + wd.w; k += 3) { g.fillStyle = hex(0x0d1520); g.fillRect(k, y + wd.h * 0.5 - rnd() * 6, 1.6, 8); }
  } else { // far hills + a bare tree
    g.fillStyle = hex(0x141a3c);
    g.beginPath(); g.moveTo(x - 2, y + wd.h + 2);
    for (let k = 0; k <= wd.w + 4; k += 6) g.lineTo(x - 2 + k, y + wd.h * (0.72 - 0.1 * Math.sin(k * 0.05 + seed) - 0.04 * Math.sin(k * 0.17)));
    g.lineTo(x + wd.w + 2, y + wd.h + 2); g.closePath(); g.fill();
    g.strokeStyle = hex(0x090c1d); g.lineWidth = 2; g.lineCap = 'round';
    const tx = x + wd.w * (0.2 + rnd() * 0.2);
    g.beginPath(); g.moveTo(tx, y + wd.h); g.lineTo(tx, y + wd.h * 0.55); g.moveTo(tx, y + wd.h * 0.7); g.lineTo(tx + 12, y + wd.h * 0.55); g.moveTo(tx, y + wd.h * 0.62); g.lineTo(tx - 10, y + wd.h * 0.5); g.stroke();
  }
}

function windowArt(g: Ctx2D, wd: WindowDef, floor: RoomDef['floor'], seed: number): void {
  const frame = floor === 'basement' ? 0x6a6470 : 0xd9c9a8;
  g.save();
  g.fillStyle = rgba(0x000000, 0.35); winPath(g, wd); g.lineWidth = 12; g.strokeStyle = rgba(0x000000, 0.28); g.stroke();
  clipped(g, () => winPath(g, wd), () => nightView(g, wd, floor === 'basement', seed));
  // glass sheen
  clipped(g, () => winPath(g, wd), () => {
    g.fillStyle = rgba(0xffffff, 0.07);
    g.beginPath(); g.moveTo(wd.x - wd.w * 0.5, wd.y + wd.h * 0.1); g.lineTo(wd.x - wd.w * 0.05, wd.y - wd.h * 0.5); g.lineTo(wd.x + wd.w * 0.12, wd.y - wd.h * 0.5); g.lineTo(wd.x - wd.w * 0.4, wd.y + wd.h * 0.5); g.fill();
  });
  // frame + muntins
  winPath(g, wd); g.strokeStyle = hex(frame); g.lineWidth = 6; g.stroke();
  g.strokeStyle = rgba(0x000000, 0.35); g.lineWidth = 1; g.stroke();
  g.strokeStyle = hex(frame); g.lineWidth = 3.2;
  const x = wd.x - wd.w / 2;
  const y = wd.y - wd.h / 2;
  g.beginPath();
  if (wd.kind === 'round') { g.moveTo(wd.x - wd.w / 2, wd.y); g.lineTo(wd.x + wd.w / 2, wd.y); g.moveTo(wd.x, wd.y - wd.h / 2); g.lineTo(wd.x, wd.y + wd.h / 2); }
  else if (wd.kind === 'bay') { const s = wd.w * 0.22; g.moveTo(x + s, y); g.lineTo(x + s, y + wd.h); g.moveTo(x + wd.w - s, y); g.lineTo(x + wd.w - s, y + wd.h); g.moveTo(x, wd.y); g.lineTo(x + wd.w, wd.y); }
  else if (wd.kind === 'small') { g.moveTo(wd.x, y); g.lineTo(wd.x, y + wd.h); }
  else { g.moveTo(wd.x, y); g.lineTo(wd.x, y + wd.h); g.moveTo(x, wd.y + wd.h * 0.1); g.lineTo(x + wd.w, wd.y + wd.h * 0.1); }
  g.stroke();
  // sill
  if (wd.kind !== 'round') { g.fillStyle = hex(frame); g.fillRect(x - 8, y + wd.h + 1, wd.w + 16, 7); g.fillStyle = rgba(0x000000, 0.3); g.fillRect(x - 8, y + wd.h + 8, wd.w + 16, 3); }
  g.restore();
}

// ---- stairs (painted on the back wall) ----

function railing(g: Ctx2D, xa: number, xb: number, yFloor: number, hgt: number): void {
  const lo = Math.min(xa, xb);
  const hi = Math.max(xa, xb);
  g.fillStyle = hex(PAL.woodDark); g.fillRect(lo, yFloor - hgt, hi - lo, 5);
  g.fillStyle = hex(PAL.woodLight); g.fillRect(lo, yFloor - hgt, hi - lo, 1.5);
  for (let x = lo + 4; x < hi; x += 11) { g.fillStyle = hex(PAL.woodDark); g.fillRect(x, yFloor - hgt, 3.4, hgt); }
  g.fillStyle = hex(PAL.woodDark); g.fillRect(lo - 3, yFloor - hgt - 8, 9, hgt + 8); g.fillRect(hi - 6, yFloor - hgt - 8, 9, hgt + 8);
  g.fillStyle = hex(PAL.woodLight); g.fillRect(lo - 4, yFloor - hgt - 10, 11, 4); g.fillRect(hi - 7, yFloor - hgt - 10, 11, 4);
}

function flight(g: Ctx2D, a: [number, number], b: [number, number]): void {
  const [lo, hi] = a[1] > b[1] ? [a, b] : [b, a];
  const n = Math.max(3, Math.round(Math.hypot(hi[0] - lo[0], lo[1] - hi[1]) / 30));
  const sx = (hi[0] - lo[0]) / n;
  const sy = (lo[1] - hi[1]) / n;
  const T = 30;
  // dark understair
  g.fillStyle = rgba(0x07040a, 0.55);
  poly(g, [[lo[0], lo[1]], [hi[0], hi[1] + T], [hi[0], lo[1]]]); g.fill();
  // stringer
  g.fillStyle = hex(PAL.woodDark);
  poly(g, [[lo[0], lo[1] - 2], [hi[0], hi[1] - 2], [hi[0], hi[1] + T], [lo[0], lo[1] + T - 14]]); g.fill();
  for (let i = 0; i < n; i++) {
    const x = lo[0] + i * sx;
    const y = lo[1] - (i + 1) * sy;
    const l = Math.min(x, x + sx);
    g.fillStyle = hex(shade(PAL.woodDark, -0.2)); g.fillRect(l, y, Math.abs(sx) + 1, sy + 1); // riser
    g.fillStyle = hex(PAL.woodLight); g.fillRect(l - 3, y - 3.5, Math.abs(sx) + 6, 4.5); // tread + nosing
    g.fillStyle = rgba(0xffffff, 0.22); g.fillRect(l - 3, y - 3.5, Math.abs(sx) + 6, 1.2);
    g.fillStyle = rgba(0x000000, 0.35); g.fillRect(l, y + 1, Math.abs(sx), 2);
    // balusters
    if (i % 2 === 0) { g.fillStyle = hex(PAL.woodDark); g.fillRect(l + Math.abs(sx) / 2 - 1.5, y - 60, 3, 56); }
  }
  g.strokeStyle = hex(PAL.woodDark); g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(lo[0], lo[1] - 60); g.lineTo(hi[0], hi[1] - 60 - 3); g.stroke();
  g.strokeStyle = rgba(0xffffff, 0.2); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(lo[0], lo[1] - 62); g.lineTo(hi[0], hi[1] - 63); g.stroke();
  g.fillStyle = hex(PAL.woodDark); g.fillRect(lo[0] - 5, lo[1] - 78, 10, 78);
  g.fillStyle = hex(PAL.woodLight); g.fillRect(lo[0] - 6, lo[1] - 80, 12, 4);
}

function roomStairs(g: Ctx2D, r: RoomDef): void {
  for (const st of STAIRS) {
    const p = st.path;
    const topIsFirst = p[0][1] < p[p.length - 1][1];
    const topRoom = topIsFirst ? st.a : st.b;
    const top = topIsFirst ? p[0] : p[p.length - 1];
    const nxt = topIsFirst ? p[1] : p[p.length - 2];
    const lowRoom = topIsFirst ? st.b : st.a;
    if (r.id === lowRoom) {
      clipped(g, () => rectPath(g, r.x0, r.ceil, r.x1 - r.x0, r.floorY - r.ceil), () => {
        for (let i = 0; i < p.length - 1; i++) if (Math.abs(p[i][1] - p[i + 1][1]) > 30) flight(g, p[i], p[i + 1]);
      });
    }
    if (r.id === topRoom) { // balustrade at the stair-well opening
      const dir = Math.sign(nxt[0] - top[0]) || 1;
      railing(g, top[0], top[0] + dir * 56, r.floorY - FLOOR_BAND + 6, 62);
    }
  }
}

// ---- light fixtures (unlit look baked into the room; lit core = separate ADD overlay) ----

function fixture(g: Ctx2D, l: LightDef, ceil: number): void {
  const { x, y } = l;
  g.save();
  switch (l.kind) {
    case 'bulb': {
      const shaded = l.id === 'kitchen_lamp';
      g.strokeStyle = hex(PAL.ink); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, ceil); g.lineTo(x, y - (shaded ? 22 : 12)); g.stroke();
      if (shaded) {
        g.fillStyle = hex(0xe9e4d2); g.beginPath(); g.moveTo(x - 7, y - 24); g.lineTo(x + 7, y - 24); g.lineTo(x + 24, y - 2); g.lineTo(x - 24, y - 2); g.closePath(); g.fill();
        g.fillStyle = rgba(0x000000, 0.25); g.fillRect(x - 24, y - 4, 48, 2.4);
      } else { g.fillStyle = hex(0x2b2530); g.fillRect(x - 4, y - 12, 8, 8); }
      g.fillStyle = hex(0xcfc39a); g.beginPath(); g.arc(x, y + (shaded ? 1 : 2), 7.5, 0, TAU); g.fill();
      g.fillStyle = rgba(0xffffff, 0.35); g.beginPath(); g.arc(x - 2.4, y - 1, 2.4, 0, TAU); g.fill();
      break;
    }
    case 'sconce': {
      g.fillStyle = hex(0x2b2530); rrect(g, x - 5, y - 6, 10, 38, 3); g.fill();
      g.fillStyle = hex(PAL.brass); g.fillRect(x - 3, y + 14, 6, 10); g.beginPath(); g.arc(x, y + 22, 7, 0, Math.PI); g.fill();
      g.fillStyle = hex(0xf1e3c6); g.beginPath(); g.moveTo(x - 7, y + 12); g.lineTo(x + 7, y + 12); g.lineTo(x + 12, y - 12); g.lineTo(x - 12, y - 12); g.closePath(); g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.6); g.lineWidth = 1; g.stroke();
      break;
    }
    case 'lamp': { // plug-in night light
      g.fillStyle = hex(0x2b2530); g.fillRect(x - 4, y + 12, 8, 14);
      g.fillStyle = hex(0xd9d0e8); rrect(g, x - 11, y - 12, 22, 26, 9); g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.6); g.lineWidth = 1; g.stroke();
      g.fillStyle = hex(0x8f84b0); g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill();
      g.fillStyle = hex(0xd9d0e8); g.beginPath(); g.arc(x + 2.6, y - 1.6, 4.6, 0, TAU); g.fill();
      break;
    }
    case 'candle': {
      g.fillStyle = hex(0x2b2530); g.fillRect(x - 3, y - 8, 6, 28);
      g.fillStyle = hex(PAL.brass); g.fillRect(x - 12, y + 14, 24, 4); g.beginPath(); g.arc(x, y + 18, 11, 0, Math.PI); g.fill();
      g.fillStyle = hex(PAL.cream); g.fillRect(x - 3.2, y - 8, 6.4, 22);
      g.fillStyle = rgba(0x000000, 0.25); g.fillRect(x + 1, y - 8, 2.2, 22);
      g.fillStyle = hex(0x222222); g.fillRect(x - 0.5, y - 12, 1, 4);
      break;
    }
    case 'lantern': {
      g.strokeStyle = hex(PAL.ink); g.lineWidth = 3; g.beginPath(); g.moveTo(x + 34, y - 46); g.lineTo(x, y - 46); g.lineTo(x, y - 24); g.stroke();
      g.fillStyle = hex(0x2b2530); g.fillRect(x + 30, y - 52, 8, 62);
      lantern(g, x, y, 22, 40);
      break;
    }
    default: break;
  }
  g.restore();
}

// ---- pictures ----

interface PictureDef { room: RoomId; x: number; y: number; w: number; h: number; motif: 'landscape' | 'portrait' | 'still' | 'map' | 'abc' | 'mirror' | 'sampler' }
const PICTURES: PictureDef[] = [
  { room: 'attic', x: 1320, y: 340, w: 70, h: 92, motif: 'portrait' },
  { room: 'nursery', x: 2310, y: 330, w: 84, h: 62, motif: 'abc' },
  { room: 'nursery', x: 2120, y: 300, w: 60, h: 60, motif: 'landscape' },
  { room: 'bedroom', x: 1000, y: 690, w: 96, h: 70, motif: 'landscape' },
  { room: 'study', x: 1790, y: 640, w: 84, h: 58, motif: 'map' },
  { room: 'upperHall', x: 2390, y: 650, w: 70, h: 92, motif: 'portrait' },
  { room: 'upperHall', x: 2700, y: 610, w: 56, h: 74, motif: 'sampler' },
  { room: 'kitchen', x: 380, y: 1080, w: 70, h: 56, motif: 'sampler' },
  { room: 'dining', x: 1250, y: 1060, w: 96, h: 70, motif: 'still' },
  { room: 'parlor', x: 1660, y: 1060, w: 84, h: 106, motif: 'portrait' },
  { room: 'parlor', x: 2220, y: 1090, w: 104, h: 76, motif: 'mirror' },
  { room: 'foyer', x: 2960, y: 1040, w: 76, h: 96, motif: 'portrait' },
];

function picture(g: Ctx2D, p: PictureDef): void {
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;
  g.fillStyle = rgba(0x000000, 0.3); g.fillRect(x + 3, y + 4, p.w, p.h);
  g.fillStyle = lin(g, x, y, x + p.w, y + p.h, [[0, 0xe0b867], [1, 0x8f6a2e]]); g.fillRect(x - 5, y - 5, p.w + 10, p.h + 10);
  g.fillStyle = hex(0x3a2a14); g.fillRect(x - 1, y - 1, p.w + 2, p.h + 2);
  clipped(g, () => rectPath(g, x, y, p.w, p.h), () => {
    switch (p.motif) {
      case 'landscape':
        g.fillStyle = lin(g, 0, y, 0, y + p.h, [[0, 0x6a7ab0], [0.6, 0xc9b48a]]); g.fillRect(x, y, p.w, p.h);
        g.fillStyle = hex(0x3d5a3c); g.beginPath(); g.moveTo(x, y + p.h); g.quadraticCurveTo(x + p.w * 0.3, y + p.h * 0.45, x + p.w * 0.6, y + p.h * 0.7); g.quadraticCurveTo(x + p.w * 0.8, y + p.h * 0.5, x + p.w, y + p.h * 0.65); g.lineTo(x + p.w, y + p.h); g.fill();
        break;
      case 'portrait':
        g.fillStyle = hex(0x2b2118); g.fillRect(x, y, p.w, p.h);
        g.fillStyle = hex(0xd4b08a); g.beginPath(); g.ellipse(p.x, y + p.h * 0.38, p.w * 0.19, p.h * 0.17, 0, 0, TAU); g.fill();
        g.fillStyle = hex(0x15110c); g.beginPath(); g.ellipse(p.x, y + p.h * 0.88, p.w * 0.36, p.h * 0.3, 0, Math.PI, TAU); g.fill();
        g.fillStyle = hex(0x6a2a2a); g.fillRect(p.x - p.w * 0.3, y + p.h * 0.7, p.w * 0.6, p.h * 0.3);
        break;
      case 'still':
        g.fillStyle = hex(0x3a2c24); g.fillRect(x, y, p.w, p.h);
        g.fillStyle = hex(0x8f3a2a); g.beginPath(); g.arc(p.x - 14, y + p.h * 0.62, 9, 0, TAU); g.fill();
        g.fillStyle = hex(0xc9a24a); g.beginPath(); g.arc(p.x + 8, y + p.h * 0.66, 11, 0, TAU); g.fill();
        g.fillStyle = hex(0x4a6a3a); g.beginPath(); g.arc(p.x + 28, y + p.h * 0.68, 7, 0, TAU); g.fill();
        break;
      case 'map':
        g.fillStyle = hex(0xd8c79a); g.fillRect(x, y, p.w, p.h);
        g.strokeStyle = hex(0x6a5a3a); g.lineWidth = 1.2; polyline(g, [[x + 8, y + p.h * 0.7], [x + 26, y + p.h * 0.3], [x + 44, y + p.h * 0.55], [x + 66, y + p.h * 0.25]]); g.stroke();
        g.fillStyle = hex(0x8a2a2a); g.fillRect(x + 62, y + 12, 5, 5);
        break;
      case 'abc':
        g.fillStyle = hex(0xf0e0b8); g.fillRect(x, y, p.w, p.h);
        for (let i = 0; i < 4; i++) { g.fillStyle = hex([0xd96a6a, 0x6aa0d9, 0xd9c24a, 0x6ac28a][i]); g.fillRect(x + 6 + i * 19, y + 14, 15, 16); g.fillRect(x + 6 + i * 19, y + 36, 15, 12); }
        break;
      case 'mirror':
        g.fillStyle = lin(g, x, y, x + p.w, y + p.h, [[0, 0x6f7f9a], [0.5, 0xaab8cf], [1, 0x4a566e]]); g.fillRect(x, y, p.w, p.h);
        g.fillStyle = rgba(0xffffff, 0.25); g.beginPath(); g.moveTo(x + 10, y + p.h); g.lineTo(x + 30, y); g.lineTo(x + 44, y); g.lineTo(x + 24, y + p.h); g.fill();
        break;
      case 'sampler':
        g.fillStyle = hex(0xe3d3b0); g.fillRect(x, y, p.w, p.h);
        g.strokeStyle = hex(0x9a4a4a); g.lineWidth = 1.4; g.strokeRect(x + 5, y + 5, p.w - 10, p.h - 10);
        g.fillStyle = hex(0x9a4a4a); for (let i = 0; i < 4; i++) g.fillRect(x + 12, y + 14 + i * 9, p.w - 24 - (i % 2) * 12, 3);
        break;
    }
    g.fillStyle = lin(g, x, y, x + p.w, y + p.h, [[0, 0xffffff, 0.14], [0.5, 0xffffff, 0], [1, 0xffffff, 0.06]]); g.fillRect(x, y, p.w, p.h);
  });
}

/** Boiler-room plumbing: ceiling pipes, valves, a pressure gauge. */
function pipes(g: Ctx2D, r: RoomDef): void {
  const y = r.ceil + 34;
  g.lineCap = 'butt';
  for (const [dy, c] of [[0, 0x6a5a4a], [16, 0x4a5a64]] as const) {
    g.fillStyle = hex(c); g.fillRect(r.x0 + 20, y + dy, r.x1 - r.x0 - 90, 9);
    g.fillStyle = rgba(0xffffff, 0.2); g.fillRect(r.x0 + 20, y + dy, r.x1 - r.x0 - 90, 2);
    for (let x = r.x0 + 120; x < r.x1 - 100; x += 210) { g.fillStyle = hex(shade(c, -0.3)); g.fillRect(x, y + dy - 2, 8, 13); }
  }
  g.fillStyle = hex(0x6a5a4a); g.fillRect(r.x1 - 80, y, 9, 150); g.fillRect(r.x0 + 300, y + 16, 9, 120);
  g.fillStyle = hex(0x9a2f2f); g.beginPath(); g.arc(r.x0 + 304, y + 140, 9, 0, TAU); g.fill();
  g.fillStyle = hex(0xe9e4d2); g.beginPath(); g.arc(r.x1 - 120, y + 60, 15, 0, TAU); g.fill();
  g.strokeStyle = hex(PAL.ink); g.lineWidth = 2; g.stroke();
  g.beginPath(); g.moveTo(r.x1 - 120, y + 60); g.lineTo(r.x1 - 110, y + 52); g.stroke();
}

function roomArt(scene: Phaser.Scene, r: RoomDef, lights: LightDef[]): void {
  roomTex(scene, `st:room:${r.id}`, r, (g) => {
    wallpaper(g, r);
    trimAndFloor(g, r);
    if (r.id === 'boiler') pipes(g, r);
    r.windows.forEach((wd, i) => windowArt(g, wd, r.floor, r.x0 + i));
    for (const p of PICTURES) if (p.room === r.id) picture(g, p);
    roomStairs(g, r);
    for (const l of lights) if (!l.objectId) fixture(g, l, r.ceil);
    // dust, cobwebs, ambient occlusion
    if (isAttic(r) || r.floor === 'basement') { cobweb(g, r.x0 + 4, r.ceil + 2, 1, 70); cobweb(g, r.x1 - 4, r.ceil + 2, -1, 62); }
    g.fillStyle = lin(g, 0, r.ceil, 0, r.ceil + 90, [[0, 0x000000, 0.5], [1, 0x000000, 0]]); g.fillRect(r.x0, r.ceil, r.x1 - r.x0, 90);
    g.fillStyle = lin(g, r.x0, 0, r.x0 + 70, 0, [[0, 0x000000, 0.42], [1, 0x000000, 0]]); g.fillRect(r.x0, r.ceil, 70, r.floorY - r.ceil);
    g.fillStyle = lin(g, r.x1 - 70, 0, r.x1, 0, [[0, 0x000000, 0], [1, 0x000000, 0.42]]); g.fillRect(r.x1 - 70, r.ceil, 70, r.floorY - r.ceil);
    g.fillStyle = lin(g, 0, r.floorY - 90, 0, r.floorY, [[0, 0x000000, 0], [1, 0x000000, 0.35]]); g.fillRect(r.x0, r.floorY - 90, r.x1 - r.x0, 90);
  });
}

// ---- glows / lit cores / dark overlays / panes / shafts ----

const GLOW_RES = 0.5;

/** Clip shape (absolute coords) a light's glow may not leave. */
function lightClip(g: Ctx2D, l: LightDef): void {
  g.beginPath();
  if (l.room === 'outside') { g.rect(HOUSE.x1, WORLD_TOP, 2000, 3000); return; }
  const r = ROOM_BY_ID[l.room];
  if (isAttic(r)) ATTIC_CLIP.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  else g.rect(r.x0, r.ceil, r.x1 - r.x0, r.floorY - r.ceil);
  g.closePath();
}
const WORLD_TOP = WORLD.y0;

function glowTex(scene: Phaser.Scene, l: LightDef): string {
  const R = l.radius;
  return softTex(scene, `st:glow:${l.id}`, R * 2, R * 2, GLOW_RES, (g) => {
    g.translate(R - l.x, R - l.y);
    clipped(g, () => lightClip(g, l), () => {
      g.fillStyle = rad(g, l.x, l.y, 0, R, [[0, l.color, 0.6], [0.18, l.color, 0.4], [0.5, shade(l.color, -0.25), 0.15], [1, l.color, 0]]);
      g.fillRect(l.x - R, l.y - R, R * 2, R * 2);
    });
  });
}

const LIT_SIZE: Record<string, [number, number]> = { bulb: [44, 44], sconce: [44, 52], lamp: [40, 44], candle: [30, 50], lantern: [44, 64], chandelier: [44, 44], fire: [44, 44], window: [44, 44] };

/** Lit core overlay for a light kind (centered on the light position). */
function litTex(scene: Phaser.Scene, kind: LightDef['kind']): string {
  const [lw, lh] = LIT_SIZE[kind] ?? [44, 44];
  return canvasTex(scene, `st:lit:${kind}`, lw, lh, (g) => {
    const cx = lw / 2;
    const cy = lh / 2;
    g.fillStyle = rad(g, cx, cy, 0, lw / 2, [[0, 0xfff6d0, 0.9], [0.3, 0xffd890, 0.45], [1, 0xffc060, 0]]);
    g.fillRect(0, 0, lw, lh);
    g.fillStyle = hex(0xfff3c8);
    if (kind === 'bulb') { g.beginPath(); g.arc(cx, cy + 2, 7.5, 0, TAU); g.fill(); }
    else if (kind === 'sconce') { g.fillStyle = rgba(0xffe9b0, 0.95); poly(g, [[cx - 7, cy + 12], [cx + 7, cy + 12], [cx + 12, cy - 12], [cx - 12, cy - 12]]); g.fill(); }
    else if (kind === 'lamp') { g.fillStyle = rgba(0xffe4b8, 0.95); rrect(g, cx - 10, cy - 12, 20, 24, 8); g.fill(); }
    else if (kind === 'candle') { g.fillStyle = hex(0xffd36a); g.beginPath(); g.moveTo(cx, cy - 4); g.quadraticCurveTo(cx + 5, cy + 6, cx, cy + 10); g.quadraticCurveTo(cx - 5, cy + 6, cx, cy - 4); g.fill(); g.fillStyle = hex(0xfff6d0); g.beginPath(); g.ellipse(cx, cy + 6, 1.8, 3.2, 0, 0, TAU); g.fill(); }
    else if (kind === 'lantern') { g.fillStyle = rgba(0xffe9b0, 0.92); rrect(g, cx - 8, cy - 14, 16, 28, 5); g.fill(); g.fillStyle = hex(0xfff6d0); g.beginPath(); g.arc(cx, cy, 4.5, 0, TAU); g.fill(); }
  });
}

function darkTex(scene: Phaser.Scene, r: RoomDef): string {
  return softTex(scene, `st:dark:${r.id}`, r.x1 - r.x0, r.floorY - r.ceil, 0.5, (g) => {
    g.translate(-r.x0, -r.ceil);
    clipped(g, () => {
      g.beginPath();
      if (isAttic(r)) ATTIC_CLIP.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      else g.rect(r.x0, r.ceil, r.x1 - r.x0, r.floorY - r.ceil);
      g.closePath();
    }, () => {
      g.fillStyle = hex(0x070a1a);
      g.fillRect(r.x0, r.ceil, r.x1 - r.x0, r.floorY - r.ceil);
    });
  });
}

/** Lightning-flash pane: glass shape in white (muntins cut out), sized wd + 8 padding, origin = window top-left - 4. */
function paneTex(scene: Phaser.Scene, wd: WindowDef): string {
  const key = `st:pane:${wd.kind}:${wd.w}x${wd.h}`;
  return canvasTex(scene, key, wd.w + 8, wd.h + 8, (g) => {
    g.translate(wd.w / 2 + 4 - wd.x, wd.h / 2 + 4 - wd.y);
    winPath(g, wd);
    g.fillStyle = hex(0xe8f0ff); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = 3.2; g.beginPath();
    if (wd.kind === 'round') { g.moveTo(wd.x - wd.w / 2, wd.y); g.lineTo(wd.x + wd.w / 2, wd.y); g.moveTo(wd.x, wd.y - wd.h / 2); g.lineTo(wd.x, wd.y + wd.h / 2); }
    else if (wd.kind !== 'bay') { g.moveTo(wd.x, wd.y - wd.h / 2); g.lineTo(wd.x, wd.y + wd.h / 2); }
    g.stroke();
  });
}

/** Moonbeam from a window to the floor, clipped to the room. Returns null when the room is too cramped. */
function shaftTex(scene: Phaser.Scene, r: RoomDef, wd: WindowDef, i: number): { key: string; x: number; y: number; w: number; h: number } | null {
  const yb = wd.y + wd.h / 2;
  const yf = r.floorY - FLOOR_BAND + 6;
  const dy = yf - yb;
  if (dy < 40) return null;
  const dx = dy * 0.65;
  const x0 = Math.max(r.x0, wd.x - wd.w / 2 - dx - 6);
  const x1 = Math.min(r.x1, wd.x + wd.w / 2 + 6);
  const w = x1 - x0;
  const key = `st:shaft:${r.id}:${i}`;
  softTex(scene, key, w, dy, 0.5, (g) => {
    g.translate(-x0, -yb);
    clipped(g, () => {
      g.beginPath();
      if (isAttic(r)) ATTIC_CLIP.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      else g.rect(r.x0, r.ceil, r.x1 - r.x0, r.floorY - r.ceil);
      g.closePath();
    }, () => {
      g.fillStyle = lin(g, 0, yb, 0, yf, [[0, 0xb4c8ff, 0.3], [0.7, 0x9db4ff, 0.1], [1, 0x9db4ff, 0.04]]);
      poly(g, [[wd.x - wd.w / 2 + 4, yb], [wd.x + wd.w / 2 - 4, yb], [wd.x + wd.w / 2 - dx, yf], [wd.x - wd.w / 2 - dx, yf]]);
      g.fill();
    });
  });
  return { key, x: x0, y: yb, w, h: dy };
}

// ================================================================ decor ====

const woodTone = (c: number, r: () => number): string => hex(shade(c, (r() - 0.5) * 0.18));

function crate(g: Ctx2D, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  g.fillStyle = hex(0x5a3b22); g.fillRect(x, y, w, h);
  const n = Math.round(h / 14);
  for (let i = 0; i < n; i++) { g.fillStyle = woodTone(0x7a5230, r); g.fillRect(x + 2, y + 2 + i * ((h - 4) / n), w - 4, (h - 4) / n - 1.5); }
  g.strokeStyle = hex(0x3a2412); g.lineWidth = 5;
  g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + h - 4); g.moveTo(x + w - 4, y + 4); g.lineTo(x + 4, y + h - 4); g.stroke();
  g.strokeStyle = rgba(0xffffff, 0.12); g.lineWidth = 1; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.strokeStyle = rgba(PAL.ink, 0.7); g.lineWidth = 1.2; g.strokeRect(x, y, w, h);
}

/** Decor painters draw in a frame where y = h is the floor and x ∈ [0,w]. */
type DecorPainter = (g: Ctx2D, w: number, h: number) => void;

const DECOR_PAINT: Record<string, DecorPainter> = {
  crates(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.52, 6, 0.5);
    crate(g, 0, h - 56, 72, 56, 1); crate(g, 76, h - 54, 74, 54, 2); crate(g, 20, h - 110, 74, 56, 3);
    g.fillStyle = rgba(0xd9d0c0, 0.5); g.beginPath(); g.moveTo(90, h - 108); g.quadraticCurveTo(122, h - 96, 132, h - 58); g.lineTo(150, h - 58); g.lineTo(100, h - 112); g.fill(); // draped sheet
  },
  crib(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 6, 0.45);
    const wood = hex(0xe9dcc0); const dk = hex(0xb8a47c);
    for (const px of [4, w - 14]) { g.fillStyle = wood; g.fillRect(px, 0, 10, h - 4); g.fillStyle = dk; g.fillRect(px + 7, 0, 3, h - 4); g.fillStyle = wood; g.beginPath(); g.arc(px + 5, -1, 6, 0, TAU); g.fill(); }
    g.fillStyle = hex(0xc9b88e); g.fillRect(2, 8, w - 4, 7);
    for (let x = 22; x < w - 20; x += 14) { g.fillStyle = wood; g.fillRect(x, 14, 4.6, 52); }
    g.fillStyle = hex(0x8aa3d4); g.fillRect(8, 64, w - 16, 12); // mattress
    // dust ruffle down to the floor (hides what is under the crib)
    g.fillStyle = lin(g, 0, 70, 0, h, [[0, 0xdbe3f4], [1, 0xa9b6d6]]);
    g.beginPath(); g.moveTo(6, 74); g.lineTo(w - 6, 74); g.lineTo(w - 6, h - 6);
    for (let x = w - 6; x > 6; x -= 14) g.quadraticCurveTo(x - 7, h + 3, x - 14, h - 6);
    g.closePath(); g.fill();
    g.strokeStyle = rgba(0x5a6a94, 0.5); g.lineWidth = 1.1;
    for (let x = 16; x < w - 8; x += 14) { g.beginPath(); g.moveTo(x, 78); g.lineTo(x, h - 8); g.stroke(); }
    g.fillStyle = hex(0xf2c46a); for (const sx of [34, 60, 88]) { g.beginPath(); g.arc(sx, 56, 3.4, 0, TAU); g.fill(); }
    g.fillStyle = hex(0xf0e6d0); rrect(g, 22, 52, 36, 14, 6); g.fill(); // pillow
  },
  toyTable(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 4, 0.4);
    for (const lx of [10, w - 18]) { g.fillStyle = hex(0x9a6fc0); g.fillRect(lx, 8, 8, h - 8); g.fillStyle = rgba(0x000000, 0.25); g.fillRect(lx + 5, 8, 3, h - 8); }
    g.fillStyle = hex(0xf0c85a); rrect(g, 0, 0, w, 11, 4); g.fill();
    g.fillStyle = rgba(0xffffff, 0.3); g.fillRect(3, 1, w - 6, 2);
    g.fillStyle = hex(0xd96a6a); g.fillRect(14, h - 30, 12, 10); g.fillStyle = hex(0x6aa0d9); g.fillRect(w - 34, h - 24, 12, 10);
  },
  stool(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 3.5, 0.4);
    g.fillStyle = hex(PAL.woodDark);
    g.fillRect(8, 8, 5, h - 8); g.fillRect(w - 13, 8, 5, h - 8);
    g.fillRect(8, h * 0.62, w - 16, 3);
    g.fillStyle = hex(PAL.woodLight); rrect(g, 2, 0, w - 4, 10, 4); g.fill();
    g.fillStyle = hex(0xc77d8a); rrect(g, 5, -3, w - 10, 7, 3); g.fill();
  },
  sink(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.4, 4, 0.4);
    const c = lin(g, 0, 0, w, 0, [[0, 0xdfe6e6], [0.5, 0xffffff], [1, 0xb6c4c4]]);
    g.fillStyle = c; g.beginPath(); g.moveTo(w * 0.36, 16); g.lineTo(w * 0.64, 16); g.quadraticCurveTo(w * 0.62, h * 0.7, w * 0.7, h - 8); g.lineTo(w * 0.3, h - 8); g.quadraticCurveTo(w * 0.38, h * 0.7, w * 0.36, 16); g.fill();
    g.fillRect(w * 0.22, h - 9, w * 0.56, 9);
    g.fillStyle = c; rrect(g, 0, 0, w, 20, 8); g.fill();
    g.fillStyle = hex(0x8fa0a0); rrect(g, 8, 3, w - 16, 5, 2); g.fill();
    g.fillStyle = hex(PAL.brass); g.fillRect(w * 0.5 - 2, -14, 4, 15); g.fillRect(w * 0.5 - 2, -16, 14, 4); g.fillRect(w * 0.18, -8, 7, 8); g.fillRect(w * 0.75, -8, 7, 8);
    g.strokeStyle = rgba(PAL.ink, 0.5); g.lineWidth = 1; rrect(g, 0, 0, w, 20, 8); g.stroke();
  },
  nightstand(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 4, 0.4);
    g.fillStyle = hex(PAL.woodDark); g.fillRect(4, h - 12, 7, 12); g.fillRect(w - 11, h - 12, 7, 12);
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, shade(PAL.wood, -0.1)], [1, shade(PAL.wood, -0.35)]]); rrect(g, 0, 0, w, h - 12, 3); g.fill();
    g.fillStyle = hex(PAL.woodLight); g.fillRect(-3, -2, w + 6, 6);
    g.strokeStyle = rgba(0x000000, 0.45); g.lineWidth = 1.4; g.strokeRect(6, 12, w - 12, 18); g.strokeRect(6, 36, w - 12, 18);
    g.fillStyle = hex(PAL.brass); g.beginPath(); g.arc(w / 2, 21, 2.6, 0, TAU); g.arc(w / 2, 45, 2.6, 0, TAU); g.fill();
    g.fillStyle = rgba(0xf1e3c6, 0.9); ellipse(g, w / 2, -1, 20, 2.4); g.fill(); // doily
  },
  counter(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 4.5, 0.45);
    g.fillStyle = hex(0x4f9a8a); g.fillRect(0, 12, w, h - 12 - 8);
    g.fillStyle = hex(0x2f2a30); g.fillRect(0, h - 8, w, 8);
    for (let x = 6; x < w - 20; x += 62) {
      g.fillStyle = hex(0x5fae9c); rrect(g, x, 18, 56, h - 36, 3); g.fill();
      g.strokeStyle = rgba(0x000000, 0.3); g.lineWidth = 1.2; g.stroke();
      g.fillStyle = hex(PAL.brass); g.beginPath(); g.arc(x + 46, 30, 2.4, 0, TAU); g.fill();
    }
    g.fillStyle = hex(0xe9e1cf); g.fillRect(-4, 0, w + 8, 12);
    g.fillStyle = rgba(0x000000, 0.25); g.fillRect(-4, 10, w + 8, 2.4);
    g.fillStyle = hex(0x8fa0a8); rrect(g, w * 0.4, 1, w * 0.26, 7, 3); g.fill(); // sink basin
    g.fillStyle = hex(0xc9d2d6); g.fillRect(w * 0.53 - 2, -22, 4, 22); g.fillRect(w * 0.53 - 2, -24, 16, 4); g.fillRect(w * 0.53 + 12, -24, 4, 7);
    g.fillStyle = hex(0xd4c9b0); g.fillRect(w * 0.1, -10, 18, 10); g.fillStyle = hex(0xb04a4a); g.fillRect(w * 0.1, -10, 18, 3); // canister
    g.fillStyle = hex(0xd4c9b0); g.fillRect(w * 0.85, -12, 16, 12);
  },
  diningTable(g, w, h) {
    const top = 18; // headroom (table setting) is painted above y=0 via translate by caller
    contactShadow(g, w / 2, h - 1, w * 0.52, 5, 0.5);
    // tablecloth hangs to the floor
    g.fillStyle = lin(g, 0, 0, 0, h, [[0, 0xf6ecd6], [1, 0xcfc2a2]]);
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(w + 8, 0); g.lineTo(w + 4, h - 3);
    for (let x = w + 4; x > 4; x -= 20) g.quadraticCurveTo(x - 10, h + 3, x - 20, h - 3);
    g.lineTo(4, h - 3); g.closePath(); g.fill();
    g.strokeStyle = rgba(0x8a7a52, 0.4); g.lineWidth = 1.2;
    for (let x = 14; x < w; x += 20) { g.beginPath(); g.moveTo(x, 8); g.quadraticCurveTo(x - 2, h * 0.5, x, h - 6); g.stroke(); }
    g.fillStyle = hex(0x8a2f3f); g.fillRect(-8, 2, w + 16, 6); g.fillRect(4, h - 20, w - 8, 3); // trim bands
    g.fillStyle = rgba(0x000000, 0.12); g.fillRect(-8, 8, w + 16, 4);
    // table setting
    for (const px of [w * 0.16, w * 0.84]) { g.fillStyle = hex(0xf5f1e6); ellipse(g, px, -2, 20, 3.4); g.fill(); g.strokeStyle = hex(0x8aa0c0); g.lineWidth = 1; g.stroke(); }
    for (const cx of [w * 0.44, w * 0.56]) { g.fillStyle = hex(PAL.brass); g.fillRect(cx - 1.6, -top + 5, 3.2, top - 6); g.fillRect(cx - 5, -3, 10, 3); g.fillStyle = hex(PAL.cream); g.fillRect(cx - 2, -top - 4, 4, 10); g.fillStyle = hex(0xffd36a); g.beginPath(); g.ellipse(cx, -top - 7, 1.8, 3.4, 0, 0, TAU); g.fill(); }
    g.fillStyle = hex(0x5a7a8a); ellipse(g, w * 0.5, -3, 13, 4); g.fill();
  },
  sofa(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.52, 5, 0.5);
    const c = 0x7a3a4a;
    g.fillStyle = hex(PAL.woodDark); g.fillRect(8, h - 8, 8, 8); g.fillRect(w - 16, h - 8, 8, 8);
    g.fillStyle = lin(g, 0, 0, 0, h, [[0, shade(c, 0.1)], [1, shade(c, -0.3)]]);
    rrect(g, 0, 20, 30, h - 28, 12); g.fill(); rrect(g, w - 30, 20, 30, h - 28, 12); g.fill(); // arms
    rrect(g, 18, 0, w - 36, h * 0.62, 14); g.fill(); // backrest
    g.fillStyle = hex(shade(c, 0.08)); rrect(g, 22, h * 0.45, w - 44, h * 0.34, 10); g.fill(); // seat cushions
    g.strokeStyle = rgba(0x000000, 0.38); g.lineWidth = 1.4; g.beginPath(); g.moveTo(w / 2, h * 0.45); g.lineTo(w / 2, h * 0.79); g.stroke();
    g.fillStyle = hex(shade(c, -0.18)); rrect(g, 14, h * 0.78, w - 28, h * 0.18, 5); g.fill(); // apron
    g.fillStyle = hex(PAL.gold); for (let x = 36; x < w - 30; x += 22) { g.beginPath(); g.arc(x, h * 0.2, 1.8, 0, TAU); g.fill(); } // buttons
    g.fillStyle = rgba(0xffffff, 0.12); rrect(g, 20, 2, w - 40, 4, 2); g.fill();
    g.strokeStyle = rgba(PAL.ink, 0.5); g.lineWidth = 1.2; rrect(g, 18, 0, w - 36, h * 0.62, 14); g.stroke();
  },
  sideTable(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 3.5, 0.4);
    g.fillStyle = hex(PAL.woodDark); g.fillRect(w / 2 - 3, 8, 6, h - 14);
    g.beginPath(); g.moveTo(w / 2 - 14, h); g.lineTo(w / 2 + 14, h); g.lineTo(w / 2 + 4, h - 12); g.lineTo(w / 2 - 4, h - 12); g.fill();
    g.fillStyle = hex(PAL.woodLight); ellipse(g, w / 2, 3, w / 2, 5); g.fill();
    g.fillStyle = rgba(0xf1e3c6, 0.9); ellipse(g, w / 2, 1.5, w * 0.3, 2.2); g.fill();
  },
  rug(g, w, h) {
    g.fillStyle = hex(0x7a2f3a); rrect(g, 0, 0, w, h, 4); g.fill();
    g.fillStyle = hex(0xc9a35e); g.fillRect(6, 2, w - 12, 1.8); g.fillRect(6, h - 3.8, w - 12, 1.8);
    for (let x = 24; x < w - 24; x += 34) { g.fillStyle = rgba(0xe8c9a0, 0.5); g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 8, 2.5); g.lineTo(x + 16, h / 2); g.lineTo(x + 8, h - 2.5); g.fill(); }
    g.fillStyle = hex(0xe8dcc0); for (let x = 2; x < w; x += 4) { g.fillRect(x, -2, 1.2, 2.4); g.fillRect(x, h - 0.4, 1.2, 2.4); }
  },
  barrels(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.55, 5, 0.5);
    const barrel = (cx: number, by: number, bw: number, bh: number, seed: number): void => {
      const r = rng(seed);
      g.fillStyle = lin(g, cx - bw / 2, 0, cx + bw / 2, 0, [[0, 0x3a2414], [0.4, 0x7a5230], [1, 0x3a2414]]);
      g.beginPath(); g.moveTo(cx - bw * 0.42, by - bh); g.quadraticCurveTo(cx - bw * 0.62, by - bh / 2, cx - bw * 0.42, by); g.lineTo(cx + bw * 0.42, by); g.quadraticCurveTo(cx + bw * 0.62, by - bh / 2, cx + bw * 0.42, by - bh); g.closePath(); g.fill();
      g.strokeStyle = rgba(0x000000, 0.35); g.lineWidth = 1;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx + k * bw * 0.14, by - bh); g.lineTo(cx + k * bw * 0.16, by); g.stroke(); }
      g.fillStyle = hex(0x2a2a30);
      for (const t of [0.14, 0.4, 0.62, 0.86]) { const hw = bw * (0.46 + 0.1 * Math.sin(t * Math.PI)); g.fillRect(cx - hw, by - bh * (1 - t) - 2, hw * 2, 4.6); }
      g.fillStyle = woodTone(0x8a6038, r); ellipse(g, cx, by - bh, bw * 0.42, 5); g.fill();
      g.strokeStyle = rgba(PAL.ink, 0.6); g.lineWidth = 1; g.stroke();
    };
    barrel(40, h, 76, 82, 5); barrel(w - 42, h, 80, 86, 6); barrel(w / 2 + 2, h - 78, 74, 44, 7);
    g.fillStyle = hex(0x7a1f2a); g.beginPath(); g.arc(w / 2, h - 58, 3, 0, TAU); g.fill(); // bung stain
  },
  coal(g, w, h) {
    const r = rng(77);
    contactShadow(g, w / 2, h - 1, w * 0.55, 5, 0.5);
    g.fillStyle = hex(0x16141a);
    g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w * 0.15, h - 30, w * 0.3, h - 52); g.quadraticCurveTo(w * 0.5, h - 96, w * 0.7, h - 56); g.quadraticCurveTo(w * 0.88, h - 30, w, h); g.closePath(); g.fill();
    for (let i = 0; i < 90; i++) {
      const t = r(); const px = w * (0.04 + t * 0.92);
      const maxH = Math.max(6, (1 - Math.abs(t - 0.5) * 2) * 84 + 10);
      const py = h - r() * maxH * 0.92 - 4;
      const s = 6 + r() * 8;
      g.fillStyle = hex(shade(0x1c1a22, (r() - 0.35) * 0.9));
      g.beginPath(); g.moveTo(px, py - s * 0.6); g.lineTo(px + s * 0.7, py - s * 0.1); g.lineTo(px + s * 0.4, py + s * 0.5); g.lineTo(px - s * 0.5, py + s * 0.4); g.lineTo(px - s * 0.7, py - s * 0.2); g.closePath(); g.fill();
      g.fillStyle = rgba(0x9db4ff, 0.18 + r() * 0.15); g.fillRect(px - s * 0.2, py - s * 0.5, s * 0.4, 1.4);
    }
    g.strokeStyle = hex(0x4a3a2a); g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.82, h - 70); g.lineTo(w * 0.94, h - 6); g.stroke();
    g.fillStyle = hex(0x4a5a64); g.beginPath(); g.moveTo(w * 0.9, h - 8); g.lineTo(w, h - 4); g.lineTo(w * 0.96, h - 14); g.fill();
  },
  washtub(g, w, h) {
    contactShadow(g, w / 2, h - 1, w * 0.5, 4, 0.45);
    g.fillStyle = hex(PAL.woodDark); g.fillRect(6, h * 0.55, 8, h * 0.45); g.fillRect(w - 14, h * 0.55, 8, h * 0.45); g.fillRect(6, h * 0.8, w - 12, 4);
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x6a7a84], [0.45, 0xc4d0d6], [1, 0x56646e]]);
    g.beginPath(); g.moveTo(0, 6); g.lineTo(w, 6); g.lineTo(w - 10, h * 0.62); g.quadraticCurveTo(w / 2, h * 0.7, 10, h * 0.62); g.closePath(); g.fill();
    g.fillStyle = hex(0x3a444c); ellipse(g, w / 2, 6, w / 2, 5); g.fill();
    g.fillStyle = hex(0x8fb0b8); ellipse(g, w / 2, 7, w / 2 - 6, 3.2); g.fill();
    g.fillStyle = rgba(0xffffff, 0.8); for (const [bx, by, br] of [[w * 0.3, 4, 3.4], [w * 0.5, 2, 2.6], [w * 0.66, 5, 3]] as const) { g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill(); }
    g.strokeStyle = hex(0x3a444c); g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 12); g.lineTo(0, 22); g.moveTo(w + 6, 12); g.lineTo(w, 22); g.stroke();
    g.fillStyle = hex(0x9a7a4a); g.fillRect(w - 8, -6, 6, 20); // washboard handle
  },
};

/** DECOR ids painted as a FRONT layer (DEPTH.decorFront): hide spots without a hauntable object (sofa is split, see decorStatics). */
const FRONT_DECOR = new Set(['crates', 'crib', 'diningTable', 'barrels', 'coal']);
const DECOR_TOP_PAD: Record<string, number> = { diningTable: 34, sink: 20, counter: 28, crib: 14 };
const SOFA_FRONT_H = 30;

/** Paint every DECOR texture; returns manifest statics. Hide pieces get a `:front` variant (front layer). */
function decorStatics(scene: Phaser.Scene): StaticSprite[] {
  const out: StaticSprite[] = [];
  for (const d of DECOR) {
    const room = ROOM_BY_ID[d.room];
    const paint = DECOR_PAINT[d.id];
    if (!paint) continue;
    const top = DECOR_TOP_PAD[d.id] ?? 8;
    const PX = 14;
    const tw = d.w + PX * 2;
    const th = d.h + top + 8;
    const x = d.x - d.w / 2 - PX;
    const y = room.floorY - d.h - top;
    const base = (key: string, clipH?: number): string => canvasTex(scene, key, tw, th, (g, w, h) => {
      g.translate(PX, top);
      if (clipH !== undefined) clipped(g, () => rectPath(g, -PX, d.h - clipH, w, h), () => paint(g, d.w, d.h));
      else paint(g, d.w, d.h);
    });
    if (d.id === 'sofa') { // back layer = whole sofa, front layer = just the seat apron (hide cover)
      out.push({ key: base('st:decor:sofa'), x, y, depth: DEPTH.decorBack, room: d.room });
      out.push({ key: base('st:decor:sofa:front', SOFA_FRONT_H), x, y, depth: DEPTH.decorFront, room: d.room });
    } else if (FRONT_DECOR.has(d.id)) {
      out.push({ key: base(`st:decor:${d.id}`), x, y, depth: DEPTH.decorFront, room: d.room });
    } else {
      out.push({ key: base(`st:decor:${d.id}`), x, y, depth: d.id === 'rug' ? DEPTH.shafts + 1 : DEPTH.decorBack, room: d.room });
    }
  }
  return out;
}

/** Two dining chairs behind the seated residents (POIs dining_seat_a/b). Back layer. */
function diningChairs(scene: Phaser.Scene): StaticSprite {
  const r = ROOM_BY_ID.dining;
  const w = 250;
  const h = 104;
  canvasTex(scene, 'st:decor:chairs', w, h, (g) => {
    const chair = (cx: number, dir: 1 | -1): void => {
      g.fillStyle = hex(PAL.woodDark);
      const b = -dir; // back post is on the side the sitter's back faces
      g.fillRect(cx + b * 14 - 3, 0, 6, h - 4); g.fillRect(cx - b * 14 - 2, h - 44, 5, 44); g.fillRect(cx + b * 14 - 3, h - 44, 5, 44);
      g.fillStyle = hex(shade(PAL.wood, 0.05)); rrect(g, cx + b * 14 - 5, 4, 10, 56, 3); g.fill();
      for (let k = 0; k < 3; k++) { g.fillStyle = hex(PAL.woodDark); g.fillRect(cx + b * 14 - 1, 10 + k * 15, 3, 12); }
      g.fillStyle = hex(0x8a2f3f); rrect(g, cx - 18, h - 52, 36, 10, 3); g.fill();
      g.fillStyle = rgba(0xffffff, 0.2); g.fillRect(cx - 16, h - 52, 32, 1.6);
      contactShadow(g, cx, h - 1, 22, 3, 0.4);
    };
    chair(45, 1); chair(185, -1);
  });
  return { key: 'st:decor:chairs', x: 1015, y: r.floorY - h, depth: DEPTH.decorBack, room: 'dining' };
}

// ---- door leaves + lintels ----

const LEAF_W = 20; // wall thickness: leaves are edge-on slabs (roomArt springs scaleX for open/slam)

function doorLeaves(scene: Phaser.Scene): void {
  canvasTex(scene, 'st:door:door', LEAF_W, DOOR_H, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x3a2414], [0.5, 0x6a4326], [1, 0x4a2e1a]]); g.fillRect(0, 0, w, h);
    woodGrain(g, 0, 0, w, h, 0x5a3a22, 17, 10);
    g.fillStyle = rgba(0x000000, 0.32); for (const py of [h * 0.14, h * 0.5, h * 0.82]) g.fillRect(0, py, w, 3);
    g.fillStyle = rgba(0xffffff, 0.14); g.fillRect(0, 0, 1.4, h); g.fillRect(0, 0, w, 2);
    g.fillStyle = hex(PAL.brass); g.fillRect(w - 5, h * 0.52, 5, 12); g.beginPath(); g.arc(w - 3, h * 0.52 + 6, 3.4, 0, TAU); g.fill();
    g.fillStyle = hex(0x2b2530); g.fillRect(0, 18, w * 0.4, 12); g.fillRect(0, h - 40, w * 0.4, 12);
    g.strokeStyle = rgba(PAL.ink, 0.7); g.lineWidth = 1.2; g.strokeRect(0.6, 0.6, w - 1.2, h - 1.2);
  });
  canvasTex(scene, 'st:door:swing', LEAF_W, DOOR_H, (g, w, h) => {
    g.fillStyle = lin(g, 0, 0, w, 0, [[0, 0x6a4a2a], [0.5, 0xa07848], [1, 0x7a5430]]); g.fillRect(0, 0, w, h);
    g.fillStyle = rgba(0x000000, 0.3);
    for (let y = 20; y < h * 0.5; y += 9) g.fillRect(2, y, w - 4, 2.4); // louvers
    g.fillStyle = rgba(0x000000, 0.28); g.fillRect(0, h * 0.5, w, 3);
    g.fillStyle = hex(0xc9d2d6); rrect(g, 3, h * 0.56, w - 6, 26, 5); g.fill(); // push plate
    g.strokeStyle = rgba(PAL.ink, 0.6); g.lineWidth = 1; g.stroke();
    g.fillStyle = rgba(0xffffff, 0.16); g.fillRect(0, 0, 1.4, h);
    g.strokeStyle = rgba(PAL.ink, 0.7); g.lineWidth = 1.2; g.strokeRect(0.6, 0.6, w - 1.2, h - 1.2);
  });
  // lintel casings over a doorway (door / swing / open / arch)
  for (const kind of ['door', 'arch', 'open'] as const) {
    canvasTex(scene, `st:lintel:${kind}`, 36, 18, (g, w, h) => {
      g.fillStyle = hex(kind === 'door' ? 0xcdbb98 : 0xb9a47a); g.fillRect(0, h - 10, w, 10);
      g.fillStyle = rgba(0xffffff, 0.25); g.fillRect(0, h - 10, w, 1.4);
      g.fillStyle = rgba(0x000000, 0.45); g.fillRect(0, h - 3, w, 3);
      if (kind === 'arch') { g.fillStyle = hex(PAL.gold); g.beginPath(); g.moveTo(w / 2 - 6, h - 10); g.lineTo(w / 2 + 6, h - 10); g.lineTo(w / 2 + 3, 0); g.lineTo(w / 2 - 3, 0); g.fill(); }
      if (kind === 'open') { g.fillStyle = hex(0x6a5a3a); g.fillRect(0, h - 10, w, 2.4); }
    });
  }
}

// ============================================================ manifest ====

const LIT_KINDS = new Set<string>(['bulb', 'sconce', 'lamp', 'candle', 'lantern']);

/** Paint every world texture and return where each one goes (see worldManifest.ts). */
export function paintStructureTextures(scene: Phaser.Scene): WorldManifest {
  // --- paint ---
  paintSkyTextures(scene); paintHillTextures(scene); paintTreeTextures(scene); paintForegroundTextures(scene);
  paintRoof(scene); paintTurret(scene); paintChimneys(scene); paintPorch(scene); paintTileTextures(scene); paintExteriorProps(scene);
  doorLeaves(scene);
  for (const r of ROOMS) roomArt(scene, r, LIGHTS.filter((l) => l.room === r.id));

  const statics: StaticSprite[] = [];
  const lights: LightSprite[] = [];
  const dark: DarkSprite[] = [];
  const doors: DoorSprite[] = [];
  const windows: WindowSprite[] = [];
  const add = (s: StaticSprite): void => { statics.push(s); };
  const tileOf = (key: string, x: number, y: number, w: number, h: number, depth: number, extra: Partial<StaticSprite> = {}): void => add({ key, x, y, w, h, tile: true, depth, ...extra });

  // --- parallax backdrop ---
  for (let c = 0; c < HILL_CHUNKS; c++) add({ key: `st:hills:${c}`, x: LAYER_X0 + c * HILL_CHUNK_W, y: HILL_TOP, w: HILL_CHUNK_W + 2, h: HILL_H, depth: DEPTH.far, scroll: 0.35 });
  [-640, -420, -200, 3330, 3600, 3880, 4160, 4440].forEach((x, i) => add({ key: `st:tree:${i % 4}`, x, y: GARDEN_Y + 8 - 800, depth: DEPTH.mid, scroll: 0.7 }));
  tileOf('st:fgGrass', -900, WORLD.y1 - 120, 5800, 120, DEPTH.foreground, { scroll: 1.15 });

  // --- ground, soil, buried things ---
  tileOf('st:soil', -200, GARDEN_Y, 4400, WORLD.y1 + 40 - GARDEN_Y, DEPTH.near + 1);
  tileOf('st:grassLip', -200, GARDEN_Y - 10, 4400, 32, DEPTH.near + 1.2);
  const buried: [number, number, number][] = [[3300, 1420, 0], [3560, 1520, 1], [3820, 1440, 2], [60, 1560, 2], [130, 1690, 0], [3400, 1700, 1]];
  buried.forEach(([x, y, i]) => add({ key: `st:buried:${i}`, x, y, depth: DEPTH.near + 1.1 }));
  add({ key: 'st:deadTree', x: -140, y: 480, depth: DEPTH.near });

  // --- house shell: rooms, walls, slabs ---
  for (const r of ROOMS) {
    add({ key: `st:room:${r.id}`, x: r.x0, y: r.ceil, depth: DEPTH.room, room: r.id });
    dark.push({ room: r.id, key: darkTex(scene, r), x: r.x0, y: r.ceil, w: r.x1 - r.x0, h: r.floorY - r.ceil });
  }
  add(diningChairs(scene));
  statics.push(...decorStatics(scene));

  const S = DEPTH.structure;
  // exterior walls (siding above ground, foundation below) + front-door lintel wall
  tileOf('st:wallExt', HOUSE.x0, 546, 30, 800, S);
  tileOf('st:wallFound', HOUSE.x0, 1346, 30, 370, S);
  tileOf('st:wallExt', HOUSE.x1 - 30, 546, 30, FRONT_DOOR.floorY - FRONT_DOOR.h - 546, S);
  tileOf('st:wallExt', HOUSE.x1 - 30, FRONT_DOOR.floorY, 30, 26, S);
  tileOf('st:wallFound', HOUSE.x1 - 30, 1346, 30, 370, S);
  // slabs under each floor line
  for (const f of ['attic', 'upper', 'ground', 'basement'] as const) tileOf(f === 'basement' ? 'st:slabStone' : 'st:slab', HOUSE.x0, FLOORS[f].floor, HOUSE.x1 - HOUSE.x0, HOUSE.slab, S);
  // interior walls with doorway openings
  WALLS.forEach((w, wi) => {
    const fl = FLOORS[w.floor];
    const x = w.x - HOUSE.wallInt / 2;
    if (w.door === 'solid') {
      tileOf('st:wallInt', x, fl.ceil, HOUSE.wallInt / 2, fl.floor - fl.ceil, S);
      return;
    }
    const openTop = fl.floor - DOOR_H;
    tileOf('st:wallInt', x, fl.ceil, HOUSE.wallInt, openTop - fl.ceil, S);
    add({ key: `st:lintel:${w.door === 'swing' ? 'door' : w.door}`, x: w.x - 18, y: openTop - 18, depth: S + 0.2 });
    if (w.door === 'door' || w.door === 'swing') doors.push({ kind: w.door, wallIndex: wi, key: `st:door:${w.door}`, x: w.x - LEAF_W / 2, y: openTop, hingeX: w.x, hingeY: openTop });
  });
  add({ key: 'st:solid', x: BASEMENT_SOLID.x0, y: 1346, depth: S });

  // --- roof, turret, chimneys, porch ---
  add({ key: 'st:roof', x: 150, y: 150, depth: S });
  add({ key: 'st:turret', x: 2920, y: -112, depth: S + 0.5 });
  const chimneySmoke = CHIMNEYS.map((c, i) => {
    add({ key: `st:chimney:${i}`, x: c.x - 50, y: c.top - 28, depth: DEPTH.houseBack });
    return { x: c.x, y: c.top - 28 };
  });
  add({ key: 'st:porchBody', x: 3195, y: 1030, depth: DEPTH.npcBehind });
  add({ key: 'st:porchRoof', x: 3180, y: 1000, depth: S });
  const fdY = FRONT_DOOR.floorY - FRONT_DOOR.h;
  const frontDoor: DoorSprite = { kind: 'front', wallIndex: -1, key: 'st:frontDoor', x: FRONT_DOOR.x0, y: fdY, hingeX: FRONT_DOOR.x0, hingeY: fdY };

  // --- garden props ---
  add({ key: 'st:lamppost', x: 3665, y: 1105, depth: DEPTH.decor });
  add({ key: 'st:gate', x: 3850, y: 1255, depth: DEPTH.object - 1 });
  add({ key: 'st:flowerbed', x: 3545, y: GARDEN_Y - 52, depth: DEPTH.object - 2 });
  add({ key: 'st:sign', x: 3715, y: GARDEN_Y - 95, depth: DEPTH.object - 2 });
  add({ key: 'st:shrub:0', x: -10, y: GARDEN_Y - 96, depth: DEPTH.object - 2 });
  add({ key: 'st:shrub:1', x: 80, y: GARDEN_Y - 96, depth: DEPTH.object - 2 });
  tileOf('st:fence', 3594, GARDEN_Y - 60, 256, 64, DEPTH.decor - 1);
  tileOf('st:fence', 3960, GARDEN_Y - 60, 256, 64, DEPTH.decor - 1);

  // --- windows: moon shafts + lightning panes ---
  for (const r of ROOMS) {
    r.windows.forEach((wd, i) => {
      const sh = shaftTex(scene, r, wd, i);
      if (sh) add({ key: sh.key, x: sh.x, y: sh.y, w: sh.w, h: sh.h, depth: DEPTH.shafts, add: true });
      windows.push({ room: r.id, key: paneTex(scene, wd), x: wd.x - wd.w / 2 - 4, y: wd.y - wd.h / 2 - 4 });
    });
  }
  const tw: WindowDef = { x: TURRET.window.x, y: TURRET.window.y, w: TURRET.window.r * 2, h: TURRET.window.r * 2, kind: 'round' };
  windows.push({ room: 'outside', key: paneTex(scene, tw), x: tw.x - tw.w / 2 - 4, y: tw.y - tw.h / 2 - 4 });

  // --- lights ---
  for (const l of LIGHTS) {
    const ls: LightSprite = { lightId: l.id, room: l.room, glowKey: glowTex(scene, l), x: l.x - l.radius, y: l.y - l.radius, w: l.radius * 2, h: l.radius * 2 };
    if (!l.objectId && LIT_KINDS.has(l.kind)) {
      const [lw, lh] = LIT_SIZE[l.kind];
      ls.fixtureKey = litTex(scene, l.kind); ls.fx = l.x - lw / 2; ls.fy = l.y - lh / 2;
    }
    lights.push(ls);
  }

  return {
    statics, lights, dark, doors, windows, frontDoor,
    backdrop: { sky: 'st:sky', moon: 'st:moon', star: 'st:star', clouds: ['st:cloud:0', 'st:cloud:1', 'st:cloud:2'], bat: 'st:bat', mote: 'st:mote', smoke: 'st:smoke' },
    chimneySmoke,
  };
}
