// Global tuning constants. World units are "design pixels"; textures are
// painted at ART× resolution and displayed at 1/ART so everything stays crisp
// on Retina displays at any camera zoom.

export const ART = 2;

export const WORLD = { x0: 0, x1: 4000, y0: -260, y1: 1830 };

export const HOUSE = {
  x0: 200,
  x1: 3200,
  wallExt: 30,
  wallInt: 20,
  slab: 26,
  ground: 1340, // garden level outside
};

export const DOOR_H = 236;

export const DEPTH = {
  sky: 0,
  far: 2,
  mid: 4,
  near: 6,
  houseBack: 8,
  room: 10,
  shafts: 12,
  decorBack: 14,
  npcBehind: 18,
  object: 20,
  decor: 22,
  npc: 30,
  decorFront: 34,
  dark: 38,
  structure: 40,
  door: 41,
  light: 46,
  fx: 48,
  apparition: 52,
  ghost: 55,
  foreground: 60,
  emote: 66,
};

export const GHOST = {
  maxSpeed: 500,
  response: 9.5, // accel time-constant (1/s) while steering
  glide: 4.2, // decel time-constant (1/s) when released
  reach: 70, // extra distance around an object's bounds that counts as "near"
};

export const CAMERA = {
  visibleH: 1000, // world units visible vertically at default zoom
  minVisibleH: 640,
  maxVisibleH: 2050,
  follow: 4.2,
};

export const INTENSITY = {
  levels: [0, 0.2, 0.48, 0.78],
  names: ['Quiet', 'Stirring', 'Haunted', 'Awakened'],
};

// Fear tuning — ONE place to make people easier/harder to scare.
export const FEAR = {
  gain: 0.8, // fear added per point of scare impact (was 0.55)
  worried: 30, // visible unease: glance behind, quicker steps, hugging arms
  restless: 45, // pace between rooms / group up instead of settling
  contagionRange: 340, // px, same room
  contagionRate: 0.9, // fear/sec at full source panic
  contagionCap: 62, // contagion alone never pushes anyone past this
};
