// FearSystem — turns scare events into per-resident impact (DESIGN "People").
// Listens to ctx.events 'scare'. For each resident it works out how well they
// perceived the event (sight / hearing / room distance), applies novelty
// damping, skepticism, group effects, then calls npc.react(impact, ev) and
// feeds the haunting intensity. Scream contagion: NPCController emits
// 'npc:scream'; this system counts it and re-broadcasts it as a `scream` scare.
//
// Note: HauntableObject already multiplies ev.scare by ctx.intensity.scareMult,
// so it is NOT applied again here.

import { FEAR } from '../config';
import type { GameCtx, IFear, INPC, RoomId, ScareEvent } from '../types';

const RECENT_WINDOW = 14; // s — "recentScares" memory
const NOVELTY_RECOVER = 28; // s per repeat forgotten
const HEAT_DECAY = 7; // s for a room's heat to fall off
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

interface Memory { count: number; t: number }

export class FearSystem implements IFear {
  totalScreams = 0;

  private memory = new Map<string, Map<string, Memory>>(); // npcId → signature → seen
  private recent = new Map<string, number[]>(); // npcId → timestamps (s)
  private heat = new Map<RoomId, number>(); // room → recent big-scare weight
  private clock = 0;
  private depth = 0;

  constructor(private ctx: GameCtx) {
    ctx.events.on('scare', (ev: ScareEvent) => this.broadcast(ev));
    ctx.events.on('npc:scream', (e: { npcId: string }) => this.onScream(e.npcId));
    ctx.events.on('npc:fled', () => ctx.intensity.addFled());
  }

  /** How strongly a room should be avoided by routines (0..~60). */
  roomHeat(room: RoomId): number {
    return this.heat.get(room) ?? 0;
  }

  /** Last-N-seconds scare count for a resident. */
  recentScares(npcId: string): number {
    return this.recent.get(npcId)?.length ?? 0;
  }

  private onScream(npcId: string): void {
    this.totalScreams++;
    const n = this.ctx.npcs.find((p) => p.id === npcId);
    if (!n) return;
    this.broadcast({
      kind: 'scream',
      x: n.x,
      y: n.y - n.def.height * 0.6,
      room: n.room,
      scare: 0.18 * (Math.max(30, n.panic) / 100),
      noise: 1.0,
      sourceId: npcId,
      visual: false,
      signature: `scream:${npcId}`,
    });
  }

  broadcast(ev: ScareEvent): void {
    if (this.depth > 3) return;
    this.depth++;
    const hot = ev.scare >= 0.4 || ev.kind === 'scream';
    if (hot) this.heat.set(ev.room, Math.min(60, (this.heat.get(ev.room) ?? 0) + ev.scare * 50));
    for (const n of this.ctx.npcs) {
      if (n.fled || n.state === 'gone' || n.arriving || n.id === ev.sourceId) continue;
      const p = this.perceive(n, ev);
      if (p <= 0) continue;
      const impact = this.impactFor(n, ev, p);
      if (impact < 0.8) continue;
      this.remember(n, ev);
      n.react(impact, ev);
      this.ctx.intensity.addFear(impact);
    }
    this.depth--;
  }

  /** 0 = not perceived, else a multiplier for the impact. */
  private perceive(n: INPC, ev: ScareEvent): number {
    const t = n.def.traits;
    const hidden = n.hidingIn !== null;
    const own = hidden && ev.sourceId === n.hidingIn;
    const subtle = ev.scare < 0.2;
    let best = 0;

    if (ev.room === n.room) {
      if (ev.visual && (!hidden || own)) {
        const toward = Math.sign(ev.x - n.x) || n.facing;
        const facing = toward === n.facing;
        const gate = Math.min(1, 0.4 + 0.8 * t.awareness) * (facing ? 1 : 0.55);
        if (!subtle || Math.random() < gate) best = facing ? 1 : 0.8;
      }
      if (!ev.visual || ev.noise > 0.15) {
        // heard in the room: even a hard-of-hearing guest catches a close sound
        const heard = (0.55 + 0.45 * t.hearing) * (ev.visual ? 0.6 : 1);
        best = Math.max(best, heard);
      }
      if (hidden && !own) best *= 0.8; // muffled in cover
    } else {
      const d = this.ctx.rooms.distance(ev.room, n.room);
      let carry = 0;
      if (d === 1 && ev.noise >= 0.5) carry = 0.4 * ev.noise;
      else if (d === 2 && ev.noise >= 1.2) carry = 0.2 * ev.noise;
      if (carry > 0) {
        if (this.ctx.rooms.floorOf(ev.room) !== this.ctx.rooms.floorOf(n.room)) carry *= 0.8;
        best = carry * t.hearing;
      }
    }
    return best;
  }

