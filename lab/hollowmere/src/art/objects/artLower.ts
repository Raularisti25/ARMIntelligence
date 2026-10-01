// Object drawings: study, kitchen, dining, parlor, foyer, cellar, boiler (15 objects).
// Register each with def(id, ...parts) from ../objectKit at module top level.
// Anchor coords: floor/table objects x centered, y negative upward from the feet;
// wall objects centered on 0,0; ceiling objects y positive downward from the mount.

import { bar, bead, def, flame, grain, hgrad, INK, lineStroke, P, poly, shadowBase, sheen, slab, softGlow, speckle, vgrad, wood } from '../objectKit';
import { clipped, ellipse, fill, lin, PAL, rad, rgba, rng, rrect } from '../paint';
import type { Ctx2D } from '../paint';

const hex2 = (c: number): string => rgba(c, 1);
const dot = (g: Ctx2D, x: number, y: number, r: number, c: string): void => {
  ellipse(g, x, y, r, r);
  fill(g, c);
};

// ------------------------------------------------------------------ study ----

/** Book standing upright: spine colour, ink outline, gold bands. */
function book(g: Ctx2D, x: number, yBottom: number, w: number, h: number, c: number, seed = 1): void {
  rrect(g, x, yBottom - h, w, h, 1.5);
  fill(g, hgrad(g, x, x + w, c, 0.22, -0.28), INK(), 1.1);
  g.strokeStyle = rgba(PAL.gold, 0.8);
  g.lineWidth = 0.9;
  for (const f of [0.18, 0.82]) {
    g.beginPath(); g.moveTo(x + 0.5, yBottom - h * f); g.lineTo(x + w - 0.5, yBottom - h * f); g.stroke();
  }
  const r = rng(seed);
  g.fillStyle = rgba(PAL.cream, 0.75);
  g.fillRect(x + w * 0.25, yBottom - h * 0.62, w * 0.5, 2 + r() * 2);
}

def('desk',
  P('body', [-95, -76, 190, 76], (g) => {
    shadowBase(g, 92);
    // pedestals
    wood(g, -90, -64, 58, 62, 3, PAL.woodDark, 5);
    wood(g, 32, -64, 58, 62, 3, PAL.woodDark, 6);
    // drawer cavities (revealed when the drawers slide out)
    for (const y of [-58, -30]) { g.fillStyle = rgba(PAL.ink, 0.88); g.fillRect(36, y, 50, 26); }
    // left pedestal panel doors
    for (const y of [-58, -30]) {
      rrect(g, -84, y, 46, 26, 2);
      fill(g, vgrad(g, y, y + 26, PAL.wood, 0.08, -0.2), INK(), 1);
      bead(g, -61, y + 13, 2.6);
    }
    // kneehole shadow
    g.fillStyle = rgba(PAL.ink, 0.72);
    g.fillRect(-30, -62, 62, 62);
    g.fillStyle = rgba(PAL.rose, 0.35);
    g.fillRect(-26, -4, 54, 4);
    // top slab with overhang + green leather inlay
    wood(g, -95, -76, 190, 13, 4, PAL.wood, 9);
    rrect(g, -80, -73, 160, 5, 2);
    fill(g, rgba(PAL.green, 0.7));
    // feet
    for (const x of [-88, 70]) { g.fillStyle = INK(); g.fillRect(x, -2, 18, 2.5); }
  }),
  P('typewriter', [-56, -108, 54, 32], (g) => {
    // base body
    rrect(g, -52, -92, 46, 16, 3);
    fill(g, vgrad(g, -92, -76, 0x3a3f4a, 0.3, -0.2), INK(), 1.2);
    // key rows
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) dot(g, -46 + i * 6 + r * 1.6, -88 + r * 4, 1.5, rgba(PAL.cream, 0.95));
    // ribbon spools
    dot(g, -44, -98, 4, rgba(0x222a35)); dot(g, -14, -98, 4, rgba(0x222a35));
    lineStroke(g, [[-44, -98], [-14, -98]], INK(0.8), 1);
    // paper rest
    g.fillStyle = INK(0.9);
    g.fillRect(-32, -104, 14, 4);
  }),
  P('carriage', [-58, -110, 58, 12], (g) => {
    rrect(g, -56, -106, 54, 7, 3.5);
    fill(g, vgrad(g, -106, -99, 0x4a505c, 0.4, -0.25), INK(), 1.1);
    bead(g, -57, -102.5, 3.4); bead(g, -1, -102.5, 3.4);
    g.fillStyle = rgba(0xffffff, 0.25);
    g.fillRect(-52, -105, 44, 1.4);
  }),
  P('paper', [-44, -134, 26, 36], (g) => {
    rrect(g, -42, -132, 22, 32, 1.5);
    fill(g, vgrad(g, -132, -100, PAL.cream, 0.1, -0.12), INK(), 1);
    g.strokeStyle = rgba(PAL.ink, 0.35);
    g.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-39, -126 + i * 5); g.lineTo(-24 - (i % 2) * 5, -126 + i * 5); g.stroke(); }
  }),
  P('lamp', [44, -134, 50, 62], (g) => {
    // banker's lamp: brass base + stem + green glass shade
    rrect(g, 56, -80, 26, 8, 3);
    fill(g, vgrad(g, -80, -72, PAL.brass, 0.4, -0.3), INK(), 1.1);
    bar(g, 69, -78, 69, -108, 5, PAL.brass);
    g.beginPath();
    g.moveTo(48, -102); g.quadraticCurveTo(48, -132, 69, -132); g.quadraticCurveTo(90, -132, 90, -102); g.closePath();
    fill(g, lin(g, 48, -132, 90, -102, [[0, 0x6fd09a], [0.5, 0x2f8a5c], [1, 0x1d5a3e]]), INK(), 1.3);
    g.fillStyle = rgba(0xffffff, 0.3);
    g.fillRect(55, -124, 5, 14);
    bead(g, 69, -106, 3);
  }),
  P('glowLamp', [26, -140, 84, 84], (g) => {
    softGlow(g, 68, -98, 42, 0xffe4a0, 0.8);
  }, { alpha: 0.5 }),
  P('drawer1', [34, -60, 54, 30], (g) => {
    slab(g, 36, -58, 50, 26, 2, PAL.wood);
    g.fillStyle = rgba(PAL.woodDark, 0.5); g.fillRect(40, -54, 42, 18);
    g.strokeStyle = INK(0.45); g.lineWidth = 0.8; g.strokeRect(40, -54, 42, 18);
    bead(g, 61, -45, 3);
  }),
  P('drawer2', [34, -32, 54, 30], (g) => {
    slab(g, 36, -30, 50, 26, 2, PAL.wood);
    g.fillStyle = rgba(PAL.woodDark, 0.5); g.fillRect(40, -26, 42, 18);
    g.strokeStyle = INK(0.45); g.lineWidth = 0.8; g.strokeRect(40, -26, 42, 18);
    bead(g, 61, -17, 3);
  }),
  P('message', [-34, -138, 74, 56], (g) => {
    g.save();
    g.translate(2, -112);
    g.rotate(-0.05);
    rrect(g, -34, -24, 68, 48, 3);
    fill(g, vgrad(g, -24, 24, PAL.cream, 0.08, -0.16), INK(), 1.2);
    speckle(g, -34, -24, 68, 48, 18, 0xb08a4a, 0.25, 4, 1.6);
    g.font = 'italic 700 17px "Iowan Old Style", Palatino, Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = rgba(PAL.blood, 0.95);
    g.fillText('LEAVE', 0, -3);
    g.fillText('NOW', 0, 15);
    g.restore();
  }, { alpha: 0 }),
);

