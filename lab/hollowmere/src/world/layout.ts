// Every house coordinate lives here (decided in DESIGN.md — do not re-derive).
// y grows downward. Feet stand on `floorY`; the slab (HOUSE.slab thick) sits
// directly below each floor line.

import type {
  FloorId, HauntablePlacement, HideSpotDef, LightDef, PoiDef, RoomDef, RoomId, StairDef, WallDef,
} from '../types';

export const FLOORS: Record<FloorId, { ceil: number; floor: number }> = {
  attic: { ceil: 205, floor: 520 },
  upper: { ceil: 546, floor: 920 },
  ground: { ceil: 946, floor: 1320 },
  basement: { ceil: 1346, floor: 1690 },
};

export const FLOOR_ORDER: FloorId[] = ['attic', 'upper', 'ground', 'basement'];

/** Attic interior polygon (sloped mansard sides) and the outer roof outline. */
export const ATTIC_POLY: [number, number][] = [[240, 510], [540, 205], [2860, 205], [3160, 510]];
export const ROOF_OUTLINE: [number, number][] = [[170, 520], [520, 170], [2880, 170], [3230, 520]];
export const TURRET = { x0: 2950, x1: 3150, top: 170, spireTop: -60, window: { x: 3050, y: 60, r: 30 } };
export const CHIMNEYS = [
  { x: 900, w: 70, top: 60 },
  { x: 2200, w: 70, top: 40 },
];
export const EXT_WALLS = { west: [200, 230] as const, east: [3170, 3200] as const };
export const FRONT_DOOR = { x0: 3170, x1: 3200, floorY: 1320, h: 236 };
export const PORCH = { x0: 3200, x1: 3480, y: 1320, steps: [3480, 3540] as const, roofY: 1100 };
export const GARDEN_Y = 1340;
/** Solid earth / foundation east of the boiler room. */
export const BASEMENT_SOLID = { x0: 2500, x1: 3170 };

