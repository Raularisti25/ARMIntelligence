import type { ActionDef, Fx, ObjectDef, SfxId } from '../types';
import { partsFor } from '../art/objectArt';

// study, kitchen, dining, parlor, foyer, cellar, boiler — parts via partsFor(id) from ../art/objectArt.
// Calibration (DESIGN.md): tier1 .10–.16 / noise .2–.6 / cd 3; tier2 .25–.38 / .5–1.0 / cd 6; tier3 .55–.80 / 1.0–1.6 / cd 10.
// Fx particle/throw/apparition dx,dy are relative to the BOUNDS CENTER (floor items: centre = (0,-h/2)).

type Tags = NonNullable<ActionDef['tags']>;
const act = (
  name: string, tier: 1 | 2 | 3, scare: number, noise: number, duration: number, fx: Fx[],
  tags: Tags, emits?: ActionDef['emits'],
): ActionDef => ({
  name, tier, scare, noise, cooldown: tier === 1 ? 3 : tier === 2 ? 6 : 10, duration, fx, tags, ...(emits ? { emits } : {}),
});
const sfx = (at: number, id: SfxId, vol?: number, rate?: number): Fx => ({ k: 'sfx', at, id, vol, rate });
/** Repeat an sfx n times every `gap` ms. */
const sfxRun = (at: number, id: SfxId, n: number, gap: number, vol?: number): Fx[] =>
  Array.from({ length: n }, (_, i) => sfx(at + i * gap, id, vol));

// ----------------------------------------------------------------- study ----

const desk: ObjectDef = {
  id: 'desk', name: 'Writing Desk', w: 190, h: 140, parts: partsFor('desk'),
  actions: [
    act('Typewriter clatters', 1, 0.12, 0.45, 2200, [
      sfx(0, 'typewriter'),
      { k: 'shake', at: 0, dur: 2000, amp: 0.9, freq: 30, part: 'typewriter' },
      ...[0, 380, 760, 1140, 1520].map((at): Fx => ({ k: 'move', at, dx: 9, dy: 0, dur: 360, yoyo: true, part: 'carriage' })),
      { k: 'shake', at: 0, dur: 2000, amp: 0.7, freq: 24, part: 'paper' },
      { k: 'particles', at: 300, kind: 'paper', count: 2, dx: -30, dy: -45, spread: 30 },
    ], ['audible']),
    act('Drawers slam open', 2, 0.3, 0.85, 1500, [
      sfx(0, 'slam'),
      { k: 'move', at: 0, dx: 26, dy: 0, dur: 1000, ease: 'Back.easeOut', yoyo: true, part: 'drawer1' },
      { k: 'move', at: 220, dx: 26, dy: 0, dur: 1000, ease: 'Back.easeOut', yoyo: true, part: 'drawer2' },
      { k: 'shake', at: 0, dur: 260, amp: 2, freq: 28 },
      { k: 'particles', at: 80, kind: 'dust', count: 8, dx: 60, dy: 25, spread: 40 },
      sfx(1000, 'bang', 0.8),
    ], ['audible', 'loud'], [{ at: 1000, scare: 0.12, noise: 0.6 }]),
    act('Writes a warning', 3, 0.62, 1.05, 3800, [
      { k: 'aura', at: 0, color: 0xff6a4a, dur: 3400, strength: 1 },
      sfx(0, 'lamp_buzz'), sfx(120, 'typewriter'),
      { k: 'light', at: 0, mode: 'flicker', dur: 2800, room: true },
      { k: 'show', at: 0, part: 'glowLamp', alpha: 1, dur: 300, hold: 2800 },
      ...[0, 360, 720, 1080, 1440, 1800].map((at): Fx => ({ k: 'move', at, dx: 9, dy: 0, dur: 340, yoyo: true, part: 'carriage' })),
      { k: 'shake', at: 0, dur: 2200, amp: 1.2, freq: 30, part: 'typewriter' },
      { k: 'dark', at: 300, amount: 0.35, dur: 3000 },
      { k: 'show', at: 900, part: 'message', alpha: 1, dur: 600, hold: 2000 },
      { k: 'particles', at: 1000, kind: 'ecto', count: 10, dx: 0, dy: -50, spread: 70 },
      sfx(1700, 'whisper'), sfx(3000, 'sting_low', 0.7),
    ], ['visual', 'dark', 'audible'], [{ at: 1400, scare: 0.2, noise: 0.5 }]),
  ],
};

