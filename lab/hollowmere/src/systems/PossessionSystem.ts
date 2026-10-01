// Possession: finds the nearest hauntable within reach (soft glow), Space/E to
// possess + leave, 1/2/3 to act, and mouse seek / click-to-possess.

import Phaser from 'phaser';
import { GHOST } from '../config';
import { input } from '../scenes/input';
import type { GameCtx, GameEvents, IHauntable } from '../types';
import type { GhostController } from '../entities/GhostController';

const ACT_KEYS: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2,
};

/** Hooks the HUD installs so the system can poke it without importing it. */
export interface PossessionHud {
  denyRow(index: number): void;
  pressRow(index: number): void;
}

function rectDist(o: IHauntable, x: number, y: number): number {
  const b = o.bounds;
  const dx = Math.max(b.left - x, 0, x - b.right);
  const dy = Math.max(b.top - y, 0, y - b.bottom);
  return Math.hypot(dx, dy);
}

export class PossessionSystem {
  hud: PossessionHud | null = null;
  /** Nearest hauntable within reach while flying (null otherwise). */
  near: IHauntable | null = null;

  private ctx: GameCtx;
  private ghost: GhostController;
  private pending: IHauntable | null = null;
  private wasDown = false;
  private enabled = true;

  constructor(ctx: GameCtx) {
    this.ctx = ctx;
    this.ghost = ctx.ghost as GhostController;
    input.onPress((code) => this.onKey(code));
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  get current(): IHauntable | null {
    return this.ctx.ghost.possessing;
  }

  // -------------------------------------------------------------- actions ----

  possess(o: IHauntable): void {
    if (this.current || o.possessed) return;
    const { ctx } = this;
    this.pending = null;
    this.setNear(null);
    const b = o.bounds;
    this.withEvent('possess', { objectId: o.id }, () => {
      o.possess();
    });
    ctx.ghost.enterObject(o);
    ctx.audio.play('possess_in', { x: b.centerX, y: b.centerY });
    ctx.fx.puff(b.centerX, b.centerY);
  }

  leave(): void {
    const o = this.current;
    if (!o) return;
    const { ctx } = this;
    const b = o.bounds;
    this.withEvent('release', { objectId: o.id }, () => {
      o.release();
    });
    ctx.ghost.exitObject(o);
    ctx.audio.play('possess_out', { x: b.centerX, y: b.top });
    ctx.fx.ring(b.centerX, b.top, 0xbfeaff, 90);
    ctx.fx.particles('wisp', b.centerX, b.top, 8, { spread: 16, speed: 160 });
  }

  /** index 0..2. */
  act(index: number): boolean {
    const o = this.current;
    if (!o || index < 0 || index > 2) return false;
    const { ctx } = this;
    const before = ctx.stats.haunts;
    const beforeObj = ctx.stats.perObject[o.id] ?? 0;
    let ok = false;
    this.withEvent('action', { objectId: o.id, index, tier: o.def.actions[index].tier }, () => {
      ok = o.act(index);
    }, () => ok);
    if (!ok) {
      this.hud?.denyRow(index);
      if (!o.unlocked(index)) ctx.audio.play('ui_tick', { ui: true, vol: 0.4, rate: 0.7 });
      return false;
    }
    this.hud?.pressRow(index);
    // count the haunt unless the object already did
    if (ctx.stats.haunts === before) ctx.stats.haunts++;
    if ((ctx.stats.perObject[o.id] ?? 0) === beforeObj) ctx.stats.perObject[o.id] = beforeObj + 1;
    return true;
  }

  /**
   * Runs fn; afterwards emits `name` only if nothing else emitted it meanwhile
   * (HauntableObject may already broadcast possess/release/action).
   */
  private withEvent<K extends keyof GameEvents>(name: K, payload: GameEvents[K], fn: () => void, emitIf: () => boolean = () => true): void {
    let seen = false;
    const h = () => { seen = true; };
    this.ctx.events.on(name, h);
    fn();
    this.ctx.events.off(name, h);
    if (!seen && emitIf()) this.ctx.events.emit(name, payload);
  }

  // ----------------------------------------------------------------- keys ----

  private onKey(code: string): void {
    if (!this.enabled) return;
    if (code === 'Space' || code === 'KeyE') {
      if (this.current) this.leave();
      else if (this.near) this.possess(this.near);
      return;
    }
    const idx = ACT_KEYS[code];
    if (idx !== undefined) this.act(idx);
  }

  // --------------------------------------------------------------- update ----

  update(_dt: number): void {
    void _dt;
    if (!this.enabled) return;
    const { ctx, ghost } = this;
    const sc = ctx.scene;
    const ptr = sc.input.activePointer;
    const down = ptr.isDown && ptr.leftButtonDown();
    const pressed = down && !this.wasDown;
    this.wasDown = down;

    const possessing = ctx.ghost.possessing;
    if (possessing) {
      // click empty space while possessed → leave and drift toward the click
      if (pressed) {
        const p = sc.cameras.main.getWorldPoint(ptr.x, ptr.y);
        if (!this.hauntableAt(p.x, p.y)) {
          this.leave();
          ghost.seek(p.x, p.y);
        }
      }
      return;
    }

    // ---- mouse seek / click-to-possess ----
    if (down) {
      const p = sc.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const target = this.hauntableAt(p.x, p.y);
      if (pressed || this.pending === null) this.pending = target;
      if (this.pending) {
        const b = this.pending.bounds;
        ghost.seek(b.centerX, b.centerY);
      } else {
        ghost.seek(p.x, p.y);
      }
    }
    if (this.pending) {
      if (!ghost.seeking) this.pending = null; // keyboard (or arrival) cancelled
      else if (rectDist(this.pending, ghost.x, ghost.y) < GHOST.reach * 0.35 && !this.pending.possessed) {
        this.possess(this.pending);
        return;
      }
    }

    // ---- nearest hauntable within reach (hysteresis stops flicker) ----
    let best: IHauntable | null = null;
    let bd = Infinity;
    for (const o of ctx.objects) {
      const d = rectDist(o, ghost.x, ghost.y);
      const lim = o === this.near ? GHOST.reach * 1.18 : GHOST.reach;
      if (d <= lim && d < bd) {
        bd = d;
        best = o;
      }
    }
    this.setNear(best);
  }

  private setNear(o: IHauntable | null): void {
    if (o === this.near) return;
    this.near?.setHighlight(false);
    this.near = o;
    o?.setHighlight(true);
  }

  /** Hauntable under a world point (slightly inflated so small items are clickable). */
  private hauntableAt(x: number, y: number): IHauntable | null {
    let best: IHauntable | null = null;
    let bd = Infinity;
    for (const o of this.ctx.objects) {
      const b = o.bounds;
      const m = 26;
      if (x >= b.left - m && x <= b.right + m && y >= b.top - m && y <= b.bottom + m) {
        const d = Phaser.Math.Distance.Between(x, y, b.centerX, b.centerY);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
    }
    return best;
  }
}
