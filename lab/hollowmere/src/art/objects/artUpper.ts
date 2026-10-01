// Object drawings: attic, nursery, bathroom, bedroom, upperHall (14 objects).
// Registered with def(id, ...parts) at import time. Anchor coords: floor/table y<0 upward,
// wall objects centered on 0,0. ADD-blended parts start with glow|fire|flame|embers|eyes|gfire|beam.

import { bar, bead, def, grain, hgrad, INK, P, sheen, shadowBase, slab, softGlow, vgrad, wood } from '../objectKit';
import { clipped, ellipse, fill, hex, lin, PAL, poly, rad, rgba, rng, rrect, shade, speckle } from '../paint';
import type { Ctx2D } from '../paint';

const CREAM = PAL.cream;
const stroke = (g: Ctx2D, c: string, w: number): void => { g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
const curve = (g: Ctx2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, c: string, w: number): void => {
  g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); stroke(g, c, w); g.lineCap = 'butt';
};

// ================================================================ ATTIC ====

// --- rockingChair 96×118 ---
const RC_PIV: [number, number] = [0, -3];
def('rockingChair',
  P('body', [-46, -118, 92, 104], (g) => {
    // back spindles + posts
    bar(g, -28, -50, -38, -112, 5, PAL.woodDark);
    for (let i = 0; i < 4; i++) bar(g, -25 + i * 4 - (i * 3), -54, -34 + i * 4 - (i * 2), -108, 2.2, PAL.wood);
    slab(g, -46, -118, 30, 9, 4, PAL.woodLight);
    bar(g, -26, -50, -30, -16, 5, PAL.woodDark);
    // seat + cushion
    slab(g, -38, -57, 78, 9, 4, PAL.wood);
    slab(g, -32, -68, 64, 13, 6, 0x9b4a5e);
    g.strokeStyle = rgba(CREAM, 0.5); g.lineWidth = 0.9;
    for (let i = -24; i <= 24; i += 12) { g.beginPath(); g.moveTo(i, -66); g.lineTo(i + 3, -57); g.stroke(); }
    // front leg, arm
    bar(g, 30, -50, 34, -16, 5, PAL.woodDark);
    bar(g, -24, -88, 34, -84, 4.4, PAL.woodLight);
    bar(g, 32, -84, 32, -54, 3.6, PAL.wood);
    bead(g, 37, -84, 4.4, PAL.brass);
  }, { pivot: RC_PIV }),
  P('rockers', [-48, -18, 96, 18], (g) => {
    curve(g, -46, -14, 0, 8, 46, -14, INK(), 8);
    curve(g, -46, -14, 0, 8, 46, -14, hex(PAL.woodLight), 5);
    curve(g, -44, -15.5, 0, 5.5, 44, -15.5, rgba(0xffffff, 0.22), 1.2);
    bead(g, -46, -14, 3, PAL.brass); bead(g, 46, -14, 3, PAL.brass);
  }, { pivot: RC_PIV }),
  P('shawl', [-46, -112, 58, 66], (g) => {
    g.beginPath();
    g.moveTo(-44, -112); g.quadraticCurveTo(-30, -118, -16, -110);
    g.bezierCurveTo(-8, -90, -6, -70, -12, -52); g.lineTo(-20, -48); g.lineTo(-26, -54); g.lineTo(-34, -47);
    g.bezierCurveTo(-42, -70, -46, -90, -44, -112); g.closePath();
    fill(g, lin(g, -44, -112, 0, -48, [[0, 0xd9899b], [1, 0x9b4a5e]]), INK(), 1.3);
    clipped(g, () => g.rect(-46, -118, 60, 72), () => {
      g.strokeStyle = rgba(CREAM, 0.55); g.lineWidth = 1;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-46, -108 + i * 10); g.bezierCurveTo(-34, -102 + i * 10, -22, -112 + i * 10, -4, -104 + i * 10); g.stroke(); }
    });
    g.strokeStyle = rgba(CREAM, 0.9); g.lineWidth = 1.2;
    for (let x = -34; x <= -16; x += 3.6) { g.beginPath(); g.moveTo(x, -50); g.lineTo(x + 0.6, -43); g.stroke(); }
  }, { pivot: RC_PIV }),
);

// --- dressForm 80×165 ---
def('dressForm',
  P('stand', [-30, -165, 60, 165], (g) => {
    shadowBase(g, 28);
    bar(g, 0, -34, -24, -4, 4.4, PAL.woodDark); bar(g, 0, -34, 24, -4, 4.4, PAL.woodDark); bar(g, 0, -34, 0, -2, 4, PAL.wood);
    bar(g, 0, -92, 0, -34, 5.4, PAL.wood);
    bead(g, 0, -34, 5, PAL.brass);
    rrect(g, -3, -160, 6, 12, 2); fill(g, hex(PAL.woodLight), INK(), 1.1);
    bead(g, 0, -163, 4.2, PAL.brass);
  }),
  P('body', [-27, -152, 54, 68], (g) => {
    g.beginPath();
    g.moveTo(-5, -150); g.quadraticCurveTo(0, -152, 5, -150);
    g.bezierCurveTo(14, -146, 26, -142, 26, -130); g.bezierCurveTo(24, -116, 17, -104, 14, -86);
    g.lineTo(-14, -86); g.bezierCurveTo(-17, -104, -24, -116, -26, -130); g.bezierCurveTo(-26, -142, -14, -146, -5, -150); g.closePath();
    fill(g, hgrad(g, -26, 26, 0xe9d8b4, 0.12, -0.2), INK(), 1.4);
    g.setLineDash([2.5, 2.5]); g.strokeStyle = rgba(PAL.ink, 0.5); g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(0, -148); g.lineTo(0, -88); g.stroke();
    g.beginPath(); g.moveTo(-10, -144); g.quadraticCurveTo(-18, -118, -11, -90); g.stroke();
    g.beginPath(); g.moveTo(10, -144); g.quadraticCurveTo(18, -118, 11, -90); g.stroke();
    g.setLineDash([]);
    // pin cushion
    ellipse(g, 15, -126, 4.4, 3.4); fill(g, hex(PAL.rose), INK(), 1);
    g.strokeStyle = hex(0xffffff); g.lineWidth = 0.8;
    for (const [x, y] of [[13, -127], [16, -128], [15, -124]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5, y - 5); g.stroke(); bead(g, x + 1.5, y - 5.5, 1, PAL.gold); }
  }, { pivot: [0, -120] }),
  P('skirt', [-42, -94, 84, 82], (g) => {
    g.beginPath();
    g.moveTo(-14, -92); g.lineTo(14, -92);
    g.bezierCurveTo(26, -66, 34, -40, 41, -15); g.quadraticCurveTo(30, -10, 20, -14); g.quadraticCurveTo(10, -9, 0, -14);
    g.quadraticCurveTo(-10, -9, -20, -14); g.quadraticCurveTo(-30, -10, -41, -15);
    g.bezierCurveTo(-34, -40, -26, -66, -14, -92); g.closePath();
    fill(g, lin(g, 0, -92, 0, -12, [[0, 0x8e72c9], [1, 0x5a4590]]), INK(), 1.4);
    clipped(g, () => { g.beginPath(); g.moveTo(-14, -92); g.lineTo(14, -92); g.lineTo(41, -12); g.lineTo(-41, -12); g.closePath(); }, () => {
      g.strokeStyle = rgba(0xffffff, 0.16); g.lineWidth = 1.4;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3, -90); g.quadraticCurveTo(i * 8, -50, i * 12, -14); g.stroke(); }
      g.strokeStyle = rgba(PAL.ink, 0.28);
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3 + 1.5, -90); g.quadraticCurveTo(i * 8 + 3, -50, i * 12 + 4, -14); g.stroke(); }
      g.fillStyle = rgba(CREAM, 0.85); g.fillRect(-44, -22, 88, 4);
    });
    slab(g, -15, -95, 30, 6, 3, 0xe6c06a);
  }, { pivot: [0, -92] }),
  P('tape', [-22, -144, 44, 70], (g) => {
    g.lineCap = 'round';
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? hex(0xf0d37a) : INK(); g.lineWidth = pass ? 3.4 : 5.6;
      g.beginPath(); g.moveTo(-10, -141); g.quadraticCurveTo(0, -134, 10, -141); g.stroke();
      g.beginPath(); g.moveTo(10, -140); g.bezierCurveTo(14, -120, 6, -100, 14, -78); g.stroke();
      g.beginPath(); g.moveTo(-10, -140); g.bezierCurveTo(-18, -122, -12, -104, -17, -88); g.stroke();
    }
    g.strokeStyle = rgba(PAL.ink, 0.6); g.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) { const y = -128 + i * 6; g.beginPath(); g.moveTo(12 - (i % 2) * 2.4, y); g.lineTo(15, y); g.stroke(); }
    g.lineCap = 'butt';
  }, { pivot: [0, -141] }),
);

