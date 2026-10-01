// Tiny shared keyboard state. DOM-level so it works the same in every system and
// never fights Phaser's per-scene key plugin. Escape always passes when locked.

type PressFn = (code: string, e: KeyboardEvent) => void;

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE',
  'Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
  'ShiftLeft', 'ShiftRight', 'Escape',
]);

class InputState {
  readonly down = new Set<string>();
  /** When true only Escape is dispatched (paused). */
  locked = false;
  /** Ever received a key / pointer press. */
  touched = false;
  private press = new Set<PressFn>();
  private first = new Set<() => void>();
  private attached = false;

  held(...codes: string[]): boolean {
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }

  onPress(fn: PressFn): () => void {
    this.press.add(fn);
    return () => this.press.delete(fn);
  }

  /** Fires once on the first key or pointer press of the session. */
  onFirstInput(fn: () => void): void {
    if (this.touched) fn();
    else this.first.add(fn);
  }

  markTouched(): void {
    if (this.touched) return;
    this.touched = true;
    for (const f of this.first) f();
    this.first.clear();
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.markTouched();
      if (!e.repeat) this.down.add(e.code);
      else if (!this.down.has(e.code)) this.down.add(e.code);
      if (e.repeat) return;
      if (this.locked && e.code !== 'Escape') return;
      for (const f of this.press) f(e.code, e);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    window.addEventListener('pointerdown', () => this.markTouched());
  }
}

export const input = new InputState();
