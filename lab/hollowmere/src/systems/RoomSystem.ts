// RoomSystem — the house as a graph. Nodes are rooms; edges are interior walls
// with a doorway (WALLS, non-solid) and the three staircases (STAIRS). Used by
// the FearSystem (hop distance = how far a sound carries) and NPCController
// (routes). The graph is a tree, so every route is unique and BFS is exact.

import type { FloorId, IRooms, RoomDef, RoomId } from '../types';
import { ATTIC_POLY, FLOORS, ROOMS, ROOM_BY_ID, STAIRS, WALLS } from '../world/layout';
import { HOUSE } from '../config';

type Edge =
  | { kind: 'wall'; to: RoomId; x: number }
  | { kind: 'stair'; to: RoomId; stair: number; reverse: boolean };

export class RoomSystem implements IRooms {
  readonly list: RoomDef[] = ROOMS;

  private adj = new Map<RoomId, Edge[]>();
  private dist = new Map<string, number>();
  private next = new Map<string, Edge>(); // `${from}>${to}` → first edge on the shortest path
  private byFloor = new Map<FloorId, RoomDef[]>();

  constructor() {
    for (const r of ROOMS) this.adj.set(r.id, []);
    for (const w of WALLS) {
      if (!w.right || w.door === 'solid') continue;
      this.adj.get(w.left)!.push({ kind: 'wall', to: w.right, x: w.x });
      this.adj.get(w.right)!.push({ kind: 'wall', to: w.left, x: w.x });
    }
    STAIRS.forEach((s, i) => {
      this.adj.get(s.a)!.push({ kind: 'stair', to: s.b, stair: i, reverse: false });
      this.adj.get(s.b)!.push({ kind: 'stair', to: s.a, stair: i, reverse: true });
    });
    for (const r of ROOMS) {
      const arr = this.byFloor.get(r.floor) ?? [];
      arr.push(r);
      this.byFloor.set(r.floor, arr);
      this.bfs(r.id);
    }
  }

  /** All-pairs hop distance + first-hop table, one BFS per source. */
  private bfs(src: RoomId): void {
    const seen = new Set<RoomId>([src]);
    const queue: { id: RoomId; d: number; first: Edge | null }[] = [{ id: src, d: 0, first: null }];
    this.dist.set(`${src}>${src}`, 0);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of this.adj.get(cur.id)!) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        const first = cur.first ?? e;
        this.dist.set(`${src}>${e.to}`, cur.d + 1);
        this.next.set(`${src}>${e.to}`, first);
        queue.push({ id: e.to, d: cur.d + 1, first });
      }
    }
  }

  get(id: RoomId): RoomDef {
    return ROOM_BY_ID[id];
  }

  floorOf(id: RoomId): FloorId {
    return ROOM_BY_ID[id].floor;
  }

  neighbors(id: RoomId): RoomId[] {
    return this.adj.get(id)!.map((e) => e.to);
  }

  distance(a: RoomId, b: RoomId): number {
    return this.dist.get(`${a}>${b}`) ?? 99;
  }

  /**
   * Room containing a world point. Each floor owns [ceil, floor + slab): the slab
   * belongs to the room above it, so a point exactly at feet level is in that room.
   * Attic rooms are clipped to the sloped mansard polygon.
   */
  at(x: number, y: number): RoomId | null {
    for (const f of ['attic', 'upper', 'ground', 'basement'] as FloorId[]) {
      const fl = FLOORS[f];
      if (y < fl.ceil || y >= fl.floor + HOUSE.slab) continue;
      if (f === 'attic' && !this.inAtticPoly(x, y)) return null;
      for (const r of this.byFloor.get(f)!) if (x >= r.x0 && x < r.x1) return r.id;
      // exactly on the east edge of a floor's last room
      const rooms = this.byFloor.get(f)!;
      const last = rooms[rooms.length - 1];
      if (x === last.x1) return last.id;
      return null;
    }
    return null;
  }

  private inAtticPoly(x: number, y: number): boolean {
    const [bl, tl, tr, br] = ATTIC_POLY;
    if (y >= bl[1]) return x >= bl[0] && x <= br[0];
    const t = (y - tl[1]) / (bl[1] - tl[1]); // 0 at the ridge corner, 1 at the eave
    const left = tl[0] + (bl[0] - tl[0]) * t;
    const right = tr[0] + (br[0] - tr[0]) * t;
    return x >= left && x <= right;
  }

  /**
   * Feet waypoints from (fromX in fromRoom) to (toX in toRoom), excluding the start
   * point. Doorways contribute a waypoint at the wall; stairs contribute the walk to
   * the stair foot and then the whole path polyline (reversed when descending the
   * other way).
   */
  route(fromRoom: RoomId, fromX: number, toRoom: RoomId, toX: number): [number, number][] {
    void fromX;
    const out: [number, number][] = [];
    let cur = fromRoom;
    let guard = 0;
    while (cur !== toRoom && guard++ < 16) {
      const e = this.next.get(`${cur}>${toRoom}`);
      if (!e) break;
      const fy = ROOM_BY_ID[cur].floorY;
      if (e.kind === 'wall') {
        out.push([e.x, fy]);
      } else {
        const p = STAIRS[e.stair].path;
        const seq = e.reverse ? [...p].reverse() : p;
        for (const pt of seq) out.push([pt[0], pt[1]]);
      }
      cur = e.to;
    }
    const dest = ROOM_BY_ID[toRoom];
    const x = Math.max(dest.walk[0], Math.min(dest.walk[1], toX));
    out.push([x, dest.floorY]);
    return out;
  }

  /** Doorway x between two adjacent rooms (null for stairs / non-adjacent). */
  doorX(a: RoomId, b: RoomId): number | null {
    for (const e of this.adj.get(a)!) if (e.kind === 'wall' && e.to === b) return e.x;
    return null;
  }

  /** The room holding the staircase foot for a hop, if the hop is a stair. */
  isStairHop(a: RoomId, b: RoomId): boolean {
    for (const e of this.adj.get(a)!) if (e.kind === 'stair' && e.to === b) return true;
    return false;
  }
}