def('stagHead',
  P('plaque', [-52, -34, 104, 116], (g) => {
    // shield-shaped wooden plaque
    g.beginPath();
    g.moveTo(-46, -28); g.quadraticCurveTo(0, -38, 46, -28);
    g.quadraticCurveTo(52, 30, 0, 78); g.quadraticCurveTo(-52, 30, -46, -28); g.closePath();
    fill(g, lin(g, -46, -30, 46, 78, [[0, PAL.woodLight], [1, PAL.woodDark]]), INK(), 1.6);
    clipped(g, () => g.rect(-52, -34, 104, 116), () => grain(g, -50, -30, 100, 110, PAL.wood, 21, 14, 0.25, true));
    g.strokeStyle = rgba(PAL.gold, 0.55); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-36, -22); g.quadraticCurveTo(0, -30, 36, -22); g.quadraticCurveTo(42, 26, 0, 66); g.quadraticCurveTo(-42, 26, -36, -22); g.stroke();
    bead(g, 0, 66, 3.2);
  }),
  P('antlers', [-65, -75, 130, 76], (g) => {
    const horn = (s: 1 | -1): void => {
      const tines: [number, number, number, number][] = [[10, -8, 22, -30], [20, -22, 40, -44], [30, -34, 46, -62], [40, -48, 62, -68]];
      g.lineCap = 'round';
      for (const [w, c] of [[8, INK()], [5.2, hex2(0xd8c29a)]] as [number, string][]) {
        g.strokeStyle = c; g.lineWidth = w;
        g.beginPath(); g.moveTo(s * 10, -2); g.bezierCurveTo(s * 22, -10, s * 34, -30, s * 52, -54); g.bezierCurveTo(s * 58, -62, s * 60, -68, s * 62, -72); g.stroke();
        for (const [a, b, cx, cy] of tines) {
          g.beginPath(); g.moveTo(s * (a + 6), b - 1); g.lineTo(s * cx, cy - 4); g.stroke();
        }
      }
      g.lineCap = 'butt';
    };
    horn(1); horn(-1);
  }),
  P('head', [-36, -34, 72, 88], (g) => {
    // ears
    for (const s of [1, -1]) {
      g.save(); g.translate(s * 30, -14); g.rotate(s * 0.7);
      ellipse(g, 0, 0, 7, 14); fill(g, rgba(0x8a5a38), INK(), 1.3);
      ellipse(g, 0, 1, 3.4, 9); fill(g, rgba(PAL.rose, 0.6));
      g.restore();
    }
    // skull + muzzle
    g.beginPath();
    g.moveTo(-26, -14); g.quadraticCurveTo(-30, -34, 0, -34); g.quadraticCurveTo(30, -34, 26, -14);
    g.quadraticCurveTo(24, 6, 16, 22); g.quadraticCurveTo(14, 36, 0, 38); g.quadraticCurveTo(-14, 36, -16, 22);
    g.quadraticCurveTo(-24, 6, -26, -14); g.closePath();
    fill(g, lin(g, -26, -34, 26, 40, [[0, 0xb07a4c], [0.6, 0x8a5a38], [1, 0x6a4128]]), INK(), 1.6);
    speckle(g, -26, -30, 52, 66, 40, 0x4a2c18, 0.35, 11, 1.5);
    // brow ridge + eye sockets
    for (const s of [1, -1]) { ellipse(g, s * 14, -8, 8, 6); fill(g, rgba(PAL.ink, 0.55)); }
    // nose
    ellipse(g, 0, 33, 8, 5); fill(g, rgba(0x20161c), INK(), 1);
    g.fillStyle = rgba(0xffffff, 0.3); g.fillRect(-4, 31, 3, 1.4);
    for (const s of [1, -1]) dot(g, s * 4, 34, 1.4, rgba(0, 0.6));
    // mouth line
    g.strokeStyle = INK(); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-12, 46); g.quadraticCurveTo(0, 40, 12, 46); g.stroke();
  }),
  P('jaw', [-18, 28, 36, 28], (g) => {
    g.beginPath();
    g.moveTo(-14, 28); g.quadraticCurveTo(-16, 46, 0, 50); g.quadraticCurveTo(16, 46, 14, 28); g.closePath();
    fill(g, lin(g, 0, 28, 0, 50, [[0, 0x8a5a38], [1, 0x6a4128]]), INK(), 1.5);
    g.fillStyle = rgba(PAL.cream, 0.95);
    for (const x of [-9, -3, 3, 9]) { poly(g, [[x - 2, 29], [x + 2, 29], [x, 35]]); fill(g, rgba(PAL.cream, 0.95), INK(0.6), 0.6); }
  }, { pivot: [0, 29] }),
  P('eyes', [-26, -20, 52, 22], (g) => {
    for (const s of [1, -1]) {
      softGlow(g, s * 14, -8, 12, 0xff5a3a, 0.9);
      dot(g, s * 14, -8, 3.2, 'rgba(255,230,160,1)');
    }
  }, { alpha: 0 }),
);

def('bookshelf',
  P('body', [-70, -240, 140, 240], (g) => {
    shadowBase(g, 66);
    // case
    wood(g, -70, -240, 140, 240, 4, PAL.wood, 31, true);
    // dark interior
    g.fillStyle = rgba(PAL.ink, 0.82);
    g.fillRect(-62, -230, 124, 226);
    // shelves + pre-placed books (shelf 3 slots left empty for b1..b3)
    const base = [-6, -58, -110, -162, -214];
    const r = rng(77);
    const cols = [0x8a2f3a, 0x2f5a7a, 0x4a7a4a, 0xb08a3a, 0x6a3f7a, 0x7a4a2a, 0x3a6a6a];
    for (let s = 0; s < 4; s++) {
      const yb = base[s];
      let x = -60;
      while (x < 58) {
        const w = 8 + r() * 7;
        const h = 32 + r() * 14;
        if (s === 2 && x > -44 && x < -2) { x += w + 1; continue; }
        if (r() < 0.12) { x += 6; continue; }
        book(g, x, yb, Math.min(w, 58 - x), h, cols[Math.floor(r() * cols.length)], Math.floor(r() * 99));
        x += w + 0.5;
      }
      wood(g, -64, yb, 128, 5, 1.5, PAL.woodLight, 40 + s);
    }
    // crown molding + base
    wood(g, -74, -246 + 6, 148, 10, 2, PAL.woodLight, 55);
    wood(g, -72, -10, 144, 10, 2, PAL.woodDark, 56);
  }),
  P('b1', [-42, -152, 14, 44], (g) => book(g, -42, -108, 13, 42, 0xb0402f, 3), { depth: 1 }),
  P('b2', [-29, -148, 15, 40], (g) => book(g, -29, -108, 14, 38, 0x2f6a8a, 4), { depth: 1 }),
  P('b3', [-15, -154, 14, 46], (g) => book(g, -15, -108, 13, 44, 0x4a8a5a, 5), { depth: 1 }),
);

// ---------------------------------------------------------------- kitchen ----

