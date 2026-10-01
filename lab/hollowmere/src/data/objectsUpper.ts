import type { ActionDef, Fx, ObjectDef, SfxId } from '../types';
import { partsFor } from '../art/objectArt';

// attic, nursery, bathroom, bedroom, upperHall — parts via partsFor(id) from ../art/objectArt
// Calibration (DESIGN.md): tier1 .10–.16 / noise .2–.6 / cd 3; tier2 .25–.38 / .5–1.0 / cd 6; tier3 .55–.80 / 1.0–1.6 / cd 10.

const sfx = (at: number, id: SfxId, vol?: number, rate?: number): Fx => ({ k: 'sfx', at, id, vol, rate });
/** n repeats of a generator, `step` ms apart, starting at `from`. */
const rep = (n: number, from: number, step: number, f: (at: number, i: number) => Fx[]): Fx[] =>
  Array.from({ length: n }, (_, i) => f(from + i * step, i)).flat();
/** Show a part briefly, then fade it back out. */
const flash = (part: string, at: number, alpha: number, dur: number, hold: number): Fx => ({ k: 'show', at, part, alpha, dur, hold });

const act = (a: ActionDef): ActionDef => a;
const T1 = { tier: 1 as const, cooldown: 3 };
const T2 = { tier: 2 as const, cooldown: 6 };
const T3 = { tier: 3 as const, cooldown: 10 };

// ================================================================ ATTIC ====

const CHAIR = 'body,rockers,shawl';
const rockingChair: ObjectDef = {
  id: 'rockingChair', name: 'Rocking Chair', w: 96, h: 118, parts: partsFor('rockingChair'),
  actions: [
    act({ ...T1, name: 'Rocks by itself', scare: 0.12, noise: 0.3, duration: 3000, tags: ['audible', 'visual'], fx: [
      sfx(0, 'rock_creak', 0.7),
      ...rep(3, 0, 900, (at) => [{ k: 'rotate', at, deg: 5, dur: 900, yoyo: true, part: CHAIR }, sfx(at + 450, 'rock_creak', 0.5)]),
      { k: 'wobble', at: 200, dur: 2200, deg: 3, freq: 2, part: 'shawl' },
    ] }),
    act({ ...T2, name: 'Hums a lullaby', scare: 0.3, noise: 0.8, duration: 4400, tags: ['audible', 'visual', 'light'], fx: [
      sfx(0, 'music_box', 0.8),
      { k: 'aura', at: 0, color: 0x9b7bff, dur: 3600, strength: 0.6 },
      { k: 'light', at: 500, mode: 'flicker', dur: 1800 },
      ...rep(4, 0, 1000, (at) => [{ k: 'rotate', at, deg: at % 2000 ? -7 : 7, dur: 1000, yoyo: true, part: CHAIR }]),
      { k: 'particles', at: 300, kind: 'notes', count: 7, dy: -70, spread: 50, speed: 40, color: 0xcdb8ff },
      { k: 'particles', at: 1800, kind: 'notes', count: 6, dy: -80, spread: 60, speed: 40, color: 0xcdb8ff },
      { k: 'wobble', at: 0, dur: 3800, deg: 4, freq: 1.8, part: 'shawl' },
    ] }),
    act({ ...T3, name: 'Violent rocking', scare: 0.66, noise: 1.3, duration: 3800, tags: ['audible', 'visual', 'loud'],
      emits: [{ at: 1800, scare: 0.3, noise: 1.0 }], fx: [
      { k: 'aura', at: 0, color: 0xff6a4a, dur: 3000, strength: 0.8 },
      ...rep(7, 0, 420, (at, i) => [{ k: 'rotate', at, deg: i % 2 ? -15 : 15, dur: 420, yoyo: true, part: CHAIR }, sfx(at, 'rock_creak', 0.9, 1.1 + i * 0.03)]),
      { k: 'hop', at: 200, h: 10, count: 5, dur: 420 },
      { k: 'shake', at: 0, dur: 3000, amp: 2.4, freq: 22 },
      sfx(300, 'moan', 0.7), sfx(2800, 'slam', 0.9),
      { k: 'shakeCam', at: 400, amp: 2.5, dur: 1800 },
      { k: 'particles', at: 0, kind: 'dust', count: 16, dy: 30, spread: 90 },
      { k: 'particles', at: 2800, kind: 'dust', count: 14, dy: 40, spread: 100 },
      { k: 'wobble', at: 0, dur: 3200, deg: 12, freq: 6, part: 'shawl' },
    ] }),
  ],
};