const stagHead: ObjectDef = {
  id: 'stagHead', name: 'Stag Trophy', w: 130, h: 150, parts: partsFor('stagHead'),
  actions: [
    act('Eyes glow', 1, 0.14, 0.25, 2200, [
      { k: 'aura', at: 0, color: 0xff5a3a, dur: 1800, strength: 0.8 },
      { k: 'show', at: 100, part: 'eyes', alpha: 1, dur: 400, hold: 1300 },
      { k: 'wobble', at: 300, dur: 900, deg: 1.6, freq: 3, part: 'head' },
      sfx(200, 'creak_soft'), sfx(600, 'growl', 0.35),
    ], ['visual']),
    act('Jaw drops, growls', 2, 0.32, 0.75, 2400, [
      { k: 'show', at: 0, part: 'eyes', alpha: 1, dur: 250, hold: 1700 },
      { k: 'rotate', at: 250, deg: 26, dur: 1200, yoyo: true, part: 'jaw' },
      { k: 'shake', at: 300, dur: 1100, amp: 1.4, freq: 26, part: 'head,jaw' },
      sfx(250, 'growl'),
      { k: 'particles', at: 400, kind: 'smoke', count: 6, dx: 0, dy: 40, spread: 20 },
    ], ['visual', 'audible'], [{ at: 300, scare: 0.1, noise: 0.7 }]),
    act('Roars and lunges', 3, 0.68, 1.3, 2600, [
      { k: 'show', at: 0, part: 'eyes', alpha: 1, dur: 150, hold: 1800 },
      { k: 'lunge', at: 150, dist: 70, dur: 900 },
      { k: 'rotate', at: 150, deg: 34, dur: 1000, yoyo: true, part: 'jaw' },
      { k: 'shakeCam', at: 200, amp: 3, dur: 500 },
      { k: 'flash', at: 150, color: 0xff3a2a, dur: 300, alpha: 0.18 },
      sfx(120, 'roar'), sfx(0, 'sting_low', 0.6),
      { k: 'particles', at: 250, kind: 'dust', count: 10, dx: 0, dy: 20, spread: 60 },
    ], ['visual', 'loud'], [{ at: 200, scare: 0.2, noise: 1.2 }]),
  ],
};

const bookshelf: ObjectDef = {
  id: 'bookshelf', name: 'Tall Bookshelf', w: 140, h: 240, parts: partsFor('bookshelf'),
  actions: [
    act('Books slide out', 1, 0.11, 0.3, 1800, [
      { k: 'move', at: 0, dx: 0, dy: -3, dur: 900, yoyo: true, part: 'b1' },
      { k: 'move', at: 200, dx: 12, dy: 0, dur: 1000, yoyo: true, part: 'b2' },
      { k: 'rotate', at: 400, deg: 10, dur: 1000, yoyo: true, part: 'b3' },
      sfx(0, 'wood_knock', 0.6), sfx(250, 'book_thud', 0.5),
    ], ['visual']),
    act('Books fly off', 2, 0.32, 0.85, 1800, [
      { k: 'shake', at: 0, dur: 500, amp: 1.6, freq: 24 },
      { k: 'throw', at: 150, tex: 'prop:book', count: 4, dx: -28, dy: -10, power: 1 },
      { k: 'particles', at: 150, kind: 'paper', count: 6, dx: -28, dy: -10, spread: 50 },
      sfx(0, 'rattle'), sfx(200, 'book_thud'), sfx(450, 'book_thud', 0.8), sfx(700, 'book_thud', 0.6),
    ], ['visual', 'audible'], [{ at: 450, scare: 0.1, noise: 0.6 }]),
    act('Topples toward you', 3, 0.7, 1.5, 3000, [
      { k: 'shake', at: 0, dur: 600, amp: 2.4, freq: 20 },
      { k: 'rotate', at: 300, deg: 6, dur: 1000, yoyo: true },
      { k: 'lunge', at: 500, dist: 80, dur: 1000 },
      { k: 'throw', at: 450, tex: 'prop:book', count: 8, dx: -10, dy: -40, power: 1.3 },
      { k: 'shakeCam', at: 1000, amp: 4, dur: 500 },
      { k: 'particles', at: 1000, kind: 'dust', count: 14, dx: 0, dy: 90, spread: 90 },
      sfx(0, 'wood_knock'), sfx(300, 'creak_loud'), sfx(1000, 'bang'), sfx(1050, 'book_thud'),
    ], ['visual', 'audible', 'loud'], [{ at: 1000, scare: 0.35, noise: 1.5 }]),
  ],
};

// --------------------------------------------------------------- kitchen ----

const stove: ObjectDef = {
  id: 'stove', name: 'Cast Iron Stove', w: 140, h: 150, parts: partsFor('stove'),
  actions: [
    act('Burners flare', 1, 0.12, 0.3, 1800, [
      { k: 'show', at: 0, part: 'flame', alpha: 1, dur: 250, hold: 1100 },
      sfx(0, 'fire_whoosh', 0.7),
      { k: 'particles', at: 100, kind: 'spark', count: 5, dx: 0, dy: -43, spread: 40 },
      { k: 'wobble', at: 200, dur: 900, deg: 2, freq: 6, part: 'lid' },
    ], ['visual']),
    act('Pots bang and boil', 2, 0.3, 0.95, 2400, [
      { k: 'show', at: 0, part: 'flame', alpha: 1, dur: 200, hold: 1800 },
      { k: 'shake', at: 0, dur: 2000, amp: 1.8, freq: 22, part: 'pots' },
      { k: 'hop', at: 100, h: 9, dur: 220, count: 7, part: 'lid' },
      { k: 'rotate', at: 100, deg: 10, dur: 220, yoyo: true, part: 'lid' },
      ...[0, 450, 900, 1350].map((at) => sfx(at, 'pot_bang', 0.8)),
      sfx(0, 'sizzle', 0.7),
      { k: 'particles', at: 200, kind: 'steam', count: 8, dx: -20, dy: -62, spread: 30 },
      { k: 'particles', at: 900, kind: 'steam', count: 8, dx: 30, dy: -62, spread: 30 },
    ], ['audible', 'visual'], [{ at: 900, scare: 0.1, noise: 0.8 }]),
    act('Oven bursts open', 3, 0.62, 1.25, 2800, [
      { k: 'squash', at: 100, amt: 0.95, dur: 1600, part: 'ovenDoor' },
      { k: 'show', at: 100, part: 'glowOven', alpha: 1, dur: 200, hold: 1900 },
      { k: 'show', at: 100, part: 'flame', alpha: 1, dur: 200, hold: 1900 },
      { k: 'shake', at: 100, dur: 400, amp: 2, freq: 28 },
      { k: 'flash', at: 120, color: 0xff8a3a, dur: 300, alpha: 0.22 },
      { k: 'shakeCam', at: 120, amp: 2.5, dur: 400 },
      { k: 'particles', at: 150, kind: 'smoke', count: 12, dx: 0, dy: -50, spread: 60 },
      { k: 'particles', at: 150, kind: 'embers', count: 12, dx: 0, dy: -20, spread: 70 },
      { k: 'throw', at: 200, tex: 'prop:plate', count: 2, dx: 0, dy: -20, power: 1 },
      sfx(100, 'slam'), sfx(120, 'fire_whoosh'), sfx(900, 'pot_bang', 0.8),
    ], ['visual', 'loud', 'light'], [{ at: 120, scare: 0.2, noise: 1.2 }]),
  ],
};

