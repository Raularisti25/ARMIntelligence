// Object art for Hollowmere's 29 hauntables + thrown props, painted procedurally.
// Specs + helpers live in objectKit.ts; the per-object drawings are registered
// (via def(...)) at import time by objects/artUpper.ts and objects/artLower.ts,
// so importing this module guarantees partsFor(id) sees every object.

import Phaser from 'phaser';
import './objects/artUpper';
import './objects/artLower';
import { SPECS, HL, ADDITIVE_PART, INK, bar, slab, texKey } from './objectKit';
import { canvasTex, ellipse, fill, lin, rad, rgba, rrect } from './paint';
import { ART } from '../config';

export { texKey, ADDITIVE_PART, partsFor, highlightOf } from './objectKit';

const PAD = 2;

function paintProps(scene: Phaser.Scene): void {
  // each prop painted in a 40×40 box centered on 0,0
  const prop = (name: string, draw: (g: CanvasRenderingContext2D) => void): void => {
    canvasTex(scene, `prop:${name}`, 40, 40, (g) => { g.translate(20, 20); draw(g); });
  };
  prop('book', (g) => {
    g.save(); g.rotate(-0.25);
    slab(g, -13, -9, 26, 18, 2, 0x8a2f3a);
    g.fillStyle = rgba(0xf1e3c6, 1); g.fillRect(-11, -7, 22, 14);
    g.strokeStyle = INK(0.5); g.lineWidth = 0.7;
    for (let y = -4; y <= 4; y += 4) { g.beginPath(); g.moveTo(-9, y); g.lineTo(9, y); g.stroke(); }
    slab(g, -13, -9, 5, 18, 2, 0x6e2230, { h: true });
    g.restore();
  });
  prop('plate', (g) => {
    ellipse(g, 0, 0, 15, 15); fill(g, rad(g, -4, -5, 0, 18, [[0, 0xffffff], [1, 0xcfd6e6]]), INK(), 1.3);
    ellipse(g, 0, 0, 9, 9); fill(g, rgba(0x6f8fd0, 0.6), undefined);
    ellipse(g, 0, 0, 7, 7); fill(g, rad(g, -2, -2, 0, 8, [[0, 0xffffff], [1, 0xe6ebf5]]));
  });
  prop('cup', (g) => {
    g.strokeStyle = INK(); g.lineWidth = 4.4; g.beginPath(); g.arc(11, 0, 5, -1.3, 1.3); g.stroke();
    g.strokeStyle = hexc(0xf1e3c6); g.lineWidth = 2.2; g.beginPath(); g.arc(11, 0, 5, -1.3, 1.3); g.stroke();
    rrect(g, -11, -9, 22, 18, [2, 2, 9, 9]); fill(g, lin(g, -11, 0, 11, 0, [[0, 0xfffaf0], [1, 0xd9c9a6]]), INK(), 1.3);
    g.fillStyle = rgba(0x6f8fd0, 0.8); g.fillRect(-9, -3, 18, 3);
    ellipse(g, 0, -9, 11, 2.6); fill(g, rgba(0x5a3420, 0.9), INK(), 1);
  });
  prop('spoon', (g) => {
    g.save(); g.rotate(-0.7);
    bar(g, -2, 0, 2, 16, 3, 0xd8dce6);
    ellipse(g, 0, -8, 5, 8); fill(g, lin(g, -5, 0, 5, 0, [[0, 0xffffff], [1, 0xaeb4c4]]), INK(), 1.2);
    g.restore();
  });
  prop('bottle', (g) => {
    g.save(); g.rotate(0.35);
    rrect(g, -7, -2, 14, 18, 4); fill(g, lin(g, -7, 0, 7, 0, [[0, 0x6fd08a], [1, 0x2b7a49]]), INK(), 1.3);
    rrect(g, -3, -13, 6, 12, 2); fill(g, lin(g, -3, 0, 3, 0, [[0, 0x6fd08a], [1, 0x2b7a49]]), INK(), 1.2);
    g.fillStyle = hexc(0xf1e3c6); g.fillRect(-6, 4, 12, 7);
    g.fillStyle = rgba(0xffffff, 0.45); g.fillRect(-5, -1, 2, 14);
    g.restore();
  });
  prop('paper', (g) => {
    g.save(); g.rotate(0.2);
    rrect(g, -11, -14, 22, 28, 1.5); fill(g, lin(g, -11, -14, 11, 14, [[0, 0xfffaf0], [1, 0xe4d6b4]]), INK(0.8), 1.1);
    g.strokeStyle = INK(0.4); g.lineWidth = 0.8;
    for (let y = -8; y <= 8; y += 4) { g.beginPath(); g.moveTo(-7, y); g.lineTo(y % 8 ? 5 : 7, y); g.stroke(); }
    g.restore();
  });
  prop('coal', (g) => {
    g.beginPath(); g.moveTo(-10, 4); g.lineTo(-7, -7); g.lineTo(2, -10); g.lineTo(10, -3); g.lineTo(8, 8); g.lineTo(-3, 10); g.closePath();
    fill(g, lin(g, -10, -10, 10, 10, [[0, 0x4a4656], [1, 0x14111c]]), INK(), 1.3);
    g.fillStyle = rgba(0xffffff, 0.2); g.fillRect(-4, -6, 5, 2);
    g.fillStyle = rgba(0xff8a3a, 0.8); g.fillRect(3, 3, 3, 2);
  });
  prop('sock', (g) => {
    g.beginPath(); g.moveTo(-6, -13); g.lineTo(6, -13); g.lineTo(6, 3); g.bezierCurveTo(6, 8, 14, 8, 14, 13);
    g.bezierCurveTo(14, 17, -3, 17, -6, 10); g.closePath();
    fill(g, lin(g, -6, 0, 14, 0, [[0, 0xe8a0b0], [1, 0xc77d8a]]), INK(), 1.3);
    g.fillStyle = hexc(0xf1e3c6); g.fillRect(-6, -13, 12, 5);
    g.fillStyle = rgba(0xf1e3c6, 0.9); g.fillRect(-6, -2, 12, 2.4);
  });
  prop('toy', (g) => {
    // little wooden block with a star
    g.save(); g.rotate(-0.2);
    slab(g, -11, -11, 22, 22, 3, 0xe0a24a);
    g.fillStyle = hexc(0xf1e3c6); g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('★', 0, 1);
    g.restore();
  });
}
const hexc = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Paint every registered object part, the `obj:<id>:hl` union silhouettes, 'obj:aura' and 'prop:*'. */
export function paintObjectTextures(scene: Phaser.Scene): void {
  for (const [id, specs] of SPECS) {
    for (const s of specs) {
      const [l, t, w, h] = s.box;
      canvasTex(scene, texKey(id, s.name), w, h, (g) => { g.translate(-l, -t); s.draw(g); });
    }
    // union silhouette of the solid (non-additive, non-hidden, non-extra) parts
    const solid = specs.filter((s) => !s.extra && !ADDITIVE_PART.test(s.name) && s.alpha !== 0);
    if (!solid.length) continue;
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    for (const s of solid) {
      const [l, t, w, h] = s.box;
      L = Math.min(L, l); T = Math.min(T, t); R = Math.max(R, l + w); B = Math.max(B, t + h);
    }
    L -= PAD; T -= PAD; R += PAD; B += PAD;
    const key = `obj:${id}:hl`;
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, Math.ceil((R - L) * ART), Math.ceil((B - T) * ART));
      if (tex) {
        const g = tex.getContext();
        for (const s of solid) {
          const src = scene.textures.get(texKey(id, s.name)).getSourceImage() as CanvasImageSource;
          const [l, t, w, h] = s.box;
          g.drawImage(src, (l - L) * ART, (t - T) * ART, w * ART, h * ART);
        }
        tex.refresh();
      }
    }
    HL.set(id, { key, l: L, t: T });
  }
  // soft aura (128px)
  canvasTex(scene, 'obj:aura', 128 / ART, 128 / ART, (g) => {
    const c = 64 / ART;
    g.fillStyle = rad(g, c, c, 0, c, [[0, 0xffffff, 0.9], [0.5, 0xffffff, 0.35], [1, 0xffffff, 0]]);
    g.fillRect(0, 0, c * 2, c * 2);
  });
  paintProps(scene);
}