const dressForm: ObjectDef = {
  id: 'dressForm', name: 'Dress Form', w: 80, h: 165, parts: partsFor('dressForm'),
  actions: [
    act({ ...T1, name: 'Slowly turns', scare: 0.11, noise: 0.25, duration: 3000, tags: ['visual'], fx: [
      sfx(0, 'creak_soft', 0.6),
      { k: 'scaleX', at: 0, to: 0.55, dur: 2400, yoyo: true, part: 'body,tape' },
      { k: 'scaleX', at: 0, to: 0.8, dur: 2400, yoyo: true, part: 'skirt' },
      { k: 'rotate', at: 300, deg: 3, dur: 1800, yoyo: true, part: 'stand' },
      { k: 'wobble', at: 600, dur: 1800, deg: 5, freq: 2.5, part: 'tape' },
    ] }),
    act({ ...T2, name: 'Gown billows', scare: 0.3, noise: 0.6, duration: 3600, tags: ['visual', 'audible'], fx: [
      sfx(0, 'wind_whoosh', 0.7), sfx(500, 'cloth_flutter', 0.8),
      { k: 'wobble', at: 0, dur: 3200, deg: 4.5, freq: 2.6, part: 'skirt' },
      ...rep(2, 0, 1600, (at) => [{ k: 'scaleX', at, to: 1.2, dur: 1600, yoyo: true, part: 'skirt' }]),
      { k: 'wobble', at: 0, dur: 3000, deg: 9, freq: 3.2, part: 'tape' },
      { k: 'float', at: 400, dur: 2600, h: 8, part: 'skirt' },
      { k: 'particles', at: 300, kind: 'dust', count: 10, dy: -20, spread: 70 },
      { k: 'light', at: 600, mode: 'flicker', dur: 1600 },
    ] }),
    act({ ...T3, name: 'Ghost waltz', scare: 0.62, noise: 1.2, duration: 5000, tags: ['visual', 'audible', 'light'],
      emits: [{ at: 2400, scare: 0.3, noise: 1.0 }], fx: [
      { k: 'aura', at: 0, color: 0x9fe8ff, dur: 4400, strength: 0.7 },
      sfx(0, 'music_box', 0.9, 0.9), sfx(400, 'piano_soft', 0.7), sfx(2000, 'moan', 0.5),
      { k: 'move', at: 0, dx: 70, dy: 0, dur: 1500, yoyo: true },
      { k: 'move', at: 1500, dx: -70, dy: 0, dur: 1500, yoyo: true },
      { k: 'move', at: 3000, dx: 40, dy: 0, dur: 1400, yoyo: true },
      { k: 'hop', at: 0, h: 14, count: 6, dur: 700 },
      { k: 'scaleX', at: 0, to: 0.6, dur: 1500, yoyo: true, part: 'body,tape' },
      { k: 'scaleX', at: 1500, to: 0.6, dur: 1500, yoyo: true, part: 'body,tape' },
      { k: 'wobble', at: 0, dur: 4400, deg: 10, freq: 3.4, part: 'skirt' },
      { k: 'apparition', at: 700, kind: 'figure', dx: -25, dy: -70, dur: 3200, toward: 'up' },
      { k: 'light', at: 600, mode: 'flicker', dur: 3000 },
      { k: 'particles', at: 800, kind: 'wisp', count: 12, dy: -60, spread: 90, color: 0xcdf6ff },
    ] }),
  ],
};

const oldTrunk: ObjectDef = {
  id: 'oldTrunk', name: 'Old Trunk', w: 128, h: 80, parts: partsFor('oldTrunk'),
  actions: [
    act({ ...T1, name: 'Lid creaks open', scare: 0.13, noise: 0.35, duration: 2400, tags: ['audible', 'visual'], fx: [
      sfx(0, 'creak_loud', 0.7),
      { k: 'rotate', at: 0, deg: 20, dur: 2000, yoyo: true, part: 'lid' },
      flash('glow', 300, 0.55, 400, 700),
      { k: 'particles', at: 500, kind: 'dust', count: 6, dy: -30, spread: 40 },
    ] }),
    act({ ...T2, name: 'Lid snaps and rattles', scare: 0.33, noise: 0.9, duration: 3200, tags: ['audible', 'loud'], fx: [
      { k: 'rotate', at: 0, deg: 38, dur: 700, yoyo: true, part: 'lid' },
      sfx(0, 'creak_soft', 0.7), sfx(650, 'slam', 0.9),
      sfx(800, 'rattle', 0.8), sfx(1500, 'rattle', 0.6),
      { k: 'shake', at: 800, dur: 1800, amp: 2.6, freq: 16, part: 'body' },
      { k: 'shake', at: 800, dur: 1800, amp: 3.2, freq: 19, part: 'lid' },
      flash('glow', 100, 0.75, 400, 2200),
      { k: 'particles', at: 700, kind: 'dust', count: 14, dy: -20, spread: 80 },
      { k: 'shakeCam', at: 650, amp: 1.6, dur: 300 },
    ] }),
    act({ ...T3, name: 'Trunk bites', scare: 0.7, noise: 1.4, duration: 4000, tags: ['audible', 'visual', 'loud'],
      emits: [{ at: 1500, scare: 0.35, noise: 1.1 }], fx: [
      { k: 'aura', at: 0, color: 0x8ff5d2, dur: 3200, strength: 0.9 },
      { k: 'rotate', at: 0, deg: 62, dur: 1000, yoyo: true, part: 'lid' },
      { k: 'rotate', at: 1500, deg: 56, dur: 800, yoyo: true, part: 'lid' },
      flash('glow', 100, 0.95, 500, 2600),
      { k: 'apparition', at: 300, kind: 'hands', dy: -55, dur: 1800, toward: 'viewer' },
      { k: 'lunge', at: 500, dist: 45, dur: 600, part: 'body' },
      { k: 'lunge', at: 1650, dist: 55, dur: 600, part: 'body' },
      sfx(0, 'growl', 0.9), sfx(950, 'slam', 1), sfx(1600, 'wood_knock', 0.9), sfx(2300, 'slam', 1),
      { k: 'shakeCam', at: 950, amp: 3, dur: 500 }, { k: 'shakeCam', at: 2300, amp: 3.5, dur: 600 },
      { k: 'particles', at: 950, kind: 'ecto', count: 14, dy: -50, spread: 90 },
      { k: 'light', at: 800, mode: 'flicker', dur: 2200 },
    ] }),
  ],
};

