// The seven residents of Hollowmere House. Traits are tuned so each one reacts
// like a person: Augustus dismisses, Nell shrieks, Hester barely hears, Toby
// walks toward the noise.

import type { NpcDef } from '../types';
import { NPC_STARTS } from '../world/layout';

export const NPCS: NpcDef[] = [
  {
    id: 'augustus',
    name: 'Augustus Fairweather',
    short: 'Augustus',
    initials: 'AF',
    role: 'the skeptic',
    height: 158,
    palette: { skin: 0xe8bf9a, hair: 0x4b3425, top: 0x8a3340, bottom: 0x35364a, accent: 0xefe2c4 },
    traits: { courage: 0.68, curiosity: 0.35, awareness: 0.5, skepticism: 0.88, speed: 90, hearing: 1, pitch: 108 },
    start: NPC_STARTS.augustus,
    home: ['study_desk', 'study_shelf', 'parlor_sofa', 'parlor_fire', 'cellar_wine', 'foyer_door'],
  },
  {
    id: 'marigold',
    name: 'Marigold Fairweather',
    short: 'Marigold',
    initials: 'MF',
    role: 'the mother',
    height: 150,
    palette: { skin: 0xf1cdb2, hair: 0x8e4b2c, top: 0x7d4a7c, bottom: 0x5b3359, accent: 0xe8c372 },
    traits: { courage: 0.42, curiosity: 0.45, awareness: 0.66, skepticism: 0.3, speed: 84, hearing: 1, pitch: 215 },
    start: NPC_STARTS.marigold,
    home: ['parlor_piano', 'parlor_sofa', 'nursery_toys', 'bed_window', 'dining_seat_a', 'parlor_fire'],
  },
  {
    id: 'toby',
    name: 'Toby Fairweather',
    short: 'Toby',
    initials: 'TF',
    role: 'the curious child',
    height: 102,
    palette: { skin: 0xf3cba6, hair: 0xc88a3c, top: 0x3f7f78, bottom: 0x3c4670, accent: 0xe9b04a },
    traits: { courage: 0.5, curiosity: 0.96, awareness: 0.72, skepticism: 0.08, speed: 108, hearing: 1, pitch: 335 },
    start: NPC_STARTS.toby,
    home: ['nursery_play', 'nursery_horse', 'nursery_window', 'attic_trunk', 'attic_chair', 'parlor_tv'],
  },
  {
    id: 'hester',
    name: 'Great-Aunt Hester',
    short: 'Hester',
    initials: 'GH',
    role: 'the brave one',
    height: 142,
    palette: { skin: 0xe3c2aa, hair: 0xe4e0dc, top: 0x66679a, bottom: 0x4a4b76, accent: 0xb85f6e },
    traits: { courage: 0.88, curiosity: 0.5, awareness: 0.4, skepticism: 0.6, speed: 70, hearing: 0.45, pitch: 188 },
    start: NPC_STARTS.hester,
    home: ['parlor_sofa', 'parlor_fire', 'parlor_tv', 'dining_seat_b', 'bed_window', 'foyer_clock'],
  },
  {
    id: 'pruitt',
    name: 'Mr. Pruitt',
    short: 'Pruitt',
    initials: 'MP',
    role: 'the butler',
    height: 178,
    palette: { skin: 0xdcb598, hair: 0x9a9aa4, top: 0x25252f, bottom: 0x25252f, accent: 0xf4ecd8 },
    traits: { courage: 0.66, curiosity: 0.3, awareness: 0.92, skepticism: 0.6, speed: 88, hearing: 1, pitch: 98 },
    start: NPC_STARTS.pruitt,
    home: ['foyer_door', 'dining_cabinet', 'hall_armor', 'cellar_wine', 'boiler_furnace', 'foyer_clock'],
  },
  {
    id: 'nell',
    name: 'Nell',
    short: 'Nell',
    initials: 'N',
    role: 'the maid',
    height: 146,
    palette: { skin: 0xf1c9ac, hair: 0x3b2b25, top: 0x3b4a66, bottom: 0x2d3650, accent: 0xf5f0e4 },
    traits: { courage: 0.12, curiosity: 0.4, awareness: 0.86, skepticism: 0.08, speed: 106, hearing: 1, pitch: 262 },
    start: NPC_STARTS.nell,
    home: ['bath_sink', 'bed_wardrobe', 'nursery_toys', 'hall_armor', 'dining_cabinet', 'boiler_washtub'],
  },
  {
    id: 'dobbs',
    name: 'Mrs. Dobbs',
    short: 'Dobbs',
    initials: 'MD',
    role: 'the cook',
    height: 148,
    palette: { skin: 0xe8b696, hair: 0x9d9ca6, top: 0x8b5d3d, bottom: 0x5b3a2a, accent: 0xeadfc2 },
    traits: { courage: 0.3, curiosity: 0.25, awareness: 0.5, skepticism: 0.05, speed: 78, hearing: 1, pitch: 198 },
    start: NPC_STARTS.dobbs,
    home: ['kitchen_stove', 'kitchen_sink', 'kitchen_fridge', 'dining_seat_a', 'boiler_washtub', 'cellar_wine'],
  },
];