def('stove',
  P('body', [-70, -150, 140, 150], (g) => {
    shadowBase(g, 68);
    // cabinet body (cream enamel)
    slab(g, -68, -118, 136, 114, 5, 0xe9e0c9, { h: true, up: 0.12, dn: -0.18 });
    // backsplash with knobs
    slab(g, -68, -150, 136, 34, 4, 0xd9cfb4);
    for (let i = 0; i < 5; i++) {
      const x = -48 + i * 24;
      bead(g, x, -134, 5.2, 0x3a3f4a);
      g.strokeStyle = rgba(0xffffff, 0.6); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, -137); g.lineTo(x, -132); g.stroke();
    }
    // cooktop
    wood(g, -70, -122, 140, 8, 2, 0x3a3f4a, 4);
    // oven cavity (door drops over it)
    g.fillStyle = rgba(PAL.ink, 0.92);
    g.fillRect(-50, -102, 100, 84);
    g.strokeStyle = INK(); g.lineWidth = 1.2; g.strokeRect(-50, -102, 100, 84);
    // oven rack lines
    g.strokeStyle = rgba(0x8a8f99, 0.7); g.lineWidth = 1.2;
    for (const y of [-80, -58, -36]) { g.beginPath(); g.moveTo(-48, y); g.lineTo(48, y); g.stroke(); }
    // drawer strip + feet
    slab(g, -60, -14, 120, 10, 2, 0xd9cfb4);
    for (const x of [-62, 52]) { g.fillStyle = INK(); g.fillRect(x, -3, 10, 3); }
  }),
  P('glowOven', [-46, -98, 92, 76], (g) => {
    softGlow(g, 0, -60, 48, 0xff8a3a, 0.9);
    g.fillStyle = rgba(0xffa04a, 0.35); g.fillRect(-44, -96, 88, 72);
  }, { alpha: 0 }),
  P('ovenDoor', [-52, -104, 104, 90], (g) => {
    rrect(g, -52, -104, 104, 88, 4);
    fill(g, vgrad(g, -104, -16, 0xe9e0c9, 0.14, -0.2), INK(), 1.5);
    // window
    rrect(g, -38, -92, 76, 44, 5);
    fill(g, lin(g, -38, -92, 38, -48, [[0, 0x2a3140], [1, 0x151a26]]), INK(), 1.3);
    g.fillStyle = rgba(0xffffff, 0.2);
    poly(g, [[-34, -88], [-12, -88], [-26, -52], [-34, -52]]); g.fill();
    // handle bar
    bar(g, -34, -34, 34, -34, 4.5, 0xb8bcc6);
    bead(g, -34, -34, 4.5, 0x8a8f99); bead(g, 34, -34, 4.5, 0x8a8f99);
  }, { pivot: [0, -16] }),
  P('pots', [-62, -144, 124, 30], (g) => {
    // big stockpot
    rrect(g, -58, -142, 38, 30, [4, 4, 7, 7]);
    fill(g, hgrad(g, -58, -20, 0x8a8f99, 0.4, -0.3), INK(), 1.4);
    bar(g, -62, -132, -58, -132, 3, 0x3a3f4a); bar(g, -20, -132, -16, -132, 3, 0x3a3f4a);
    // saucepan
    rrect(g, 14, -134, 32, 22, [3, 3, 6, 6]);
    fill(g, hgrad(g, 14, 46, PAL.teal, 0.3, -0.3), INK(), 1.4);
    bar(g, 46, -128, 62, -132, 4, 0x3a3f4a);
  }),
  P('lid', [-58, -152, 40, 14], (g) => {
    g.beginPath();
    g.moveTo(-58, -141); g.quadraticCurveTo(-57, -150, -38, -150); g.quadraticCurveTo(-19, -150, -18, -141); g.closePath();
    fill(g, lin(g, -58, -150, -18, -141, [[0, 0xc7cbd4], [1, 0x7a808c]]), INK(), 1.3);
    bead(g, -38, -152, 3.2, 0x3a3f4a);
  }, { pivot: [-38, -141] }),
  P('flame', [-62, -124, 124, 14], (g) => {
    for (const x of [-48, -34, -22, 20, 30, 40]) flame(g, x, -112, 7, 12, 0, 0xcfe8ff, 0x5aa8ff, 0x2a5acf);
  }, { alpha: 0 }),
);

def('refrigerator',
  P('body', [-42, -178, 84, 178], (g) => {
    shadowBase(g, 40);
    slab(g, -42, -178, 84, 176, 7, 0xcfe2dc, { h: true, up: 0.22, dn: -0.16 });
    // interior (visible when the door swings)
    rrect(g, -38, -118, 76, 108, 3);
    fill(g, vgrad(g, -118, -10, 0xf4f1e2, 0.1, -0.12), INK(), 1.2);
    g.strokeStyle = rgba(0x8aa8a0, 0.9); g.lineWidth = 2;
    for (const y of [-92, -66, -40]) { g.beginPath(); g.moveTo(-36, y); g.lineTo(36, y); g.stroke(); }
    // groceries
    ellipse(g, -22, -76, 6, 6); fill(g, rgba(0xd94a3a), INK(0.6), 0.8);
    rrect(g, -8, -90, 10, 14, 2); fill(g, rgba(PAL.cream), INK(0.6), 0.8);
    rrect(g, 8, -88, 18, 12, 2); fill(g, rgba(0x7ab87a), INK(0.6), 0.8);
    rrect(g, -30, -52, 22, 12, 2); fill(g, rgba(0xe8c372), INK(0.6), 0.8);
    ellipse(g, 14, -48, 7, 5); fill(g, rgba(0xc77d8a), INK(0.6), 0.8);
    // feet
    for (const x of [-34, 26]) { g.fillStyle = INK(); g.fillRect(x, -3, 9, 3); }
  }),
  P('freezer', [-42, -178, 84, 58], (g) => {
    slab(g, -42, -178, 84, 56, 7, 0xd6e8e2, { h: true, up: 0.25, dn: -0.14 });
    bar(g, 28, -164, 28, -134, 4, 0xa8b4b0);
    g.fillStyle = rgba(0xffffff, 0.3); g.fillRect(-36, -172, 40, 3);
    g.fillStyle = rgba(PAL.ink, 0.35); g.fillRect(-42, -122, 84, 2);
  }, { pivot: [-42, -150] }),
  P('door', [-42, -120, 84, 118], (g) => {
    slab(g, -42, -120, 84, 116, 7, 0xcfe2dc, { h: true, up: 0.22, dn: -0.16 });
    bar(g, 28, -108, 28, -66, 4.5, 0xa8b4b0);
    g.fillStyle = rgba(0xffffff, 0.28); g.fillRect(-36, -114, 3, 100);
    // magnets
    dot(g, -18, -90, 4, rgba(0xd94a3a)); dot(g, -8, -78, 3.4, rgba(0xe8c372));
    rrect(g, -24, -70, 14, 10, 1); fill(g, rgba(PAL.cream), INK(0.5), 0.7);
  }, { pivot: [-42, -64] }),
  P('glow', [-38, -118, 76, 108], (g) => {
    g.fillStyle = rad(g, 0, -64, 0, 60, [[0, 0xeaffe8, 0.7], [1, 0xbfe8d8, 0.1]]);
    g.fillRect(-38, -118, 76, 108);
  }, { alpha: 0 }),
  P('eyes', [-26, -166, 52, 24], (g) => {
    for (const s of [1, -1]) {
      softGlow(g, s * 13, -154, 11, 0xff5a3a, 0.9);
      dot(g, s * 13, -154, 3.2, 'rgba(255,230,160,1)');
    }
  }, { alpha: 0 }),
);

// ----------------------------------------------------------------- dining ----