// =============================================================== NURSERY ====

const HORSE = 'horse,mane,rockers,eyes';
const rockingHorse: ObjectDef = {
  id: 'rockingHorse', name: 'Rocking Horse', w: 124, h: 112, parts: partsFor('rockingHorse'),
  actions: [
    act({ ...T1, name: 'Eyes glow, nods', scare: 0.12, noise: 0.3, duration: 2800, tags: ['visual', 'audible'], fx: [
      flash('eyes', 0, 0.95, 350, 1500),
      ...rep(3, 500, 650, (at) => [{ k: 'rotate', at, deg: 5, dur: 650, yoyo: true, part: 'horse,mane,eyes' }]),
      sfx(400, 'rock_creak', 0.6), sfx(1700, 'horse_neigh', 0.35),
    ] }),
    act({ ...T2, name: 'Gallops in place', scare: 0.3, noise: 0.85, duration: 3400, tags: ['audible', 'visual'], fx: [
      flash('eyes', 0, 0.95, 300, 2400),
      ...rep(6, 0, 450, (at, i) => [{ k: 'rotate', at, deg: i % 2 ? -10 : 10, dur: 450, yoyo: true, part: HORSE }, sfx(at, 'rock_creak', 0.8, 1.2)]),
      { k: 'wobble', at: 0, dur: 2800, deg: 9, freq: 7, part: 'mane' },
      { k: 'hop', at: 0, h: 6, count: 6, dur: 450 },
      sfx(1300, 'horse_neigh', 0.8), sfx(2000, 'thump', 0.6),
      { k: 'particles', at: 0, kind: 'dust', count: 10, dy: 30, spread: 90 },
    ] }),
    act({ ...T3, name: 'Charges!', scare: 0.64, noise: 1.3, duration: 4000, tags: ['audible', 'visual', 'loud'],
      emits: [{ at: 900, scare: 0.35, noise: 1.2 }], fx: [
      { k: 'aura', at: 0, color: 0xff8a3a, dur: 3000, strength: 0.8 },
      flash('eyes', 0, 1, 300, 3000),
      ...rep(3, 0, 300, (at, i) => [{ k: 'rotate', at, deg: i % 2 ? -12 : 12, dur: 300, yoyo: true, part: HORSE }]),
      { k: 'move', at: 700, dx: 50, dy: 0, dur: 1600, yoyo: true, ease: 'Quad.In' },
      { k: 'lunge', at: 800, dist: 70, dur: 900, part: 'horse,mane' },
      { k: 'hop', at: 700, h: 8, count: 4, dur: 400 },
      sfx(0, 'horse_neigh', 1), sfx(850, 'thump', 1), sfx(900, 'bang', 0.8), sfx(1500, 'horse_neigh', 0.8, 0.9),
      { k: 'shakeCam', at: 850, amp: 3.5, dur: 500 },
      { k: 'particles', at: 850, kind: 'dust', count: 18, dy: 25, spread: 100 },
      { k: 'throw', at: 850, tex: 'prop:toy', count: 3, dx: 30, dy: -20, power: 0.8 },
    ] }),
  ],
};

const jackInTheBox: ObjectDef = {
  id: 'jackInTheBox', name: 'Jack-in-the-Box', w: 64, h: 86, parts: partsFor('jackInTheBox'),
  actions: [
    act({ ...T1, name: 'Crank turns itself', scare: 0.12, noise: 0.4, duration: 3000, tags: ['audible'], fx: [
      sfx(0, 'music_box', 0.7),
      { k: 'spin', at: 0, turns: 2, dur: 2600, part: 'crank' },
      { k: 'particles', at: 300, kind: 'notes', count: 5, dy: -50, spread: 30, speed: 30, color: 0xf0d37a },
    ] }),
    act({ ...T2, name: 'Lid trembles', scare: 0.28, noise: 0.7, duration: 3000, tags: ['audible', 'visual'], fx: [
      sfx(0, 'music_box', 0.8), sfx(1100, 'rattle', 0.8),
      { k: 'spin', at: 0, turns: 3, dur: 2000, part: 'crank' },
      { k: 'wobble', at: 900, dur: 1800, deg: 7, freq: 14, part: 'lid' },
      { k: 'shake', at: 900, dur: 1800, amp: 1.8, freq: 18, part: 'box' },
      { k: 'hop', at: 1800, h: 3, count: 2, dur: 200 },
      { k: 'light', at: 1400, mode: 'flicker', dur: 1200 },
    ] }),
    act({ ...T3, name: 'Pop!', scare: 0.72, noise: 1.5, duration: 3400, tags: ['audible', 'visual', 'loud'],
      emits: [{ at: 1300, scare: 0.4, noise: 1.5 }], fx: [
      sfx(0, 'music_box', 0.9),
      { k: 'spin', at: 0, turns: 2, dur: 1400, part: 'crank' },
      { k: 'shake', at: 900, dur: 400, amp: 2, freq: 24, part: 'box' },
      { k: 'rotate', at: 1250, deg: -110, dur: 1700, yoyo: true, part: 'lid' },
      flash('popper', 1300, 1, 160, 1500),
      { k: 'squash', at: 1300, amt: -0.8, dur: 700, part: 'popper' },
      { k: 'wobble', at: 1500, dur: 1400, deg: 12, freq: 5, part: 'popper' },
      sfx(1300, 'jack_pop', 1), sfx(1420, 'boing', 0.9), sfx(2000, 'giggle', 0.8),
      { k: 'shakeCam', at: 1300, amp: 3.5, dur: 450 },
      { k: 'flash', at: 1300, color: 0xffffff, dur: 120, alpha: 0.45 },
      { k: 'particles', at: 1300, kind: 'stars', count: 12, dy: -50, spread: 70, speed: 80 },
    ] }),
  ],
};