// --- oldTrunk 128×80 ---
def('oldTrunk',
  P('body', [-64, -58, 128, 58], (g) => {
    shadowBase(g, 62);
    wood(g, -62, -56, 124, 52, 4, 0x7a4a2c, 5);
    for (const x of [-46, 40]) { slab(g, x, -56, 8, 52, 1, 0x3b3550, { line: true, lw: 1 }); for (const y of [-50, -12]) bead(g, x + 4, y, 1.6, 0xb8b2c8); }
    slab(g, -64, -56, 128, 7, 2, 0x3b3550); slab(g, -64, -12, 128, 8, 2, 0x3b3550);
    for (const x of [-60, 58]) { slab(g, x, -62, 6, 14, 2, 0x3b3550); }
    // feet
    for (const x of [-60, 52]) slab(g, x, -6, 10, 6, 2, PAL.woodDark);
    // lock plate
    slab(g, -9, -48, 18, 20, 4, PAL.brass);
    ellipse(g, 0, -41, 2.6, 2.6); fill(g, hex(PAL.ink));
    g.fillStyle = hex(PAL.ink); g.fillRect(-1, -41, 2, 7);
  }),
  P('glow', [-56, -94, 112, 44], (g) => {
    softGlow(g, 0, -52, 54, 0x8ff5d2, 0.85);
    softGlow(g, 0, -56, 30, 0xe9fbff, 0.7);
  }, { alpha: 0, depth: 1 }),
  P('lid', [-64, -84, 128, 34], (g) => {
    g.beginPath();
    g.moveTo(-64, -52); g.lineTo(-64, -66); g.bezierCurveTo(-62, -82, 62, -82, 64, -66); g.lineTo(64, -52); g.closePath();
    fill(g, lin(g, 0, -84, 0, -52, [[0, 0xa06a40], [1, 0x6a3f24]]), INK(), 1.4);
    clipped(g, () => { g.beginPath(); g.moveTo(-64, -52); g.lineTo(-64, -66); g.bezierCurveTo(-62, -82, 62, -82, 64, -66); g.lineTo(64, -52); g.closePath(); }, () => {
      grain(g, -64, -84, 128, 32, 0x7a4a2c, 9, 9, 0.22);
      for (const x of [-46, 40]) { g.fillStyle = hex(0x3b3550); g.fillRect(x, -86, 8, 36); }
      g.fillStyle = hex(0x3b3550); g.fillRect(-64, -58, 128, 7);
      g.strokeStyle = rgba(0xffffff, 0.2); g.lineWidth = 1; g.beginPath(); g.moveTo(-56, -72); g.bezierCurveTo(-30, -80, 30, -80, 56, -72); g.stroke();
    });
    slab(g, -8, -60, 16, 11, 3, PAL.brass);
  }, { pivot: [60, -52] }),
);

// =============================================================== NURSERY ====

const RH_PIV: [number, number] = [0, -6];
// --- rockingHorse 124×112 ---
def('rockingHorse',
  P('horse', [-58, -112, 116, 92], (g) => {
    const coat = 0xe8dcc0;
    // far legs
    bar(g, -26, -54, -32, -22, 7, shade(coat, -0.25)); bar(g, 28, -54, 34, -22, 7, shade(coat, -0.25));
    // body
    ellipse(g, -2, -62, 38, 21); fill(g, vgrad(g, -84, -42, coat, 0.12, -0.25), INK(), 1.4);
    // neck + head
    g.beginPath(); g.moveTo(20, -74); g.quadraticCurveTo(34, -90, 36, -108); g.lineTo(52, -106); g.quadraticCurveTo(54, -84, 40, -58); g.closePath();
    fill(g, hgrad(g, 20, 52, coat, 0.1, -0.2), INK(), 1.4);
    g.save(); g.translate(46, -98); g.rotate(0.45); ellipse(g, 0, 0, 16, 9); fill(g, hgrad(g, -16, 16, coat, 0.1, -0.15), INK(), 1.4); g.restore();
    ellipse(g, 58, -90, 4, 3); fill(g, hex(0xc77d8a), INK(), 1);
    poly(g, [[36, -108], [38, -120], [44, -109]]); fill(g, hex(coat), INK(), 1.2);
    // dapples
    clipped(g, () => { ellipse(g, -2, -62, 38, 21); }, () => speckle(g, -40, -84, 80, 42, 14, 0x9a8a6a, 0.45, 4, 3));
    // saddle
    rrect(g, -22, -84, 32, 14, 5); fill(g, hex(0xa83c4c), INK(), 1.3);
    g.strokeStyle = hex(PAL.gold); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-18, -78); g.lineTo(6, -78); g.stroke();
    // near legs
    bar(g, -14, -52, -20, -20, 8, coat); bar(g, 16, -52, 22, -20, 8, coat);
    ellipse(g, -20, -20, 5, 3); fill(g, hex(PAL.woodDark), INK(), 1); ellipse(g, 22, -20, 5, 3); fill(g, hex(PAL.woodDark), INK(), 1);
    // eye socket (painted dark; glow overlay on top)
    ellipse(g, 48, -101, 3.4, 3.4); fill(g, hex(PAL.ink));
  }, { pivot: RH_PIV }),
  P('mane', [-58, -112, 100, 76], (g) => {
    const mc = 0xb0485a;
    for (let i = 0; i < 6; i++) { // neck mane tufts
      const t = i / 5; const x = 36 - t * 14, y = -108 + t * 36;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 14, y - 2, x - 18 - (i % 2) * 4, y + 12); g.quadraticCurveTo(x - 6, y + 8, x + 2, y + 6); g.closePath();
      fill(g, hex(shade(mc, i % 2 ? 0.1 : -0.1)), INK(), 1.1);
    }
    for (let i = 0; i < 4; i++) { // tail
      g.beginPath(); g.moveTo(-34, -70); g.bezierCurveTo(-52 - i * 2, -64 + i * 3, -56, -48 + i * 5, -50 + i * 2, -36 + i * 3);
      g.bezierCurveTo(-44, -50, -40, -62, -32, -66); g.closePath(); fill(g, hex(shade(mc, i % 2 ? 0.12 : -0.08)), INK(), 1);
    }
  }, { pivot: RH_PIV }),
  P('rockers', [-62, -26, 124, 26], (g) => {
    curve(g, -60, -18, 0, 12, 60, -18, INK(), 11);
    curve(g, -60, -18, 0, 12, 60, -18, hex(PAL.woodLight), 7.5);
    curve(g, -58, -20.5, 0, 8.5, 58, -20.5, rgba(0xffffff, 0.22), 1.3);
    for (let x = -50; x <= 50; x += 100) bead(g, x, -17, 2, PAL.brass);
  }, { pivot: RH_PIV, depth: -1 }),
  P('eyes', [38, -108, 22, 16], (g) => {
    softGlow(g, 48, -101, 9, 0xffa23a, 1);
    ellipse(g, 48, -101, 2.8, 2.8); fill(g, hex(0xfff0b0));
  }, { alpha: 0, pivot: RH_PIV }),
);