const refrigerator: ObjectDef = {
  id: 'refrigerator', name: 'Old Icebox', w: 84, h: 178, parts: partsFor('refrigerator'),
  actions: [
    act('Hums, light flickers', 1, 0.1, 0.25, 2000, [
      sfx(0, 'fridge_hum'),
      { k: 'show', at: 0, part: 'glow', alpha: 0.9, dur: 150, hold: 200 },
      { k: 'show', at: 700, part: 'glow', alpha: 0.9, dur: 120, hold: 120 },
      { k: 'show', at: 1200, part: 'glow', alpha: 0.9, dur: 100, hold: 400 },
      { k: 'shake', at: 0, dur: 1800, amp: 0.8, freq: 40 },
      { k: 'light', at: 0, mode: 'flicker', dur: 1400, room: true },
    ], ['audible', 'light']),
    act('Door swings open', 2, 0.28, 0.6, 2600, [
      sfx(0, 'creak_loud', 0.7), sfx(200, 'fridge_open'),
      { k: 'scaleX', at: 100, to: 0.12, dur: 2200, yoyo: true, part: 'door' },
      { k: 'show', at: 200, part: 'glow', alpha: 1, dur: 250, hold: 1600 },
      { k: 'particles', at: 400, kind: 'steam', count: 8, dx: 0, dy: -50, spread: 30 },
      { k: 'wobble', at: 150, dur: 600, deg: 1.2, freq: 5, part: 'freezer' },
    ], ['visual', 'audible']),
    act('Shudders and spews', 3, 0.6, 1.2, 3200, [
      { k: 'shake', at: 0, dur: 1500, amp: 3.6, freq: 24 },
      { k: 'show', at: 100, part: 'eyes', alpha: 1, dur: 200, hold: 2200 },
      { k: 'scaleX', at: 600, to: 0.1, dur: 1800, yoyo: true, part: 'door' },
      { k: 'scaleX', at: 700, to: 0.1, dur: 1500, yoyo: true, part: 'freezer' },
      { k: 'show', at: 600, part: 'glow', alpha: 1, dur: 200, hold: 1800 },
      { k: 'throw', at: 800, tex: 'prop:bottle', count: 3, dx: 0, dy: -40, power: 1.1 },
      { k: 'throw', at: 900, tex: 'prop:cup', count: 3, dx: 0, dy: -50, power: 0.9 },
      { k: 'particles', at: 700, kind: 'ecto', count: 10, dx: 0, dy: -40, spread: 50 },
      { k: 'particles', at: 700, kind: 'bubbles', count: 8, dx: 0, dy: -20, spread: 40 },
      { k: 'light', at: 0, mode: 'flicker', dur: 1800, room: true },
      sfx(0, 'rattle'), sfx(0, 'fridge_hum'), sfx(600, 'door_slam'), sfx(800, 'growl', 0.8),
    ], ['visual', 'audible', 'loud'], [{ at: 800, scare: 0.2, noise: 1.2 }]),
  ],
};

// ---------------------------------------------------------------- dining ----