def('chandelier',
  P('chain', [-6, 0, 12, 58], (g) => {
    for (let y = 2; y < 50; y += 9) {
      rrect(g, -3.2, y, 6.4, 11, 3);
      g.strokeStyle = INK(); g.lineWidth = 1.4; g.stroke();
      g.strokeStyle = hex2(PAL.brass); g.lineWidth = 0.9; g.stroke();
    }
    bead(g, 0, 53, 5);
  }, { pivot: [0, 0] }),
  P('body', [-102, 52, 204, 100], (g) => {
    ellipse(g, 0, 66, 9, 12); fill(g, rad(g, -3, 62, 0, 14, [[0, 0xf4d58a], [0.5, PAL.brass], [1, 0x7a5a2a]]), INK(), 1.3);
    g.lineCap = 'round';
    for (const [w, c] of [[5, INK()], [3, hex2(0x2a2430)]] as [number, string][]) {
      g.strokeStyle = c; g.lineWidth = w;
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(s * 6, 78); g.bezierCurveTo(s * 30, 118, s * 60, 124, s * 96, 98); g.stroke();
        g.beginPath(); g.moveTo(s * 5, 74); g.bezierCurveTo(s * 20, 96, s * 40, 100, s * 56, 92); g.stroke();
        g.beginPath(); g.moveTo(s * 8, 82); g.bezierCurveTo(s * 12, 108, s * 22, 116, s * 24, 98); g.stroke();
      }
    }
    g.lineCap = 'butt';
    for (const x of [-96, -56, -24, 24, 56, 96]) {
      const y = Math.abs(x) === 56 ? 92 : 98;
      g.beginPath(); g.moveTo(x - 7, y - 4); g.lineTo(x + 7, y - 4); g.lineTo(x + 4, y + 4); g.lineTo(x - 4, y + 4); g.closePath();
      fill(g, vgrad(g, y - 4, y + 4, PAL.brass, 0.4, -0.3), INK(), 1);
      rrect(g, x - 2.8, y - 24, 5.6, 21, 1.5);
      fill(g, hgrad(g, x - 3, x + 3, PAL.cream, 0.2, -0.1), INK(0.8), 1);
      g.strokeStyle = INK(); g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x, y - 27); g.stroke();
    }
    bead(g, 0, 98, 6, PAL.gold);
  }),
  P('crys1', [-76, 100, 24, 60], (g) => crystal(g, -64, 100, 9, 52), { pivot: [-64, 100] }),
  P('crys2', [-14, 100, 28, 90], (g) => crystal(g, 0, 104, 11, 82), { pivot: [0, 104] }),
  P('crys3', [52, 100, 24, 60], (g) => crystal(g, 64, 100, 9, 52), { pivot: [64, 100] }),
  P('flames', [-104, 40, 208, 40], (g) => {
    for (const x of [-96, -56, -24, 24, 56, 96]) {
      const y = Math.abs(x) === 56 ? 66 : 72;
      softGlow(g, x, y - 6, 14, 0xffd28a, 0.55);
      flame(g, x, y, 7, 15, 0.5 * Math.sign(x));
    }
  }),
);
/** Crystal drop (x = centerline, y = top attach, w = half-width, h = length). */
function crystal(g: Ctx2D, x: number, y: number, w: number, h: number): void {
  lineStroke(g, [[x, y - 4], [x, y + 4]], INK(), 1.4);
  poly(g, [[x, y + 2], [x + w, y + h * 0.32], [x + w * 0.5, y + h], [x, y + h + 4], [x - w * 0.5, y + h], [x - w, y + h * 0.32]]);
  fill(g, lin(g, x - w, y, x + w, y + h, [[0, 0xf0fbff, 0.95], [0.5, 0xa8d8f0, 0.85], [1, 0x7aa8d8, 0.9]]), INK(0.75), 1.1);
  g.strokeStyle = rgba(0xffffff, 0.75); g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - w * 0.3, y + h * 0.2); g.lineTo(x - w * 0.5, y + h * 0.7); g.stroke();
  g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y + h + 3); g.stroke();
}

def('chinaCabinet',
  P('body', [-65, -210, 130, 210], (g) => {
    shadowBase(g, 62);
    wood(g, -65, -210, 130, 14, 4, PAL.woodDark, 71);
    slab(g, -62, -198, 124, 112, 3, PAL.wood);
    g.fillStyle = rgba(PAL.ink, 0.45);
    g.fillRect(-56, -192, 112, 100);
    g.fillStyle = rgba(PAL.woodLight, 0.9);
    for (const y of [-160, -126]) g.fillRect(-56, y, 112, 4);
    wood(g, -64, -88, 128, 14, 3, PAL.woodDark, 72);
    wood(g, -62, -76, 124, 70, 3, PAL.wood, 73);
    for (const x of [-56, 4]) {
      rrect(g, x, -68, 52, 54, 3); fill(g, vgrad(g, -68, -14, PAL.woodLight, 0.04, -0.2), INK(0.8), 1.1);
      rrect(g, x + 8, -60, 36, 38, 2); g.strokeStyle = INK(0.4); g.lineWidth = 0.9; g.stroke();
    }
    bead(g, -8, -42, 3); bead(g, 8, -42, 3);
    wood(g, -62, -6, 124, 6, 2, PAL.woodDark, 74);
  }),
  P('china', [-56, -192, 112, 100], (g) => {
    const cols = [0xe8e2d0, 0xcfe0f0];
    for (let i = 0; i < 6; i++) {
      const x = -46 + i * 17;
      ellipse(g, x, -176, 7, 14); fill(g, hex2(cols[i % 2]), INK(0.7), 1);
      ellipse(g, x, -176, 4.6, 9.5); g.strokeStyle = rgba(PAL.blood, 0.55); g.lineWidth = 1; g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 22;
      rrect(g, x - 7, -146, 14, 16, [2, 2, 6, 6]); fill(g, hex2(cols[i % 2]), INK(0.7), 1);
      g.strokeStyle = INK(0.7); g.lineWidth = 1.2; g.beginPath(); g.arc(x + 8, -139, 4, -1.4, 1.4); g.stroke();
    }
    g.beginPath(); g.moveTo(-26, -100); g.quadraticCurveTo(-30, -122, 0, -122); g.quadraticCurveTo(30, -122, 26, -100); g.closePath();
    fill(g, lin(g, -26, -122, 26, -100, [[0, 0xf4f0e2], [1, 0xb8c8dc]]), INK(0.8), 1.2);
    bead(g, 0, -124, 3.4, PAL.gold);
  }),
  P('doorL', [-58, -196, 56, 108], (g) => cabDoor(g, -58, true), { pivot: [-58, -142] }),
  P('doorR', [2, -196, 56, 108], (g) => cabDoor(g, 2, false), { pivot: [58, -142] }),
  P('crack', [-30, -186, 60, 82], (g) => {
    g.strokeStyle = rgba(0xffffff, 0.9); g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(0, -170); g.lineTo(-8, -150); g.lineTo(6, -136); g.lineTo(-4, -118); g.stroke();
    g.beginPath(); g.moveTo(-8, -150); g.lineTo(-24, -142); g.moveTo(6, -136); g.lineTo(22, -130); g.moveTo(-4, -118); g.lineTo(-18, -108); g.stroke();
  }, { alpha: 0 }),
);
function cabDoor(g: Ctx2D, x: number, left: boolean): void {
  rrect(g, x, -196, 56, 108, 3);
  fill(g, hex2(PAL.wood), INK(), 1.3);
  rrect(g, x + 5, -190, 46, 96, 2);
  fill(g, lin(g, x, -190, x + 46, -94, [[0, 0xdff0ff, 0.28], [1, 0xa8c8e0, 0.2]]), INK(0.6), 1);
  g.strokeStyle = rgba(PAL.woodDark, 0.9); g.lineWidth = 2;
  g.beginPath(); g.moveTo(x + 28, -190); g.lineTo(x + 28, -94); g.moveTo(x + 5, -142); g.lineTo(x + 51, -142); g.stroke();
  sheen(g, x + 8, -188, 14, 90, 0.35);
  bead(g, left ? x + 50 : x + 6, -140, 3.2);
}