  private impactFor(n: INPC, ev: ScareEvent, perception: number): number {
    const t = n.def.traits;
    let novelty = 1;
    if (ev.kind === 'haunt') {
      const m = this.memory.get(n.id)?.get(ev.signature);
      if (m) {
        const forgot = (this.clock - m.t) / NOVELTY_RECOVER;
        const eff = Math.max(0, m.count - forgot);
        novelty = Math.max(0.25, Math.pow(0.62, eff));
      }
    }
    const recent = this.recent.get(n.id)?.length ?? 0;
    const dark = ev.dark || this.ctx.world.isDark(n.room) ? 1.35 : 1;

    let group = 1;
    let calmCompany = false;
    let panicking = false;
    for (const o of this.ctx.npcs) {
      if (o === n || o.fled || o.room !== n.room || o.hidingIn) continue;
      if (o.panic > 40) panicking = true;
      else calmCompany = true;
    }
    if (panicking) group = 1.3;
    else if (calmCompany) group = 0.85;

    // skepticism: shrugs off small effects while still calm
    let skeptic = 1;
    if (ev.kind === 'haunt' && (ev.tier ?? 1) <= 2) {
      const calm = Math.max(0, 1 - n.fear / 40);
      skeptic = 1 - t.skepticism * (ev.tier === 2 ? 0.3 : 0.65) * calm;
    }
    const own = n.hidingIn !== null && n.hidingIn === ev.sourceId ? 2 : 1;

    return ev.scare * 100 * novelty * (1 - 0.55 * t.courage) * (1 + 0.6 * n.fear / 100) *
      (1 + 0.15 * recent) * dark * group * skeptic * own * perception * rnd(0.8, 1.2);
  }

  private remember(n: INPC, ev: ScareEvent): void {
    let mem = this.memory.get(n.id);
    if (!mem) this.memory.set(n.id, (mem = new Map()));
    const m = mem.get(ev.signature);
    if (m) {
      m.count = Math.max(0, m.count - (this.clock - m.t) / NOVELTY_RECOVER) + 1;
      m.t = this.clock;
    } else mem.set(ev.signature, { count: 1, t: this.clock });
    if (ev.kind === 'haunt' && ev.scare >= 0.1) {
      let r = this.recent.get(n.id);
      if (!r) this.recent.set(n.id, (r = []));
      r.push(this.clock);
    }
  }

  /** Scared people rub off on nearby calmer ones — a little, never enough to flee on its own. */
  private contagion(dt: number): void {
    const list = this.ctx.npcs;
    for (const a of list) {
      if (a.fled || a.arriving || a.hidingIn) continue;
      const src = Math.max(a.panic, a.fear * 0.6);
      if (src < 25) continue;
      for (const b of list) {
        if (b === a || b.fled || b.arriving || b.room !== a.room || b.fear >= a.fear) continue;
        const d = Math.abs(b.x - a.x);
        if (d > FEAR.contagionRange) continue;
        b.catchFear(FEAR.contagionRate * (src / 100) * (1 - d / FEAR.contagionRange) * dt);
      }
    }
  }

  update(dt: number): void {
    this.clock += dt;
    this.contagion(dt);
    for (const [id, r] of this.recent) {
      while (r.length && this.clock - r[0] > RECENT_WINDOW) r.shift();
      if (!r.length) this.recent.delete(id);
    }
    for (const [room, h] of this.heat) {
      const nh = h - (dt * 60) / HEAT_DECAY;
      if (nh <= 0) this.heat.delete(room);
      else this.heat.set(room, nh);
    }
  }
}
