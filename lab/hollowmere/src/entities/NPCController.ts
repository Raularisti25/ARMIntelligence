// NPCController — one resident of Hollowmere. A paper-doll rig of Containers
// (legs / torso / arms / head+face+hat) animated by transforms only, driven by
// a small behaviour state machine: routine at POIs → glance / investigate →
// startled → nervous / group → scream → run → stumble → hide → flee (out the
// front door, then removed). FearSystem decides how hard a scare hit and calls
// react(impact, ev); this class decides what the person DOES about it.
//
// Rig conventions (see art/characterArt.ts): figures face +x, the whole root is
// mirrored with scaleX = facing; limbs pivot at hip/shoulder/neck. Rotation
// sign: NEGATIVE swings a limb/head forward-or-back "up and toward +x"
// (arms forward = negative), POSITIVE body rotation falls forward.

import Phaser from 'phaser';
import type {
  Emote, Face, GameCtx, HideSpotDef, INPC, NpcDef, NpcState, PoiDef, Pose, RoomId, ScareEvent,
} from '../types';
import { ART, DEPTH, FEAR } from '../config';
import { EMOTE_KEYS, RIGS, type Rig } from '../art/characterArt';
import { EXIT_PATH, HIDE_SPOTS, POIS, ROOM_BY_ID } from '../world/layout';

