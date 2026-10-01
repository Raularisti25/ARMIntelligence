// Contract between structureArt.ts (A-tex worker: paints textures, says WHERE they go)
// and roomArt.ts (A-run worker: buildWorld / IWorldView runtime). Positions are world units,
// x/y = top-left unless ox/oy given. Only ADD optional fields.
import type { RoomId } from '../types';

export interface StaticSprite {
  key: string; x: number; y: number;
  ox?: number; oy?: number; // origin (default 0,0)
  depth: number; // DEPTH.* from config.ts
  /** Parallax factor: 1 = world-locked (default); <1 = background layer (layer.x = base + (camCX-2000)*(1-f)). */
  scroll?: number;
  alpha?: number;
  add?: boolean; // ADD blend
  room?: RoomId; // dims with the room's light level when set
  /** Display size in WORLD units. Omitted = texture px / ART (canvasTex). REQUIRED for softTex textures (display = w x h) and for tile:true. */
  w?: number; h?: number;
  /** true = TileSprite of w x h world units (use paint.tile(): texture painted at ART x). */
  tile?: boolean;
}
export interface LightSprite {
  lightId: string; // LIGHTS[].id
  room: RoomId | 'outside';
  glowKey: string; x: number; y: number; // glow image top-left (clipped to its room)
  fixtureKey?: string; fx?: number; fy?: number; // lit-fixture overlay, canvasTex (size px/ART), fx/fy = top-left (absent when objectId owns the fixture)
  /** glow display size in world units (softTex: tex px / 0.5) = 2*radius square. */
  w?: number; h?: number;
}
export interface DarkSprite { room: RoomId; key: string; x: number; y: number; w?: number; h?: number /* display size (softTex res 0.5) = room rect */ } // full-darkness overlay, alpha set at runtime
export interface DoorSprite { kind?: 'door' | 'swing' | 'front'; wallIndex: number; key: string; x: number; y: number; hingeX: number; hingeY: number } // WALLS[wallIndex] leaf
export interface WindowSprite { room: RoomId | 'outside'; key: string; x: number; y: number } // pane, flashed by lightning()
export interface WorldManifest {
  statics: StaticSprite[];
  lights: LightSprite[];
  dark: DarkSprite[];
  doors: DoorSprite[];
  windows: WindowSprite[];
  frontDoor: DoorSprite;
  /** Screen-anchored + effect textures from s1 (sky gradient, moon, star, cloud[], bat, mote, smoke). */
  backdrop: { sky: string; moon: string; star: string; clouds: string[]; bat: string; mote: string; smoke: string };
  chimneySmoke: { x: number; y: number }[];
}
// structureArt.ts exports: function paintStructureTextures(scene: Phaser.Scene): WorldManifest
