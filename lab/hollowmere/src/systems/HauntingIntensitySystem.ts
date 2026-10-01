// Global haunting meter: 0..1 value, 4 named levels with hysteresis, drives the
// color grade, vignette, poltergeist touches, lightning and the audio layers.

import Phaser from 'phaser';
import { INTENSITY } from '../config';
import type { GameCtx, IIntensity, RoomId } from '../types';

const SCARE_MULT = [1, 1.05, 1.12, 1.25];
const HYSTERESIS = 0.12;
const FEAR_GAIN = 0.12 / 100; // per impact point; 0.06 never reached level 1 in play-test
const FLED_GAIN = 0.05;
const DECAY = 0.006; // per second, toward 0.6 × peak

export class HauntingIntensitySystem implements IIntensity {
  value = 0;
  level = 0;
  private peak = 0;
  private ctx: GameCtx;
  private matrix: Phaser.FX.ColorMatrix | null = null;
  private lastGrade = -1;
  private lastAudio = -1;
  private vignette: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private touchT = 8;
  private lightningT = 12;
  private flickerT = 0;

  constructor(ctx: GameCtx) {
    this.ctx = ctx;
    this.vignette = document.createElement('div');
    this.vignette.id = 'hm-vignette';
    document.body.appendChild(this.vignette);
    this.flashEl = document.createElement('div');
    this.flashEl.id = 'hm-lightning';
    document.body.appendChild(this.flashEl);

    const cam = ctx.scene.cameras.main;
    if (ctx.scene.game.renderer.type === Phaser.WEBGL && cam.postFX) {
      this.matrix = cam.postFX.addColorMatrix();
    }
    ctx.scene.events.once('shutdown', () => this.destroy());
    this.applyGrade(true);
  }

  get levelName(): string {
    return INTENSITY.names[this.level];
  }
  get scareMult(): number {
    return SCARE_MULT[this.level];
  }

  addFear(impact: number): void {
    if (impact <= 0) return;
    this.bump(impact * FEAR_GAIN);
  }
  addFled(): void {
    this.bump(FLED_GAIN);
  }
  set(v: number): void {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.peak = Math.max(this.peak, this.value);
    this.settleLevels(true);
  }

  private bump(d: number): void {
    this.value = Math.min(1, this.value + d);
    if (this.value > this.peak) this.peak = this.value;
    this.settleLevels(false);
  }

  /** Level from value with hysteresis; `jump` lets debug set() skip several levels at once. */
  private settleLevels(jump: boolean): void {
    const L = INTENSITY.levels;
    let changed = false;
    for (let guard = 0; guard < 4; guard++) {
      if (this.level < L.length - 1 && this.value >= L[this.level + 1]) {
        this.level++;
        changed = true;
        this.ctx.events.emit('intensity:level', { level: this.level, name: this.levelName, up: true });
        if (!jump) break;
      } else if (this.level > 0 && this.value < L[this.level] - HYSTERESIS) {
        this.level--;
        changed = true;
        this.ctx.events.emit('intensity:level', { level: this.level, name: this.levelName, up: false });
        if (!jump) break;
      } else break;
    }
    if (changed) {
      this.touchT = Math.min(this.touchT, 3);
      this.ctx.audio.play('sting_low', { ui: true, vol: 0.5 });
    }
  }

  update(dt: number): void {
    const floor = this.peak * 0.6;
    if (this.value > floor) {
      this.value = Math.max(floor, this.value - DECAY * dt);
      this.settleLevels(false);
    }
    const v = this.value;
    if (Math.abs(v - this.lastAudio) > 0.002) {
      this.lastAudio = v;
      this.ctx.audio.setIntensity(v);
    }
    this.applyGrade(false);

    // flickering vignette breath at higher levels (cheap: opacity only, 8 Hz)
    this.flickerT -= dt;
    if (this.flickerT <= 0) {
      this.flickerT = 0.12;
      const breathe = 1 + Math.sin(this.ctx.now() / 1400) * 0.06 + (this.level >= 2 ? (Math.random() - 0.5) * 0.05 * this.level : 0);
      this.vignette.style.opacity = String(Math.min(1, (0.55 + v * 0.45) * breathe));
    }

    if (this.level >= 2) {
      this.touchT -= dt;
      if (this.touchT <= 0) {
        this.touchT = this.level >= 3 ? 3.5 + Math.random() * 5 : 7 + Math.random() * 8;
        this.poltergeist();
      }
    }
    if (this.level >= 3) {
      this.lightningT -= dt;
      if (this.lightningT <= 0) {
        this.lightningT = 14 + Math.random() * 18;
        this.lightning();
      }
    } else {
      this.lightningT = Math.max(this.lightningT, 8);
    }
  }

  private applyGrade(force: boolean): void {
    const v = this.value;
    if (!force && Math.abs(v - this.lastGrade) < 0.004) return;
    this.lastGrade = v;
    const m = this.matrix;
    if (!m) return;
    m.reset();
    if (v < 0.01) return;
    m.saturate(-0.22 * v, true);
    m.hue(-16 * v, true);
    m.contrast(0.1 * v, true);
    m.brightness(1 - 0.05 * v, true);
  }

  private poltergeist(): void {
    const { npcs, rooms, world } = this.ctx;
    const pool: RoomId[] = [];
    for (const n of npcs) if (!n.fled && n.room) pool.push(n.room);
    // include the neighbours so it also happens "just out of sight"
    const all = rooms.list;
    pool.push(all[Math.floor(Math.random() * all.length)].id);
    const room = pool[Math.floor(Math.random() * pool.length)];
    const at = world.touch(room);
    if (at) this.ctx.audio.play('creak_soft', { x: at.x, y: at.y, vol: 0.55 });
  }

  private lightning(): void {
    this.ctx.world.lightning();
    const f = this.flashEl;
    f.animate(
      [{ opacity: 0 }, { opacity: 0.22 }, { opacity: 0.04 }, { opacity: 0.14 }, { opacity: 0 }],
      { duration: 420, easing: 'ease-out' },
    );
    const delay = 250 + Math.random() * 900;
    this.ctx.scene.time.delayedCall(delay, () => this.ctx.audio.play('thunder', { ui: true, vol: 0.8 }));
  }

  private destroy(): void {
    this.vignette.remove();
    this.flashEl.remove();
  }
}
