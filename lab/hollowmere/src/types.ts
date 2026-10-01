// Cross-module contract for Hollowmere. Every module codes against these
// interfaces only. Do not change existing shapes; ADD optional fields if needed.
//
// Construction order (GameScene.create, module E) — ctx is filled progressively,
// so constructors may only touch ctx members created BEFORE them; everything
// else must be read lazily (in update / act / callbacks):
//   1 ctx.rooms   = new RoomSystem()                     (C)
//   2 ctx.audio   = new AudioManager()                   (D)
//   3 paintFxTextures / paintObjectTextures / paintCharacterTextures / ghost textures
//   4 ctx.world   = buildWorld(scene)                    (A)
//   5 ctx.fx      = new EffectsManager(ctx)              (E)
//   6 ctx.intensity = new HauntingIntensitySystem(ctx)   (E)
//   7 ctx.fear    = new FearSystem(ctx)                  (C)
//   8 ctx.objects = OBJECTS.map(d => new HauntableObject(ctx, d))   (B)
//   9 ctx.npcs    = NPCS.map(d => new NPCController(ctx, d))        (C)
//  10 ctx.ghost   = new GhostController(ctx)             (E)
//  11 PossessionSystem, HUD                              (E)
// Per frame (dt in SECONDS, already multiplied by the debug speed factor):
//   ghost, possession, objects[i].update, fear.update, npcs[i].update,
//   intensity.update, world.update, audio.update, fx.update, hud.update

import type Phaser from 'phaser';

// ---------------------------------------------------------------- world ----

export type FloorId = 'attic' | 'upper' | 'ground' | 'basement';

export type RoomId =
  | 'attic' | 'nursery'
  | 'bathroom' | 'bedroom' | 'study' | 'upperHall'
  | 'kitchen' | 'dining' | 'parlor' | 'foyer'
  | 'cellar' | 'boiler';

export type WindowKind = 'round' | 'arched' | 'bay' | 'square' | 'small';
export interface WindowDef { x: number; y: number; w: number; h: number; kind: WindowKind }

export type LightKind = 'bulb' | 'sconce' | 'chandelier' | 'lamp' | 'candle' | 'fire' | 'lantern' | 'window';
export interface LightDef {
  id: string;
  room: RoomId | 'outside';
  x: number;
  y: number;
  kind: LightKind;
  radius: number; // glow radius in world units
  color: number; // 0xRRGGBB
  /** Painted fixture belongs to a hauntable object (it draws its own fixture). */
  objectId?: string;
}

export type Wallpaper =
  | 'atticBoards' | 'stars' | 'tiles' | 'damask' | 'woodPanel' | 'stripes'
  | 'kitchenTile' | 'dining' | 'parlor' | 'foyer' | 'stone' | 'brick';

export interface RoomDef {
  id: RoomId;
  name: string; // display name, e.g. "Master Bedroom"
  floor: FloorId;
  x0: number; // interior span (inside walls)
  x1: number;
  ceil: number; // y of the ceiling underside
  floorY: number; // y where feet stand
  walk: [number, number]; // x range NPCs may stand in
  wallpaper: Wallpaper;
  windows: WindowDef[];
}

export type WallDoor = 'door' | 'arch' | 'swing' | 'open' | 'solid';
export interface WallDef { x: number; floor: FloorId; door: WallDoor; left: RoomId; right: RoomId | null }

export interface StairDef {
  id: 'cellar' | 'grand' | 'attic';
  a: RoomId; // room at path[0]
  b: RoomId; // room at path[last]
  path: [number, number][]; // feet positions, polyline
}

export type Pose = 'stand' | 'sit' | 'read' | 'cook' | 'clean' | 'play' | 'warm' | 'tv' | 'look' | 'type' | 'bath';
export interface PoiDef { id: string; room: RoomId; x: number; pose: Pose; facing?: 1 | -1; /** NPC ids this POI suits; empty = anyone */ who?: string[] }

export type HideKind = 'behind' | 'under' | 'inside';
export interface HideSpotDef { id: string; room: RoomId; x: number; kind: HideKind; objectId?: string; capacity: number }

export interface HauntablePlacement {
  id: string; // ObjectDef.id
  room: RoomId;
  x: number; // center x
  /** Feet/base y for floor items, center y for wall items, mount y (ceiling) for ceiling items. */
  y: number;
  mount: 'floor' | 'wall' | 'ceiling' | 'table';
}