const porcelainDoll: ObjectDef = {
  id: 'porcelainDoll', name: 'Porcelain Doll', w: 44, h: 70, parts: partsFor('porcelainDoll'),
  actions: [
    act({ ...T1, name: 'Head turns slowly', scare: 0.13, noise: 0.2, duration: 2800, tags: ['visual'], fx: [
      sfx(0, 'creak_soft', 0.5), sfx(1100, 'giggle', 0.25),
      { k: 'rotate', at: 0, deg: 30, dur: 2400, yoyo: true, part: 'head,eyes' },
    ] }),
    act({ ...T2, name: 'Eyes follow you', scare: 0.28, noise: 0.5, duration: 3400, tags: ['visual', 'light'], fx: [
      flash('eyes', 0, 0.95, 300, 2400),
      { k: 'lookAtNpc', at: 300, dur: 2600, part: 'head,eyes' },
      sfx(400, 'whisper', 0.6),
      { k: 'light', at: 1000, mode: 'flicker', dur: 1000 },
      { k: 'shake', at: 1400, dur: 600, amp: 0.8, freq: 22, part: 'head' },
    ] }),
    act({ ...T3, name: 'Laughs, topples', scare: 0.6, noise: 1.2, duration: 4000, tags: ['audible', 'visual', 'loud'],
      emits: [{ at: 2500, scare: 0.3, noise: 1.0 }], fx: [
      flash('eyes', 0, 1, 300, 3000),
      flash('crack', 600, 0.9, 200, 2600),
      sfx(0, 'doll_laugh', 1), sfx(2500, 'thump', 0.9), sfx(2500, 'glass_crack', 0.8),
      { k: 'shake', at: 0, dur: 1600, amp: 1.8, freq: 20, part: 'head,eyes' },
      { k: 'rotate', at: 900, deg: 40, dur: 500, yoyo: true, part: 'head,eyes' },
      { k: 'apparition', at: 300, kind: 'child', dy: -45, dur: 1800, toward: 'viewer' },
      { k: 'rotate', at: 1600, deg: 80, dur: 2200, yoyo: true },
      { k: 'shakeCam', at: 2500, amp: 2, dur: 350 },
      { k: 'particles', at: 2500, kind: 'glass', count: 8, dy: -20, spread: 50 },
    ] }),
  ],
};

// ============================================================== BATHROOM ====

const mirror: ObjectDef = {
  id: 'mirror', name: 'Standing Mirror', w: 100, h: 150, parts: partsFor('mirror'),
  actions: [
    act({ ...T1, name: 'Wrong reflection', scare: 0.13, noise: 0.3, duration: 3000, tags: ['visual'], fx: [
      sfx(0, 'glass_shimmer', 0.6),
      flash('reflection', 200, 0.85, 500, 1600),
      { k: 'light', at: 500, mode: 'flicker', dur: 900 },
    ] }),
    act({ ...T2, name: 'Figure in the glass', scare: 0.34, noise: 0.6, duration: 3600, tags: ['visual', 'dark'], fx: [
      sfx(0, 'glass_shimmer', 0.8), sfx(500, 'whisper', 0.7),
      flash('reflection', 0, 0.95, 400, 2600),
      flash('apparition', 600, 0.85, 700, 1400),
      { k: 'dark', at: 300, amount: 0.25, dur: 2600 },
      { k: 'aura', at: 0, color: 0x9fe8ff, dur: 3000, strength: 0.6 },
    ] }),
    act({ ...T3, name: 'Apparition bursts out', scare: 0.74, noise: 1.5, duration: 3800, tags: ['visual', 'dark', 'loud'],
      emits: [{ at: 1200, scare: 0.4, noise: 1.5 }], fx: [
      flash('reflection', 0, 1, 300, 3000),
      flash('apparition', 300, 1, 600, 2400),
      flash('crack', 1200, 0.95, 100, 2200),
      { k: 'lunge', at: 1000, dist: 60, dur: 700, part: 'apparition' },
      { k: 'apparition', at: 1200, kind: 'figure', dy: 0, dur: 2200, toward: 'viewer' },
      sfx(0, 'glass_shimmer', 0.9), sfx(1200, 'glass_crack', 1), sfx(1350, 'glass_shatter', 1), sfx(1300, 'wail', 0.9),
      { k: 'shakeCam', at: 1200, amp: 4, dur: 600 },
      { k: 'flash', at: 1200, color: 0xe9fbff, dur: 140, alpha: 0.6 },
      { k: 'particles', at: 1250, kind: 'glass', count: 22, spread: 100, speed: 120 },
      { k: 'light', at: 1300, mode: 'off', dur: 1800 },
      { k: 'dark', at: 1300, amount: 0.55, dur: 2400 },
    ] }),
  ],
};