// ----------------------------------------------------------------- parlor ----

/** White-key strip; `variant` 1..3 depresses a different cluster of keys. */
function pianoKeys(g: Ctx2D, variant: number): void {
  const n = 9, w = 8;
  const down = variant === 1 ? [1, 4] : variant === 2 ? [2, 6, 7] : variant === 3 ? [0, 3, 5] : [];
  for (let i = 0; i < n; i++) {
    const d = down.includes(i) ? 2 : 0;
    g.fillStyle = hex2(down.includes(i) ? 0xdad2bd : PAL.cream);
    g.fillRect(-50 + i * w, -80 + d, w - 0.4, 16 - d);
    g.strokeStyle = INK(0.8); g.lineWidth = 0.8; g.strokeRect(-50 + i * w, -80 + d, w - 0.4, 16 - d);
  }
  for (const i of [0, 1, 3, 4, 5, 7]) {
    const d = down.includes(i) ? 1.5 : 0;
    g.fillStyle = INK(); g.fillRect(-50 + (i + 1) * w - 2.4, -80 + d, 4.6, 9.5);
  }
}

def('piano',
  P('body', [-52, -112, 142, 112], (g) => {
    shadowBase(g, 86);
    wood(g, -50, -112, 140, 52, 5, 0x2a2430, 81);
    wood(g, -52, -86, 76, 8, 2, 0x1a1426, 82);
    for (const x of [-46, 78]) wood(g, x, -60, 10, 60, 2, 0x2a2430, 83);
    bar(g, 14, -60, 14, -10, 4, 0x2a2430);
    for (const x of [8, 14, 20]) { ellipse(g, x, -8, 3, 1.6); fill(g, hex2(PAL.brass), INK(0.7), 0.8); }
    g.fillStyle = rgba(PAL.cream, 0.95); g.fillRect(-30, -108, 28, 20);
    g.strokeStyle = INK(0.4); g.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-28, -104 + i * 4.5); g.lineTo(-4, -104 + i * 4.5); g.stroke(); }
    rrect(g, 30, -104, 54, 36, 3); fill(g, rgba(0x3a3340), INK(0.6), 1);
    g.fillStyle = rgba(PAL.brass, 0.7); g.fillRect(52, -90, 14, 3);
    sheen(g, -48, -110, 136, 40, 0.14);
  }),
  P('lid', [-54, -126, 144, 16], (g) => {
    g.beginPath(); g.moveTo(-52, -124); g.lineTo(88, -124); g.lineTo(90, -112); g.lineTo(-54, -112); g.closePath();
    fill(g, lin(g, 0, -124, 0, -112, [[0, 0x4a4252], [1, 0x1f1a28]]), INK(), 1.5);
    g.fillStyle = rgba(0xffffff, 0.22); g.fillRect(-46, -121, 120, 2);
    for (const x of [60, 76]) bead(g, x, -118, 2.4);
  }, { pivot: [88, -118] }),
  P('keys', [-50, -80, 72, 18], (g) => pianoKeys(g, 0)),
  P('keys1', [-50, -80, 72, 18], (g) => pianoKeys(g, 1), { extra: true }),
  P('keys2', [-50, -80, 72, 18], (g) => pianoKeys(g, 2), { extra: true }),
  P('keys3', [-50, -80, 72, 18], (g) => pianoKeys(g, 3), { extra: true }),
  P('stool', [-92, -52, 40, 52], (g) => {
    for (const x of [-86, -60]) bar(g, x, -34, x + (x < -74 ? -2 : 2), -2, 4, PAL.woodDark);
    rrect(g, -92, -46, 40, 14, 6); fill(g, vgrad(g, -46, -32, PAL.blood, 0.1, -0.3), INK(), 1.3);
    g.fillStyle = rgba(0xffffff, 0.25); g.fillRect(-84, -43, 24, 2);
  }),
);

/** CRT glass; `variant` 0 = dark idle glass, 1..3 = snow frames. */
function tvScreen(g: Ctx2D, variant: number): void {
  const x = -52, y = -114, w = 82, h = 68;
  clipped(g, () => rrect(g, x, y, w, h, 8), () => {
    if (variant === 0) {
      g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 0x2a3a4a], [1, 0x101820]]);
      g.fillRect(x, y, w, h);
      g.fillStyle = rgba(0xffffff, 0.12);
      g.beginPath(); g.ellipse(x + 20, y + 14, 22, 9, -0.5, 0, 6.3); g.fill();
    } else {
      g.fillStyle = hex2(0x8a929c); g.fillRect(x, y, w, h);
      speckle(g, x, y, w, h, 520, 0xffffff, 0.85, 100 + variant * 13, 1.8);
      speckle(g, x, y, w, h, 360, 0x0a0c10, 0.8, 200 + variant * 17, 1.8);
      g.fillStyle = rgba(0xffffff, 0.35);
      g.fillRect(x, y + 6 + variant * 17, w, 5);
    }
  });
  rrect(g, x, y, w, h, 8);
  g.strokeStyle = INK(0.9); g.lineWidth = 1.2; g.stroke();
}

def('television',
  P('body', [-66, -128, 132, 128], (g) => {
    shadowBase(g, 62);
    for (const x of [-50, 46]) bar(g, x, -36, x + (x < 0 ? -6 : 6), -2, 5, PAL.woodDark);
    wood(g, -64, -126, 128, 92, 8, PAL.wood, 91);
    rrect(g, -56, -118, 90, 76, 9); fill(g, hex2(0x16121c), INK(), 1.4);
    for (const y of [-106, -86]) bead(g, 48, y, 6.5, 0xc7a46a);
    g.strokeStyle = rgba(PAL.ink, 0.7); g.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, -66 + i * 4); g.lineTo(56, -66 + i * 4); g.stroke(); }
  }),
  P('antenna', [-42, -170, 84, 46], (g) => {
    g.lineCap = 'round';
    for (const [w, c] of [[4.4, INK()], [2.4, hex2(0xb8bcc6)]] as [number, string][]) {
      g.strokeStyle = c; g.lineWidth = w;
      g.beginPath(); g.moveTo(-4, -126); g.lineTo(-36, -168); g.moveTo(4, -126); g.lineTo(38, -162); g.stroke();
    }
    g.lineCap = 'butt';
    bead(g, -37, -169, 3.2, 0xb8bcc6); bead(g, 39, -163, 3.2, 0xb8bcc6);
    ellipse(g, 0, -126, 11, 5); fill(g, hex2(0x3a3f4a), INK(), 1.2);
  }, { pivot: [0, -126] }),
  P('screen', [-52, -114, 82, 68], (g) => tvScreen(g, 0)),
  P('static1', [-52, -114, 82, 68], (g) => tvScreen(g, 1), { extra: true }),
  P('static2', [-52, -114, 82, 68], (g) => tvScreen(g, 2), { extra: true }),
  P('static3', [-52, -114, 82, 68], (g) => tvScreen(g, 3), { extra: true }),
  P('face', [-52, -114, 82, 68], (g) => {
    clipped(g, () => rrect(g, -52, -114, 82, 68, 8), () => {
      g.fillStyle = rgba(0xcfe8ff, 0.55); g.fillRect(-52, -114, 82, 68);
      ellipse(g, -11, -80, 20, 26); fill(g, rgba(0xe8f4ff, 0.85));
      for (const s of [1, -1]) { ellipse(g, -11 + s * 8, -86, 4, 6); fill(g, rgba(PAL.ink, 0.95)); }
      ellipse(g, -11, -66, 6, 8); fill(g, rgba(PAL.ink, 0.95));
    });
  }, { alpha: 0 }),
  P('glowScreen', [-64, -126, 106, 92], (g) => {
    softGlow(g, -11, -80, 52, 0xaad4ff, 0.7);
  }, { alpha: 0.35 }),
);