// --- jackInTheBox 64×86 ---
def('jackInTheBox',
  P('box', [-27, -38, 54, 38], (g) => {
    shadowBase(g, 28, 0.25);
    rrect(g, -26, -38, 52, 36, 3); fill(g, hgrad(g, -26, 26, 0x3f8f9a, 0.14, -0.2), INK(), 1.4);
    clipped(g, () => rrect(g, -26, -38, 52, 36, 3), () => {
      for (let i = -3; i <= 3; i++) { g.fillStyle = rgba(0xe6c06a, 0.85); g.fillRect(i * 9 - 2, -38, 4, 36); }
      speckle(g, -26, -38, 52, 36, 8, 0xffffff, 0.2, 5, 1.6);
    });
    slab(g, -27, -6, 54, 6, 2, PAL.woodDark);
    // star label
    ellipse(g, 0, -20, 7, 7); fill(g, hex(0xa83c4c), INK(), 1.1);
    g.fillStyle = hex(CREAM); g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 0, -19.5);
  }),
  P('lid', [-28, -46, 56, 10], (g) => { slab(g, -28, -45, 56, 8, 3, 0xa83c4c); slab(g, -28, -45, 56, 3, 2, 0xd0687a, { line: false }); bead(g, 0, -46, 2.6, PAL.gold); }, { pivot: [-27, -41] }),
  P('crank', [24, -32, 24, 24], (g) => {
    bar(g, 26, -20, 36, -20, 3, PAL.brass);
    ellipse(g, 36, -20, 8, 8); fill(g, rad(g, 34, -22, 0, 9, [[0, 0xf0d37a], [1, 0xa87a30]]), INK(), 1.2);
    bar(g, 36, -20, 36, -28, 2.6, PAL.brass); bead(g, 36, -29, 3.4, 0xa83c4c);
  }, { pivot: [36, -20] }),
  P('popper', [-22, -86, 44, 52], (g) => {
    // spring
    g.strokeStyle = INK(); g.lineWidth = 3.4;
    g.beginPath(); for (let i = 0; i <= 8; i++) { const y = -38 - i * 2.4, x = (i % 2 ? 7 : -7); i ? g.lineTo(x, y) : g.moveTo(0, y); } g.stroke();
    g.strokeStyle = hex(0xc9ced9); g.lineWidth = 1.7; g.stroke();
    // head
    ellipse(g, 0, -68, 11, 12); fill(g, rad(g, -3, -72, 0, 14, [[0, 0xfff0dc], [1, 0xe8b99a]]), INK(), 1.3);
    // jester hat
    g.beginPath(); g.moveTo(-11, -72); g.quadraticCurveTo(-24, -80, -20, -92); g.lineTo(-8, -78); g.lineTo(0, -88); g.lineTo(8, -78); g.lineTo(20, -92); g.quadraticCurveTo(24, -80, 11, -72); g.closePath();
    fill(g, lin(g, -20, 0, 20, 0, [[0, 0xa83c4c], [0.5, 0xe0a24a], [1, 0x3f8f9a]]), INK(), 1.2);
    bead(g, -20, -92, 3, PAL.gold); bead(g, 20, -92, 3, PAL.gold); bead(g, 0, -88, 2.6, PAL.gold);
    ellipse(g, -4, -70, 2, 2.6); fill(g, hex(PAL.ink)); ellipse(g, 4, -70, 2, 2.6); fill(g, hex(PAL.ink));
    ellipse(g, 0, -65, 3, 3); fill(g, hex(0xd9384a), INK(), 0.8);
    g.beginPath(); g.moveTo(-6, -60); g.quadraticCurveTo(0, -55, 6, -60); stroke(g, INK(), 1.4);
    ellipse(g, -8, -63, 2.4, 1.6); fill(g, rgba(0xff7a8a, 0.55)); ellipse(g, 8, -63, 2.4, 1.6); fill(g, rgba(0xff7a8a, 0.55));
  }, { alpha: 0, pivot: [0, -38], depth: -5 }),
);

// --- porcelainDoll 44×70 ---
def('porcelainDoll',
  P('body', [-18, -44, 36, 44], (g) => {
    shadowBase(g, 18, 0.22);
    // legs + shoes
    bar(g, -5, -12, -5, -4, 4, 0xf4ebe2); bar(g, 5, -12, 5, -4, 4, 0xf4ebe2);
    ellipse(g, -5, -2.5, 4.4, 2.4); fill(g, hex(PAL.ink), undefined); ellipse(g, 5, -2.5, 4.4, 2.4); fill(g, hex(PAL.ink));
    // dress
    g.beginPath(); g.moveTo(-6, -40); g.lineTo(6, -40); g.bezierCurveTo(10, -30, 17, -22, 16, -10); g.quadraticCurveTo(0, -5, -16, -10); g.bezierCurveTo(-17, -22, -10, -30, -6, -40); g.closePath();
    fill(g, lin(g, 0, -40, 0, -8, [[0, 0xe8b4c4], [1, 0xc77d8a]]), INK(), 1.3);
    g.fillStyle = rgba(CREAM, 0.95); g.beginPath(); for (let x = -16; x <= 16; x += 4) g.arc(x, -9, 2.2, 0, Math.PI); g.fill();
    g.strokeStyle = rgba(CREAM, 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(-10, -22); g.quadraticCurveTo(0, -17, 10, -22); g.stroke();
    // arms
    bar(g, -7, -38, -15, -26, 3.6, 0xf4ebe2); bar(g, 7, -38, 15, -26, 3.6, 0xf4ebe2);
    // sash bow
    poly(g, [[0, -29], [-7, -33], [-7, -25]]); fill(g, hex(0x6f8fd0), INK(), 0.9); poly(g, [[0, -29], [7, -33], [7, -25]]); fill(g, hex(0x6f8fd0), INK(), 0.9);
  }),
  P('head', [-15, -74, 30, 36], (g) => {
    // hair back
    ellipse(g, 0, -57, 14, 15); fill(g, hex(0x6a3b24), INK(), 1.2);
    for (const s of [-1, 1]) { ellipse(g, s * 12, -50, 4.4, 7); fill(g, hex(0x7a4630), INK(), 1); }
    // face
    ellipse(g, 0, -56, 11, 13); fill(g, rad(g, -3, -60, 0, 15, [[0, 0xffffff], [1, 0xf0d8cc]]), INK(), 1.3);
    // fringe
    g.beginPath(); g.moveTo(-11, -58); g.quadraticCurveTo(0, -76, 11, -58); g.quadraticCurveTo(0, -64, -11, -58); g.closePath(); fill(g, hex(0x7a4630), INK(), 1);
    // eyes (whites + irises)
    for (const s of [-1, 1]) {
      ellipse(g, s * 5, -56, 3.2, 3.6); fill(g, hex(0xffffff), INK(), 0.9);
      ellipse(g, s * 5, -56, 1.9, 2.4); fill(g, hex(0x4a7fc0)); ellipse(g, s * 5 + 0.5, -56.5, 0.7, 0.7); fill(g, hex(0xffffff));
      g.beginPath(); g.moveTo(s * 5 - 3.4, -59.5); g.quadraticCurveTo(s * 5, -61.5, s * 5 + 3.4, -59.5); stroke(g, INK(), 0.9);
      ellipse(g, s * 7.6, -50, 2.6, 1.6); fill(g, rgba(0xff7a8a, 0.5));
    }
    g.beginPath(); g.moveTo(-2.6, -49.4); g.quadraticCurveTo(0, -47.6, 2.6, -49.4); stroke(g, hex(0xb83a4c), 1.3);
    // bow
    poly(g, [[0, -69], [-8, -73], [-8, -65]]); fill(g, hex(0xd9384a), INK(), 0.9); poly(g, [[0, -69], [8, -73], [8, -65]]); fill(g, hex(0xd9384a), INK(), 0.9);
    bead(g, 0, -69, 1.6, PAL.gold);
  }, { pivot: [0, -42] }),
  P('eyes', [-12, -64, 24, 14], (g) => {
    for (const s of [-1, 1]) { softGlow(g, s * 5, -56, 7, 0x9fe8ff, 0.95); ellipse(g, s * 5, -56, 1.5, 1.8); fill(g, hex(0xffffff)); }
  }, { alpha: 0, pivot: [0, -42] }),
  P('crack', [-11, -72, 22, 30], (g) => {
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-3, -69); g.lineTo(-1, -63); g.lineTo(-5, -58); g.lineTo(0, -53); g.lineTo(-2, -47); stroke(g, INK(0.9), 1.3);
    g.beginPath(); g.moveTo(-1, -63); g.lineTo(4, -60); stroke(g, INK(0.8), 0.9);
    g.beginPath(); g.moveTo(-5, -58); g.lineTo(-9, -57); stroke(g, INK(0.8), 0.9);
    g.lineCap = 'butt';
  }, { alpha: 0, pivot: [0, -42] }),
);