const dripCycle = (at: number): Fx[] => [flash('drip', at, 0.9, 220, 0), { k: 'move', at, dx: 0, dy: 36, dur: 440, part: 'drip' }];
const bathtub: ObjectDef = {
  id: 'bathtub', name: 'Clawfoot Tub', w: 216, h: 100, parts: partsFor('bathtub'), hide: 'behind',
  idle: [...dripCycle(0)], idleLoopMs: 2800,
  actions: [
    act({ ...T1, name: 'Faucet drips', scare: 0.1, noise: 0.25, duration: 2800, tags: ['audible'], fx: [
      { k: 'wobble', at: 0, dur: 700, deg: 4, freq: 6, part: 'faucet' },
      ...[0, 800, 1600].flatMap(dripCycle),
      sfx(400, 'water_drip', 0.8), sfx(1200, 'water_drip', 0.8), sfx(2000, 'water_drip', 0.8),
    ] }),
    act({ ...T2, name: 'Tub fills itself', scare: 0.27, noise: 0.7, duration: 4200, tags: ['audible', 'visual'], fx: [
      sfx(0, 'water_gurgle', 0.9), sfx(2500, 'water_splash', 0.7),
      { k: 'shake', at: 0, dur: 3200, amp: 1.2, freq: 18, part: 'faucet' },
      { k: 'particles', at: 0, kind: 'water', count: 16, dx: -90, dy: -60, spread: 20, speed: 50 },
      flash('foam', 800, 0.85, 1200, 1800),
      flash('puddle', 1800, 0.8, 800, 1400),
      { k: 'particles', at: 1200, kind: 'bubbles', count: 9, dy: -70, spread: 90 },
      { k: 'squash', at: 2500, amt: 0.15, dur: 400, part: 'foam' },
    ] }),
    act({ ...T3, name: 'Something surfaces', scare: 0.66, noise: 1.3, duration: 4400, tags: ['audible', 'visual', 'dark', 'loud'],
      emits: [{ at: 900, scare: 0.4, noise: 1.3 }], fx: [
      flash('foam', 0, 0.9, 700, 2800),
      flash('hand', 900, 1, 500, 2200),
      { k: 'move', at: 900, dx: 0, dy: -14, dur: 900, ease: 'Quad.Out', part: 'hand' },
      { k: 'wobble', at: 1600, dur: 1400, deg: 8, freq: 4, part: 'hand' },
      flash('puddle', 1400, 0.9, 700, 1800),
      { k: 'apparition', at: 1100, kind: 'hands', dx: 40, dy: -70, dur: 1800, toward: 'npc' },
      sfx(0, 'water_gurgle', 0.8), sfx(800, 'water_splash', 1), sfx(1100, 'moan', 0.8),
      { k: 'particles', at: 900, kind: 'water', count: 22, dx: 40, dy: -70, spread: 60, speed: 100 },
      { k: 'shakeCam', at: 900, amp: 2.5, dur: 450 },
      { k: 'light', at: 600, mode: 'flicker', dur: 2000 },
      { k: 'dark', at: 800, amount: 0.3, dur: 2600 },
    ] }),
  ],
};

// ============================================================== BEDROOM ====

const bed: ObjectDef = {
  id: 'bed', name: 'Four-Poster Bed', w: 230, h: 140, parts: partsFor('bed'), hide: 'under',
  actions: [
    act({ ...T1, name: 'Covers twitch', scare: 0.12, noise: 0.3, duration: 2600, tags: ['visual'], fx: [
      sfx(0, 'cloth_flutter', 0.6), sfx(700, 'creak_soft', 0.5),
      ...rep(2, 0, 800, (at) => [{ k: 'move', at, dx: 0, dy: -7, dur: 600, yoyo: true, part: 'quilt' }]),
      { k: 'wobble', at: 0, dur: 1600, deg: 2.2, freq: 7, part: 'quilt' },
      { k: 'wobble', at: 300, dur: 1200, deg: 4, freq: 5, part: 'pillow' },
      { k: 'particles', at: 300, kind: 'dust', count: 5, dy: -80, spread: 60 },
    ] }),
    act({ ...T2, name: 'Bed bounces', scare: 0.32, noise: 0.9, duration: 3400, tags: ['audible', 'visual'], fx: [
      { k: 'hop', at: 0, h: 16, count: 4, dur: 440 },
      ...rep(4, 0, 440, (at) => [sfx(at, 'bed_bounce', 0.85)]),
      { k: 'squash', at: 200, amt: 0.3, dur: 500, part: 'quilt' },
      { k: 'hop', at: 100, h: 10, count: 4, dur: 440, part: 'pillow' },
      { k: 'shakeCam', at: 0, amp: 1.5, dur: 1800 },
      { k: 'particles', at: 500, kind: 'feathers', count: 9, dy: -100, spread: 90, speed: 50 },
      { k: 'particles', at: 0, kind: 'dust', count: 10, dy: 10, spread: 110 },
      sfx(1900, 'thump', 0.8),
    ] }),
    act({ ...T3, name: 'Bed rises and shakes', scare: 0.7, noise: 1.5, duration: 4400, tags: ['audible', 'visual', 'dark', 'loud'],
      emits: [{ at: 3400, scare: 0.35, noise: 1.4 }], fx: [
      { k: 'aura', at: 0, color: 0xff6a4a, dur: 3600, strength: 0.8 },
      flash('eyes', 0, 0.95, 500, 3200),
      { k: 'float', at: 600, dur: 3000, h: 40 },
      { k: 'shake', at: 900, dur: 2200, amp: 3, freq: 20 },
      { k: 'wobble', at: 600, dur: 2800, deg: 6, freq: 4, part: 'quilt' },
      sfx(0, 'growl', 0.9), sfx(600, 'bed_bounce', 1), sfx(900, 'wardrobe_rattle', 0.9), sfx(3500, 'bang', 1),
      { k: 'shakeCam', at: 900, amp: 3, dur: 2200 },
      { k: 'light', at: 400, mode: 'flicker', dur: 2400 },
      { k: 'dark', at: 500, amount: 0.4, dur: 3200 },
      { k: 'particles', at: 1000, kind: 'feathers', count: 14, dy: -90, spread: 120, speed: 60 },
      { k: 'particles', at: 3400, kind: 'dust', count: 18, dy: 10, spread: 120 },
    ] }),
  ],
};