// -------------------------------------------------------------- objects ----

export type ParticleKind =
  | 'wisp' | 'spark' | 'dust' | 'puff' | 'ecto' | 'notes' | 'water' | 'feathers' | 'paper'
  | 'embers' | 'glass' | 'smoke' | 'steam' | 'stars' | 'leaves' | 'bubbles' | 'coal' | 'petals';

export type ApparitionKind = 'figure' | 'face' | 'hands' | 'eyes' | 'shadow' | 'skull' | 'child';

/** Every sound an object action may request. AudioManager (D) implements ALL of them. */
export const SFX_IDS = [
  'piano_soft', 'piano_melody', 'piano_cluster',
  'clock_tick_fast', 'clock_bong', 'clock_chime_wild',
  'glass_shimmer', 'glass_crack', 'glass_shatter',
  'water_drip', 'water_gurgle', 'water_splash',
  'creak_soft', 'creak_loud', 'wood_knock', 'thump', 'bang', 'slam', 'rattle',
  'crystal_tinkle', 'crystal_crash',
  'fire_whoosh', 'fire_roar',
  'tv_static', 'tv_voice',
  'phone_ring', 'phone_whisper',
  'typewriter', 'paper_flutter', 'book_thud',
  'metal_clank', 'armor_march', 'sword_swing',
  'growl', 'roar',
  'lamp_buzz', 'lamp_pop',
  'cloth_flutter', 'wind_whoosh',
  'music_box', 'jack_pop', 'giggle', 'doll_laugh',
  'rock_creak', 'horse_neigh', 'bed_bounce', 'wardrobe_rattle',
  'fridge_hum', 'fridge_open', 'pot_bang', 'sizzle',
  'bottle_clink', 'bottle_pop', 'furnace_roar', 'steam_hiss', 'chain_rattle',
  'whisper', 'moan', 'wail', 'heartbeat', 'ghost_laugh', 'sting_low', 'sting_high', 'boing',
  'possess_in', 'possess_out', 'unlock', 'ui_tick', 'door_slam', 'thunder',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

/**
 * Fx timeline primitive. `at` = ms after the action starts. `part` names a
 * sub-image of the object (ObjectDef.parts[].name); omitted = whole object.
 * Implemented ONCE inside HauntableObject (module B), which delegates the
 * scene-level ones (particles/apparition/flash/dark/shakeCam/light/throw) to
 * ctx.fx / ctx.world.
 */
export type Fx =
  | { k: 'shake'; at: number; dur: number; amp: number; freq?: number; part?: string }
  | { k: 'wobble'; at: number; dur: number; deg: number; freq?: number; part?: string }
  | { k: 'hop'; at: number; h: number; dur?: number; count?: number; part?: string }
  | { k: 'float'; at: number; dur: number; h: number; part?: string }
  | { k: 'squash'; at: number; amt: number; dur?: number; part?: string }
  | { k: 'rotate'; at: number; deg: number; dur: number; yoyo?: boolean; part?: string }
  | { k: 'scaleX'; at: number; to: number; dur: number; yoyo?: boolean; part?: string }
  | { k: 'move'; at: number; dx: number; dy: number; dur: number; yoyo?: boolean; ease?: string; part?: string }
  | { k: 'spin'; at: number; turns: number; dur: number; part?: string }
  | { k: 'show'; at: number; part: string; alpha: number; dur?: number; hold?: number }
  | { k: 'frames'; at: number; part: string; keys: string[]; fps: number; loops?: number }
  | { k: 'light'; at: number; mode: 'flicker' | 'off' | 'surge'; dur: number; room?: boolean }
  | { k: 'aura'; at: number; color: number; dur: number; strength?: number }
  | { k: 'particles'; at: number; kind: ParticleKind; count: number; dx?: number; dy?: number; spread?: number; speed?: number; color?: number }
  | { k: 'apparition'; at: number; kind: ApparitionKind; dx?: number; dy?: number; dur: number; toward?: 'viewer' | 'npc' | 'up' }
  | { k: 'throw'; at: number; tex: string; count: number; dx?: number; dy?: number; power?: number }
  | { k: 'dark'; at: number; amount: number; dur: number }
  | { k: 'shakeCam'; at: number; amp: number; dur: number }
  | { k: 'flash'; at: number; color: number; dur: number; alpha?: number }
  | { k: 'sfx'; at: number; id: SfxId; vol?: number; rate?: number }
  | { k: 'lunge'; at: number; dist: number; dur: number; part?: string }
  | { k: 'lookAtNpc'; at: number; dur: number; part?: string };

export interface ActionDef {
  name: string; // shown in the possession panel, sentence case, ≤ 22 chars ("Keys play themselves")
  tier: 1 | 2 | 3;
  scare: number; // 0..1 base scare (see DESIGN calibration)
  noise: number; // 0..~1.6, how far it is heard
  cooldown: number; // seconds
  duration: number; // ms the object is "busy"
  fx: Fx[];
  /** Extra scare broadcasts beyond the automatic one at `at`=0 (e.g. a delayed crash). */
  emits?: { at: number; scare: number; noise: number }[];
  /** Hints for perception: 'visual' needs line of sight; 'dark' darkens room (×1.35). */
  tags?: ('visual' | 'audible' | 'dark' | 'loud' | 'light')[];
}

export interface ObjectPart {
  name: string; // 'body', 'lid', 'keys', 'pendulum', ...
  tex: string; // texture key painted by objectArt
  x: number; // offset from object origin (bottom-center for floor/table, center for wall, top-center for ceiling), world units
  y: number;
  originX?: number; // default 0.5
  originY?: number; // default 1 for floor/table, 0.5 wall, 0 ceiling
  depthOffset?: number; // relative to DEPTH.object
  alpha?: number; // initial alpha (0 = hidden until a `show` fx)
}

export interface ObjectDef {
  id: string; // matches HauntablePlacement.id
  name: string; // "Grand Piano"
  w: number; // bounds size in world units (for reach/highlight/panel placement)
  h: number;
  parts: ObjectPart[]; // parts[0] is the main image (gets the highlight glow)
  actions: [ActionDef, ActionDef, ActionDef];
  /** Ambient idle animation while NOT possessed (clock pendulum, curtain sway...). */
  idle?: Fx[]; // replayed in a loop, `at` relative to loop start
  idleLoopMs?: number;
  /** Continuous positional loop sound while idle (e.g. 'clock_tick_fast' is NOT for idle — use AudioManager ambience ids) */
  hide?: HideKind;
}

// ------------------------------------------------------------- scare bus ----

export type ScareKind = 'haunt' | 'scream' | 'presence' | 'flee' | 'touch';
export interface ScareEvent {
  kind: ScareKind;
  x: number;
  y: number;
  room: RoomId;
  scare: number; // 0..1
  noise: number;
  sourceId: string; // object id or npc id
  visual: boolean; // true → only seen in the same room (awareness/facing gated)
  dark?: boolean;
  tier?: 1 | 2 | 3;
  /** Distinguishes repeats for novelty: `${objectId}:${actionIndex}` */
  signature: string;
}

/** Game event bus (ctx.events) names and payloads. */
export interface GameEvents {
  scare: ScareEvent;
  possess: { objectId: string };
  release: { objectId: string };
  action: { objectId: string; index: number; tier: number };
  'npc:scream': { npcId: string };
  'npc:fled': { npcId: string; name: string };
  'npc:state': { npcId: string; state: NpcState };
  'intensity:level': { level: number; name: string; up: boolean };
  win: { timeMs: number };
}

// ----------------------------------------------------------------- people ----

export interface NpcTraits {
  courage: number; // 0..1
  curiosity: number; // 0..1
  awareness: number; // 0..1 (perceives subtle visual events)
  skepticism: number; // 0..1 (dampens tier-1 effect while fear low)
  speed: number; // walk speed u/s (~70..110)
  hearing: number; // 0..1 multiplier on audible events (Hester 0.45)
  pitch: number; // voice base frequency Hz
}

export interface NpcDef {
  id: string; // 'augustus' | 'marigold' | 'toby' | 'hester' | 'pruitt' | 'nell' | 'dobbs'
  name: string; // "Augustus Fairweather"
  short: string; // "Augustus"
  initials: string; // "AF"
  role: string; // "the skeptic"
  height: number; // world units (~150 adult, 100 child)
  palette: { skin: number; hair: number; top: number; bottom: number; accent: number };
  traits: NpcTraits;
  start: { room: RoomId; x: number };
  home: string[]; // preferred POI ids
  /** Party guest: reuses this resident's body/face art (recoloured by palette). */
  look?: string;
}

export type NpcState =
  | 'idle' | 'walk' | 'routine' | 'investigate' | 'glance' | 'startled' | 'nervous'
  | 'group' | 'scream' | 'run' | 'stumble' | 'hide' | 'flee' | 'gone';

export type Face = 'calm' | 'blink' | 'curious' | 'skeptic' | 'nervous' | 'scared' | 'terror' | 'scream';
export type Emote = '?' | '!' | '!!' | '…' | 'sweat' | '♪' | 'zzz';

export interface INPC {
  readonly def: NpcDef;
  readonly id: string;
  x: number;
  y: number;
  room: RoomId;
  facing: 1 | -1;
  fear: number; // 0..100
  panic: number; // 0..100
  state: NpcState;
  hidingIn: string | null; // hide spot id or object id when inside
  readonly container: Phaser.GameObjects.Container;
  readonly fled: boolean;
  update(dt: number): void;
  /** Called by FearSystem after perception math. */
  react(impact: number, ev: ScareEvent): void;
  emote(e: Emote): void;
  /** Contagious fear from a scared neighbour (no behaviour flip, capped by FearSystem). */
  catchFear(amount: number): void;
  /** True while a guest is walking in through the front door. */
  readonly arriving?: boolean;
}

// ---------------------------------------------------------------- systems ----

export interface IRooms {
  readonly list: RoomDef[];
  get(id: RoomId): RoomDef;
  at(x: number, y: number): RoomId | null; // room containing a point (ghost/camera)
  floorOf(id: RoomId): FloorId;
  /** Hop distance between rooms through doors/stairs (0 = same). */
  distance(a: RoomId, b: RoomId): number;
  /** Waypoint list (feet positions) to walk from (x,room) to (x2,room2), stairs included. */
  route(fromRoom: RoomId, fromX: number, toRoom: RoomId, toX: number): [number, number][];
  neighbors(id: RoomId): RoomId[];
}

export interface PlayOpts { x?: number; y?: number; vol?: number; rate?: number; pan?: number; ui?: boolean }
export type VoiceKind = 'mumble' | 'hmm' | 'gasp' | 'yelp' | 'scream' | 'whimper' | 'laugh' | 'huff';
export interface LoopHandle { stop(fadeMs?: number): void; setPos(x: number, y: number): void; setVol(v: number): void }

export interface IAudio {
  resume(): void; // call on first user input
  play(id: SfxId, opts?: PlayOpts): void;
  voice(kind: VoiceKind, pitch: number, x: number, y: number, vol?: number): void;
  footstep(x: number, y: number, weight: number, running: boolean): void;
  /** Positional ambience loops: 'fire' | 'clock' | 'furnace' | 'tv' | 'fridge' | 'water' | 'drip' | 'hum' */
  loop(id: string, x: number, y: number, vol?: number): LoopHandle;
  setListener(x: number, y: number, floor: FloorId | null): void;
  setIntensity(v: number): void; // 0..1, drives ambience layers
  startAmbience(): void;
  setVolume(v: number): void; // master 0..1
  readonly volume: number;
  muted: boolean;
  update(dt: number): void;
}

export interface IEffects {
  particles(kind: ParticleKind, x: number, y: number, count: number, opts?: { spread?: number; speed?: number; color?: number; gravity?: number; depth?: number }): void;
  apparition(kind: ApparitionKind, x: number, y: number, durMs: number, toward?: 'viewer' | 'npc' | 'up'): void;
  throwProp(tex: string, x: number, y: number, count: number, power?: number): void;
  flash(color: number, durMs: number, alpha?: number): void;
  shakeCam(amp: number, durMs: number): void;
  puff(x: number, y: number, color?: number): void;
  ring(x: number, y: number, color: number, radius: number): void; // expanding shock ring
  update(dt: number): void;
}

export interface IWorldView {
  /** Darken a room (0..1) for durMs then ease back. */
  darkenRoom(room: RoomId, amount: number, durMs: number): void;
  /** Flicker / kill / surge the lights of a room. */
  lights(room: RoomId, mode: 'flicker' | 'off' | 'surge', durMs: number): void;
  /** Ambient poltergeist touch: door swing, frame tilt etc. (level ≥2). Returns where it happened. */
  touch(room: RoomId): { x: number; y: number } | null;
  /** Lightning flash on windows (level 3). */
  lightning(): void;
  isDark(room: RoomId): boolean;
  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, intensity: number): void;
}