const chandelier: ObjectDef = {
  id: 'chandelier', name: 'Crystal Chandelier', w: 210, h: 190, parts: partsFor('chandelier'),
  idle: [
    { k: 'wobble', at: 0, dur: 4000, deg: 0.8, freq: 0.5 },
    { k: 'wobble', at: 0, dur: 4000, deg: 3, freq: 1, part: 'crys1' },
    { k: 'wobble', at: 0, dur: 4000, deg: 2.4, freq: 0.75, part: 'crys2' },
    { k: 'wobble', at: 0, dur: 4000, deg: 3, freq: 1.25, part: 'crys3' },
  ],
  idleLoopMs: 4000,
  actions: [
    act('Crystals chime', 1, 0.12, 0.4, 2000, [
      { k: 'wobble', at: 0, dur: 1600, deg: 14, freq: 6, part: 'crys1' },
      { k: 'wobble', at: 200, dur: 1600, deg: 12, freq: 5, part: 'crys2' },
      { k: 'wobble', at: 400, dur: 1500, deg: 14, freq: 7, part: 'crys3' },
      sfx(0, 'crystal_tinkle'), sfx(500, 'crystal_tinkle', 0.8, 1.2),
      { k: 'particles', at: 100, kind: 'stars', count: 6, dx: 0, dy: 40, spread: 90 },
    ], ['audible', 'visual']),
    act('Swings, lights flicker', 2, 0.32, 0.85, 3000, [
      { k: 'wobble', at: 0, dur: 2800, deg: 9, freq: 0.9 },
      { k: 'wobble', at: 0, dur: 2800, deg: 6, freq: 5, part: 'flames' },
      { k: 'light', at: 100, mode: 'flicker', dur: 2400, room: true },
      sfx(0, 'chain_rattle'), sfx(300, 'crystal_tinkle'), sfx(1000, 'creak_soft'),
      { k: 'particles', at: 300, kind: 'dust', count: 6, dx: 0, dy: -60, spread: 60 },
    ], ['visual', 'audible', 'light']),
    act('Plummets and recoils', 3, 0.72, 1.5, 3000, [
      { k: 'move', at: 0, dx: 0, dy: 300, dur: 450, ease: 'Quad.easeIn' },
      { k: 'light', at: 450, mode: 'off', dur: 1600, room: true },
      { k: 'dark', at: 450, amount: 0.45, dur: 2200 },
      { k: 'shakeCam', at: 450, amp: 5, dur: 600 },
      { k: 'flash', at: 450, color: 0xffffff, dur: 160, alpha: 0.4 },
      { k: 'squash', at: 450, amt: 0.3, dur: 500 },
      { k: 'wobble', at: 450, dur: 1400, deg: 12, freq: 6, part: 'crys1,crys2,crys3' },
      { k: 'particles', at: 450, kind: 'glass', count: 18, dx: 0, dy: 330, spread: 110 },
      sfx(0, 'chain_rattle', 0.9), sfx(450, 'crystal_crash'), sfx(700, 'crystal_tinkle', 0.7),
    ], ['visual', 'audible', 'loud', 'dark'], [{ at: 450, scare: 0.35, noise: 1.5 }]),
  ],
};

const chinaCabinet: ObjectDef = {
  id: 'chinaCabinet', name: 'China Cabinet', w: 130, h: 210, parts: partsFor('chinaCabinet'),
  actions: [
    act('Plates rattle', 1, 0.12, 0.4, 1900, [
      { k: 'shake', at: 0, dur: 1700, amp: 1.5, freq: 34, part: 'china' },
      { k: 'shake', at: 0, dur: 1700, amp: 0.6, freq: 30, part: 'doorL,doorR' },
      sfx(0, 'rattle'), sfx(400, 'crystal_tinkle', 0.6),
    ], ['audible']),
    act('Plates fly out', 2, 0.33, 0.95, 2400, [
      { k: 'scaleX', at: 100, to: 0.1, dur: 1700, yoyo: true, part: 'doorL' },
      { k: 'scaleX', at: 150, to: 0.1, dur: 1700, yoyo: true, part: 'doorR' },
      { k: 'show', at: 500, part: 'crack', alpha: 1, dur: 150, hold: 1200 },
      { k: 'throw', at: 400, tex: 'prop:plate', count: 4, dx: 0, dy: -60, power: 1 },
      { k: 'throw', at: 600, tex: 'prop:cup', count: 2, dx: 0, dy: -50, power: 0.9 },
      { k: 'shake', at: 0, dur: 500, amp: 1.8, freq: 28 },
      sfx(0, 'rattle'), sfx(100, 'creak_loud', 0.7), sfx(500, 'glass_crack'), sfx(900, 'glass_shatter', 0.7),
    ], ['visual', 'audible'], [{ at: 900, scare: 0.12, noise: 0.8 }]),
    act('Tableware avalanche', 3, 0.74, 1.6, 3400, [
      { k: 'scaleX', at: 0, to: 0.05, dur: 2200, yoyo: true, part: 'doorL' },
      { k: 'scaleX', at: 0, to: 0.05, dur: 2200, yoyo: true, part: 'doorR' },
      { k: 'shake', at: 0, dur: 1600, amp: 3, freq: 24 },
      { k: 'show', at: 300, part: 'crack', alpha: 1, dur: 100, hold: 1600 },
      { k: 'throw', at: 200, tex: 'prop:plate', count: 6, dx: 0, dy: -70, power: 1.3 },
      { k: 'throw', at: 500, tex: 'prop:cup', count: 4, dx: 0, dy: -50, power: 1.1 },
      { k: 'throw', at: 800, tex: 'prop:spoon', count: 4, dx: 0, dy: -40, power: 1 },
      { k: 'particles', at: 400, kind: 'glass', count: 16, dx: 0, dy: -30, spread: 80 },
      { k: 'shakeCam', at: 450, amp: 5, dur: 700 },
      sfx(0, 'slam'), sfx(400, 'glass_shatter'), sfx(900, 'crystal_crash'), sfx(1300, 'glass_shatter', 0.7),
    ], ['visual', 'audible', 'loud'], [{ at: 450, scare: 0.25, noise: 1.5 }, { at: 1000, scare: 0.15, noise: 1.2 }]),
  ],
};

// ---------------------------------------------------------------- parlor ----