export const ROOMS: RoomDef[] = [
  // ATTIC
  { id: 'attic', name: 'Attic', floor: 'attic', x0: 240, x1: 1700, ceil: 205, floorY: 520, walk: [410, 1680], wallpaper: 'atticBoards',
    windows: [{ x: 1000, y: 330, w: 92, h: 92, kind: 'round' }] },
  { id: 'nursery', name: 'Nursery', floor: 'attic', x0: 1700, x1: 3160, ceil: 205, floorY: 520, walk: [1720, 2990], wallpaper: 'stars',
    windows: [{ x: 2700, y: 330, w: 92, h: 92, kind: 'round' }] },
  // UPPER
  { id: 'bathroom', name: 'Bathroom', floor: 'upper', x0: 230, x1: 760, ceil: 546, floorY: 920, walk: [250, 740], wallpaper: 'tiles',
    windows: [{ x: 330, y: 680, w: 70, h: 100, kind: 'small' }] },
  { id: 'bedroom', name: 'Master Bedroom', floor: 'upper', x0: 760, x1: 1500, ceil: 546, floorY: 920, walk: [780, 1480], wallpaper: 'damask',
    windows: [{ x: 1250, y: 700, w: 110, h: 170, kind: 'arched' }] },
  { id: 'study', name: 'Study', floor: 'upper', x0: 1500, x1: 2200, ceil: 546, floorY: 920, walk: [1520, 2180], wallpaper: 'woodPanel',
    windows: [{ x: 1640, y: 700, w: 100, h: 150, kind: 'arched' }] },
  { id: 'upperHall', name: 'Upper Hall', floor: 'upper', x0: 2200, x1: 3170, ceil: 546, floorY: 920, walk: [2220, 3150], wallpaper: 'stripes',
    windows: [] },
  // GROUND
  { id: 'kitchen', name: 'Kitchen', floor: 'ground', x0: 230, x1: 820, ceil: 946, floorY: 1320, walk: [250, 800], wallpaper: 'kitchenTile',
    windows: [{ x: 520, y: 1110, w: 120, h: 110, kind: 'square' }] },
  { id: 'dining', name: 'Dining Room', floor: 'ground', x0: 820, x1: 1440, ceil: 946, floorY: 1320, walk: [840, 1420], wallpaper: 'dining',
    windows: [{ x: 960, y: 1100, w: 110, h: 160, kind: 'arched' }] },
  { id: 'parlor', name: 'Parlor', floor: 'ground', x0: 1440, x1: 2340, ceil: 946, floorY: 1320, walk: [1460, 2320], wallpaper: 'parlor',
    windows: [{ x: 1860, y: 1100, w: 180, h: 170, kind: 'bay' }] },
  { id: 'foyer', name: 'Foyer', floor: 'ground', x0: 2340, x1: 3170, ceil: 946, floorY: 1320, walk: [2360, 3150], wallpaper: 'foyer',
    windows: [] },
  // BASEMENT
  { id: 'cellar', name: 'Wine Cellar', floor: 'basement', x0: 230, x1: 1300, ceil: 1346, floorY: 1690, walk: [250, 1280], wallpaper: 'stone',
    windows: [{ x: 500, y: 1385, w: 80, h: 34, kind: 'small' }] },
  { id: 'boiler', name: 'Boiler Room', floor: 'basement', x0: 1300, x1: 2500, ceil: 1346, floorY: 1690, walk: [1320, 2480], wallpaper: 'brick',
    windows: [{ x: 1500, y: 1385, w: 80, h: 34, kind: 'small' }] },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomDef>;

/** Interior walls (centers). Doorway opening height = DOOR_H unless 'solid'. */
export const WALLS: WallDef[] = [
  { x: 1700, floor: 'attic', door: 'arch', left: 'attic', right: 'nursery' },
  { x: 760, floor: 'upper', door: 'door', left: 'bathroom', right: 'bedroom' },
  { x: 1500, floor: 'upper', door: 'door', left: 'bedroom', right: 'study' },
  { x: 2200, floor: 'upper', door: 'arch', left: 'study', right: 'upperHall' },
  { x: 820, floor: 'ground', door: 'swing', left: 'kitchen', right: 'dining' },
  { x: 1440, floor: 'ground', door: 'open', left: 'dining', right: 'parlor' },
  { x: 2340, floor: 'ground', door: 'arch', left: 'parlor', right: 'foyer' },
  { x: 1300, floor: 'basement', door: 'door', left: 'cellar', right: 'boiler' },
  { x: 2500, floor: 'basement', door: 'solid', left: 'boiler', right: null },
];

export const STAIRS: StairDef[] = [
  { id: 'cellar', a: 'kitchen', b: 'cellar', path: [[760, 1320], [736, 1346], [400, 1690]] },
  { id: 'grand', a: 'foyer', b: 'upperHall', path: [[2470, 1320], [2850, 946], [2880, 920]] },
  { id: 'attic', a: 'upperHall', b: 'nursery', path: [[2640, 920], [2290, 546], [2250, 520]] },
];

/** Fleeing residents walk this after reaching the front door, then are removed. */
export const EXIT_PATH: [number, number][] = [[3150, 1320], [3230, 1320], [3480, 1320], [3540, 1340], [4200, 1340]];

export const LIGHTS: LightDef[] = [
  { id: 'attic_bulb', room: 'attic', x: 780, y: 240, kind: 'bulb', radius: 300, color: 0xffd9a0 },
  { id: 'nursery_nightlight', room: 'nursery', x: 2400, y: 470, kind: 'lamp', radius: 200, color: 0xffc890 },
  { id: 'bath_sconce', room: 'bathroom', x: 470, y: 640, kind: 'sconce', radius: 220, color: 0xffe2b0 },
  { id: 'bed_lamp', room: 'bedroom', x: 1130, y: 812, kind: 'lamp', radius: 260, color: 0xffcf8a, objectId: 'bedLamp' },
  { id: 'study_lamp', room: 'study', x: 1800, y: 800, kind: 'lamp', radius: 240, color: 0xfff0b0, objectId: 'desk' },
  { id: 'hall_sconce_a', room: 'upperHall', x: 2500, y: 650, kind: 'sconce', radius: 230, color: 0xffd9a0 },
  { id: 'hall_sconce_b', room: 'upperHall', x: 2960, y: 650, kind: 'sconce', radius: 230, color: 0xffd9a0 },
  { id: 'kitchen_lamp', room: 'kitchen', x: 500, y: 1010, kind: 'bulb', radius: 320, color: 0xffe0a8 },
  { id: 'dining_chandelier', room: 'dining', x: 1130, y: 1050, kind: 'chandelier', radius: 380, color: 0xffd28a, objectId: 'chandelier' },
  { id: 'parlor_fire', room: 'parlor', x: 2220, y: 1250, kind: 'fire', radius: 360, color: 0xff9a40, objectId: 'fireplace' },
  { id: 'parlor_candle', room: 'parlor', x: 1530, y: 1170, kind: 'candle', radius: 180, color: 0xffc070 },
  { id: 'foyer_lantern', room: 'foyer', x: 3120, y: 1150, kind: 'lantern', radius: 260, color: 0xffcf80 },
  { id: 'foyer_sconce', room: 'foyer', x: 2700, y: 1080, kind: 'sconce', radius: 240, color: 0xffd9a0 },
  { id: 'cellar_bulb', room: 'cellar', x: 820, y: 1380, kind: 'bulb', radius: 280, color: 0xffd090 },
  { id: 'boiler_bulb', room: 'boiler', x: 2100, y: 1380, kind: 'bulb', radius: 280, color: 0xffd090 },
  { id: 'furnace_glow', room: 'boiler', x: 1700, y: 1630, kind: 'fire', radius: 300, color: 0xff7a30, objectId: 'furnace' },
  { id: 'porch_lantern', room: 'outside', x: 3260, y: 1180, kind: 'lantern', radius: 240, color: 0xffcf80 },
  { id: 'lamp_post', room: 'outside', x: 3700, y: 1150, kind: 'lantern', radius: 260, color: 0xffd9a0 },
];

export const POIS: PoiDef[] = [
  { id: 'attic_chair', room: 'attic', x: 700, pose: 'look' },
  { id: 'attic_window', room: 'attic', x: 1000, pose: 'look' },
  { id: 'attic_trunk', room: 'attic', x: 1420, pose: 'look', facing: 1 },
  { id: 'nursery_play', room: 'nursery', x: 2240, pose: 'play', who: ['toby'] },
  { id: 'nursery_horse', room: 'nursery', x: 2120, pose: 'play', facing: -1, who: ['toby'] },
  { id: 'nursery_window', room: 'nursery', x: 2700, pose: 'look' },
  { id: 'nursery_toys', room: 'nursery', x: 2500, pose: 'clean', who: ['nell', 'marigold'] },
  { id: 'bath_sink', room: 'bathroom', x: 380, pose: 'clean', facing: -1 },
  { id: 'bath_tub', room: 'bathroom', x: 640, pose: 'look', facing: -1 },
  { id: 'bed_sit', room: 'bedroom', x: 1000, pose: 'read' },
  { id: 'bed_window', room: 'bedroom', x: 1250, pose: 'look' },
  { id: 'bed_wardrobe', room: 'bedroom', x: 1340, pose: 'clean', facing: 1, who: ['nell'] },
  { id: 'study_desk', room: 'study', x: 1700, pose: 'type', facing: 1, who: ['augustus'] },
  { id: 'study_shelf', room: 'study', x: 2040, pose: 'read', facing: 1 },
  { id: 'study_window', room: 'study', x: 1640, pose: 'look' },
  { id: 'hall_portrait', room: 'upperHall', x: 3000, pose: 'look', facing: 1 },
  { id: 'hall_armor', room: 'upperHall', x: 2730, pose: 'clean', facing: 1, who: ['pruitt', 'nell'] },
  { id: 'hall_mid', room: 'upperHall', x: 2450, pose: 'stand' },
  { id: 'kitchen_stove', room: 'kitchen', x: 380, pose: 'cook', facing: -1, who: ['dobbs'] },
  { id: 'kitchen_sink', room: 'kitchen', x: 505, pose: 'clean', facing: -1 },
  { id: 'kitchen_fridge', room: 'kitchen', x: 600, pose: 'stand', facing: 1 },
  { id: 'dining_seat_a', room: 'dining', x: 1060, pose: 'sit', facing: 1 },
  { id: 'dining_seat_b', room: 'dining', x: 1200, pose: 'sit', facing: -1 },
  { id: 'dining_cabinet', room: 'dining', x: 1300, pose: 'clean', facing: 1, who: ['pruitt', 'nell'] },
  { id: 'parlor_piano', room: 'parlor', x: 1600, pose: 'play', facing: -1, who: ['marigold'] },
  { id: 'parlor_sofa', room: 'parlor', x: 1760, pose: 'sit', who: ['hester', 'augustus', 'marigold'] },
  { id: 'parlor_tv', room: 'parlor', x: 1880, pose: 'tv', facing: 1 },
  { id: 'parlor_phone', room: 'parlor', x: 2030, pose: 'stand', facing: 1 },
  { id: 'parlor_fire', room: 'parlor', x: 2150, pose: 'warm', facing: 1 },
  { id: 'foyer_door', room: 'foyer', x: 3000, pose: 'stand', facing: 1, who: ['pruitt'] },
  { id: 'foyer_clock', room: 'foyer', x: 2460, pose: 'look', facing: -1 },
  { id: 'foyer_coat', room: 'foyer', x: 3040, pose: 'stand', facing: 1 },
  { id: 'cellar_wine', room: 'cellar', x: 900, pose: 'look', facing: 1, who: ['pruitt', 'dobbs', 'augustus'] },
  { id: 'cellar_barrels', room: 'cellar', x: 1100, pose: 'look', facing: 1 },
  { id: 'boiler_furnace', room: 'boiler', x: 1620, pose: 'warm', facing: 1, who: ['pruitt'] },
  { id: 'boiler_washtub', room: 'boiler', x: 2200, pose: 'clean', facing: 1, who: ['nell', 'dobbs'] },
];

export const HIDE_SPOTS: HideSpotDef[] = [
  { id: 'attic_crates', room: 'attic', x: 560, kind: 'behind', capacity: 2 },
  { id: 'nursery_crib', room: 'nursery', x: 1900, kind: 'under', capacity: 1 },
  { id: 'bath_tub', room: 'bathroom', x: 560, kind: 'behind', capacity: 1, objectId: 'bathtub' },
  { id: 'bed_under', room: 'bedroom', x: 960, kind: 'under', capacity: 2, objectId: 'bed' },
  { id: 'wardrobe', room: 'bedroom', x: 1405, kind: 'inside', capacity: 1, objectId: 'wardrobe' },
  { id: 'dining_table', room: 'dining', x: 1130, kind: 'under', capacity: 2 },
  { id: 'parlor_sofa', room: 'parlor', x: 1760, kind: 'behind', capacity: 2 },
  { id: 'cellar_barrels', room: 'cellar', x: 1185, kind: 'behind', capacity: 2 },
  { id: 'boiler_coal', room: 'boiler', x: 1950, kind: 'behind', capacity: 2 },
];

/** Non-hauntable furniture painted by the world art (module A) at these spots. */
export const DECOR: { id: string; room: RoomId; x: number; w: number; h: number }[] = [
  { id: 'crates', room: 'attic', x: 560, w: 150, h: 110 },
  { id: 'crib', room: 'nursery', x: 1900, w: 170, h: 120 },
  { id: 'toyTable', room: 'nursery', x: 2560, w: 110, h: 70 },
  { id: 'stool', room: 'nursery', x: 2880, w: 60, h: 50 },
  { id: 'sink', room: 'bathroom', x: 360, w: 90, h: 100 },
  { id: 'nightstand', room: 'bedroom', x: 1130, w: 70, h: 70 },
  { id: 'counter', room: 'kitchen', x: 505, w: 200, h: 92 },
  { id: 'diningTable', room: 'dining', x: 1130, w: 280, h: 82 },
  { id: 'sofa', room: 'parlor', x: 1760, w: 210, h: 100 },
  { id: 'sideTable', room: 'parlor', x: 2060, w: 50, h: 75 },
  { id: 'rug', room: 'parlor', x: 1880, w: 420, h: 10 },
  { id: 'barrels', room: 'cellar', x: 1185, w: 150, h: 120 },
  { id: 'coal', room: 'boiler', x: 1950, w: 190, h: 90 },
  { id: 'washtub', room: 'boiler', x: 2250, w: 110, h: 70 },
];

/** 29 hauntables. y semantics per `mount` (see HauntablePlacement). */
export const HAUNTABLE_PLACEMENTS: HauntablePlacement[] = [
  // Attic
  { id: 'rockingChair', room: 'attic', x: 760, y: 520, mount: 'floor' },
  { id: 'dressForm', room: 'attic', x: 1180, y: 520, mount: 'floor' },
  { id: 'oldTrunk', room: 'attic', x: 1480, y: 520, mount: 'floor' },
  // Nursery
  { id: 'rockingHorse', room: 'nursery', x: 2050, y: 520, mount: 'floor' },
  { id: 'jackInTheBox', room: 'nursery', x: 2560, y: 450, mount: 'table' },
  { id: 'porcelainDoll', room: 'nursery', x: 2880, y: 470, mount: 'table' },
  // Bathroom
  { id: 'mirror', room: 'bathroom', x: 360, y: 720, mount: 'wall' },
  { id: 'bathtub', room: 'bathroom', x: 560, y: 920, mount: 'floor' },
  // Master bedroom
  { id: 'bed', room: 'bedroom', x: 960, y: 920, mount: 'floor' },
  { id: 'bedLamp', room: 'bedroom', x: 1130, y: 850, mount: 'table' },
  { id: 'curtains', room: 'bedroom', x: 1250, y: 700, mount: 'wall' },
  { id: 'wardrobe', room: 'bedroom', x: 1405, y: 920, mount: 'floor' },
  // Study
  { id: 'desk', room: 'study', x: 1760, y: 920, mount: 'floor' },
  { id: 'stagHead', room: 'study', x: 1900, y: 650, mount: 'wall' },
  { id: 'bookshelf', room: 'study', x: 2080, y: 920, mount: 'floor' },
  // Upper hall
  { id: 'suitOfArmor', room: 'upperHall', x: 2780, y: 920, mount: 'floor' },
  { id: 'portrait', room: 'upperHall', x: 3040, y: 650, mount: 'wall' },
  // Kitchen
  { id: 'stove', room: 'kitchen', x: 330, y: 1320, mount: 'floor' },
  { id: 'refrigerator', room: 'kitchen', x: 650, y: 1320, mount: 'floor' },
  // Dining
  { id: 'chandelier', room: 'dining', x: 1130, y: 946, mount: 'ceiling' },
  { id: 'chinaCabinet', room: 'dining', x: 1355, y: 1320, mount: 'floor' },
  // Parlor
  { id: 'piano', room: 'parlor', x: 1560, y: 1320, mount: 'floor' },
  { id: 'television', room: 'parlor', x: 1960, y: 1320, mount: 'floor' },
  { id: 'telephone', room: 'parlor', x: 2060, y: 1245, mount: 'table' },
  { id: 'fireplace', room: 'parlor', x: 2220, y: 1320, mount: 'floor' },
  // Foyer
  { id: 'grandfatherClock', room: 'foyer', x: 2405, y: 1320, mount: 'floor' },
  { id: 'coatStand', room: 'foyer', x: 3080, y: 1320, mount: 'floor' },
  // Basement
  { id: 'wineRack', room: 'cellar', x: 950, y: 1690, mount: 'floor' },
  { id: 'furnace', room: 'boiler', x: 1700, y: 1690, mount: 'floor' },
];

export const PLACEMENT_BY_ID = Object.fromEntries(HAUNTABLE_PLACEMENTS.map((p) => [p.id, p])) as Record<string, HauntablePlacement>;

export const NPC_STARTS: Record<string, { room: RoomId; x: number }> = {
  augustus: { room: 'study', x: 1700 },
  marigold: { room: 'parlor', x: 1600 },
  toby: { room: 'nursery', x: 2240 },
  hester: { room: 'parlor', x: 1760 },
  pruitt: { room: 'foyer', x: 3000 },
  nell: { room: 'bathroom', x: 380 },
  dobbs: { room: 'kitchen', x: 380 },
};

export const GHOST_START = { x: 1000, y: 420 };
