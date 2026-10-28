// Hollowmere entry: DPR-sharp Phaser canvas, Boot → Game.

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { input } from './scenes/input';

// Backing-store density: Retina-sharp (2x) by default. If the GPU cannot hold
// ~50 fps there, step down (2 -> 1.6 -> 1.3): a touch softer, much smoother.
let densityCap = 2;
const dpr = (): number => Math.min(window.devicePixelRatio || 1, densityCap);

// ?manualframes: a test harness steps frames itself (hidden/background pages pause
// rAF). window.__frame(ms) runs every queued rAF callback at a synthetic timestamp.
if (new URLSearchParams(location.search).has('manualframes')) {
  const q: FrameRequestCallback[] = [];
  let now = performance.now();
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  (window as unknown as { __frame: (ms?: number) => void }).__frame = (ms = 1000 / 60) => {
    now += ms;
    for (const cb of q.splice(0)) cb(now);
  };
}

input.attach();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // never 0x0: a hidden/minimised window at launch made WebGL's framebuffer incomplete
  width: Math.round(Math.max(320, window.innerWidth) * dpr()),
  height: Math.round(Math.max(240, window.innerHeight) * dpr()),
  backgroundColor: '#141a33',
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  disableContextMenu: true,
  banner: false,
  input: { mouse: { preventDefaultWheel: true }, touch: { capture: true } },
  scene: [BootScene, GameScene],
});

// test hook: lets a harness step the loop where rAF is paused (hidden/background pages)
(window as unknown as { __hollowGame: Phaser.Game }).__hollowGame = game;

function onResize(): void {
  const d = dpr();
  game.scale.setZoom(1 / d);
  if (window.innerWidth < 1 || window.innerHeight < 1) return; // hidden: keep the last real size
  game.scale.resize(Math.round(window.innerWidth * d), Math.round(window.innerHeight * d));
}
window.addEventListener('resize', onResize);

let slowSecs = 0;
window.setInterval(() => {
  // only judge real play: boot-time texture painting is slow by design
  if (document.hidden || !game.scene.getScenes(true).some((sc) => sc instanceof GameScene)) return;
  slowSecs = game.loop.actualFps < 50 ? slowSecs + 1 : 0;
  if (slowSecs >= 3 && densityCap > 1.3 && (window.devicePixelRatio || 1) > 1.3) {
    densityCap = densityCap > 1.6 ? 1.6 : 1.3;
    slowSecs = 0;
    onResize();
  }
}, 1000);