const bedLamp: ObjectDef = {
  id: 'bedLamp', name: 'Bedside Lamp', w: 40, h: 62, parts: partsFor('bedLamp'),
  idle: [{ k: 'show', at: 0, part: 'glow', alpha: 0.64, dur: 1500, hold: 0 }], idleLoopMs: 3000,
  actions: [
    act({ ...T1, name: 'Light flickers', scare: 0.11, noise: 0.2, duration: 2200, tags: ['visual', 'light'], fx: [
      sfx(0, 'lamp_buzz', 0.6),
      { k: 'light', at: 0, mode: 'flicker', dur: 1600 },
      ...[0, 380, 760, 1100].map((at) => flash('glow', at, 0.08, 90, 60)),
    ] }),
    act({ ...T2, name: 'Lamp stares you down', scare: 0.28, noise: 0.5, duration: 3200, tags: ['visual', 'light'], fx: [
      sfx(200, 'lamp_buzz', 0.8),
      flash('glow', 0, 1, 400, 1800),
      { k: 'lookAtNpc', at: 200, dur: 2400, part: 'shade' },
      { k: 'aura', at: 0, color: 0xffcf8a, dur: 2800, strength: 0.7 },
      { k: 'light', at: 600, mode: 'surge', dur: 1500 },
      { k: 'wobble', at: 1500, dur: 1200, deg: 3, freq: 8, part: 'shade' },
    ] }),
    act({ ...T3, name: 'Pop and darkness', scare: 0.58, noise: 1.0, duration: 3400, tags: ['audible', 'dark', 'loud'],
      emits: [{ at: 800, scare: 0.35, noise: 1.1 }], fx: [
      flash('glow', 0, 1, 500, 300),
      { k: 'light', at: 0, mode: 'surge', dur: 700 },
      { k: 'shake', at: 300, dur: 500, amp: 1.5, freq: 28, part: 'shade' },
      sfx(0, 'lamp_buzz', 1, 1.3), sfx(800, 'lamp_pop', 1),
      { k: 'flash', at: 800, color: 0xffe9b0, dur: 160, alpha: 0.7 },
      { k: 'particles', at: 800, kind: 'glass', count: 8, dy: -40, spread: 50 },
      { k: 'particles', at: 800, kind: 'spark', count: 12, dy: -40, spread: 70, speed: 100 },
      { k: 'show', at: 800, part: 'glow', alpha: 0, dur: 300, hold: 1900 },
      { k: 'light', at: 850, mode: 'off', dur: 2400 },
      { k: 'dark', at: 850, amount: 0.7, dur: 2600 },
      { k: 'squash', at: 800, amt: 0.2, dur: 300, part: 'shade' },
    ] }),
  ],
};

