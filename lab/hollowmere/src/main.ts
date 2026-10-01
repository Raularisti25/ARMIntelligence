// Hollowmere entry: DPR-sharp Phaser canvas, Boot → Game.

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { input } from './scenes/input';

const dpr = (): number => Math.min(window.devicePixelRatio || 1, 2);

input.attach();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: Math.round(window.innerWidth * dpr()),
  height: Math.round(window.innerHeight * dpr()),
  backgroundColor: '#141a33',
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  disableContextMenu: true,
  banner: false,
  input: { mouse: { preventDefaultWheel: true }, touch: { capture: true } },
  scene: [BootScene, GameScene],
});

function onResize(): void {
  const d = dpr();
  game.scale.setZoom(1 / d);
  game.scale.resize(Math.round(window.innerWidth * d), Math.round(window.innerHeight * d));
}
window.addEventListener('resize', onResize);