def('telephone',
  P('base', [-28, -30, 56, 30], (g) => {
    shadowBase(g, 26, 0.22);
    g.beginPath(); g.moveTo(-26, -2); g.quadraticCurveTo(-26, -24, 0, -24); g.quadraticCurveTo(26, -24, 26, -2); g.closePath();
    fill(g, vgrad(g, -24, 0, 0x2a2430, 0.3, -0.3), INK(), 1.4);
    for (const x of [-18, 18]) bar(g, x, -24, x, -29, 3, 0x1a1426);
    rrect(g, -9, -17, 18, 13, 2); fill(g, hex2(PAL.cream), INK(0.6), 0.8);
    g.fillStyle = rgba(0xffffff, 0.16); g.fillRect(-20, -21, 40, 2);
  }),
  P('dial', [-9, -19, 18, 18], (g) => {
    ellipse(g, 0, -10, 8.5, 8.5); fill(g, hex2(PAL.brass), INK(0.9), 1);
    ellipse(g, 0, -10, 6.4, 6.4); fill(g, hex2(0x2a2430));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.6;
      dot(g, Math.cos(a) * 5.2, -10 + Math.sin(a) * 5.2, 1.1, rgba(PAL.cream, 0.9));
    }
  }, { pivot: [0, -10] }),
  P('handset', [-27, -45, 54, 20], (g) => {
    rrect(g, -24, -36, 48, 8, 4); fill(g, vgrad(g, -36, -28, 0x2a2430, 0.3, -0.3), INK(), 1.3);
    for (const s of [1, -1]) {
      rrect(g, s * 20 - 7, -44, 14, 14, 5); fill(g, vgrad(g, -44, -30, 0x3a3340, 0.3, -0.3), INK(), 1.3);
      g.fillStyle = rgba(0x000000, 0.35); ellipse(g, s * 20, -37, 4, 4); g.fill();
    }
    g.fillStyle = rgba(0xffffff, 0.22); g.fillRect(-18, -35, 36, 1.4);
  }, { pivot: [0, -36] }),
);

/** One flickering fireplace frame: tongues of fire with per-frame lean/height. */
function fireFrame(g: Ctx2D, f: number): void {
  const T: [number, number, number, number][][] = [
    [[-24, 40, 52, -3], [-6, 50, 66, 1], [14, 44, 56, 4], [28, 30, 40, -2]],
    [[-26, 44, 46, 3], [-4, 54, 58, -3], [16, 40, 62, 2], [30, 32, 44, 4]],
    [[-22, 38, 58, -2], [-8, 46, 70, 3], [12, 48, 52, -4], [26, 34, 38, 2]],
    [[-26, 42, 50, 4], [-2, 52, 62, -2], [18, 42, 58, -3], [28, 30, 46, 3]],
  ];
  softGlow(g, 0, -34, 48, 0xff8a3a, 0.5);
  for (const [x, w, h, lean] of T[f - 1]) flame(g, x, -26, w * 0.7, h, lean);
}
function ghostFire(g: Ctx2D, f: number): void {
  const L: [number, number, number][] = [[-22, 56, 3], [0, 74, -3], [22, 58, 2]];
  softGlow(g, 0, -40, 46, 0x6af0d0, 0.55);
  L.forEach(([x, h, lean], i) => flame(g, x, -26, 26, h - ((f + i) % 3) * 10, lean * (f % 2 ? 1 : -1), 0xe8fff8, 0x6af0d0, 0x2a8a9a));
}

def('fireplace',
  P('frame', [-100, -210, 200, 210], (g) => {
    shadowBase(g, 96);
    const r = rng(95);
    slab(g, -92, -172, 184, 172, 3, PAL.stone);
    clipped(g, () => g.rect(-92, -172, 184, 172), () => {
      for (let y = -170; y < 0; y += 16) for (let x = -92 - (Math.floor(y / 16) & 1) * 12; x < 92; x += 24) {
        g.strokeStyle = INK(0.4); g.lineWidth = 1; g.strokeRect(x, y, 24, 16);
        g.fillStyle = rgba(r() < 0.5 ? 0xffffff : 0x000000, 0.04 + r() * 0.06); g.fillRect(x + 1, y + 1, 22, 14);
      }
    });
    rrect(g, -52, -112, 104, 104, [30, 30, 0, 0]); fill(g, rgba(0x120d14), INK(), 1.6);
    g.fillStyle = rgba(0x3a2a2a, 0.6); g.fillRect(-48, -110, 6, 100);
    wood(g, -100, -192, 200, 20, 3, PAL.woodDark, 96);
    wood(g, -96, -10, 192, 10, 2, PAL.stone, 97);
    for (const x of [-74, 74]) bar(g, x, -192, x, -208, 4, PAL.brass);
  }),
  P('logs', [-46, -30, 92, 26], (g) => {
    g.save(); g.translate(-12, -16); g.rotate(-0.12);
    wood(g, -34, -8, 68, 16, 7, 0x4a2c1c, 31); g.restore();
    g.save(); g.translate(14, -14); g.rotate(0.14);
    wood(g, -32, -8, 64, 16, 7, 0x3a2216, 33); g.restore();
    g.strokeStyle = rgba(0xff6a30, 0.7); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-30, -16); g.lineTo(-10, -18); g.moveTo(8, -12); g.lineTo(30, -14); g.stroke();
  }),
  P('fire1', [-46, -98, 92, 74], (g) => fireFrame(g, 1)),
  P('fire2', [-46, -98, 92, 74], (g) => fireFrame(g, 2), { extra: true }),
  P('fire3', [-46, -98, 92, 74], (g) => fireFrame(g, 3), { extra: true }),
  P('fire4', [-46, -98, 92, 74], (g) => fireFrame(g, 4), { extra: true }),
  P('embers', [-48, -26, 96, 20], (g) => {
    softGlow(g, 0, -14, 44, 0xff7a30, 0.9);
    speckle(g, -40, -22, 80, 12, 24, 0xffcf80, 0.9, 7, 1.4);
  }),
  P('gfire1', [-46, -102, 92, 78], (g) => ghostFire(g, 1), { alpha: 0 }),
  P('gfire2', [-46, -102, 92, 78], (g) => ghostFire(g, 2), { extra: true }),
  P('gfire3', [-46, -102, 92, 78], (g) => ghostFire(g, 3), { extra: true }),
  P('flameC', [-30, -150, 60, 130], (g) => {
    flame(g, 0, -22, 40, 120, 4, 0xfff0c0, 0xffa23a, 0xd94a1a);
    flame(g, -6, -22, 22, 70, -6, 0xfff0c0, 0xffc060, 0xe85a20);
  }, { alpha: 0 }),
);

// ------------------------------------------------------------------ foyer ----