const CURT_IDLE: Fx[] = [
  { k: 'rotate', at: 0, deg: 1.6, dur: 2200, yoyo: true, part: 'left' },
  { k: 'rotate', at: 2200, deg: 1.6, dur: 2200, yoyo: true, part: 'left' },
  { k: 'rotate', at: 1100, deg: -1.4, dur: 2200, yoyo: true, part: 'right' },
  { k: 'rotate', at: 3300, deg: -1.4, dur: 1100, yoyo: true, part: 'right' },
  { k: 'rotate', at: 0, deg: 1, dur: 2200, yoyo: true, part: 'sheer' },
  { k: 'rotate', at: 2200, deg: -1, dur: 2200, yoyo: true, part: 'sheer' },
];
const curtains: ObjectDef = {
  id: 'curtains', name: 'Velvet Curtains', w: 150, h: 200, parts: partsFor('curtains'),
  idle: CURT_IDLE, idleLoopMs: 4400,
  actions: [
    act({ ...T1, name: 'Curtains billow', scare: 0.12, noise: 0.3, duration: 3000, tags: ['visual', 'audible'], fx: [
      sfx(0, 'cloth_flutter', 0.7), sfx(200, 'wind_whoosh', 0.45),
      ...rep(2, 0, 1300, (at) => [
        { k: 'rotate', at, deg: 6, dur: 1300, yoyo: true, part: 'left' } as Fx,
        { k: 'rotate', at: at + 250, deg: -6, dur: 1300, yoyo: true, part: 'right' } as Fx,
      ]),
      { k: 'wobble', at: 0, dur: 2600, deg: 3.5, freq: 3, part: 'sheer' },
      { k: 'particles', at: 400, kind: 'dust', count: 6, dy: 40, spread: 80 },
    ] }),
    act({ ...T2, name: 'Curtains close', scare: 0.3, noise: 0.6, duration: 3800, tags: ['visual', 'audible', 'dark'], fx: [
      sfx(0, 'cloth_flutter', 0.9), sfx(150, 'wind_whoosh', 0.6),
      { k: 'scaleX', at: 0, to: 1.3, dur: 3200, yoyo: true, part: 'left' },
      { k: 'scaleX', at: 100, to: 1.3, dur: 3200, yoyo: true, part: 'right' },
      { k: 'dark', at: 600, amount: 0.3, dur: 2400 },
      { k: 'wobble', at: 300, dur: 2400, deg: 2, freq: 4, part: 'rod' },
    ] }),
    act({ ...T3, name: 'Figure behind curtain', scare: 0.62, noise: 1.1, duration: 4600, tags: ['visual', 'dark', 'audible'],
      emits: [{ at: 2200, scare: 0.35, noise: 1.0 }], fx: [
      { k: 'scaleX', at: 0, to: 1.3, dur: 4200, yoyo: true, part: 'left' },
      { k: 'scaleX', at: 100, to: 1.3, dur: 4200, yoyo: true, part: 'right' },
      flash('shadow', 900, 0.9, 500, 2200),
      { k: 'move', at: 1000, dx: 28, dy: 0, dur: 1800, part: 'shadow' },
      { k: 'lunge', at: 2200, dist: 55, dur: 700, part: 'shadow' },
      { k: 'wobble', at: 1200, dur: 2400, deg: 6, freq: 4, part: 'sheer' },
      { k: 'apparition', at: 2300, kind: 'shadow', dy: -10, dur: 1500, toward: 'viewer' },
      sfx(0, 'wind_whoosh', 0.7), sfx(800, 'whisper', 0.8), sfx(2200, 'thump', 0.9),
      { k: 'light', at: 500, mode: 'flicker', dur: 2200 },
      { k: 'dark', at: 400, amount: 0.45, dur: 3400 },
    ] }),
  ],
};

const DOORS = 'doorL,doorR';
const wardrobe: ObjectDef = {
  id: 'wardrobe', name: 'Wardrobe', w: 150, h: 236, parts: partsFor('wardrobe'), hide: 'inside',
  actions: [
    act({ ...T1, name: 'Doors creak ajar', scare: 0.13, noise: 0.35, duration: 3000, tags: ['audible', 'visual'], fx: [
      sfx(0, 'creak_loud', 0.7),
      { k: 'scaleX', at: 0, to: 0.55, dur: 2600, yoyo: true, part: 'doorL' },
      { k: 'scaleX', at: 200, to: 0.7, dur: 2200, yoyo: true, part: 'doorR' },
      flash('eyes', 700, 0.7, 400, 900),
    ] }),
    act({ ...T2, name: 'Rattles and bangs', scare: 0.34, noise: 1.0, duration: 3400, tags: ['audible', 'loud'], fx: [
      sfx(0, 'wardrobe_rattle', 0.9),
      { k: 'shake', at: 0, dur: 2400, amp: 2.6, freq: 18 },
      { k: 'shake', at: 0, dur: 2400, amp: 2, freq: 22, part: DOORS },
      ...rep(3, 500, 600, (at) => [
        { k: 'scaleX', at, to: 0.72, dur: 260, yoyo: true, part: 'doorL' } as Fx,
        { k: 'scaleX', at: at + 300, to: 0.78, dur: 260, yoyo: true, part: 'doorR' } as Fx,
        sfx(at, 'bang', 0.8),
      ]),
      { k: 'particles', at: 600, kind: 'dust', count: 12, dy: -20, spread: 100 },
      { k: 'shakeCam', at: 500, amp: 1.8, dur: 1800 },
    ] }),
    act({ ...T3, name: 'Flings open, wails', scare: 0.78, noise: 1.6, duration: 4600, tags: ['audible', 'visual', 'dark', 'loud'],
      emits: [{ at: 300, scare: 0.4, noise: 1.6 }], fx: [
      { k: 'scaleX', at: 0, to: 0.08, dur: 3800, yoyo: true, part: DOORS },
      flash('eyes', 300, 1, 500, 2600),
      { k: 'lunge', at: 700, dist: 60, dur: 800, part: 'eyes' },
      { k: 'apparition', at: 500, kind: 'face', dy: -60, dur: 2400, toward: 'viewer' },
      sfx(0, 'slam', 1), sfx(0, 'bang', 0.9), sfx(300, 'wail', 1), sfx(1600, 'wardrobe_rattle', 0.8),
      { k: 'shakeCam', at: 0, amp: 4, dur: 700 },
      { k: 'flash', at: 0, color: 0xff5a4a, dur: 200, alpha: 0.25 },
      { k: 'throw', at: 400, tex: 'prop:sock', count: 4, dy: -40, power: 1 },
      { k: 'particles', at: 0, kind: 'dust', count: 20, dy: -20, spread: 160 },
      { k: 'light', at: 300, mode: 'flicker', dur: 2400 },
      { k: 'dark', at: 400, amount: 0.5, dur: 3200 },
    ] }),
  ],
};

// ============================================================= UPPER HALL ====

