import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

// Execute the real TypeScript with a recording Phaser drawing surface. This
// proves placement/update contracts; headed playtest.py owns actual GPU proof.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require(process.env.HOLLOWMERE_TYPESCRIPT || '../node_modules/typescript');
const noop = () => {};
const phaser = { Scene: class {}, BlendModes: { ADD: 1 }, Math: { Clamp: (v,a,b) => Math.max(a,Math.min(b,v)) } };
function loader(overrides = {}, random = Math.random) {
  const cache = new Map();
  const math = Object.create(Math); math.random = random;
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file,module);
    const source = ts.transpileModule(readFileSync(file,'utf8'), { compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS, esModuleInterop:true } }).outputText;
    const localRequire = (id) => {
      if (id === 'phaser') return phaser;
      if (Object.hasOwn(overrides,id)) return overrides[id];
      return load(path.resolve(path.dirname(file), id + '.ts'));
    };
    vm.runInNewContext(source, { module, exports:module.exports, require:localRequire, console:{...console,warn:noop}, Math:math }, { filename:file });
    return module.exports;
  };
  return (file) => load(path.join(root,'src',file));
}
function surface() {
  const textures = new Map();
  const gradient = { addColorStop:noop };
  const ctx = new Proxy({}, { get:(_t,k) => k === 'measureText' ? () => ({width:40}) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => gradient : noop, set:() => true });
  const list = [];
  class Drawable {
    constructor(type,x,y,w,h,key) { Object.assign(this,{type,x,y,width:w,height:h,key,scaleX:1,scaleY:1,alpha:1,visible:true}); list.push(this); }
    get displayWidth() { return this.width*Math.abs(this.scaleX); }
    get displayHeight() { return this.height*Math.abs(this.scaleY); }
    setScale(x,y=x) { this.scaleX=x; this.scaleY=y; return this; }
    setDisplaySize(w,h) { return this.setScale(w/this.width,h/this.height); }
    setOrigin(x,y=x) { this.originX=x; this.originY=y; return this; }
    setPosition(x,y) { this.x=x; this.y=y; return this; }
    setAlpha(v) { this.alpha=v; return this; }
    setVisible(v) { this.visible=v; return this; }
    setTint() { return this; } setBlendMode() { return this; } setScrollFactor() { return this; }
    setDepth(v) { this.depth=v; return this; }
  }
  const cam = {zoom:1,width:1280,height:800,scrollX:0,worldView:{x:3100,y:700,width:800,height:600,right:3900,bottom:1300}};
  const scene = {
    cameras:{main:cam}, time:{delayedCall:noop},
    textures:{exists:k => textures.has(k),createCanvas:(k,w,h) => { textures.set(k,{w,h}); return {getContext:() => ctx,refresh:noop}; }},
    add:{image:(x,y,k) => { const {w,h}=textures.get(k) ?? {w:128,h:128}; return new Drawable('Image',x,y,w,h,k); },
      tileSprite:(x,y,w,h,k) => new Drawable('TileSprite',x,y,w,h,k),rectangle:(x,y,w,h) => new Drawable('Rectangle',x,y,w,h,'rect')},
  };
  return {scene,list,cam};
}
test('soil covers the right and bottom of the basement, with tiled walls and full-size soft textures', () => {
  const load = loader();
  const {buildWorld} = load('art/roomArt.ts');
  const {scene,list} = surface();
  buildWorld(scene,{npcs:[]});
  const soil = list.find(o => o.key==='st:soil');
  assert.equal(soil.type,'TileSprite');
  for (const [x,y] of [[3500,1510],[3999,1829],[1600,1760]]) {
    assert.ok(x >= soil.x && x < soil.x+soil.displayWidth && y>=soil.y && y<soil.y+soil.displayHeight, `earth missing at ${x},${y}`);
  }
  const slabs=list.filter(o => ['st:slab','st:slabStone'].includes(o.key));
  assert.equal(slabs.length,4);
  for (const slab of slabs) { assert.equal(slab.type,'TileSprite'); assert.equal(slab.displayWidth,3000); }
  const {ROOMS,LIGHTS}=load('world/layout.ts');
  for (const r of ROOMS) {
    const dark=list.find(o => o.key===`st:dark:${r.id}`);
    assert.equal(dark.displayWidth,r.x1-r.x0); assert.equal(dark.displayHeight,r.floorY-r.ceil);
  }
  for (const l of LIGHTS) {
    const glow=list.find(o => o.key===`st:glow:${l.id}`);
    assert.ok(glow.displayWidth > 0);
  }
});
test('outdoor motes never drift into the house or underground', () => {
  const load=loader({},() => 0.5);
  const {buildWorld}=load('art/roomArt.ts');
  const {scene,list,cam}=surface();
  const world=buildWorld(scene,{npcs:[]});
  for(let i=0;i<1000;i++) world.update(0.05,cam,1);
  const motes=list.filter(o => o.key==='st:mote' && o.visible);
  assert.ok(motes.length>0,'exercise actual visible motes');
  for(const m of motes) assert.ok(m.x<160 || m.x>3240,`mote drifted into house at ${m.x}`);
  cam.worldView={x:3140.1,y:700,width:200,height:600,right:3340.1,bottom:1300};
  for(let i=0;i<500;i++) {
    world.update(0.05,cam,1);
    for(const m of list.filter(o => o.key==='st:mote' && o.visible)) assert.ok(m.x<160 || m.x>3240, `drift crossed house boundary at ${m.x}`);
  }
  cam.worldView={x:160,y:700,width:3080,height:600,right:3240,bottom:1300};
  for(let i=0;i<300;i++) world.update(0.05,cam,1);
  for(const m of list.filter(o => o.key==='st:mote' && o.visible)) assert.ok(m.x<160 || m.x>3240);
});
test('game and clock wait for Start, pause together, and freeze after victory', () => {
  const stub = new Proxy({}, {get:() => class {}});
  const load=loader(Object.fromEntries(['./input','../art/roomArt','../entities/HauntableObject','../entities/NPCController','../entities/GhostController','../systems/FearSystem','../systems/RoomSystem','../systems/AudioManager','../systems/EffectsManager','../systems/HauntingIntensitySystem','../systems/PossessionSystem','../ui/HUD'].map(k => [k,stub])));
  const {GameScene}=load('scenes/GameScene.ts');
  const game=new GameScene();
  const updates=[];
  const clock=[];
  const part={update:dt => updates.push(dt)};
  game.ctx={stats:{startMs:0},objects:[part],npcs:[part],fear:part,intensity:{...part,value:0},world:part,rooms:{at:() => null},audio:{...part,setListener:noop},fx:part};
  game.ghost=part; game.possession={...part,near:null}; game.fx=part;
  game.hud={...part,setClock:ms => clock.push(ms)}; game.cameras={main:{}};
  game.applyCamera=noop; game.spawnGuests=noop;
  game.update(0,50);
  assert.equal(game.clockMs,0); assert.equal(updates.length,0);
  game.started=true; game.update(0,50);
  assert.equal(game.clockMs,50); assert.equal(clock.at(-1),50,'time starts at zero without truthy startMs sentinel');
  game.paused=true; game.update(0,50); assert.equal(game.clockMs,50);
  game.paused=false; game.won=true; const count=updates.length;
  game.update(0,50); assert.equal(game.clockMs,50); assert.equal(updates.length,count);
});