const S = 1 / ART;
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const mixCol = (a: number, b: number, k: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const approach = (cur: number, tgt: number, k: number, dt: number): number => cur + (tgt - cur) * (1 - Math.exp(-k * dt));

interface Shared { poi: Map<string, string>; hide: Map<string, Set<string>> }
const SHARED = new WeakMap<object, Shared>();
function sharedFor(ctx: GameCtx): Shared {
  let s = SHARED.get(ctx);
  if (!s) SHARED.set(ctx, (s = { poi: new Map(), hide: new Map() }));
  return s;
}

interface Goal { onArrive: () => void; speed: number }
interface Pz {
  swing: number; armSwing: number; armL: number; armR: number; lean: number; crouch: number;
  sit: number; fall: number; headRot: number; flail: number; tremble: number;
}
const newPz = (): Pz => ({ swing: 0, armSwing: 0, armL: 0.06, armR: 0.06, lean: 0, crouch: 0, sit: 0, fall: 0, headRot: 0, flail: 0, tremble: 0 });

const PROP_FOR: Partial<Record<Pose, string>> = {
  read: 'npc:prop:book', cook: 'npc:prop:spoon', clean: 'npc:prop:duster', play: 'npc:prop:toy',
};

export class NPCController implements INPC {
  readonly id: string;
  x: number;
  y: number;
  room: RoomId;
  facing: 1 | -1 = 1;
  fear = 0;
  panic = 0;
  state: NpcState = 'idle';
  hidingIn: string | null = null;
  readonly container: Phaser.GameObjects.Container;
  fled = false;
  arriving = false;

  private rig: Rig;
  private sh: Shared;
  private body: Phaser.GameObjects.Container;
  private upper: Phaser.GameObjects.Container;
  private headC: Phaser.GameObjects.Container;
  private armLC: Phaser.GameObjects.Container;
  private armRC: Phaser.GameObjects.Container;
  private legL: Phaser.GameObjects.Image;
  private legR: Phaser.GameObjects.Image;
  private faceImg: Phaser.GameObjects.Image;
  private prop: Phaser.GameObjects.Image;
  private cane: Phaser.GameObjects.Image | null = null;
  private emoteImg: Phaser.GameObjects.Image;
  private bar: Phaser.GameObjects.Graphics;
  private barA = 0;
  private worryT = rnd(1, 3);

  private pz = newPz();
  private maxFear = 0;
  private t = rnd(0, 20);
  private phase = 0;
  private stepIdx = 0;
  private moved = 0; // distance walked this frame
  private timer = 0; // time in current state
  private stateDur = 0;

  private route: [number, number][] = [];
  private goal: Goal | null = null;
  private queued: { room: RoomId; x: number; goal: Goal } | null = null;
  private exiting = false;

  private poi: PoiDef | null = null;
  private routineT = 0;
  private chatT = rnd(3, 8);
  private arrived = false; // investigate: reached the source
  private resumeState: NpcState | null = null;
  private last: { x: number; room: RoomId; id: string } | null = null;
  private spot: HideSpotDef | null = null;
  private hideT = 0;
  private whimperT = 0;
  private followInvestigate = false;
  private groupTried = false;
  private headFlip: 1 | -1 = 1;
  private flipT = 0;
  private blinkT = rnd(2, 5);
  private blinkLeft = 0;
  private curFace: Face = 'calm';
  private emoteT = 99;
  private emoteDur = 1.3;
  private stumbleT = 0.5;
  private presenceT = 0;
  private screamCool = 0;
  private hopT = 0;
  private pending: (() => void)[] = [];
  private hum = rnd(6, 14);
  private baseDepth = DEPTH.npc;

  constructor(private ctx: GameCtx, readonly def: NpcDef, arrive = false) {
    this.id = def.id;
    this.rig = RIGS[def.id];
    this.sh = sharedFor(ctx);
    this.x = def.start.x;
    this.room = def.start.room;
    this.y = ROOM_BY_ID[this.room].floorY;
    this.facing = Math.random() < 0.5 ? 1 : -1;

    const sc = ctx.scene;
    const r = this.rig;
    const img = (ref: { key: string; ox: number; oy: number }, x = 0, y = 0): Phaser.GameObjects.Image =>
      sc.add.image(x, y, ref.key).setOrigin(ref.ox, ref.oy).setScale(S);

    const shadow = sc.add.image(0, 2, 'npc:shadow').setScale(S * (def.height / 150) * 1.1);
    this.legL = img(r.legL, 0, r.hipY);
    this.legR = img(r.legR, 0, r.hipY);

    this.armLC = sc.add.container(0, r.shoulderY).add(img(r.armL));
    this.armRC = sc.add.container(0, r.shoulderY).add(img(r.armR));
    this.prop = sc.add.image(0, r.handLen, 'npc:prop:book').setScale(S).setVisible(false);
    this.armRC.add(this.prop);

    this.headC = sc.add.container(0, r.neckY);
    this.faceImg = sc.add.image(0, 0, r.faceKey('calm')).setOrigin(r.head.ox, r.head.oy).setScale(S);
    this.headC.add([img(r.head), this.faceImg]);
    if (r.hat) this.headC.add(img(r.hat));

    this.upper = sc.add.container(0, r.hipY);
    if (r.tails) this.upper.add(img(r.tails, r.tails.x, r.tails.y));
    this.upper.add([this.armLC, img(r.torso)]);
    if (r.apron) this.upper.add(img(r.apron, r.apron.x, r.apron.y));
    this.upper.add([this.headC, this.armRC]);

    this.body = sc.add.container(0, 0, [this.legL, this.legR, this.upper]);
    if (r.cane) {
      this.cane = img(r.cane, 16, 0);
      this.body.add(this.cane);
    }

    let h = 0;
    for (const ch of def.id) h = (h * 31 + ch.charCodeAt(0)) % 97;
    this.baseDepth = DEPTH.npc + h * 0.002;
    this.container = sc.add.container(this.x, this.y, [shadow, this.body]).setDepth(this.baseDepth);
    this.emoteImg = sc.add.image(0, 0, EMOTE_KEYS['!']).setOrigin(0.5, 1).setScale(S).setDepth(DEPTH.emote).setVisible(false);

    this.bar = sc.add.graphics().setDepth(DEPTH.emote - 1);
    this.timer = 0;
    this.stateDur = rnd(0.4, 4.5);
    if (arrive) this.beginArrival();
    this.applyFacing();
    this.syncContainer();
  }

  /** Party guest: appear outside, walk in the front door, greet, then mingle. */
  private beginArrival(): void {
    const path = EXIT_PATH.map((p) => [p[0], p[1]] as [number, number]).reverse();
    this.x = path[0][0];
    this.y = path[0][1];
    this.facing = -1;
    this.arriving = true;
    this.exiting = true;
    this.route = path.slice(1);
    this.goal = {
      speed: 1,
      onArrive: () => {
        this.exiting = false;
        this.arriving = false;
        this.y = ROOM_BY_ID.foyer.floorY;
        this.emote('♪');
        this.say('hmm', 0.6);
        this.setState('idle');
        this.stateDur = rnd(1.2, 2.4);
      },
    };
    this.setState('walk');
  }

  /** Contagious fear: a little, from a scared neighbour. Never flips behaviour. */
  catchFear(amount: number): void {
    if (this.fled || this.hidingIn) return;
    const before = this.fear;
    this.fear = Math.min(FEAR.contagionCap, this.fear + amount * (1 - 0.5 * this.def.traits.courage));
    this.panic = Math.min(40, this.panic + amount * 0.6);
    this.maxFear = Math.max(this.maxFear, this.fear);
    if (before < FEAR.worried && this.fear >= FEAR.worried && this.state !== 'flee') this.emote('?');
  }

  // ------------------------------------------------------------ helpers ----

  private say(kind: Parameters<GameCtx['audio']['voice']>[0], vol = 0.8): void {
    this.ctx.audio.voice(kind, this.def.traits.pitch, this.x, this.y - this.def.height * 0.7, vol);
  }

  private setState(s: NpcState): void {
    this.timer = 0;
    if (this.state === s) return;
    this.state = s;
    this.ctx.events.emit('npc:state', { npcId: this.id, state: s });
  }

  private applyFacing(): void {
    this.container.scaleX = this.facing;
  }

  private face(d: number): void {
    if (d !== 0) {
      this.facing = d > 0 ? 1 : -1;
      this.applyFacing();
    }
  }

  private syncContainer(): void {
    this.container.setPosition(this.x, this.y);
  }

  private onStairs(): boolean {
    return !this.exiting && Math.abs(this.y - ROOM_BY_ID[this.room].floorY) > 3;
  }

  private heat(room: RoomId): number {
    const f = this.ctx.fear as unknown as { roomHeat?: (r: RoomId) => number };
    return f.roomHeat ? f.roomHeat(room) : 0;
  }

  private others(): INPC[] {
    return this.ctx.npcs.filter((o) => o !== this && !o.fled && o.state !== 'gone');
  }

  emote(e: Emote): void {
    this.emoteImg.setTexture(EMOTE_KEYS[e]);
    this.emoteT = 0;
    this.emoteDur = e === '!!' ? 1.7 : e === 'sweat' ? 1.8 : 1.3;
    this.emoteImg.setVisible(true);
  }

  // ------------------------------------------------------------ walking ----

  private walkTo(room: RoomId, x: number, speed: number, onArrive: () => void): void {
    const goal: Goal = { onArrive, speed };
    if (this.onStairs() && this.route.length) {
      this.queued = { room, x, goal };
      return;
    }
    this.queued = null;
    this.route = this.ctx.rooms.route(this.room, this.x, room, x);
    this.goal = goal;
    if (!this.route.length) this.finishRoute();
  }

  /** Drop the current route unless mid-staircase (must finish the flight to stay on the floor). */
  private clearRoute(): void {
    if (this.onStairs() && this.route.length) {
      if (this.goal) this.goal = { speed: this.goal.speed, onArrive: () => {} };
      return;
    }
    this.route = [];
    this.goal = null;
    this.queued = null;
  }

  private finishRoute(): void {
    const g = this.goal;
    this.goal = null;
    this.route = [];
    if (g) g.onArrive();
  }

  /** Advance along the route; returns distance moved. */
  private stepRoute(dt: number, speedMul: number): number {
    if (!this.route.length) return 0;
    const sp = this.def.traits.speed * speedMul;
    const [tx, ty] = this.route[0];
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = sp * dt;
    let moved = 0;
    if (dist <= step) {
      this.x = tx;
      this.y = ty;
      moved = dist;
      this.route.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      moved = step;
    }
    if (Math.abs(dx) > 0.5) this.face(dx);
    const r = this.ctx.rooms.at(this.x, this.y - 2);
    if (r && r !== this.room) {
      this.room = r;
      this.onRoomChange();
    }
    if (this.queued && !this.onStairs()) {
      const q = this.queued;
      this.queued = null;
      this.route = this.ctx.rooms.route(this.room, this.x, q.room, q.x);
      this.goal = q.goal;
    }
    if (!this.route.length) this.finishRoute();
    return moved;
  }

  private onRoomChange(): void {
    if (this.hidingIn || this.presenceT > 0) return;
    if (this.panic > 45 || this.state === 'run' || this.state === 'flee') {
      this.presenceT = 1.6;
      const room = this.room;
      this.pending.push(() => this.ctx.events.emit('scare', {
        kind: 'presence', x: this.x, y: this.y - this.def.height * 0.6, room,
        scare: 0.05 + 0.1 * (this.panic / 100), noise: 0.3, sourceId: this.id, visual: true,
        signature: `presence:${this.id}`,
      } satisfies ScareEvent));
    }
  }

  // ------------------------------------------------------------ routine ----

  private releasePoi(): void {
    if (this.poi && this.sh.poi.get(this.poi.id) === this.id) this.sh.poi.delete(this.poi.id);
    this.poi = null;
  }

  /** Worried people don't settle: they pace between rooms, drift toward company, look behind. */
  private startRestless(): void {
    this.releasePoi();
    this.clearRoute();
    this.groupTried = true;
    if (this.fear >= FEAR.worried && this.goGroup()) return;
    const tgt = this.pickRunTarget();
    this.setState('group');
    this.walkTo(tgt.room, tgt.x, 1.25, () => {
      this.setState('nervous');
      this.groupTried = true;
      this.stateDur = 3 + rnd(0, 3);
    });
  }

  private pickRoutine(): void {
    this.releasePoi();
    this.arrived = false;
    if (this.fear >= FEAR.restless && Math.random() < Math.min(0.85, this.fear / 110)) {
      this.startRestless();
      return;
    }
    const homes = new Set(this.def.home);
    const cands: { p: PoiDef; w: number }[] = [];
    for (const p of POIS) {
      if (p.who && p.who.length && !p.who.includes(this.id)) continue;
      const owner = this.sh.poi.get(p.id);
      if (owner && owner !== this.id) continue;
      if (this.heat(p.room) > 25) continue;
      let w = homes.has(p.id) ? 4 : p.who?.includes(this.id) ? 3 : 0.6;
      if (p.room === this.room) w *= 1.5;
      cands.push({ p, w });
    }
    if (!cands.length) {
      this.setState('idle');
      this.stateDur = rnd(2, 5);
      return;
    }
    let roll = Math.random() * cands.reduce((a, c) => a + c.w, 0);
    let pick = cands[0].p;
    for (const c of cands) {
      roll -= c.w;
      if (roll <= 0) { pick = c.p; break; }
    }
    this.poi = pick;
    this.sh.poi.set(pick.id, this.id);
    this.setState('walk');
    this.walkTo(pick.room, pick.x, 1, () => this.beginRoutine(pick));
  }

  private beginRoutine(p: PoiDef): void {
    this.setState('routine');
    if (p.facing) this.face(p.facing);
    const long = p.pose === 'sit' || p.pose === 'tv' || p.pose === 'type' || p.pose === 'read';
    this.routineT = long ? rnd(20, 42) : rnd(11, 26);
    this.chatT = rnd(3, 8);
  }

  // ----------------------------------------------------------- reactions ----

  react(impact: number, ev: ScareEvent): void {
    if (this.fled || this.state === 'gone') return;
    this.fear = Math.min(100, this.fear + FEAR.gain * impact);
    this.panic = Math.min(100, this.panic + 1.1 * impact);
    this.maxFear = Math.max(this.maxFear, this.fear);
    this.last = { x: ev.x, room: ev.room, id: ev.sourceId };
    if (this.state === 'flee') return;

    if (this.fear >= 100) {
      this.startFlee();
      return;
    }
    const t = this.def.traits;
    const j = rnd(0.85, 1.15);
    const score = Math.max(impact, this.panic * 0.8);

    if (this.hidingIn) {
      if (ev.sourceId === this.hidingIn) {
        this.leaveHide(true);
        this.startScream();
      } else if (score > 20) {
        this.say('whimper', 0.5);
        this.emote('sweat');
      }
      return;
    }
    if (this.state === 'scream' || this.state === 'stumble') return;
    if (this.state === 'run') {
      if (score >= 50 * j && this.fear >= 45 && !this.spot && this.trySeekHide()) return;
      return;
    }
    if (score >= 80 * j && this.fear >= 50 && this.trySeekHide()) return;
    if (score >= 50 * j) {
      this.startScream();
      return;
    }
    const bold = t.curiosity > 0.8 && this.fear < 55;
    if (score >= 22 * j) {
      this.followInvestigate = bold && Math.random() < t.curiosity - 0.2;
      this.startStartled();
      return;
    }
    if (score >= 7) {
      if (this.state === 'startled') return;
      const nervousish = this.state === 'nervous' || this.state === 'group';
      if (nervousish) {
        this.face(Math.sign(ev.x - this.x));
        this.emote('?');
        return;
      }
      const p = t.curiosity * 0.85 + 0.05 - this.fear / 220;
      if (Math.random() < p && this.ctx.rooms.distance(this.room, ev.room) <= 3) this.startInvestigate(ev);
      else this.startGlance(ev);
    }
  }

  private pauseWalk(): void {
    if (this.state === 'walk' || this.state === 'routine') this.resumeState = this.state;
  }

  private startGlance(ev: ScareEvent): void {
    if (this.state === 'glance') return;
    this.pauseWalk();
    const dir = Math.sign(ev.x - this.x) || this.facing;
    this.headFlip = dir === this.facing ? 1 : -1;
    this.setState('glance');
    this.stateDur = rnd(1.1, 1.7);
    this.emote('?');
  }

  private startInvestigate(ev: ScareEvent): void {
    this.releasePoi();
    this.setState('investigate');
    this.arrived = false;
    this.emote('?');
    const dir = ev.room === this.room ? Math.sign(ev.x - this.x) || this.facing : Math.sign(ev.x - this.x) || 1;
    const stand = ev.x - dir * rnd(90, 150);
    this.walkTo(ev.room, stand, 0.85, () => {
      this.arrived = true;
      this.timer = 0;
      this.stateDur = rnd(1.8, 2.8);
      this.face(Math.sign(ev.x - this.x));
    });
  }

  private startStartled(): void {
    if (this.state === 'startled') return;
    this.pauseWalk();
    if (this.last) this.face(this.last.room === this.room ? Math.sign(this.last.x - this.x) : 0);
    this.setState('startled');
    this.stateDur = 0.55;
    this.hopT = 0;
    this.say('gasp');
    this.emote('!');
  }

  private afterStartle(): void {
    if (this.followInvestigate && this.last && this.fear < 55) {
      this.followInvestigate = false;
      const ev = { x: this.last.x, room: this.last.room } as ScareEvent;
      this.startInvestigate(ev);
      return;
    }
    this.startNervous();
  }

  private startNervous(): void {
    this.releasePoi();
    this.clearRoute();
    this.setState('nervous');
    this.groupTried = false;
    this.stateDur = 4 + rnd(0, 3) + this.panic * 0.06;
  }

  /** Nervous people go where the most people are. */
  private goGroup(): boolean {
    const counts = new Map<RoomId, INPC[]>();
    for (const o of this.others()) {
      if (o.hidingIn) continue;
      const a = counts.get(o.room) ?? [];
      a.push(o);
      counts.set(o.room, a);
    }
    let best: RoomId | null = null;
    let bestScore = 0;
    for (const [room, arr] of counts) {
      const sc = arr.length * 3 - this.ctx.rooms.distance(this.room, room) * 1.2 - this.heat(room) / 15;
      if (sc > bestScore || best === null) { best = room; bestScore = sc; }
    }
    if (!best || best === this.room || this.ctx.rooms.distance(this.room, best) > 5) return false;
    const mate = counts.get(best)![0];
    this.setState('group');
    this.walkTo(best, mate.x + rnd(-70, 70), 1.25, () => {
      this.setState('nervous');
      this.groupTried = true;
      this.stateDur = 5 + rnd(0, 3);
    });
    return true;
  }

  private startScream(): void {
    this.releasePoi();
    this.clearRoute();
    this.setState('scream');
    this.stateDur = 1.05;
    this.pending.push(() => this.doScream());
    this.emote('!!');
  }

  private doScream(): void {
    if (this.screamCool > 0) return;
    this.screamCool = 1.2;
    this.say('scream', 1);
    this.ctx.events.emit('npc:scream', { npcId: this.id });
  }

  private pickRunTarget(): { room: RoomId; x: number } {
    const from = this.last?.room ?? this.room;
    let best: RoomId = this.room;
    let bestScore = -99;
    const company = new Set(this.others().filter((o) => !o.hidingIn).map((o) => o.room));
    for (const r of this.ctx.rooms.list) {
      const hop = this.ctx.rooms.distance(this.room, r.id);
      if (hop > 4 || r.id === from) continue;
      const sc = this.ctx.rooms.distance(from, r.id) * 2 - hop * 0.6 + (company.has(r.id) ? 1.2 : 0) - this.heat(r.id) / 12 + rnd(0, 1.5);
      if (sc > bestScore) { bestScore = sc; best = r.id; }
    }
    const rd = ROOM_BY_ID[best];
    return { room: best, x: rnd(rd.walk[0] + 30, rd.walk[1] - 30) };
  }

  private runAway(): void {
    const tgt = this.pickRunTarget();
    this.setState('run');
    this.stumbleT = 0.5;
    this.walkTo(tgt.room, tgt.x, 1.9, () => {
      if (this.fear >= 70 && this.trySeekHide()) return;
      this.startNervous();
    });
  }

  private trySeekHide(): boolean {
    if (Math.random() < 0.25) return false;
    const spots = HIDE_SPOTS
      .filter((s) => (this.sh.hide.get(s.id)?.size ?? 0) < s.capacity && this.ctx.rooms.distance(this.room, s.room) <= 2)
      .map((s) => ({ s, d: this.ctx.rooms.distance(this.room, s.room) * 400 + Math.abs(s.x - this.x) + rnd(0, 200) }))
      .sort((a, b) => a.d - b.d);
    if (!spots.length) return false;
    const spot = spots[0].s;
    this.releasePoi();
    this.spot = spot;
    const set = this.sh.hide.get(spot.id) ?? new Set<string>();
    set.add(this.id);
    this.sh.hide.set(spot.id, set);
    this.setState('run');
    this.walkTo(spot.room, spot.x + rnd(-14, 14), 1.8, () => this.enterHide());
    return true;
  }

  private enterHide(): void {
    const spot = this.spot;
    if (!spot) return;
    this.hidingIn = spot.objectId ?? spot.id;
    this.setState('hide');
    this.hideT = rnd(10, 18);
    this.whimperT = rnd(2, 4);
    this.container.setDepth(DEPTH.npcBehind);
    if (spot.kind === 'inside') {
      this.container.setVisible(false);
      this.emoteImg.setVisible(false);
    }
    this.ctx.objects.find((o) => o.id === spot.objectId)?.jostle();
    this.emote('sweat');
  }

  private leaveHide(burst: boolean): void {
    const spot = this.spot;
    if (!spot) { this.hidingIn = null; return; }
    this.ctx.objects.find((o) => o.id === spot.objectId)?.jostle();
    const set = this.sh.hide.get(spot.id);
    set?.delete(this.id);
    this.spot = null;
    this.hidingIn = null;
    this.container.setVisible(true);
    this.container.setDepth(this.baseDepth);
    if (burst) this.panic = Math.min(100, this.panic + 10);
  }

  private startFlee(): void {
    if (this.hidingIn) this.leaveHide(false);
    else if (this.spot) {
      this.sh.hide.get(this.spot.id)?.delete(this.id);
      this.spot = null;
    }
    this.releasePoi();
    this.clearRoute();
    this.setState('flee');
    this.exiting = false;
    this.stumbleT = 0.6;
    this.pending.push(() => {
      this.doScream();
      this.ctx.events.emit('scare', {
        kind: 'flee', x: this.x, y: this.y - this.def.height * 0.6, room: this.room,
        scare: 0.2, noise: 0.8, sourceId: this.id, visual: true, signature: `flee:${this.id}`,
      } satisfies ScareEvent);
    });
    this.emote('!!');
    this.walkTo('foyer', 3140, 2, () => this.startExitPath());
  }

  private startExitPath(): void {
    this.exiting = true;
    this.route = EXIT_PATH.map((p) => [p[0], p[1]] as [number, number]);
    this.goal = { speed: 2, onArrive: () => this.finishFlee() };
  }

  private finishFlee(): void {
    this.fled = true;
    this.setState('gone');
    this.container.setVisible(false);
    this.emoteImg.setVisible(false);
    this.bar.clear();
    this.ctx.events.emit('npc:fled', { npcId: this.id, name: this.def.name });
    if (!this.ctx.stats.fled.includes(this.id)) this.ctx.stats.fled.push(this.id);
  }

  private startStumble(): void {
    if (this.onStairs() || this.exiting) return;
    this.resumeState = this.state;
    this.setState('stumble');
    this.stateDur = 1.45;
    this.say('yelp', 0.8);
    this.ctx.audio.play('thump', { x: this.x, y: this.y, vol: 0.5 });
  }

  // -------------------------------------------------------------- update ----

  update(dt: number): void {
    if (this.fled) return;
    dt = Math.min(dt, 0.1);
    this.t += dt;
    this.timer += dt;
    this.presenceT = Math.max(0, this.presenceT - dt);
    this.screamCool = Math.max(0, this.screamCool - dt);
    if (this.pending.length) {
      const run = this.pending;
      this.pending = [];
      for (const f of run) f();
    }
    this.decay(dt);
    if (this.fear >= 100 && this.state !== 'flee') this.startFlee();

    this.worry(dt);
    this.moved = 0;
    switch (this.state) {
      case 'idle': if (this.timer >= this.stateDur) this.pickRoutine(); break;
      case 'walk': this.moved = this.stepRoute(dt, this.arriving ? 1 : 1 + this.fear / 200); break;
      case 'routine': this.updateRoutine(dt); break;
      case 'investigate':
        if (!this.arrived) this.moved = this.stepRoute(dt, 0.85);
        else if (this.timer >= this.stateDur) this.pickRoutine();
        break;
      case 'glance':
        this.moveIfStairs(dt);
        if (this.timer >= this.stateDur) this.endTransient();
        break;
      case 'startled':
        this.moveIfStairs(dt);
        this.hopT += dt;
        if (this.timer >= this.stateDur) this.afterStartle();
        break;
      case 'nervous': this.updateNervous(dt); break;
      case 'group': this.moved = this.stepRoute(dt, 1.25 * (1 + this.fear / 300)); break;
      case 'scream':
        this.moveIfStairs(dt);
        if (this.timer >= this.stateDur) {
          if (this.fear >= 100) this.startFlee();
          else this.runAway();
        }
        break;
      case 'run': this.moved = this.stepRoute(dt, 1.9); this.rollStumble(dt, 0.025); break;
      case 'flee': this.moved = this.stepRoute(dt, 2); this.rollStumble(dt, 0.012); break;
      case 'stumble':
        if (this.timer >= this.stateDur) {
          this.setState(this.resumeState ?? 'run');
          this.resumeState = null;
        }
        break;
      case 'hide': this.updateHide(dt); break;
      default: break;
    }
    if (this.fled) return;
    this.animate(dt);
  }

  /** Lingering fear is visible: glance behind, abandon the chair when it gets bad. */
  private worry(dt: number): void {
    const st = this.state;
    if (st !== 'walk' && st !== 'routine' && st !== 'idle') return;
    if (this.fear < FEAR.worried) {
      if (this.headFlip !== 1) this.headFlip = 1;
      return;
    }
    this.worryT -= dt;
    if (this.worryT <= 0) {
      this.worryT = rnd(0.8, 1.8);
      this.headFlip = Math.random() < 0.5 ? -1 : 1;
      if (this.fear > 50 && Math.random() < 0.25) this.emote('sweat');
    }
    if (st === 'routine' && this.fear >= FEAR.restless && Math.random() < dt * 0.2) this.startRestless();
  }

  private decay(dt: number): void {
    const c = this.def.traits.courage;
    this.panic = Math.max(0, this.panic - 8 * (0.5 + c) * dt);
    if (this.panic < 15) {
      this.fear = Math.max(this.maxFear * 0.5, this.fear - 0.6 * dt);
    }
  }

  private moveIfStairs(dt: number): void {
    if (this.onStairs() && this.route.length) this.moved = this.stepRoute(dt, 0.9);
  }

  private endTransient(): void {
    this.headFlip = 1;
    const back = this.resumeState;
    this.resumeState = null;
    if (back === 'walk' && this.goal) this.setState('walk');
    else if (back === 'routine' && this.poi) this.setState('routine');
    else this.pickRoutine();
  }

  private updateRoutine(dt: number): void {
    this.moveIfStairs(dt);
    this.routineT -= dt;
    this.chatT -= dt;
    this.hum -= dt;
    const pose = this.poi?.pose;
    if (pose === 'cook' && this.hum <= 0) {
      this.hum = rnd(12, 24);
      this.say('hmm', 0.5);
      this.emote('♪');
    }
    if (this.chatT <= 0) {
      this.chatT = rnd(5, 10);
      const pal = this.others().find((o) => o.room === this.room && Math.abs(o.x - this.x) < 240 && o.fear < 30 && !o.hidingIn);
      if (pal && this.fear < 30) {
        this.say('mumble', 0.55);
        if (Math.random() < 0.3) this.emote('…');
      }
    }
    if (this.routineT <= 0) this.pickRoutine();
  }

  private updateNervous(dt: number): void {
    this.moveIfStairs(dt);
    if (!this.groupTried && this.timer > 0.4) {
      this.groupTried = true;
      if (this.fear >= 35 && this.goGroup()) return;
    }
    this.flipT -= dt;
    if (this.flipT <= 0) {
      this.flipT = rnd(0.9, 1.9);
      this.headFlip = Math.random() < 0.4 ? -1 : 1;
      if (Math.random() < 0.2) this.face(-this.facing);
    }
    if (this.timer >= this.stateDur) {
      if (this.panic > 22) this.stateDur += 1.5;
      else { this.headFlip = 1; this.pickRoutine(); }
    }
    if (this.fear > 55 && this.timer > 1 && Math.random() < dt * 0.15) {
      this.say('whimper', 0.4);
      this.emote('sweat');
    }
  }

  private updateHide(dt: number): void {
    this.hideT -= dt;
    this.whimperT -= dt;
    if (this.whimperT <= 0) {
      this.whimperT = rnd(3, 6);
      this.say('whimper', 0.35);
    }
    if (this.hideT <= 0 && this.panic < 35) {
      this.leaveHide(false);
      this.startNervous();
    }
  }

  private rollStumble(dt: number, p: number): void {
    this.stumbleT -= dt;
    if (this.stumbleT <= 0) {
      this.stumbleT = 0.5;
      if (this.moved > 0 && Math.random() < p * (0.4 + this.panic / 100)) this.startStumble();
    }
  }

  // ------------------------------------------------------------- animation ----

  private wantFace(): Face {
    switch (this.state) {
      case 'scream': return 'scream';
      case 'run': case 'flee': case 'stumble': return 'terror';
      case 'startled': case 'hide': return 'scared';
      case 'nervous': case 'group': return this.panic > 45 || this.fear > 65 ? 'scared' : 'nervous';
      case 'investigate': return this.def.traits.skepticism > 0.5 && this.fear < 25 ? 'skeptic' : 'curious';
      case 'glance': return this.def.traits.skepticism > 0.5 && this.fear < 20 ? 'skeptic' : 'curious';
      default: return this.fear > 60 ? 'scared' : this.fear > FEAR.worried ? 'nervous' : 'calm';
    }
  }

  private animate(dt: number): void {
    const r = this.rig;
    const d = r.d;
    const st = this.state;
    const speedFrac = dt > 0 ? this.moved / (dt * this.def.traits.speed) : 0; // ≈ speed multiplier
    const running = st === 'run' || st === 'flee';
    const walking = this.moved > 0.01;

    // phase + footsteps
    if (walking) {
      this.phase += (this.moved / d.legLen) * Math.PI * 0.95;
      const idx = Math.floor(this.phase / Math.PI);
      if (idx !== this.stepIdx) {
        this.stepIdx = idx;
        this.ctx.audio.footstep(this.x, this.y, this.def.height / 150, running);
      }
    }

    // ---- targets
    const tg = newPz();
    if (walking) {
      tg.swing = running ? 0.95 : clamp(0.42 + 0.14 * speedFrac, 0.4, 0.7);
      tg.armSwing = running ? 0.7 : 0.4;
      tg.lean = running ? 0.2 : 0.03;
    }
    let propKey: string | null = null;
    let sitDrop = 0;
    switch (st) {
      case 'routine': {
        const pose = this.poi?.pose ?? 'stand';
        propKey = PROP_FOR[pose] ?? null;
        const t = this.t;
        if (pose === 'sit' || pose === 'tv' || pose === 'type') { tg.sit = 1; sitDrop = 0.3; }
        if (pose === 'type') { tg.armL = -0.85 + Math.sin(t * 22) * 0.06; tg.armR = -0.9 + Math.sin(t * 19) * 0.06; tg.lean = 0.08; }
        if (pose === 'read') { tg.armL = -0.95; tg.armR = -1.0; tg.headRot = 0.22; }
        if (pose === 'cook') { tg.armL = -0.7; tg.armR = -1.0 + Math.sin(t * 5) * 0.28; tg.headRot = 0.15; }
        if (pose === 'clean') { tg.armL = -0.3; tg.armR = -1.1 + Math.sin(t * 6.5) * 0.4; tg.lean = 0.07; }
        if (pose === 'play') { tg.crouch = 0.45; tg.armL = -0.6; tg.armR = -0.85 + Math.sin(t * 4) * 0.4; tg.headRot = 0.2; }
        if (pose === 'warm') { tg.armL = -1.25; tg.armR = -1.35; tg.headRot = 0.05; }
        if (pose === 'look') tg.headRot = Math.sin(t * 0.55) * 0.18;
        if (pose === 'tv') { tg.armR = -0.25; tg.headRot = Math.sin(t * 0.3) * 0.05; }
        if (pose === 'stand') { tg.headRot = Math.sin(t * 0.4) * 0.1; }
        break;
      }
      case 'investigate':
        tg.lean = 0.1;
        tg.armR = -0.35;
        if (this.arrived) tg.headRot = Math.sin(this.t * 2.2) * 0.3;
        break;
      case 'glance': tg.headRot = -0.08; tg.lean = -0.03; break;
      case 'startled': tg.armL = -1.35; tg.armR = -1.2; tg.lean = -0.14; tg.tremble = 0.7; tg.headRot = -0.2; break;
      case 'nervous': case 'group':
        tg.lean = 0.12; tg.tremble = 0.3 + this.panic / 160; tg.armL = -0.45; tg.armR = -0.7; tg.crouch = 0.1;
        if (walking) { tg.swing = 0.5; tg.armSwing = 0.15; }
        break;
      case 'scream': tg.headRot = -0.5; tg.armL = -2.3; tg.armR = -2.45; tg.lean = -0.1; tg.tremble = 1.1; break;
      case 'run': case 'flee':
        tg.armL = -2.0; tg.armR = -2.3; tg.flail = 0.35 + this.panic / 250; tg.lean = 0.2; tg.armSwing = 0.15;
        break;
      case 'hide': tg.crouch = 1; tg.armL = -1.5; tg.armR = -1.7; tg.tremble = 0.8; tg.headRot = 0.3; tg.lean = 0.2; break;
      case 'stumble': {
        const k = this.timer / this.stateDur;
        tg.fall = k < 0.18 ? (k / 0.18) * 1.45 : k < 0.55 ? 1.45 : 1.45 * (1 - (k - 0.55) / 0.45);
        tg.armL = -2.4; tg.armR = -2.6; tg.tremble = 0.3;
        break;
      }
      default: tg.headRot = Math.sin(this.t * 0.5) * 0.08; break;
    }
    if (this.fear >= FEAR.worried && (st === 'walk' || st === 'routine' || st === 'idle')) {
      const w = clamp((this.fear - FEAR.worried) / 50, 0, 1);
      tg.tremble = Math.max(tg.tremble, 0.15 + 0.5 * w);
      tg.lean = Math.max(tg.lean, 0.06 + 0.08 * w);
      if (st !== 'routine') { tg.armL = Math.min(tg.armL, -0.3 - 0.35 * w); tg.armR = Math.min(tg.armR, -0.5 - 0.4 * w); }
      tg.crouch = Math.max(tg.crouch, 0.12 * w);
    }

    const pz = this.pz;
    const kk = st === 'stumble' ? 30 : 12;
    pz.swing = approach(pz.swing, tg.swing, 14, dt);
    pz.armSwing = approach(pz.armSwing, tg.armSwing, 14, dt);
    pz.armL = approach(pz.armL, tg.armL, kk, dt);
    pz.armR = approach(pz.armR, tg.armR, kk, dt);
    pz.lean = approach(pz.lean, tg.lean, 9, dt);
    pz.crouch = approach(pz.crouch, tg.crouch, 10, dt);
    pz.sit = approach(pz.sit, tg.sit, 8, dt);
    pz.fall = st === 'stumble' ? tg.fall : approach(pz.fall, 0, 14, dt);
    pz.headRot = approach(pz.headRot, tg.headRot, 10, dt);
    pz.flail = approach(pz.flail, tg.flail, 10, dt);
    pz.tremble = approach(pz.tremble, tg.tremble, 8, dt);

    // ---- apply
    const bob = walking ? Math.abs(Math.sin(this.phase)) * (running ? 5 : 2.2) : Math.sin(this.t * 1.8) * 0.5;
    const hop = st === 'startled' ? Math.sin(Math.min(1, this.hopT / 0.4) * Math.PI) * 14 : 0;
    this.body.y = -bob - hop;
    this.body.x = pz.tremble > 0.02 ? Math.sin(this.t * 53) * pz.tremble * 1.3 : 0;
    this.body.rotation = pz.fall;

    const drop = d.legLen * (0.3 * pz.crouch + sitDrop * pz.sit);
    this.legL.y = this.legR.y = this.upper.y = r.hipY + drop;
    const bend = -1.25 * pz.sit - 0.7 * pz.crouch;
    const sw = Math.sin(this.phase) * pz.swing;
    this.legL.rotation = sw + bend;
    this.legR.rotation = -sw + bend;
    this.legL.scaleY = this.legR.scaleY = S * (1 - 0.18 * pz.crouch);

    this.upper.rotation = pz.lean;
    this.headC.rotation = pz.headRot;
    this.headC.scaleX = this.headFlip;
    const as = Math.sin(this.phase) * pz.armSwing;
    this.armLC.rotation = pz.armL - as + Math.sin(this.t * 17 + 1) * pz.flail;
    this.armRC.rotation = pz.armR + as + Math.sin(this.t * 17) * pz.flail;

    if (propKey) {
      if (this.prop.texture.key !== propKey) this.prop.setTexture(propKey);
      this.prop.setVisible(true);
    } else this.prop.setVisible(false);
    if (this.cane) {
      this.cane.x = 16 + Math.sin(this.phase) * 5 * pz.swing;
      this.cane.rotation = -Math.sin(this.phase) * 0.12 * pz.swing;
    }

    // ---- face
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkLeft = 0.13; this.blinkT = rnd(2.2, 5.5); }
    if (this.blinkLeft > 0) this.blinkLeft -= dt;
    let f = this.wantFace();
    if ((f === 'calm' || f === 'curious' || f === 'skeptic') && this.blinkLeft > 0) f = 'blink';
    if (f !== this.curFace) {
      this.curFace = f;
      this.faceImg.setTexture(r.faceKey(f));
    }

    this.syncContainer();
    this.updateEmote(dt);
    this.updateBar(dt);
  }

  /** Fear bar over the head: fades in once someone is rattled; full = they leave. */
  private updateBar(dt: number): void {
    const show = !this.fled && this.container.visible && this.fear > 2;
    this.barA = approach(this.barA, show ? 1 : 0, 6, dt);
    const g = this.bar;
    g.clear();
    if (this.barA < 0.02) return;
    const w = 34, h = 5;
    const x = this.x - w / 2;
    const y = this.y - this.rig.height - 2 + this.body.y;
    const f = clamp(this.fear / 100, 0, 1);
    const col = f < 0.5 ? mixCol(0x6fd6c4, 0xf0c25a, f / 0.5) : mixCol(0xf0c25a, 0xe5484d, (f - 0.5) / 0.5);
    g.fillStyle(0x0d0a14, 0.6 * this.barA).fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 3);
    g.fillStyle(col, 0.95 * this.barA).fillRoundedRect(x, y, Math.max(2, w * f), h, 2);
  }

  private updateEmote(dt: number): void {
    const e = this.emoteImg;
    if (this.emoteT >= this.emoteDur || !this.container.visible) {
      e.setVisible(false);
      this.emoteT += dt;
      return;
    }
    this.emoteT += dt;
    const k = this.emoteT;
    const pop = k < 0.2 ? Math.sin((k / 0.2) * Math.PI * 0.5) * 1.2 : k < 0.32 ? 1.2 - (k - 0.2) / 0.12 * 0.2 : 1;
    const fade = k > this.emoteDur - 0.3 ? (this.emoteDur - k) / 0.3 : 1;
    const side = this.emoteImg.texture.key === EMOTE_KEYS.sweat;
    e.setScale(S * pop);
    e.setAlpha(clamp(fade, 0, 1));
    e.setPosition(
      this.x + this.facing * (side ? 22 : 6),
      this.y - this.rig.height * (side ? 0.78 : 1) - (side ? 0 : 8) + Math.sin(this.t * 6) * 1.2 + this.body.y,
    );
    e.setVisible(true);
  }
}