// ============================================================== BATHROOM ====

const MIRROR_OUT = (g: Ctx2D, x: number, y: number, w: number, h: number): void => { rrect(g, x, y, w, h, [w / 2, w / 2, 4, 4]); };

// --- mirror 100×150 (wall, centered) ---
def('mirror',
  P('frame', [-50, -75, 100, 150], (g) => {
    MIRROR_OUT(g, -50, -75, 100, 150);
    g.fillStyle = lin(g, -50, -75, 50, 75, [[0, 0xf2d58a], [0.5, 0xc89a46], [1, 0x8a6228]]);
    MIRROR_OUT(g, -50, -75, 100, 150); g.fill(); stroke(g, INK(), 1.5);
    MIRROR_OUT(g, -43, -68, 86, 136); stroke(g, rgba(0xffffff, 0.25), 1);
    // scroll beads around the rim
    for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; bead(g, Math.cos(a) * 46, -25 + Math.sin(a) * 48, 2.2, PAL.gold); }
    for (let y = -20; y <= 66; y += 14) { bead(g, -46.6, y, 2.2, PAL.gold); bead(g, 46.6, y, 2.2, PAL.gold); }
    for (let x = -36; x <= 36; x += 12) bead(g, x, 71, 2.2, PAL.gold);
    // crest
    g.beginPath(); g.moveTo(-9, -70); g.quadraticCurveTo(0, -90, 9, -70); g.closePath(); fill(g, hex(PAL.gold), INK(), 1.2);
    bead(g, 0, -76, 3.4, 0xd9384a);
    // inner cavity (the glass part overlays it)
    MIRROR_OUT(g, -40, -64, 80, 130); fill(g, hex(0x2a3a52), INK(0.9), 1.2);
  }),
  P('glass', [-40, -64, 80, 130], (g) => {
    MIRROR_OUT(g, -40, -64, 80, 130);
    fill(g, lin(g, -40, -64, 40, 66, [[0, 0xcfe4ee], [0.55, 0x9ab8cc], [1, 0x6f8fa8]]));
    clipped(g, () => MIRROR_OUT(g, -40, -64, 80, 130), () => {
      // faint reflected window + towel rail
      g.fillStyle = rgba(0xffffff, 0.2); g.fillRect(-26, -46, 22, 30); g.fillRect(2, -46, 22, 30);
      g.fillStyle = rgba(PAL.ink, 0.12); g.fillRect(-4, -46, 6, 30);
      g.fillStyle = rgba(0xffffff, 0.14); g.beginPath(); g.moveTo(-30, 60); g.lineTo(-12, -60); g.lineTo(-4, -60); g.lineTo(-22, 60); g.fill();
      g.beginPath(); g.moveTo(-4, 60); g.lineTo(14, -60); g.lineTo(18, -60); g.lineTo(0, 60); g.fill();
      speckle(g, -40, -64, 80, 130, 14, 0xffffff, 0.2, 6, 1);
    });
  }),
  P('reflection', [-40, -64, 80, 130], (g) => {
    MIRROR_OUT(g, -40, -64, 80, 130);
    fill(g, lin(g, 0, -64, 0, 66, [[0, 0x1c2c4a], [1, 0x0e1428]]));
    clipped(g, () => MIRROR_OUT(g, -40, -64, 80, 130), () => {
      // a wrong room: door standing open, lamp on, nobody home
      g.fillStyle = rgba(0x6f8fd0, 0.35); g.fillRect(-30, -40, 30, 76);
      g.fillStyle = rgba(0x0a0f20, 1); g.fillRect(-26, -36, 22, 72);
      g.fillStyle = rgba(0xffd9a0, 0.6); g.beginPath(); g.moveTo(-4, -36); g.lineTo(14, -30); g.lineTo(14, 40); g.lineTo(-4, 36); g.fill();
      softGlow(g, 24, -8, 20, 0xffc66b, 0.5);
      g.fillStyle = rgba(CREAM, 0.7); g.fillRect(20, -6, 8, 14);
      g.fillStyle = rgba(0xffffff, 0.12); g.fillRect(-40, -64, 80, 22);
    });
  }, { alpha: 0 }),
  P('apparition', [-30, -62, 60, 126], (g) => {
    // pale figure standing in the glass
    softGlow(g, 0, -10, 46, 0x9fe8ff, 0.5);
    g.beginPath(); g.moveTo(0, -52); g.bezierCurveTo(14, -52, 14, -30, 8, -24); g.bezierCurveTo(22, -10, 26, 30, 22, 60); g.lineTo(-22, 60); g.bezierCurveTo(-26, 30, -22, -10, -8, -24); g.bezierCurveTo(-14, -30, -14, -52, 0, -52); g.closePath();
    fill(g, lin(g, 0, -52, 0, 60, [[0, 0xf3ffff, 0.95], [1, 0xc8f2ff, 0.2]]));
    ellipse(g, -5, -38, 2.8, 4); fill(g, hex(PAL.ink)); ellipse(g, 5, -38, 2.8, 4); fill(g, hex(PAL.ink));
    ellipse(g, 0, -28, 2.4, 4.6); fill(g, hex(PAL.ink));
  }, { alpha: 0 }),
  P('crack', [-40, -64, 80, 130], (g) => {
    clipped(g, () => MIRROR_OUT(g, -40, -64, 80, 130), () => {
      g.lineCap = 'round';
      const lines: [number, number][][] = [
        [[6, -12], [-4, -26], [-14, -30], [-20, -44]], [[6, -12], [18, -22], [24, -40], [34, -50]], [[6, -12], [14, 4], [8, 22], [20, 40]],
        [[6, -12], [-10, 2], [-20, 8], [-30, 30]], [[-4, -26], [-2, -44], [4, -56]], [[8, 22], [-2, 34], [-6, 52]],
      ];
      for (const l of lines) {
        g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); stroke(g, rgba(PAL.ink, 0.75), 2.4);
        g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); stroke(g, rgba(0xffffff, 0.95), 1);
      }
      g.lineCap = 'butt';
    });
  }, { alpha: 0 }),
);

