import type { ObjectDef } from '../types';
import { HAUNTABLE_PLACEMENTS } from '../world/layout';
import { UPPER_OBJECTS } from './objectsUpper';
import { LOWER_OBJECTS } from './objectsLower';

const BY_ID = new Map<string, ObjectDef>([...UPPER_OBJECTS, ...LOWER_OBJECTS].map((d) => [d.id, d]));

/** All hauntables, in HAUNTABLE_PLACEMENTS order (ids missing a def are skipped until written). */
export const OBJECTS: ObjectDef[] = HAUNTABLE_PLACEMENTS.map((p) => BY_ID.get(p.id)).filter((d): d is ObjectDef => !!d);