def('grandfatherClock',
  P('case', [-42, -236, 84, 236], (g) => {
    shadowBase(g, 40);
    // base plinth
    wood(g, -40, -30, 80, 30, 3, PAL.woodDark, 101);
    wood(g, -36, -34, 72, 8, 2, PAL.woodLight, 102);
    // trunk
    wood(g, -32, -166, 64, 134, 3, PAL.wood, 103, true);
    // trunk window (pendulum shows through)
    rrect(g, -20, -136, 40, 90, [18, 18, 3, 3]); fill(g, rgba(0x120d14), INK(), 1.4);
    g.fillStyle = rgba(PAL.gold, 0.18); g.fillRect(-20, -136, 40, 90);
    // hood
    wood(g, -40, -170, 80, 10, 2, PAL.woodDark, 104);
    g.beginPath(); g.moveTo(-38, -172); g.lineTo(-38, -226); g.quadraticCurveTo(0, -250, 38, -226); g.lineTo(38, -172); g.closePath();
    fill(g, vgrad(g, -246, -172, PAL.wood, 0.1, -0.25), INK(), 1.5);
    wood(g, -42, -170, 84, 5, 2, PAL.woodLight, 105);
    bead(g, 0, -236, 5, PAL.gold);
    // finials
    for (const x of [-34, 34]) bead(g, x, -228, 3.6, PAL.gold);
  }),
  P('face', [-28, -214, 56, 56], (g) => {
    ellipse(g, 0, -186, 27, 27); fill(g, hex2(PAL.brass), INK(), 1.4);
    ellipse(g, 0, -186, 23.5, 23.5); fill(g, rad(g, -6, -192, 0, 30, [[0, 0xfff6dc], [1, 0xe0cfa0]]), INK(0.7), 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 3 === 0 ? 5 : 2.6;
      g.strokeStyle = INK(0.9); g.lineWidth = i % 3 === 0 ? 1.8 : 1;
      g.beginPath(); g.moveTo(Math.sin(a) * (21 - len), -186 - Math.cos(a) * (21 - len)); g.lineTo(Math.sin(a) * 21, -186 - Math.cos(a) * 21); g.stroke();
    }
    bead(g, 0, -186, 2.2, PAL.brass);
  }),
  P('hourHand', [-4, -202, 8, 20], (g) => {
    poly(g, [[-3, -184], [0, -202], [3, -184], [0, -182]]); fill(g, INK(0.95));
  }, { pivot: [0, -186] }),
  P('minHand', [-3, -210, 6, 28], (g) => {
    poly(g, [[-1.8, -184], [0, -210], [1.8, -184], [0, -181]]); fill(g, INK(0.95));
  }, { pivot: [0, -186] }),
  P('pendulum', [-12, -128, 24, 76], (g) => {
    bar(g, 0, -128, 0, -74, 2, PAL.brass);
    ellipse(g, 0, -62, 10, 10);
    fill(g, rad(g, -3, -66, 0, 14, [[0, 0xfbe4a0], [0.5, PAL.brass], [1, 0x7a5a2a]]), INK(), 1.2);
    ellipse(g, 0, -62, 5, 5); g.strokeStyle = INK(0.45); g.lineWidth = 1; g.stroke();
  }, { pivot: [0, -128] }),
  P('glow', [-34, -222, 68, 68], (g) => {
    softGlow(g, 0, -186, 34, 0xaef0ff, 0.8);
  }, { alpha: 0 }),
);

def('coatStand',
  P('stand', [-38, -200, 76, 200], (g) => {
    shadowBase(g, 34);
    // tripod foot
    g.lineCap = 'round';
    for (const [w, c] of [[6, INK()], [3.6, hex2(PAL.woodDark)]] as [number, string][]) {
      g.strokeStyle = c; g.lineWidth = w;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(-30, -2); g.moveTo(0, -8); g.lineTo(30, -2); g.moveTo(0, -8); g.lineTo(0, -1); g.stroke();
    }
    g.lineCap = 'butt';
    // pole with turned bulges
    bar(g, 0, -10, 0, -184, 6, PAL.woodDark);
    for (const y of [-40, -110]) { ellipse(g, 0, y, 6.4, 6); fill(g, vgrad(g, y - 6, y + 6, PAL.wood, 0.2, -0.3), INK(), 1.1); }
    // hooks (curved arms)
    g.lineCap = 'round';
    for (const [w, c] of [[4.4, INK()], [2.4, hex2(PAL.brass)]] as [number, string][]) {
      g.strokeStyle = c; g.lineWidth = w;
      for (const s of [1, -1]) for (const y of [-168, -150]) {
        g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(s * 20, y - 2, s * 24, y - 12); g.stroke();
      }
    }
    g.lineCap = 'butt';
    bead(g, 0, -190, 4.4, PAL.brass);
    // umbrella leaning in
    bar(g, 28, -60, 22, -4, 3, 0x2f4a6a);
    ellipse(g, 20, -3, 5, 2); fill(g, rgba(0x2f4a6a), INK(0.8), 1);
  }),
  P('coat', [-36, -170, 44, 104], (g) => {
    g.beginPath();
    g.moveTo(-10, -168); g.quadraticCurveTo(-34, -164, -34, -140); g.lineTo(-36, -72); g.quadraticCurveTo(-18, -66, 4, -70); g.lineTo(6, -140); g.quadraticCurveTo(6, -164, -10, -168); g.closePath();
    fill(g, lin(g, -36, -168, 6, -70, [[0, 0x6a4a5a], [1, 0x3a2a38]]), INK(), 1.5);
    g.strokeStyle = INK(0.55); g.lineWidth = 1;
    g.beginPath(); g.moveTo(-14, -164); g.lineTo(-16, -78); g.moveTo(-26, -150); g.quadraticCurveTo(-28, -110, -30, -78); g.stroke();
    for (const y of [-140, -118, -96]) dot(g, -10, y, 2.2, rgba(PAL.brass));
  }, { pivot: [-14, -166] }),
  P('scarf', [8, -166, 26, 76], (g) => {
    g.beginPath(); g.moveTo(10, -158); g.lineTo(28, -158); g.lineTo(30, -96); g.lineTo(12, -92); g.closePath();
    fill(g, hgrad(g, 10, 30, PAL.blood, 0.1, -0.25), INK(), 1.3);
    g.strokeStyle = rgba(PAL.cream, 0.85); g.lineWidth = 3;
    for (const y of [-134, -116]) { g.beginPath(); g.moveTo(11, y); g.lineTo(30, y + 2); g.stroke(); }
    g.strokeStyle = rgba(PAL.blood, 0.9); g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(14 + i * 4, -95); g.lineTo(14 + i * 4, -86); g.stroke(); }
  }, { pivot: [19, -158] }),
  P('hat', [-18, -200, 36, 26], (g) => {
    ellipse(g, 0, -178, 17, 5); fill(g, rgba(0x2a2430), INK(), 1.3);
    rrect(g, -10, -200, 20, 24, [5, 5, 2, 2]); fill(g, hgrad(g, -10, 10, 0x3a3340, 0.2, -0.25), INK(), 1.3);
    g.fillStyle = rgba(PAL.blood, 0.9); g.fillRect(-10, -184, 20, 4);
  }, { pivot: [0, -176] }),
);

// ----------------------------------------------------------------- cellar ----

const WINE = [0x2f6a4a, 0x8a5a2a, 0x6a2a3a, 0x2f6a4a, 0x3a5a2a, 0x6a2a3a];
/** One horizontal bottle in a rack cubby: body + shoulder + neck + cork + label. */
function bottle(g: Ctx2D, x: number, y: number, c: number): void {
  g.beginPath();
  g.moveTo(x, y - 10); g.lineTo(x + 52, y - 10); g.quadraticCurveTo(x + 66, y - 10, x + 68, y - 4);
  g.lineTo(x + 84, y - 4); g.lineTo(x + 84, y + 4); g.lineTo(x + 68, y + 4);
  g.quadraticCurveTo(x + 66, y + 10, x + 52, y + 10); g.lineTo(x, y + 10); g.quadraticCurveTo(x - 4, y, x, y - 10); g.closePath();
  fill(g, vgrad(g, y - 10, y + 10, c, 0.35, -0.3), INK(), 1.2);
  rrect(g, x + 84, y - 5, 5, 10, 1.5); fill(g, hex2(0xc9a26a), INK(0.8), 1);
  g.fillStyle = rgba(PAL.cream, 0.9); g.fillRect(x + 22, y - 8, 20, 16);
  g.fillStyle = rgba(PAL.blood, 0.7); g.fillRect(x + 25, y - 3, 14, 2);
  g.fillStyle = rgba(0xffffff, 0.35); g.fillRect(x + 6, y - 8, 14, 2);
}