// --- bathtub 216×100 ---
def('bathtub',
  P('hand', [14, -108, 46, 56], (g) => {
    // pale hand reaching up from behind the rim
    g.beginPath(); g.moveTo(26, -52); g.lineTo(26, -78); g.quadraticCurveTo(18, -86, 20, -96); g.quadraticCurveTo(22, -98, 24, -92);
    g.lineTo(26, -104); g.quadraticCurveTo(29, -106, 30, -100); g.lineTo(32, -106); g.quadraticCurveTo(35, -107, 36, -100); g.lineTo(37, -102);
    g.quadraticCurveTo(40, -102, 40, -96); g.lineTo(40, -86); g.quadraticCurveTo(46, -82, 44, -76); g.lineTo(42, -52); g.closePath();
    fill(g, lin(g, 20, 0, 46, 0, [[0, 0xe9fbff], [1, 0xa8d4dc]]), INK(), 1.3);
    g.strokeStyle = rgba(0x6aa0b0, 0.5); g.lineWidth = 0.9; g.beginPath(); g.moveTo(26, -92); g.lineTo(27, -80); g.moveTo(33, -94); g.lineTo(33, -80); g.stroke();
  }, { alpha: 0, depth: -2 }),
  P('tub', [-110, -74, 220, 74], (g) => {
    shadowBase(g, 104, 0.3);
    // claw feet
    for (const [x, s] of [[-86, -1], [86, 1], [-62, -1], [62, 1]] as [number, number][]) {
      g.beginPath(); g.moveTo(x - 7, -28); g.quadraticCurveTo(x - 9, -8, x + s * 6, -2); g.quadraticCurveTo(x + s * 11, -8, x + s * 9, -3);
      g.lineTo(x + s * 14, -3); g.quadraticCurveTo(x + 8, -22, x + 7, -28); g.closePath();
      fill(g, lin(g, x - 8, 0, x + 8, 0, [[0, 0xf0d37a], [1, 0xa87a30]]), INK(), 1.2);
    }
    // body
    rrect(g, -106, -72, 212, 52, [8, 8, 30, 30]); fill(g, vgrad(g, -72, -20, 0xf4efe6, 0.04, -0.2), INK(), 1.5);
    slab(g, -108, -76, 216, 11, 5, 0xfffaf0, { up: 0.04, dn: -0.12 });
    g.fillStyle = rgba(0x3f8f9a, 0.85); g.fillRect(-100, -50, 200, 5);
    g.strokeStyle = rgba(0xffffff, 0.6); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-96, -60); g.lineTo(90, -60); g.stroke();
    sheen(g, -100, -64, 40, 40, 0.28);
  }),
  P('faucet', [-104, -104, 38, 44], (g) => {
    bar(g, -98, -80, -98, -96, 6, 0xc8ccd6);
    bar(g, -98, -97, -82, -97, 5, 0xc8ccd6);
    bar(g, -82, -97, -82, -89, 4.4, 0xc8ccd6);
    bead(g, -98, -99, 5, 0xe6c06a);
    for (const x of [-103, -93]) { bead(g, x, -104, 3.2, 0xd9384a); }
    bead(g, -98, -104, 0.1);
  }, { pivot: [-98, -96] }),
  P('drip', [-90, -90, 10, 34], (g) => {
    g.beginPath(); g.moveTo(-85, -88); g.quadraticCurveTo(-90, -80, -85, -76); g.quadraticCurveTo(-80, -80, -85, -88); g.closePath();
    fill(g, lin(g, -90, -88, -80, -76, [[0, 0xe6f6ff], [1, 0x6fb4dc]]), INK(0.6), 0.8);
  }, { alpha: 0 }),
  P('puddle', [-80, -8, 160, 14], (g) => {
    ellipse(g, 0, -1, 76, 5); fill(g, lin(g, -76, 0, 76, 0, [[0, 0x6fb4dc, 0.1], [0.5, 0x8fd0ee, 0.75], [1, 0x6fb4dc, 0.1]]));
    g.strokeStyle = rgba(0xffffff, 0.5); g.lineWidth = 0.9; g.beginPath(); g.ellipse(-20, -2, 14, 2, 0, 0, Math.PI * 2); g.stroke();
  }, { alpha: 0, depth: -3 }),
  P('foam', [-104, -96, 208, 36], (g) => {
    const r = rng(11);
    for (let i = 0; i < 38; i++) {
      const x = -98 + r() * 196, rr = 3 + r() * 6, y = -72 - r() * 14 * (1 - Math.abs(x) / 130);
      ellipse(g, x, y, rr, rr * 0.92); fill(g, rad(g, x - rr * 0.3, y - rr * 0.35, 0, rr, [[0, 0xffffff], [1, 0xdbe9f4]]), INK(0.35), 0.7);
    }
  }, { alpha: 0, depth: 2 }),
);

// ============================================================== BEDROOM ====

// --- bed 230×140 ---
def('bed',
  P('frame', [-116, -140, 232, 140], (g) => {
    shadowBase(g, 112, 0.32);
    // dark space beneath
    g.fillStyle = lin(g, 0, -50, 0, 0, [[0, PAL.ink, 0.85], [1, PAL.ink, 0.3]]); g.fillRect(-98, -52, 196, 50);
    // headboard (left, tall) + footboard (right)
    g.beginPath(); g.moveTo(-116, -2); g.lineTo(-116, -122); g.quadraticCurveTo(-108, -142, -96, -126); g.lineTo(-96, -2); g.closePath();
    fill(g, hgrad(g, -116, -96, PAL.woodLight, 0.15, -0.25), INK(), 1.5);
    clipped(g, () => rrect(g, -116, -130, 20, 126, 6), () => grain(g, -116, -130, 20, 126, PAL.wood, 21, 6, 0.25, true));
    slab(g, 96, -86, 18, 84, 5, PAL.woodLight, { h: true });
    bead(g, -106, -130, 5, PAL.gold); bead(g, 105, -90, 4.4, PAL.gold);
    // rail
    slab(g, -98, -62, 196, 10, 3, PAL.wood);
    // legs
    slab(g, -114, -8, 14, 8, 2, PAL.woodDark); slab(g, 100, -8, 14, 8, 2, PAL.woodDark);
    slab(g, -110, -126, 8, 4, 2, PAL.gold, { line: false });
  }),
  P('mattress', [-100, -88, 200, 34], (g) => {
    slab(g, -100, -88, 200, 32, 10, 0xf1e3c6, { up: 0.1, dn: -0.18 });
    g.strokeStyle = rgba(0xb89a6a, 0.55); g.lineWidth = 1; for (let x = -88; x <= 88; x += 22) { g.beginPath(); g.moveTo(x, -84); g.lineTo(x, -60); g.stroke(); }
  }),
  P('pillow', [-96, -112, 56, 30], (g) => {
    g.beginPath(); g.moveTo(-96, -88); g.quadraticCurveTo(-98, -108, -78, -112); g.quadraticCurveTo(-52, -112, -42, -90); g.quadraticCurveTo(-68, -84, -96, -88); g.closePath();
    fill(g, rad(g, -76, -104, 0, 36, [[0, 0xffffff], [1, 0xdbd1dc]]), INK(), 1.4);
    g.strokeStyle = rgba(PAL.rose, 0.7); g.lineWidth = 1.3; g.beginPath(); g.moveTo(-90, -92); g.quadraticCurveTo(-68, -88, -48, -92); g.stroke();
  }, { pivot: [-69, -96] }),
  P('quilt', [-94, -100, 196, 52], (g) => {
    g.beginPath(); g.moveTo(-60, -92); g.quadraticCurveTo(-20, -102, 30, -96); g.quadraticCurveTo(80, -98, 100, -86);
    g.lineTo(102, -62); g.quadraticCurveTo(96, -52, 90, -60); g.quadraticCurveTo(70, -50, 52, -58); g.quadraticCurveTo(34, -50, 16, -58);
    g.quadraticCurveTo(-4, -50, -22, -58); g.quadraticCurveTo(-40, -50, -62, -58); g.lineTo(-62, -92); g.closePath();
    fill(g, lin(g, 0, -100, 0, -52, [[0, 0x58a7b2], [1, 0x2f6a6f]]), INK(), 1.5);
    clipped(g, () => { g.beginPath(); g.moveTo(-62, -94); g.lineTo(102, -94); g.lineTo(102, -54); g.lineTo(-62, -54); g.closePath(); }, () => {
      const cols = [0xc77d8a, 0xf1e3c6, 0xe0a24a, 0x8e72c9];
      for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) { if ((i + j) % 2) continue; g.fillStyle = rgba(cols[(i + j * 2) % 4], 0.8); g.fillRect(-60 + i * 18, -96 + j * 14, 18, 14); }
      g.strokeStyle = rgba(PAL.ink, 0.3); g.lineWidth = 0.8; for (let i = 0; i <= 9; i++) { g.beginPath(); g.moveTo(-60 + i * 18, -96); g.lineTo(-60 + i * 18, -54); g.stroke(); }
    });
    g.beginPath(); g.moveTo(-62, -92); g.quadraticCurveTo(-20, -102, 30, -96); g.quadraticCurveTo(80, -98, 100, -86); stroke(g, rgba(0xffffff, 0.25), 1.2);
  }, { pivot: [20, -96] }),
  P('eyes', [-76, -48, 152, 44], (g) => {
    const pairs: [number, number, number][] = [[-50, -24, 7], [8, -30, 9], [56, -22, 6]];
    for (const [x, y, r] of pairs) for (const s of [-1, 1]) {
      softGlow(g, x + s * r * 1.4, y, r * 1.8, 0xff7a4a, 0.55);
      ellipse(g, x + s * r * 1.4, y, r * 0.7, r * 0.95); fill(g, hex(0xfff0c0));
      ellipse(g, x + s * r * 1.4, y, r * 0.22, r * 0.8); fill(g, hex(PAL.ink));
    }
  }, { alpha: 0 }),
);