export interface IHauntable {
  readonly def: ObjectDef;
  readonly id: string;
  readonly room: RoomId;
  readonly placement: HauntablePlacement;
  readonly container: Phaser.GameObjects.Container;
  readonly bounds: Phaser.Geom.Rectangle; // world-space bounds
  readonly possessed: boolean;
  readonly busy: boolean;
  setHighlight(on: boolean): void;
  possess(): void;
  release(): void;
  /** index 0..2. Returns false when locked, cooling down or busy. Broadcasts the scare itself. */
  act(index: number): boolean;
  cooldownLeft(index: number): number; // seconds
  cooldownFrac(index: number): number; // 0..1 remaining
  unlocked(index: number): boolean; // by ctx.intensity.level
  /** Rattle when an NPC hides/exits (inside hide spots). */
  jostle(): void;
  update(dt: number): void;
}

export interface IFear {
  /** Entry point for every scare (objects call ctx.events.emit('scare') → FearSystem listens). */
  broadcast(ev: ScareEvent): void;
  update(dt: number): void;
  readonly totalScreams: number;
}

export interface IIntensity {
  readonly value: number; // 0..1
  readonly level: number; // 0..3
  readonly levelName: string;
  readonly scareMult: number;
  addFear(impact: number): void;
  addFled(): void;
  set(v: number): void; // debug
  update(dt: number): void;
}