// Party guests. They reuse a resident's body/face art (`look`) with their own
// colours, arrive through the front door at `at` seconds after the player's first
// input, then mingle. Courage/skepticism vary so some hold out and some bolt.
const PARTY = ['parlor_sofa', 'parlor_fire', 'parlor_piano', 'dining_seat_a', 'dining_seat_b', 'foyer_coat', 'foyer_clock', 'dining_cabinet'];
const guest = (
  id: string, name: string, role: string, look: string, at: number,
  palette: NpcDef['palette'], t: Partial<NpcDef['traits']>,
): { def: NpcDef; at: number } => {
  const base = NPCS.find((n) => n.id === look)!;
  return {
    at,
    def: {
      id, name, short: name.split(' ')[0], initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2),
      role, height: base.height, palette, look,
      traits: { ...base.traits, ...t },
      start: { room: 'foyer', x: 3140 }, home: PARTY,
    },
  };
};

export const GUEST_ARRIVALS = [
  guest('cordelia', 'Lady Cordelia Voss', 'the socialite', 'marigold', 14, { skin: 0xf3d2b8, hair: 0x2c2230, top: 0x2f7a63, bottom: 0x1f5444, accent: 0xe8d9a8 }, { courage: 0.35, curiosity: 0.55, skepticism: 0.2, pitch: 230 }),
  guest('bram', 'Bram Quill', 'the poet', 'augustus', 20, { skin: 0xd9a77f, hair: 0x2a2a35, top: 0x3a4f86, bottom: 0x2b2f48, accent: 0xe9e0c8 }, { courage: 0.3, curiosity: 0.7, skepticism: 0.2, pitch: 118 }),
  guest('percy', 'Percy Dunmore', 'the nephew', 'toby', 52, { skin: 0xe9bf9b, hair: 0x5a3320, top: 0xb5483d, bottom: 0x303a5c, accent: 0xf1d9a0 }, { courage: 0.62, curiosity: 0.9, skepticism: 0.15 }),
  guest('imogen', 'Imogen Pell', 'the art dealer', 'marigold', 58, { skin: 0xc99573, hair: 0x1d1a1f, top: 0xb04d6e, bottom: 0x7a2f4c, accent: 0xf0d9c4 }, { courage: 0.5, curiosity: 0.4, skepticism: 0.5, pitch: 205 }),
  guest('felix', 'Felix Ashby', 'the gambler', 'augustus', 96, { skin: 0xe8c3a2, hair: 0x9a6a2e, top: 0xc99a2e, bottom: 0x3b3a2f, accent: 0x5a2d2d }, { courage: 0.72, curiosity: 0.3, skepticism: 0.75, pitch: 104 }),
  guest('wendeline', 'Aunt Wendeline', 'the gossip', 'hester', 102, { skin: 0xe6c7b0, hair: 0xd8d2cc, top: 0x3f8f8b, bottom: 0x2d6360, accent: 0xe0b0c0 }, { courage: 0.3, curiosity: 0.7, skepticism: 0.25, hearing: 1, speed: 74, pitch: 205 }),
  guest('lucan', 'Dr. Lucan Hale', 'the physician', 'augustus', 142, { skin: 0xb98660, hair: 0x4a4a52, top: 0x5b6670, bottom: 0x2f3338, accent: 0xe4ddd0 }, { courage: 0.8, curiosity: 0.5, skepticism: 0.9, pitch: 112 }),
  guest('octavia', 'Octavia Marsh', 'the widow', 'marigold', 148, { skin: 0xeccdb4, hair: 0x6b6b78, top: 0x4b3a63, bottom: 0x2f2542, accent: 0xcbb8e0 }, { courage: 0.22, curiosity: 0.45, skepticism: 0.1, pitch: 190 }),
];
export const GUESTS: NpcDef[] = GUEST_ARRIVALS.map((g) => g.def);
export const TOTAL_PEOPLE = NPCS.length + GUESTS.length;

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries([...NPCS, ...GUESTS].map((n) => [n.id, n]));