// --- bedLamp 40×62 ---
def('bedLamp',
  P('base', [-16, -36, 32, 36], (g) => {
    shadowBase(g, 16, 0.25);
    g.beginPath(); g.moveTo(-5, -34); g.quadraticCurveTo(-16, -22, -12, -8); g.quadraticCurveTo(-12, -2, -6, -2); g.lineTo(6, -2); g.quadraticCurveTo(12, -2, 12, -8); g.quadraticCurveTo(16, -22, 5, -34); g.closePath();
    fill(g, hgrad(g, -14, 14, 0x3f8f9a, 0.3, -0.25), INK(), 1.4);
    for (const [x, y] of [[-3, -20], [4, -14], [-4, -10]]) { ellipse(g, x, y, 2.6, 2.6); fill(g, hex(0xf1e3c6)); }
    slab(g, -10, -3, 20, 4, 2, PAL.brass); bar(g, 0, -42, 0, -32, 3.6, PAL.brass);
  }),
  P('shade', [-22, -66, 44, 36], (g) => {
    g.beginPath(); g.moveTo(-9, -64); g.lineTo(9, -64); g.lineTo(22, -34); g.lineTo(-22, -34); g.closePath();
    fill(g, lin(g, -22, -64, 22, -34, [[0, 0xffe9b0], [0.6, 0xffd07a], [1, 0xe8a24a]]), INK(), 1.4);
    g.strokeStyle = rgba(0xb8742a, 0.5); g.lineWidth = 0.9;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 2.6, -63); g.lineTo(i * 6.4, -35); g.stroke(); }
    slab(g, -22, -38, 44, 4, 2, PAL.brass, { line: true });
    bead(g, 0, -66, 2.4, PAL.gold);
  }, { pivot: [0, -34] }),
  P('glow', [-42, -92, 84, 84], (g) => {
    softGlow(g, 0, -48, 42, 0xffcf8a, 0.95);
    softGlow(g, 0, -48, 20, 0xfff3d0, 0.8);
  }, { alpha: 0.5 }),
);

// --- curtains 150×200 (wall, centered) ---
const curtainPanel = (g: Ctx2D, x0: number, x1: number, tie: number, flip: 1 | -1): void => {
  const top = -88, bot = 98;
  const cx = (x0 + x1) / 2;
  g.beginPath();
  g.moveTo(x0, top); g.lineTo(x1, top);
  g.bezierCurveTo(x1 - flip * 4, -30, x1 - flip * 10, tie - 12, x1 - flip * 8, tie);
  g.bezierCurveTo(x1 + flip * 2, tie + 30, x1 + flip * 4, 70, x1 - flip * 0, bot);
  for (let i = 0; i < 4; i++) g.quadraticCurveTo(x1 - (i + 0.5) * (x1 - x0) / 4, bot + (i % 2 ? -4 : 4), x1 - (i + 1) * (x1 - x0) / 4, bot);
  g.bezierCurveTo(x0 + flip * 2, 70, x0 - flip * 2, tie + 30, x0 + flip * 8, tie);
  g.bezierCurveTo(x0 + flip * 8, tie - 12, x0 + flip * 4, -30, x0, top);
  g.closePath();
  fill(g, hgrad(g, x0, x1, 0x9b2f45, 0.1, -0.25), INK(), 1.5);
  clipped(g, () => g.rect(x0 - 8, top, x1 - x0 + 16, bot - top + 8), () => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0);
      g.strokeStyle = rgba(0xffffff, 0.14); g.lineWidth = 3; g.beginPath(); g.moveTo(x - 1, top + 4); g.quadraticCurveTo(x + (i % 2 ? 3 : -3), tie, x - 1, bot); g.stroke();
      g.strokeStyle = rgba(PAL.ink, 0.28); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 4, top + 4); g.quadraticCurveTo(x + (i % 2 ? 7 : 1), tie, x + 4, bot); g.stroke();
    }
    g.fillStyle = hex(PAL.gold); g.fillRect(x0 - 8, bot - 8, x1 - x0 + 16, 3);
  });
  // tieback + tassel
  bar(g, cx - 14 * flip * 0 - 12, tie, cx + 12, tie, 4, PAL.gold);
  bead(g, cx + flip * 10, tie + 3, 3.6, PAL.gold); bar(g, cx + flip * 10, tie + 4, cx + flip * 10, tie + 16, 3, 0xd9a24a);
};
def('curtains',
  P('shadow', [-28, -92, 56, 188], (g) => {
    g.beginPath(); g.moveTo(0, -62); g.bezierCurveTo(14, -64, 16, -40, 10, -30); g.bezierCurveTo(26, -20, 30, 40, 24, 94); g.lineTo(-24, 94);
    g.bezierCurveTo(-30, 40, -26, -20, -10, -30); g.bezierCurveTo(-16, -40, -14, -64, 0, -62); g.closePath();
    fill(g, rgba(0x0a0714, 0.85));
  }, { alpha: 0, depth: -2 }),
  P('sheer', [-70, -90, 140, 188], (g) => {
    g.fillStyle = lin(g, 0, -90, 0, 98, [[0, 0xe9e4f2, 0.55], [1, 0xcfd2ec, 0.3]]); g.fillRect(-68, -88, 136, 184);
    g.strokeStyle = rgba(0xffffff, 0.35); g.lineWidth = 1.2;
    for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 12, -86); g.quadraticCurveTo(i * 12 + 4, 0, i * 12, 96); g.stroke(); }
  }, { alpha: 0.5, pivot: [0, -88] }),
  P('left', [-78, -90, 64, 192], (g) => curtainPanel(g, -76, -16, 6, 1), { pivot: [-76, -88] }),
  P('right', [14, -90, 64, 192], (g) => curtainPanel(g, 16, 76, 6, -1), { pivot: [76, -88] }),
  P('rod', [-84, -102, 168, 18], (g) => {
    bar(g, -76, -93, 76, -93, 5, PAL.brass);
    for (const x of [-80, 80]) { bead(g, x, -93, 6, PAL.gold); }
    for (let x = -64; x <= 64; x += 16) { ellipse(g, x, -88, 3.4, 4); fill(g, hex(PAL.brass), INK(0.8), 1); }
  }, { depth: 3 }),
);