const suitOfArmor: ObjectDef = {
  id: 'suitOfArmor', name: 'Suit of Armor', w: 80, h: 190, parts: partsFor('suitOfArmor'),
  actions: [
    act({ ...T1, name: 'Helm turns', scare: 0.13, noise: 0.35, duration: 2800, tags: ['visual', 'audible'], fx: [
      sfx(100, 'metal_clank', 0.55), sfx(900, 'creak_soft', 0.5),
      { k: 'rotate', at: 0, deg: 22, dur: 2200, yoyo: true, part: 'helm,helmLit' },
      flash('helmLit', 300, 1, 300, 1300),
    ] }),
    act({ ...T2, name: 'Raises sword', scare: 0.33, noise: 0.8, duration: 3200, tags: ['visual', 'audible'], fx: [
      flash('helmLit', 0, 1, 300, 2000),
      { k: 'rotate', at: 200, deg: -140, dur: 2600, yoyo: true, part: 'arm' },
      { k: 'rotate', at: 400, deg: -8, dur: 2000, yoyo: true, part: 'helm,helmLit' },
      sfx(0, 'metal_clank', 0.8), sfx(1000, 'sword_swing', 0.6), sfx(2400, 'metal_clank', 0.9),
      { k: 'shake', at: 0, dur: 600, amp: 1.2, freq: 20, part: 'body' },
      { k: 'particles', at: 1200, kind: 'spark', count: 7, dx: 25, dy: -120, spread: 40, speed: 70 },
    ] }),
    act({ ...T3, name: 'Marches and swings', scare: 0.72, noise: 1.4, duration: 4400, tags: ['visual', 'audible', 'loud'],
      emits: [{ at: 1400, scare: 0.4, noise: 1.3 }], fx: [
      { k: 'aura', at: 0, color: 0x9fe8ff, dur: 3600, strength: 0.8 },
      flash('helmLit', 0, 1, 300, 3600),
      { k: 'move', at: 0, dx: -80, dy: 0, dur: 3000, yoyo: true },
      { k: 'hop', at: 0, h: 5, count: 8, dur: 360 },
      { k: 'rotate', at: 700, deg: -165, dur: 1100, yoyo: true, part: 'arm' },
      { k: 'rotate', at: 2100, deg: -110, dur: 500, yoyo: true, part: 'arm' },
      { k: 'lunge', at: 1400, dist: 50, dur: 500 },
      ...rep(8, 0, 360, (at) => [sfx(at, 'armor_march', 0.7)]),
      sfx(1300, 'sword_swing', 1), sfx(2250, 'sword_swing', 1), sfx(3000, 'metal_clank', 1),
      { k: 'shakeCam', at: 1400, amp: 2.5, dur: 400 },
      { k: 'particles', at: 2300, kind: 'spark', count: 14, dx: -50, dy: -60, spread: 70, speed: 100 },
    ] }),
  ],
};

const portrait: ObjectDef = {
  id: 'portrait', name: 'Ancestor Portrait', w: 112, h: 146, parts: partsFor('portrait'),
  idle: [{ k: 'show', at: 0, part: 'eyes', alpha: 0.8, dur: 2600, hold: 0 }], idleLoopMs: 5200,
  actions: [
    act({ ...T1, name: 'Eyes follow you', scare: 0.12, noise: 0.2, duration: 3000, tags: ['visual'], fx: [
      flash('eyes', 0, 1, 300, 1900),
      { k: 'lookAtNpc', at: 300, dur: 2200, part: 'eyes' },
      sfx(0, 'creak_soft', 0.45),
    ] }),
    act({ ...T2, name: 'Portrait grins', scare: 0.3, noise: 0.5, duration: 3600, tags: ['visual', 'light'], fx: [
      flash('eyes', 0, 1, 300, 2600),
      flash('grin', 600, 1, 400, 1800),
      sfx(500, 'sting_low', 0.7), sfx(900, 'ghost_laugh', 0.55),
      { k: 'wobble', at: 400, dur: 1800, deg: 2, freq: 5 },
      { k: 'light', at: 500, mode: 'flicker', dur: 1300 },
    ] }),
    act({ ...T3, name: 'Steps out of the frame', scare: 0.74, noise: 1.4, duration: 4600, tags: ['visual', 'dark', 'loud'],
      emits: [{ at: 1200, scare: 0.42, noise: 1.3 }], fx: [
      flash('void', 400, 1, 400, 2800),
      flash('eyes', 400, 1, 300, 2800),
      flash('grin', 500, 1, 300, 2400),
      { k: 'apparition', at: 1200, kind: 'figure', dy: 30, dur: 2600, toward: 'viewer' },
      { k: 'wobble', at: 1100, dur: 1000, deg: 4, freq: 6 },
      sfx(300, 'sting_high', 0.8), sfx(1000, 'ghost_laugh', 0.8), sfx(1200, 'moan', 0.9), sfx(1300, 'thump', 0.8),
      { k: 'shakeCam', at: 1200, amp: 3, dur: 500 },
      { k: 'dark', at: 800, amount: 0.5, dur: 3000 },
      { k: 'light', at: 900, mode: 'flicker', dur: 2400 },
      { k: 'particles', at: 1200, kind: 'ecto', count: 14, spread: 90, speed: 70 },
    ] }),
  ],
};

export const UPPER_OBJECTS: ObjectDef[] = [
  rockingChair, dressForm, oldTrunk,
  rockingHorse, jackInTheBox, porcelainDoll,
  mirror, bathtub,
  bed, bedLamp, curtains, wardrobe,
  suitOfArmor, portrait,
];