def('wineRack',
  P('body', [-70, -176, 140, 176], (g) => {
    shadowBase(g, 66);
    wood(g, -70, -176, 140, 176, 4, PAL.woodDark, 111, true);
    g.fillStyle = rgba(PAL.ink, 0.85); g.fillRect(-62, -168, 124, 160);
    // shelf boards + diagonal lattice
    for (const y of [-130, -90, -50, -10]) wood(g, -64, y, 128, 5, 1.5, PAL.wood, 112 + Math.abs(y));
    g.strokeStyle = rgba(PAL.wood, 0.9); g.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 28 - 14, -168); g.lineTo(i * 28 + 14, -8); g.stroke(); }
    wood(g, -72, -182 + 6, 144, 10, 3, PAL.wood, 118);
    wood(g, -72, -8, 144, 8, 2, PAL.woodDark, 119);
    // the cubby that bottleA leaves behind stays dark
  }),
  P('bottles', [-62, -168, 124, 156], (g) => {
    const rows = [-140, -100, -60, -20];
    rows.forEach((y, ri) => {
      for (let col = 0; col < 2; col++) {
        if (ri === 1 && col === 0) continue; // bottleA's slot
        bottle(g, -58 + col * 4, y - 8, WINE[(ri * 2 + col) % WINE.length]);
      }
    });
  }),
  P('bottleA', [-62, -118, 96, 24], (g) => bottle(g, -58, -108, 0x6a2a3a), { depth: 1 }),
);

// ----------------------------------------------------------------- boiler ----

def('furnace',
  P('body', [-115, -180, 230, 180], (g) => {
    shadowBase(g, 112);
    // pipes
    for (const [x, w] of [[-100, 8], [-86, 6], [90, 7]] as [number, number][]) {
      bar(g, x, -176, x, -90, w, 0x8a8f99);
      for (const y of [-170, -130, -100]) { rrect(g, x - w, y, w * 2, 5, 2); fill(g, hex2(0x6a707c), INK(0.8), 1); }
    }
    bar(g, -100, -176, -40, -176, 7, 0x8a8f99);
    // boiler tank (dome)
    g.beginPath(); g.moveTo(-76, -90); g.lineTo(-76, -140); g.quadraticCurveTo(-76, -172, 0, -172); g.quadraticCurveTo(76, -172, 76, -140); g.lineTo(76, -90); g.closePath();
    fill(g, hgrad(g, -76, 76, 0x5a606c, 0.3, -0.35), INK(), 1.8);
    g.strokeStyle = rgba(0xffffff, 0.15); g.lineWidth = 3;
    g.beginPath(); g.moveTo(-60, -150); g.quadraticCurveTo(-60, -164, -30, -166); g.stroke();
    for (const y of [-130, -108]) {
      g.strokeStyle = INK(0.7); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-76, y); g.lineTo(76, y); g.stroke();
      for (let x = -68; x < 76; x += 17) bead(g, x, y, 1.8, 0x8a8f99);
    }
    // stack
    wood(g, 40, -180, 26, 12, 2, 0x3a3f4a, 5);
    // brick firebox
    const r = rng(113);
    slab(g, -108, -92, 216, 92, 4, PAL.brick);
    clipped(g, () => g.rect(-108, -92, 216, 92), () => {
      for (let y = -90; y < 0; y += 12) for (let x = -108 - (Math.floor(y / 12) & 1) * 10; x < 108; x += 20) {
        g.strokeStyle = INK(0.45); g.lineWidth = 1; g.strokeRect(x, y, 20, 12);
        g.fillStyle = rgba(r() < 0.5 ? 0xffffff : 0x000000, 0.04 + r() * 0.06); g.fillRect(x + 1, y + 1, 18, 10);
      }
    });
    // door opening
    g.fillStyle = rgba(0x0d0810, 0.97); g.fillRect(-38, -88, 76, 70);
    g.strokeStyle = INK(); g.lineWidth = 2; g.strokeRect(-38, -88, 76, 70);
    // ash drawer + feet
    rrect(g, -30, -14, 60, 10, 2); fill(g, hex2(0x3a3f4a), INK(), 1);
    for (const x of [-104, 88]) { g.fillStyle = INK(); g.fillRect(x, -3, 16, 3); }
  }),
  P('fire1', [-34, -84, 68, 62], (g) => furnaceFire(g, 1)),
  P('fire2', [-34, -84, 68, 62], (g) => furnaceFire(g, 2), { extra: true }),
  P('fire3', [-34, -84, 68, 62], (g) => furnaceFire(g, 3), { extra: true }),
  P('fire4', [-34, -84, 68, 62], (g) => furnaceFire(g, 4), { extra: true }),
  P('door', [-42, -92, 84, 78], (g) => {
    rrect(g, -40, -90, 80, 74, 5);
    fill(g, vgrad(g, -90, -16, 0x3a3f4a, 0.25, -0.3), INK(), 1.8);
    g.fillStyle = INK(0.9);
    for (let i = 0; i < 4; i++) g.fillRect(-26, -76 + i * 8, 52, 3.5);
    bead(g, -30, -52, 2.6, 0x8a8f99); bead(g, 30, -52, 2.6, 0x8a8f99);
    bar(g, 32, -62, 32, -38, 3.6, PAL.brass);
  }, { pivot: [-40, -53] }),
  P('glowDoor', [-48, -100, 96, 90], (g) => {
    softGlow(g, 0, -52, 52, 0xff7a30, 0.55);
    g.fillStyle = rgba(0xffa04a, 0.9);
    for (let i = 0; i < 4; i++) g.fillRect(-26, -76 + i * 8, 52, 3.5);
  }, { alpha: 0.6 }),
  P('gauge', [48, -156, 40, 40], (g) => {
    ellipse(g, 68, -136, 17, 17); fill(g, hex2(PAL.brass), INK(), 1.5);
    ellipse(g, 68, -136, 13, 13); fill(g, hex2(PAL.cream), INK(0.7), 1);
    g.strokeStyle = INK(0.7); g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const a = -2.4 + i * 0.64;
      g.beginPath(); g.moveTo(68 + Math.cos(a) * 9, -136 + Math.sin(a) * 9); g.lineTo(68 + Math.cos(a) * 12, -136 + Math.sin(a) * 12); g.stroke();
    }
    g.strokeStyle = rgba(PAL.blood, 0.95); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(68, -136); g.lineTo(76, -144); g.stroke();
    bead(g, 68, -136, 2, 0x3a3f4a);
  }),
);
function furnaceFire(g: Ctx2D, f: number): void {
  const T: [number, number, number, number][][] = [
    [[-18, 24, 40, -2], [2, 30, 54, 2], [20, 22, 36, -3]],
    [[-20, 26, 34, 3], [0, 32, 48, -3], [18, 24, 42, 2]],
    [[-16, 22, 44, -2], [4, 30, 58, 3], [22, 20, 32, -2]],
    [[-20, 24, 38, 3], [-2, 32, 50, -2], [20, 24, 44, 3]],
  ];
  softGlow(g, 0, -28, 38, 0xff7a30, 0.55);
  for (const [x, w, h, lean] of T[f - 1]) flame(g, x, -22, w * 0.8, h, lean);
}