// --- wardrobe 150×236 ---
def('wardrobe',
  P('body', [-75, -236, 150, 236], (g) => {
    shadowBase(g, 72, 0.35);
    // carcass
    wood(g, -74, -226, 148, 214, 3, 0x6a3f28, 31);
    // cornice
    slab(g, -75, -236, 150, 14, 3, PAL.woodLight); slab(g, -70, -224, 140, 6, 2, PAL.wood);
    // plinth + feet
    slab(g, -74, -16, 148, 12, 2, PAL.woodDark); slab(g, -70, -4, 16, 4, 1, PAL.woodDark); slab(g, 54, -4, 16, 4, 1, PAL.woodDark);
    // interior (doors cover it)
    g.fillStyle = lin(g, 0, -214, 0, -22, [[0, 0x14101a], [1, 0x0a0812]]); g.fillRect(-66, -214, 132, 194);
    bar(g, -62, -196, 62, -196, 3, PAL.brass);
    // clothes on the rail
    const coats: [number, number, number][] = [[-48, 0x6f4a7a, 120], [-24, 0x3f6b4a, 130], [-2, 0x7a2f3a, 112], [22, 0x3b4a6a, 126], [46, 0x8a6a3a, 118]];
    for (const [x, c, len] of coats) {
      bar(g, x, -196, x, -192, 2, PAL.brass);
      g.beginPath(); g.moveTo(x - 4, -192); g.lineTo(x + 4, -192); g.lineTo(x + 11, -192 + len); g.lineTo(x - 11, -192 + len); g.closePath();
      fill(g, hex(shade(c, -0.35)), INK(0.7), 1);
    }
    slab(g, -66, -30, 132, 10, 2, shade(PAL.woodDark, -0.2));
  }),
  P('eyes', [-34, -190, 68, 50], (g) => {
    for (const s of [-1, 1]) {
      softGlow(g, s * 16, -166, 24, 0xff5a4a, 0.55);
      ellipse(g, s * 16, -166, 9, 6.4); fill(g, hex(0xfff0d0));
      ellipse(g, s * 16, -166, 2.6, 5.6); fill(g, hex(PAL.ink));
    }
    g.beginPath(); g.moveTo(-28, -182); g.lineTo(-6, -176); stroke(g, rgba(0x000000, 0.85), 3.4);
    g.beginPath(); g.moveTo(28, -182); g.lineTo(6, -176); stroke(g, rgba(0x000000, 0.85), 3.4);
  }, { alpha: 0 }),
  P('doorL', [-72, -212, 72, 196], (g) => {
    wood(g, -72, -212, 72, 196, 3, 0x7d4a2e, 33);
    rrect(g, -62, -200, 52, 76, 5); fill(g, hgrad(g, -62, -10, 0x7d4a2e, -0.1, 0.12), INK(0.8), 1.2);
    rrect(g, -62, -112, 52, 84, 5); fill(g, hgrad(g, -62, -10, 0x7d4a2e, -0.1, 0.12), INK(0.8), 1.2);
    bead(g, -8, -112, 3.8, PAL.brass); bead(g, -9, -118, 1.8, PAL.gold);
    for (const y of [-190, -60]) slab(g, -72, y, 5, 14, 1, PAL.brass);
  }, { pivot: [-72, -114] }),
  P('doorR', [0, -212, 72, 196], (g) => {
    wood(g, 0, -212, 72, 196, 3, 0x7d4a2e, 34);
    rrect(g, 10, -200, 52, 76, 5); fill(g, hgrad(g, 10, 62, 0x7d4a2e, 0.12, -0.1), INK(0.8), 1.2);
    rrect(g, 10, -112, 52, 84, 5); fill(g, hgrad(g, 10, 62, 0x7d4a2e, 0.12, -0.1), INK(0.8), 1.2);
    bead(g, 8, -112, 3.8, PAL.brass); bead(g, 9, -118, 1.8, PAL.gold);
    for (const y of [-190, -60]) slab(g, 67, y, 5, 14, 1, PAL.brass);
  }, { pivot: [72, -114] }),
);

// ============================================================= UPPER HALL ====

const STEEL = 0xaab2c4;
const steel = (g: Ctx2D, x0: number, x1: number): CanvasGradient => lin(g, x0, 0, x1, 0, [[0, 0xe6ecf8], [0.35, STEEL], [1, 0x59607a]]);

// helm drawing shared by the dull and lit versions
const helmArt = (g: Ctx2D, lit: boolean): void => {
  // plume
  g.beginPath(); g.moveTo(0, -178); g.bezierCurveTo(-4, -192, 14, -196, 20, -184); g.bezierCurveTo(12, -184, 8, -180, 4, -176); g.closePath();
  fill(g, hex(0xa83c4c), INK(), 1.2);
  // dome
  g.beginPath(); g.moveTo(-15, -148); g.lineTo(-16, -168); g.quadraticCurveTo(-16, -182, 0, -183); g.quadraticCurveTo(16, -182, 16, -168); g.lineTo(15, -148); g.closePath();
  fill(g, steel(g, -16, 16), INK(), 1.4);
  // visor + slits
  g.beginPath(); g.moveTo(-14, -164); g.lineTo(14, -164); g.lineTo(13, -152); g.lineTo(-13, -152); g.closePath(); fill(g, hgrad(g, -14, 14, 0x8a92a8, 0.1, -0.25), INK(0.9), 1.1);
  g.fillStyle = lit ? hex(0x9fe8ff) : hex(PAL.ink);
  g.fillRect(-11, -160, 22, 3);
  if (lit) { softGlow(g, -5, -158.5, 9, 0x9fe8ff, 0.9); softGlow(g, 5, -158.5, 9, 0x9fe8ff, 0.9); }
  g.strokeStyle = INK(0.8); g.lineWidth = 1;
  for (let y = -150; y < -146; y += 2) { g.beginPath(); g.moveTo(-6, y); g.lineTo(6, y); g.stroke(); }
  g.strokeStyle = rgba(0xffffff, 0.45); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -178); g.quadraticCurveTo(-13, -170, -12, -166); g.stroke();
  bead(g, 0, -184, 2.4, PAL.brass);
};

