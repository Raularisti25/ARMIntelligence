// Paints every procedural texture (staged across frames so the boot splash can
// repaint), then hands over to GameScene.

import Phaser from 'phaser';
import { paintFxTextures } from '../art/fxArt';
import { paintObjectTextures } from '../art/objectArt';
import { paintCharacterTextures } from '../art/characterArt';

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function say(text: string): void {
  const el = document.getElementById('boot-s');
  if (el) el.textContent = text;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    void this.paintAll();
  }

  private async paintAll(): Promise<void> {
    say('conjuring the ghost…');
    await nextFrame();
    paintFxTextures(this);
    say('furnishing the rooms…');
    await nextFrame();
    paintObjectTextures(this);
    say('waking the residents…');
    await nextFrame();
    paintCharacterTextures(this);
    say('raising the walls…');
    await nextFrame();
    this.scene.start('Game');
  }
}