const KEYS = ['obj:piano:keys1', 'obj:piano:keys2', 'obj:piano:keys3'];
const piano: ObjectDef = {
  id: 'piano', name: 'Grand Piano', w: 184, h: 128, parts: partsFor('piano'),
  actions: [
    act('Keys play themselves', 1, 0.13, 0.45, 2200, [
      { k: 'frames', at: 0, part: 'keys', keys: KEYS, fps: 6, loops: 3 },
      sfx(0, 'piano_soft'),
      { k: 'particles', at: 200, kind: 'notes', count: 4, dx: 0, dy: -50, spread: 40 },
    ], ['audible', 'visual']),
    act('Frantic melody', 2, 0.32, 0.95, 2800, [
      { k: 'frames', at: 0, part: 'keys', keys: KEYS, fps: 12, loops: 7 },
      { k: 'wobble', at: 0, dur: 2400, deg: 2.4, freq: 3, part: 'lid' },
      { k: 'hop', at: 0, h: 5, dur: 300, count: 7, part: 'stool' },
      sfx(0, 'piano_melody'),
      { k: 'particles', at: 100, kind: 'notes', count: 10, dx: 0, dy: -50, spread: 70 },
      { k: 'shake', at: 0, dur: 2400, amp: 0.8, freq: 18 },
    ], ['audible', 'loud']),
    act('Piano comes alive', 3, 0.68, 1.5, 3600, [
      { k: 'aura', at: 0, color: 0x9b7bff, dur: 3200, strength: 1.2 },
      { k: 'rotate', at: 100, deg: 38, dur: 2800, yoyo: true, part: 'lid' },
      { k: 'frames', at: 0, part: 'keys', keys: KEYS, fps: 18, loops: 14 },
      { k: 'hop', at: 200, h: 14, dur: 320, count: 5 },
      { k: 'squash', at: 200, amt: 0.2, dur: 400 },
      { k: 'move', at: 300, dx: -14, dy: 0, dur: 1600, yoyo: true, part: 'stool' },
      { k: 'shakeCam', at: 200, amp: 3, dur: 1600 },
      { k: 'flash', at: 200, color: 0x9b7bff, dur: 400, alpha: 0.2 },
      { k: 'particles', at: 150, kind: 'notes', count: 14, dx: 0, dy: -60, spread: 90 },
      { k: 'particles', at: 400, kind: 'ecto', count: 8, dx: 0, dy: -40, spread: 70 },
      sfx(0, 'piano_cluster'), sfx(500, 'piano_melody'), sfx(2200, 'piano_cluster', 0.9),
    ], ['audible', 'loud', 'visual'], [{ at: 200, scare: 0.2, noise: 1.4 }]),
  ],
};

const STATIC = ['obj:television:static1', 'obj:television:static2', 'obj:television:static3'];
const television: ObjectDef = {
  id: 'television', name: 'Television Set', w: 136, h: 170, parts: partsFor('television'),
  actions: [
    act('Static crackles on', 1, 0.13, 0.35, 2400, [
      { k: 'frames', at: 0, part: 'screen', keys: STATIC, fps: 14, loops: 8 },
      { k: 'show', at: 0, part: 'glowScreen', alpha: 1, dur: 200, hold: 1900 },
      { k: 'wobble', at: 0, dur: 800, deg: 7, freq: 5, part: 'antenna' },
      sfx(0, 'tv_static'),
    ], ['audible', 'visual']),
    act('Whispers in the static', 2, 0.3, 0.7, 3000, [
      { k: 'frames', at: 0, part: 'screen', keys: STATIC, fps: 12, loops: 10 },
      { k: 'show', at: 0, part: 'glowScreen', alpha: 1, dur: 250, hold: 2400 },
      { k: 'light', at: 200, mode: 'flicker', dur: 2000, room: true },
      { k: 'wobble', at: 0, dur: 2400, deg: 5, freq: 3, part: 'antenna' },
      { k: 'particles', at: 700, kind: 'ecto', count: 6, dx: -11, dy: 5, spread: 40 },
      sfx(0, 'tv_static'), sfx(600, 'tv_voice', 0.7), sfx(1500, 'whisper'),
    ], ['audible', 'visual', 'light']),
    act('Face on the screen', 3, 0.68, 1.2, 4000, [
      { k: 'frames', at: 0, part: 'screen', keys: STATIC, fps: 16, loops: 6 },
      { k: 'show', at: 0, part: 'glowScreen', alpha: 1, dur: 200, hold: 3200 },
      { k: 'show', at: 1100, part: 'face', alpha: 1, dur: 300, hold: 1900 },
      { k: 'apparition', at: 1500, kind: 'face', dx: -11, dy: 5, dur: 2000, toward: 'viewer' },
      { k: 'light', at: 1000, mode: 'off', dur: 2400, room: true },
      { k: 'dark', at: 1000, amount: 0.35, dur: 2800 },
      { k: 'shakeCam', at: 1500, amp: 2.5, dur: 500 },
      { k: 'flash', at: 1450, color: 0xaad4ff, dur: 200, alpha: 0.25 },
      sfx(0, 'tv_static'), sfx(1000, 'tv_voice'), sfx(1500, 'wail', 0.8), sfx(1600, 'sting_high', 0.8),
    ], ['visual', 'dark', 'audible'], [{ at: 1500, scare: 0.25, noise: 1.0 }]),
  ],
};