// --- suitOfArmor 80×190 ---
const SA_SH: [number, number] = [16, -142];
def('suitOfArmor',
  P('body', [-36, -158, 72, 158], (g) => {
    shadowBase(g, 34, 0.32);
    slab(g, -30, -14, 60, 14, 3, PAL.stone, { h: true }); slab(g, -26, -22, 52, 9, 3, shade(PAL.stone, 0.12));
    // legs (greaves)
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 4, -24); g.lineTo(s * 16, -24); g.lineTo(s * 14, -66); g.lineTo(s * 5, -66); g.closePath(); fill(g, steel(g, -16, 16), INK(), 1.3);
      ellipse(g, s * 10, -68, 8, 5); fill(g, steel(g, 0, 16), INK(), 1.2);
    }
    // tassets
    for (let i = 0; i < 3; i++) { slab(g, -20 + i * 1, -88 + i * 7, 40 - i * 2, 9, 3, shade(STEEL, 0.06 - i * 0.05), { h: true }); }
    // torso
    g.beginPath(); g.moveTo(-14, -148); g.lineTo(14, -148); g.quadraticCurveTo(24, -130, 17, -92); g.lineTo(-17, -92); g.quadraticCurveTo(-24, -130, -14, -148); g.closePath();
    fill(g, steel(g, -22, 22), INK(), 1.5);
    g.strokeStyle = rgba(PAL.ink, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(0, -146); g.lineTo(0, -94); g.stroke();
    g.strokeStyle = rgba(0xffffff, 0.45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, -142); g.quadraticCurveTo(-14, -120, -11, -98); g.stroke();
    slab(g, -17, -100, 34, 6, 2, PAL.brass);
    // left shoulder + arm (far side)
    ellipse(g, -22, -142, 10, 8); fill(g, steel(g, -32, -12), INK(), 1.3);
    bar(g, -24, -138, -27, -98, 8, 0x8a92a8); ellipse(g, -27, -94, 5, 5); fill(g, steel(g, -32, -22), INK(), 1.2);
    // gorget
    slab(g, -9, -156, 18, 10, 3, shade(STEEL, -0.05), { h: true });
  }),
  P('arm', [4, -152, 36, 130], (g) => {
    // sword planted point-down, gauntlet on the pommel
    g.beginPath(); g.moveTo(20, -26); g.lineTo(26, -26); g.lineTo(26, -98); g.lineTo(20, -98); g.closePath(); fill(g, lin(g, 20, 0, 26, 0, [[0, 0xf4f6ff], [1, 0x9aa2b8]]), INK(), 1.1);
    g.beginPath(); g.moveTo(20, -26); g.lineTo(23, -18); g.lineTo(26, -26); g.closePath(); fill(g, hex(0xdfe4f2), INK(), 1);
    slab(g, 12, -102, 22, 5, 2, PAL.brass); bead(g, 23, -118, 4, PAL.brass); bar(g, 23, -114, 23, -103, 3, 0x6a4130);
    // upper arm + shoulder
    ellipse(g, 16, -144, 11, 9); fill(g, steel(g, 6, 28), INK(), 1.3);
    bar(g, 17, -138, 21, -112, 8, 0x8a92a8);
    ellipse(g, 22, -112, 7, 8); fill(g, steel(g, 14, 30), INK(), 1.3);
    ellipse(g, 23, -108, 5.4, 5); fill(g, steel(g, 18, 28), INK(), 1.1);
  }, { pivot: SA_SH }),
  P('helm', [-17, -190, 34, 44], (g) => helmArt(g, false), { pivot: [0, -150] }),
  P('helmLit', [-17, -190, 34, 44], (g) => helmArt(g, true), { alpha: 0, pivot: [0, -150] }),
);

// --- portrait 112×146 (wall, centered) ---
def('portrait',
  P('canvas', [-46, -63, 92, 126], (g) => {
    rrect(g, -44, -61, 88, 122, 3);
    fill(g, lin(g, 0, -61, 0, 61, [[0, 0x3a3226], [1, 0x1c1812]]));
    clipped(g, () => rrect(g, -44, -61, 88, 122, 3), () => {
      softGlow(g, 0, -20, 50, 0x8a6a3a, 0.45);
      // shoulders + dark coat
      g.beginPath(); g.moveTo(-44, 61); g.quadraticCurveTo(-40, 24, -14, 20); g.lineTo(14, 20); g.quadraticCurveTo(40, 24, 44, 61); g.closePath(); fill(g, hex(0x2a2638));
      // ruff collar
      for (let i = -3; i <= 3; i++) { ellipse(g, i * 6.4, 20, 5.4, 6); fill(g, hex(shade(CREAM, -0.04 * Math.abs(i))), INK(0.6), 0.9); }
      // face
      g.beginPath(); g.moveTo(-12, -20); g.quadraticCurveTo(-14, 14, 0, 18); g.quadraticCurveTo(14, 14, 12, -20); g.quadraticCurveTo(0, -34, -12, -20); g.closePath();
      fill(g, lin(g, -12, 0, 12, 0, [[0, 0xe9c9a4], [1, 0xb88a64]]), INK(0.8), 1.2);
      // hair
      g.beginPath(); g.moveTo(-14, -14); g.quadraticCurveTo(-18, -44, 0, -42); g.quadraticCurveTo(18, -44, 14, -14); g.quadraticCurveTo(10, -30, 0, -30); g.quadraticCurveTo(-10, -30, -14, -14); g.closePath(); fill(g, hex(0x6a5a52), INK(0.8), 1);
      // eye sockets (pupils are the glowing 'eyes' overlay), brows, nose, stern mouth
      for (const s of [-1, 1]) {
        ellipse(g, s * 6, -14, 3.8, 2.4); fill(g, hex(0xece0c8), INK(0.8), 0.8);
        g.beginPath(); g.moveTo(s * 2, -20); g.lineTo(s * 10, -19 + s * -1); stroke(g, hex(0x4a3c36), 1.6);
      }
      g.beginPath(); g.moveTo(0, -12); g.lineTo(-2.4, -2); g.lineTo(2, -1); stroke(g, rgba(PAL.ink, 0.55), 1);
      g.beginPath(); g.moveTo(-5, 7); g.quadraticCurveTo(0, 6, 5, 7); stroke(g, hex(0x8a3a3a), 1.5);
      // brooch
      bead(g, 0, 36, 3.4, PAL.gold);
      g.fillStyle = rgba(0x000000, 0.3); g.fillRect(-44, 40, 88, 21);
    });
  }),
  P('void', [-44, -61, 88, 122], (g) => {
    rrect(g, -44, -61, 88, 122, 3); fill(g, rad(g, 0, 0, 4, 80, [[0, 0x000000], [0.6, 0x0a0714], [1, 0x1a1030]]));
    softGlow(g, 0, 0, 38, 0x9b7bff, 0.25);
  }, { alpha: 0, depth: 1 }),
  P('eyes', [-14, -22, 28, 16], (g) => {
    for (const s of [-1, 1]) { softGlow(g, s * 6, -14, 8, 0xffb454, 0.9); ellipse(g, s * 6, -14, 1.9, 1.9); fill(g, hex(0xfff0c8)); }
  }, { alpha: 0.5, depth: 2 }),
  P('grin', [-16, -4, 32, 20], (g) => {
    g.beginPath(); g.moveTo(-14, 4); g.quadraticCurveTo(0, 20, 14, 4); g.quadraticCurveTo(0, 8, -14, 4); g.closePath();
    fill(g, hex(0x1a0f14), INK(), 1);
    g.fillStyle = hex(0xf6efdc);
    for (let i = -5; i <= 5; i++) { const x = i * 2.5; g.beginPath(); g.moveTo(x - 1.2, 5.4 + Math.abs(i) * 0.15); g.lineTo(x + 1.2, 5.4 + Math.abs(i) * 0.15); g.lineTo(x, 9.6 - Math.abs(i) * 0.5); g.closePath(); g.fill(); }
  }, { alpha: 0, depth: 2 }),
  P('frame', [-56, -73, 112, 146], (g) => {
    g.beginPath(); rrect(g, -56, -73, 112, 146, 6); rrect(g, -44, -61, 88, 122, 3);
    g.fillStyle = lin(g, -56, -73, 56, 73, [[0, 0xf2d58a], [0.5, 0xc89a46], [1, 0x8a6228]]); g.fill('evenodd');
    // re-trace outlines (path above was consumed by fill)
    rrect(g, -56, -73, 112, 146, 6); stroke(g, INK(), 1.6);
    rrect(g, -44, -61, 88, 122, 3); stroke(g, INK(), 1.3);
    rrect(g, -50, -67, 100, 134, 4); stroke(g, rgba(0xffffff, 0.3), 1);
    for (let x = -42; x <= 42; x += 12) { bead(g, x, -67, 2, PAL.gold); bead(g, x, 67, 2, PAL.gold); }
    for (let y = -54; y <= 54; y += 12) { bead(g, -50, y, 2, PAL.gold); bead(g, 50, y, 2, PAL.gold); }
    for (const [x, y] of [[-50, -67], [50, -67], [-50, 67], [50, 67]] as [number, number][]) bead(g, x, y, 4.6, PAL.gold);
    slab(g, -16, 62, 32, 9, 2, 0x2a2638); g.fillStyle = hex(PAL.gold); g.fillRect(-10, 65.6, 20, 1.6);
  }, { depth: 3 }),
);