export interface IGhost {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly container: Phaser.GameObjects.Container;
  possessing: IHauntable | null;
  /** Fly toward a point (mouse seek); null cancels. */
  seek(x: number | null, y?: number): void;
  enterObject(o: IHauntable): void; // squeeze-in animation, hides ghost
  exitObject(o: IHauntable): void; // spring-out animation
  update(dt: number): void;
}

export interface GameStats {
  startMs: number;
  haunts: number;
  screams: number;
  fled: string[];
  perObject: Record<string, number>;
}

export interface GameCtx {
  scene: Phaser.Scene;
  events: Phaser.Events.EventEmitter; // typed via GameEvents names
  rooms: IRooms;
  audio: IAudio;
  world: IWorldView;
  fx: IEffects;
  intensity: IIntensity;
  fear: IFear;
  objects: IHauntable[];
  npcs: INPC[];
  ghost: IGhost;
  stats: GameStats;
  /** Scene time in ms (respects debug speed). */
  now(): number;
}

// MODULE exports (one owner each — see DESIGN.md "Module ownership"):
// A  src/art/roomArt.ts            export function buildWorld(scene: Phaser.Scene, ctx: GameCtx): IWorldView
// B  src/art/objectArt.ts          export function paintObjectTextures(scene: Phaser.Scene): void
// B  src/data/objects.ts           export const OBJECTS: ObjectDef[]
// B  src/entities/HauntableObject.ts export class HauntableObject implements IHauntable { constructor(ctx: GameCtx, def: ObjectDef) }
// C  src/art/characterArt.ts       export function paintCharacterTextures(scene: Phaser.Scene): void
// C  src/data/npcs.ts              export const NPCS: NpcDef[]
// C  src/entities/NPCController.ts export class NPCController implements INPC { constructor(ctx: GameCtx, def: NpcDef) }
// C  src/systems/FearSystem.ts     export class FearSystem implements IFear { constructor(ctx: GameCtx) }
// C  src/systems/RoomSystem.ts     export class RoomSystem implements IRooms { constructor() }
// D  src/systems/AudioManager.ts   export class AudioManager implements IAudio { constructor() }
// E  src/art/fxArt.ts              export function paintFxTextures(scene: Phaser.Scene): void  (+ ghost textures)
// E  everything else (scenes, GhostController, PossessionSystem, HauntingIntensitySystem, EffectsManager, HUD, main, scripts)
//
// Texture key conventions: rooms 'room:<id>', structure 'st:<name>', objects
// 'obj:<id>:<part>', thrown props 'prop:<name>', people 'npc:<id>:<part>',
// faces 'face:<id>:<Face>', emotes 'emote:<name>', fx 'fx:<kind>', ghost 'ghost:<part>'.
// FX texture keys that B may rely on (painted by E): 'fx:<ParticleKind>' for every
// ParticleKind, 'fx:glow' (soft white radial 128), 'fx:ring', 'app:<ApparitionKind>'.
// Thrown props B may request: 'prop:book' 'prop:plate' 'prop:cup' 'prop:spoon' 'prop:bottle'
// 'prop:paper' 'prop:coal' 'prop:sock' 'prop:toy' — painted by B in objectArt (B owns 'prop:*').