const telephone: ObjectDef = {
  id: 'telephone', name: 'Rotary Telephone', w: 56, h: 46, parts: partsFor('telephone'),
  actions: [
    act('Rings by itself', 1, 0.13, 0.6, 2200, [
      { k: 'hop', at: 0, h: 2.4, dur: 170, count: 9, part: 'handset' },
      { k: 'shake', at: 0, dur: 1600, amp: 0.8, freq: 28 },
      sfx(0, 'phone_ring'), sfx(1000, 'phone_ring'),
    ], ['audible']),
    act('Receiver whispers', 2, 0.28, 0.55, 3000, [
      { k: 'rotate', at: 100, deg: 16, dur: 2600, yoyo: true, part: 'handset' },
      { k: 'move', at: 100, dx: 0, dy: -10, dur: 2600, yoyo: true, part: 'handset' },
      { k: 'particles', at: 600, kind: 'ecto', count: 5, dx: 0, dy: -30, spread: 30 },
      sfx(0, 'phone_ring', 0.7), sfx(500, 'phone_whisper'), sfx(1500, 'phone_whisper', 0.9),
    ], ['audible']),
    act('Phone shrieks wildly', 3, 0.62, 1.4, 2800, [
      { k: 'spin', at: 0, turns: 3, dur: 1400, part: 'dial' },
      { k: 'hop', at: 0, h: 9, dur: 220, count: 8 },
      { k: 'shake', at: 0, dur: 2200, amp: 2.2, freq: 30 },
      { k: 'shakeCam', at: 300, amp: 1.5, dur: 1200 },
      { k: 'throw', at: 400, tex: 'prop:paper', count: 3, dx: 0, dy: -20, power: 0.8 },
      ...sfxRun(0, 'phone_ring', 3, 700, 1),
      sfx(400, 'wail', 0.7),
    ], ['audible', 'loud'], [{ at: 700, scare: 0.2, noise: 1.3 }]),
  ],
};

const FIRE = ['obj:fireplace:fire1', 'obj:fireplace:fire2', 'obj:fireplace:fire3', 'obj:fireplace:fire4'];
const GFIRE = ['obj:fireplace:gfire1', 'obj:fireplace:gfire2', 'obj:fireplace:gfire3'];
const fireplace: ObjectDef = {
  id: 'fireplace', name: 'Stone Fireplace', w: 200, h: 200, parts: partsFor('fireplace'),
  idle: [{ k: 'frames', at: 0, part: 'fire1', keys: FIRE, fps: 8 }],
  idleLoopMs: 2000,
  actions: [
    act('Flames leap', 1, 0.14, 0.3, 1800, [
      { k: 'show', at: 100, part: 'flameC', alpha: 1, dur: 250, hold: 700 },
      { k: 'particles', at: 150, kind: 'embers', count: 8, dx: 0, dy: 40, spread: 40 },
      sfx(100, 'fire_whoosh', 0.8),
    ], ['visual', 'light']),
    act('Ghost fire', 2, 0.34, 0.6, 3400, [
      { k: 'show', at: 0, part: 'fire1', alpha: 0, dur: 300, hold: 2600 },
      { k: 'show', at: 0, part: 'gfire1', alpha: 1, dur: 300, hold: 2600 },
      { k: 'frames', at: 0, part: 'gfire1', keys: GFIRE, fps: 8, loops: 8 },
      { k: 'light', at: 200, mode: 'flicker', dur: 2400, room: true },
      { k: 'dark', at: 200, amount: 0.2, dur: 2800 },
      { k: 'particles', at: 400, kind: 'ecto', count: 8, dx: 0, dy: 20, spread: 40 },
      sfx(0, 'fire_whoosh', 0.7), sfx(700, 'whisper'), sfx(1600, 'moan', 0.7),
    ], ['visual', 'dark', 'light']),
    act('Fire roars out', 3, 0.72, 1.4, 3000, [
      { k: 'show', at: 0, part: 'flameC', alpha: 1, dur: 200, hold: 1800 },
      { k: 'flash', at: 100, color: 0xff8a3a, dur: 350, alpha: 0.28 },
      { k: 'light', at: 0, mode: 'surge', dur: 2200, room: true },
      { k: 'shakeCam', at: 100, amp: 3, dur: 700 },
      { k: 'particles', at: 100, kind: 'embers', count: 22, dx: 0, dy: 0, spread: 100 },
      { k: 'particles', at: 150, kind: 'smoke', count: 10, dx: 0, dy: -60, spread: 70 },
      { k: 'throw', at: 150, tex: 'prop:coal', count: 4, dx: 0, dy: -10, power: 1.2 },
      { k: 'aura', at: 0, color: 0xff7a30, dur: 2400, strength: 1.2 },
      sfx(0, 'fire_roar'), sfx(100, 'fire_whoosh'), sfx(1500, 'fire_roar', 0.7),
    ], ['visual', 'loud', 'light'], [{ at: 120, scare: 0.2, noise: 1.3 }]),
  ],
};

// ----------------------------------------------------------------- foyer ----

