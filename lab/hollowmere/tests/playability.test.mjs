import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

// ARM-20261027-1921-PKUP. Raul 2026-10-27: "scaring people is too hard without the
// harder 2 symbols" (tiers 2-3 were locked behind intensity) and "when emerged in an
// object make sure the pop up menu does not cover anything". Executes the real
// TypeScript with a stubbed Phaser; GPU/feel proof is the browser play-test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require(process.env.HOLLOWMERE_TYPESCRIPT || '../node_modules/typescript');
const phaser = { Scene: class {}, BlendModes: { ADD: 1 }, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } };
const sandbox = { window: { innerWidth: 1280, innerHeight: 800 }, performance };
const cache = new Map();
function mod(rel) {
  const file = path.join(root, 'src', rel);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const req = (id) => (id === 'phaser' ? phaser : mod(path.relative(path.join(root, 'src'), path.resolve(path.dirname(file), id + '.ts'))));
  vm.runInNewContext(source, { module, exports: module.exports, require: req, console, Math, ...sandbox }, { filename: file });
  return module.exports;
}

test('every haunt (tiers 1-3) is usable at intensity level 0, and recharges faster as the house wakes', () => {
  const { HauntableObject } = mod('entities/HauntableObject.ts');
  const { OBJECTS } = mod('data/objects.ts');
  const { HauntingIntensitySystem } = mod('systems/HauntingIntensitySystem.ts');
  assert.ok(OBJECTS.length >= 15, `only ${OBJECTS.length} objects`);
  for (const def of OBJECTS) {
    assert.equal(def.actions.length, 3, `${def.id} has ${def.actions.length} actions`);
    for (let i = 0; i < 3; i++) {
      const fake = { def, ctx: { intensity: { level: 0 } } };
      assert.equal(HauntableObject.prototype.unlocked.call(fake, i), true, `${def.id} action ${i + 1} is locked at level 0`);
    }
  }
  const desc = Object.getOwnPropertyDescriptor(HauntingIntensitySystem.prototype, 'cooldownMult');
  assert.ok(desc?.get, 'intensity has no cooldownMult');
  const m = [0, 1, 2, 3].map((level) => desc.get.call({ level }));
  assert.equal(m[0], 1);
  for (let i = 1; i < 4; i++) assert.ok(m[i] < m[i - 1], `cooldownMult not decreasing: ${m}`);
});

test('possession card never covers the possessed object, steps around people, and fades back only when boxed in', () => {
  const { HUD, PANEL_W } = mod('ui/HUD.ts');
  assert.equal(typeof HUD.prototype.placePanel, 'function', 'HUD has no placePanel');
  const P = HUD.prototype;
  const rect = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, centerX: l + w / 2, centerY: t + h / 2 });
  const person = (x, y) => ({ x, y, fled: false, hidingIn: null, def: { height: 150 } });
  const hud = (obj, npcs) => ({
    view: { cx: 640, cy: 400, zoom: 1, w: 1280, h: 800, dpr: 1 },
    panelH: 120, panelKey: '', ctx: { npcs, objects: [obj] }, sx: P.sx, sy: P.sy,
  });
  const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const card = (p) => ({ l: p.x, t: p.y, r: p.x + PANEL_W, b: p.y + 120 });
  const objBox = (o) => ({ l: o.bounds.left, t: o.bounds.top, r: o.bounds.right, b: o.bounds.bottom });
  const personBox = (n) => ({ l: n.x - 37, t: n.y - 150, r: n.x + 37, b: n.y });
  const inView = (p) => p.x >= 0 && p.y >= 0 && p.x + PANEL_W <= 1280 && p.y + 120 <= 800;

  const piano = { id: 'piano', bounds: rect(600, 300, 160, 120) };
  // empty room: beside the object, never on it
  let h = hud(piano, []);
  let p = P.placePanel.call(h, piano);
  assert.equal(ov(card(p), objBox(piano)), 0, 'card covers the possessed object');
  assert.ok(inView(p) && !p.covers);
  // a person to the right: the card moves off them
  const right = person(850, 420);
  h = hud(piano, [right]);
  p = P.placePanel.call(h, piano);
  assert.equal(ov(card(p), personBox(right)), 0, `card covers the person on the right (${JSON.stringify(p)})`);
  assert.equal(ov(card(p), objBox(piano)), 0);
  // sticky: same scene twice -> same spot (no flicker)
  const again = P.placePanel.call(h, piano);
  assert.deepEqual([again.x, again.y], [p.x, p.y]);
  // people on both sides: above or below, covering nobody
  const left = person(450, 420);
  h = hud(piano, [right, left]);
  p = P.placePanel.call(h, piano);
  assert.ok(p.side === 'above' || p.side === 'below', `side ${p.side}`);
  for (const n of [right, left]) assert.equal(ov(card(p), personBox(n)), 0, 'card covers a person');
  assert.equal(ov(card(p), objBox(piano)), 0);
  // object at the right screen edge: card stays on screen and off the object
  const clock = { id: 'clock', bounds: rect(1150, 300, 120, 120) };
  h = hud(clock, []);
  p = P.placePanel.call(h, clock);
  assert.ok(inView(p), `card off screen ${JSON.stringify(p)}`);
  assert.equal(ov(card(p), objBox(clock)), 0, 'card covers the edge object');
  // boxed in by people on every side: it may overlap them, but says so (fades back)
  h = hud(piano, [right, left, person(680, 290), person(680, 560), person(820, 300), person(520, 300)]);
  p = P.placePanel.call(h, piano);
  assert.equal(ov(card(p), objBox(piano)), 0);
  assert.equal(p.covers, true, 'boxed-in card does not report covering');
});