const grandfatherClock: ObjectDef = {
  id: 'grandfatherClock', name: 'Grandfather Clock', w: 84, h: 240, parts: partsFor('grandfatherClock'),
  idle: [
    { k: 'rotate', at: 0, deg: 7, dur: 1000, yoyo: true, part: 'pendulum' },
    { k: 'rotate', at: 1000, deg: -7, dur: 1000, yoyo: true, part: 'pendulum' },
  ],
  idleLoopMs: 2000,
  actions: [
    act('Hands spin wildly', 1, 0.12, 0.4, 2200, [
      { k: 'spin', at: 0, turns: 6, dur: 1800, part: 'minHand' },
      { k: 'spin', at: 0, turns: 1, dur: 1800, part: 'hourHand' },
      { k: 'show', at: 0, part: 'glow', alpha: 0.7, dur: 300, hold: 1300 },
      sfx(0, 'clock_tick_fast'),
    ], ['visual', 'audible']),
    act('Chimes thirteen', 2, 0.32, 1.0, 5400, [
      ...sfxRun(200, 'clock_bong', 13, 360),
      { k: 'show', at: 0, part: 'glow', alpha: 1, dur: 300, hold: 4600 },
      { k: 'shake', at: 200, dur: 4700, amp: 0.9, freq: 3 },
      { k: 'wobble', at: 200, dur: 4700, deg: 0.8, freq: 2.8 },
      { k: 'particles', at: 3000, kind: 'ecto', count: 6, dx: 0, dy: -66, spread: 40 },
    ], ['audible'], [{ at: 2400, scare: 0.12, noise: 1.0 }]),
    act('Time unravels', 3, 0.66, 1.35, 3600, [
      { k: 'spin', at: 0, turns: 22, dur: 3000, part: 'minHand' },
      { k: 'spin', at: 0, turns: -5, dur: 3000, part: 'hourHand' },
      { k: 'wobble', at: 0, dur: 3000, deg: 34, freq: 3, part: 'pendulum' },
      { k: 'show', at: 0, part: 'glow', alpha: 1, dur: 300, hold: 2800 },
      { k: 'aura', at: 0, color: 0x9fe8ff, dur: 3200, strength: 1.2 },
      { k: 'light', at: 300, mode: 'flicker', dur: 2600, room: true },
      { k: 'dark', at: 300, amount: 0.3, dur: 2800 },
      { k: 'shakeCam', at: 500, amp: 2, dur: 1800 },
      { k: 'flash', at: 400, color: 0x9fe8ff, dur: 300, alpha: 0.22 },
      { k: 'particles', at: 300, kind: 'stars', count: 12, dx: 0, dy: -66, spread: 80 },
      { k: 'particles', at: 800, kind: 'dust', count: 10, dx: 0, dy: -40, spread: 70 },
      sfx(0, 'clock_chime_wild'), sfx(600, 'clock_bong'), sfx(1300, 'clock_chime_wild', 0.8), sfx(2200, 'sting_low', 0.7),
    ], ['visual', 'audible', 'loud', 'dark'], [{ at: 600, scare: 0.2, noise: 1.2 }]),
  ],
};

const coatStand: ObjectDef = {
  id: 'coatStand', name: 'Coat Stand', w: 76, h: 200, parts: partsFor('coatStand'),
  idle: [
    { k: 'wobble', at: 0, dur: 4000, deg: 1.2, freq: 0.5, part: 'coat' },
    { k: 'wobble', at: 0, dur: 4000, deg: 2, freq: 1, part: 'scarf' },
  ],
  idleLoopMs: 4000,
  actions: [
    act('Coat sways', 1, 0.1, 0.2, 2200, [
      { k: 'wobble', at: 0, dur: 2000, deg: 6, freq: 2, part: 'coat' },
      { k: 'wobble', at: 150, dur: 1900, deg: 8, freq: 2.5, part: 'scarf' },
      sfx(0, 'cloth_flutter', 0.6),
    ], ['visual']),
    act('Hat tips, coat waves', 2, 0.26, 0.5, 2600, [
      { k: 'rotate', at: 300, deg: 30, dur: 1400, yoyo: true, part: 'hat' },
      { k: 'hop', at: 300, h: 6, dur: 700, count: 2, part: 'hat' },
      { k: 'wobble', at: 0, dur: 2200, deg: 14, freq: 3.5, part: 'coat' },
      { k: 'wobble', at: 0, dur: 2200, deg: 16, freq: 4, part: 'scarf' },
      { k: 'particles', at: 300, kind: 'dust', count: 6, dx: 0, dy: -20, spread: 40 },
      sfx(0, 'wind_whoosh', 0.6), sfx(300, 'cloth_flutter'),
    ], ['visual']),
    act('Shadow in the coats', 3, 0.6, 1.0, 3400, [
      { k: 'light', at: 0, mode: 'off', dur: 2000, room: true },
      { k: 'dark', at: 0, amount: 0.4, dur: 2800 },
      { k: 'wobble', at: 300, dur: 2400, deg: 22, freq: 4, part: 'coat' },
      { k: 'wobble', at: 300, dur: 2400, deg: 26, freq: 5, part: 'scarf' },
      { k: 'spin', at: 600, turns: 1, dur: 800, part: 'hat' },
      { k: 'shake', at: 300, dur: 1800, amp: 1.6, freq: 22, part: 'stand' },
      { k: 'apparition', at: 700, kind: 'shadow', dx: 0, dy: -50, dur: 2200, toward: 'viewer' },
      sfx(0, 'whisper'), sfx(700, 'sting_low'), sfx(1500, 'moan', 0.8),
    ], ['visual', 'dark'], [{ at: 800, scare: 0.2, noise: 0.8 }]),
  ],
};

// ----------------------------------------------------------------- cellar ----

const wineRack: ObjectDef = {
  id: 'wineRack', name: 'Wine Rack', w: 140, h: 176, parts: partsFor('wineRack'),
  actions: [
    act('Bottles clink', 1, 0.11, 0.3, 1800, [
      { k: 'shake', at: 0, dur: 1500, amp: 1, freq: 30, part: 'bottles' },
      { k: 'shake', at: 200, dur: 1200, amp: 1.4, freq: 26, part: 'bottleA' },
      sfx(0, 'bottle_clink'), sfx(300, 'bottle_clink', 0.8, 1.1), sfx(700, 'bottle_clink', 0.7),
    ], ['audible']),
    act('Corks pop', 2, 0.3, 0.85, 2400, [
      { k: 'move', at: 100, dx: 22, dy: 0, dur: 1000, yoyo: true, part: 'bottleA' },
      { k: 'shake', at: 0, dur: 1800, amp: 1.4, freq: 22 },
      { k: 'particles', at: 300, kind: 'bubbles', count: 8, dx: 20, dy: -30, spread: 40 },
      { k: 'particles', at: 800, kind: 'spark', count: 5, dx: 20, dy: -50, spread: 40 },
      sfx(0, 'bottle_clink'), sfx(300, 'bottle_pop'), sfx(900, 'bottle_pop', 0.9, 1.1), sfx(1400, 'bottle_pop', 0.8, 0.9),
    ], ['audible', 'visual'], [{ at: 900, scare: 0.1, noise: 0.7 }]),
    act('Rack erupts', 3, 0.66, 1.4, 3000, [
      { k: 'shake', at: 0, dur: 1600, amp: 3, freq: 24 },
      { k: 'squash', at: 600, amt: 0.15, dur: 500 },
      { k: 'move', at: 200, dx: 24, dy: 0, dur: 900, yoyo: true, part: 'bottleA' },
      { k: 'throw', at: 500, tex: 'prop:bottle', count: 6, dx: 0, dy: -40, power: 1.3 },
      { k: 'shakeCam', at: 500, amp: 4, dur: 700 },
      { k: 'particles', at: 500, kind: 'glass', count: 14, dx: 0, dy: -20, spread: 90 },
      { k: 'particles', at: 500, kind: 'bubbles', count: 10, dx: 0, dy: -40, spread: 80 },
      sfx(0, 'rattle'), sfx(400, 'bottle_pop'), sfx(550, 'bottle_pop', 0.9, 1.2), sfx(900, 'glass_shatter'), sfx(1200, 'bang', 0.8),
    ], ['audible', 'loud', 'visual'], [{ at: 500, scare: 0.25, noise: 1.3 }, { at: 900, scare: 0.12, noise: 1.0 }]),
  ],
};

// ----------------------------------------------------------------- boiler ----

const FFIRE = ['obj:furnace:fire1', 'obj:furnace:fire2', 'obj:furnace:fire3', 'obj:furnace:fire4'];
const furnace: ObjectDef = {
  id: 'furnace', name: 'Old Furnace', w: 230, h: 180, parts: partsFor('furnace'),
  idle: [
    { k: 'show', at: 0, part: 'glowDoor', alpha: 0.95, dur: 900 },
    { k: 'show', at: 2000, part: 'glowDoor', alpha: 0.8, dur: 700 },
  ],
  idleLoopMs: 4000,
  actions: [
    act('Embers glow brighter', 1, 0.12, 0.35, 2400, [
      { k: 'show', at: 0, part: 'glowDoor', alpha: 1, dur: 500, hold: 1500 },
      { k: 'light', at: 100, mode: 'surge', dur: 1400, room: true },
      { k: 'shake', at: 300, dur: 1200, amp: 1.2, freq: 20, part: 'gauge' },
      { k: 'particles', at: 400, kind: 'embers', count: 6, dx: 0, dy: -20, spread: 50 },
      sfx(0, 'fire_whoosh', 0.6),
    ], ['visual', 'light']),
    act('Pipes bang, steam', 2, 0.3, 0.95, 2600, [
      { k: 'shake', at: 0, dur: 2200, amp: 1.6, freq: 18 },
      { k: 'rotate', at: 300, deg: 22, dur: 1600, yoyo: true, part: 'gauge' },
      { k: 'particles', at: 300, kind: 'steam', count: 10, dx: -100, dy: -80, spread: 30 },
      { k: 'particles', at: 800, kind: 'steam', count: 10, dx: 90, dy: -70, spread: 30 },
      sfx(0, 'metal_clank'), sfx(300, 'chain_rattle'), sfx(500, 'steam_hiss'), sfx(1100, 'metal_clank', 0.9, 0.85), sfx(1600, 'steam_hiss', 0.8),
    ], ['audible', 'loud'], [{ at: 1100, scare: 0.1, noise: 0.9 }]),
    act('Door roars open', 3, 0.7, 1.45, 3200, [
      { k: 'scaleX', at: 200, to: 0.1, dur: 2400, yoyo: true, part: 'door' },
      { k: 'frames', at: 200, part: 'fire1', keys: FFIRE, fps: 14, loops: 12 },
      { k: 'show', at: 0, part: 'glowDoor', alpha: 1, dur: 200, hold: 2600 },
      { k: 'flash', at: 250, color: 0xff7a30, dur: 400, alpha: 0.28 },
      { k: 'light', at: 200, mode: 'surge', dur: 2200, room: true },
      { k: 'shakeCam', at: 250, amp: 3, dur: 900 },
      { k: 'shake', at: 100, dur: 900, amp: 2.2, freq: 22 },
      { k: 'particles', at: 300, kind: 'embers', count: 20, dx: 0, dy: -50, spread: 90 },
      { k: 'particles', at: 300, kind: 'coal', count: 6, dx: 0, dy: -40, spread: 70 },
      { k: 'throw', at: 300, tex: 'prop:coal', count: 4, dx: 0, dy: -50, power: 1.1 },
      { k: 'aura', at: 0, color: 0xff7a30, dur: 2800, strength: 1.2 },
      sfx(0, 'metal_clank'), sfx(200, 'furnace_roar'), sfx(250, 'fire_roar'), sfx(1500, 'steam_hiss', 0.8),
    ], ['visual', 'loud', 'light'], [{ at: 250, scare: 0.2, noise: 1.4 }]),
  ],
};

export const LOWER_OBJECTS: ObjectDef[] = [
  desk, stagHead, bookshelf, stove, refrigerator, chandelier, chinaCabinet,
  piano, television, telephone, fireplace, grandfatherClock, coatStand, wineRack, furnace,
];
