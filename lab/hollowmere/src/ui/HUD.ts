// DOM overlay HUD. Nothing on screen while flying except a tiny emblem + ring and
// the resident cameos; the possession panel springs in beside the object.

import { INTENSITY } from '../config';
import { FONT_TITLE, FONT_UI } from '../art/paint';
import type { GameCtx, IHauntable } from '../types';
import type { PossessionHud } from '../systems/PossessionSystem';

export interface HudCallbacks {
  onAct(index: number): void;
  onLeave(): void;
  onResume(): void;
  onRestart(): void;
}

export interface HudView { cx: number; cy: number; zoom: number; w: number; h: number; dpr: number }

const RING_C = 2 * Math.PI * 20;
const LEVEL_CAPTIONS = ['', 'The house stirs…', 'Something answers.', 'Hollowmere awakens.'];
const SKIP_INTRO_KEY = 'hollowmere-skip-intro';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function fearColor(f: number): string {
  // cream → amber → rose-violet as fear deepens
  const t = Math.max(0, Math.min(1, f / 100));
  const stops: [number, number, number][] = [[241, 227, 198], [255, 198, 107], [214, 74, 118]];
  const u = t * 2;
  const i = Math.min(1, Math.floor(u));
  const k = u - i;
  const a = stops[i];
  const b = stops[i + 1];
  const c = (j: number) => Math.round(a[j] + (b[j] - a[j]) * k);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

const CSS = `
#hm-hud, #hm-hud * { box-sizing: border-box; }
#hm-hud { position: fixed; inset: 0; z-index: 20; pointer-events: none; color: #f1e3c6; font-family: ${FONT_UI}; -webkit-font-smoothing: antialiased; user-select: none; }
#hm-hud .key { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 6px; font: 600 11px/1 ${FONT_UI}; color: #f1e3c6; background: rgba(241,227,198,.10); border: 1px solid rgba(241,227,198,.28); box-shadow: 0 1px 0 rgba(0,0,0,.35); letter-spacing: .02em; }

/* emblem */
.hm-emblem { position: absolute; left: 18px; top: 16px; display: flex; align-items: center; gap: 10px; }
.hm-emblem svg { width: 46px; height: 46px; filter: drop-shadow(0 0 8px rgba(159,232,255,.25)); }
.hm-emblem .track { fill: rgba(14,10,24,.45); stroke: rgba(241,227,198,.14); stroke-width: 2; }
.hm-emblem .ring { fill: none; stroke: #9fe8ff; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: ${RING_C.toFixed(2)}; stroke-dashoffset: ${RING_C.toFixed(2)}; transform: rotate(-90deg); transform-origin: 24px 24px; transition: stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1), stroke .8s; }
.hm-emblem .wisp { fill: rgba(233,251,255,.92); }
.hm-emblem .eye { fill: #1a1426; }
.hm-emblem.pulse svg { animation: hm-emblem-pulse .9s cubic-bezier(.2,1.4,.4,1); }
@keyframes hm-emblem-pulse { 0% { transform: scale(1); } 30% { transform: scale(1.28); filter: drop-shadow(0 0 16px rgba(159,232,255,.9)); } 100% { transform: scale(1); } }
.hm-emblem .lvl { font: italic 500 13px/1 ${FONT_TITLE}; letter-spacing: .1em; text-transform: lowercase; font-variant: small-caps; color: rgba(241,227,198,.9); opacity: 0; transform: translateX(-6px); transition: opacity .6s, transform .6s; text-shadow: 0 1px 8px rgba(0,0,0,.6); }
.hm-emblem .lvl.on { opacity: 1; transform: none; }

/* cameos */
.hm-cameos { position: absolute; right: 18px; top: 18px; display: flex; gap: 8px; }
.hm-cam { position: relative; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(14,10,24,.5); font: 600 10.5px/1 ${FONT_UI}; letter-spacing: .04em; color: rgba(241,227,198,.92); transition: opacity .8s, transform .3s; }
.hm-cam::before { content: ''; position: absolute; inset: 0; border-radius: 50%; padding: 2.5px; background: conic-gradient(var(--c, #f1e3c6) calc(var(--f, 0) * 1%), rgba(241,227,198,.16) 0); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.hm-cam.scare { animation: hm-cam-shake .4s; }
@keyframes hm-cam-shake { 0%,100% { transform: none; } 20% { transform: translateX(-2px) scale(1.08); } 40% { transform: translateX(2px) scale(1.08); } 60% { transform: translateX(-1px); } }
.hm-cam.fled { opacity: .32; background: transparent; color: rgba(241,227,198,.6); }
.hm-cam.fled::before { background: none; border: 1px dashed rgba(241,227,198,.5); padding: 0; -webkit-mask: none; mask: none; }

/* captions */
.hm-caps { position: absolute; left: 0; right: 0; top: 26px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.hm-cap { font: italic 400 22px/1.2 ${FONT_TITLE}; letter-spacing: .02em; color: #f6ecd2; text-shadow: 0 2px 14px rgba(0,0,0,.75), 0 0 24px rgba(159,232,255,.25); will-change: transform, opacity; }
.hm-cap.small { font-size: 16px; color: rgba(246,236,210,.92); }
.hm-cap.quiet { font-size: 15px; color: rgba(246,236,210,.7); }

/* possession panel */
.hm-panel { position: absolute; left: 0; top: 0; width: 240px; will-change: transform; opacity: 0; transition: opacity .16s; }
.hm-panel.on { opacity: 1; }
.hm-panel .card { pointer-events: auto; padding: 12px 14px 10px; border-radius: 14px; background: rgba(20,14,30,.74); -webkit-backdrop-filter: blur(10px) saturate(1.15); backdrop-filter: blur(10px) saturate(1.15); border: 1px solid rgba(241,227,198,.15); box-shadow: 0 10px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05); transform-origin: 0 50%; }
.hm-panel.on .card { animation: hm-panel-in .42s cubic-bezier(.2,1.5,.35,1) both; }
.hm-panel.flip .card { transform-origin: 100% 50%; }
@keyframes hm-panel-in { from { opacity: 0; transform: translateX(-10px) scale(.84); } to { opacity: 1; transform: none; } }
.hm-panel .name { font: italic 500 12px/1 ${FONT_TITLE}; font-variant: small-caps; letter-spacing: .14em; color: #e8c372; margin: 0 0 9px 1px; }
.hm-row { position: relative; display: flex; align-items: center; gap: 9px; padding: 7px 4px 8px; font-size: 13.5px; color: #f6ecd2; cursor: pointer; border-radius: 8px; transition: opacity .25s, background .15s; }
.hm-row:hover { background: rgba(241,227,198,.07); }
.hm-row .nm { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hm-row .lock { display: none; font: italic 400 11px/1 ${FONT_TITLE}; color: rgba(241,227,198,.5); }
.hm-row.locked { opacity: .42; cursor: default; }
.hm-row.locked .nm { display: none; }
.hm-row.locked .lock { display: inline; }
.hm-row.locked:hover { background: none; }
.hm-row .cd { position: absolute; left: 4px; right: 4px; bottom: 2px; height: 2px; border-radius: 2px; background: #e8c372; transform-origin: 0 50%; transform: scaleX(0); opacity: .85; }
.hm-row.busy .key { background: rgba(232,195,114,.24); border-color: rgba(232,195,114,.6); }
.hm-row.press { animation: hm-press .28s ease-out; }
.hm-row.deny { animation: hm-deny .3s; }
@keyframes hm-press { 0% { background: rgba(232,195,114,.32); transform: scale(.98); } 100% { background: transparent; transform: none; } }
@keyframes hm-deny { 0%,100% { transform: none; } 25% { transform: translateX(-3px); } 55% { transform: translateX(3px); } }
.hm-panel .foot { display: flex; align-items: center; gap: 8px; margin: 6px 2px 0; padding-top: 8px; border-top: 1px solid rgba(241,227,198,.1); font-size: 11.5px; color: rgba(241,227,198,.62); cursor: pointer; }

/* hint */
.hm-hint { position: absolute; left: 50%; bottom: 30px; transform: translate(-50%, 8px); display: flex; align-items: center; gap: 8px; padding: 7px 14px 7px 9px; border-radius: 999px; background: rgba(20,14,30,.6); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border: 1px solid rgba(241,227,198,.14); font-size: 12.5px; color: rgba(246,236,210,.9); opacity: 0; transition: opacity .25s, transform .3s cubic-bezier(.2,1.3,.4,1); }
.hm-hint.on { opacity: 1; transform: translate(-50%, 0); }

/* overlays (intro / pause / win) */
.hm-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .6s; }
.hm-overlay.on { opacity: 1; pointer-events: auto; }
.hm-overlay.dim { background: radial-gradient(ellipse at center, rgba(8,6,16,.5), rgba(8,6,16,.78)); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); }
.hm-sheet { max-width: 520px; padding: 34px 40px 30px; text-align: center; border-radius: 20px; background: rgba(18,12,28,.82); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border: 1px solid rgba(241,227,198,.14); box-shadow: 0 24px 80px rgba(0,0,0,.55); }
.hm-overlay.on .hm-sheet { animation: hm-sheet-in .6s cubic-bezier(.2,1.2,.35,1) both; }
@keyframes hm-sheet-in { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
.hm-title { font: 500 54px/1 ${FONT_TITLE}; letter-spacing: .1em; color: #f6ecd2; text-shadow: 0 0 30px rgba(159,232,255,.35); margin: 0 0 12px; }
.hm-title.small { font-size: 32px; letter-spacing: .08em; }
.hm-sub { font: italic 400 17px/1.45 ${FONT_TITLE}; color: rgba(246,236,210,.82); margin: 0 0 22px; }
.hm-keys { display: grid; grid-template-columns: auto auto; justify-content: center; gap: 9px 22px; text-align: left; font-size: 13px; color: rgba(246,236,210,.85); margin: 0 0 22px; }
.hm-keys .k { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.hm-go { font: 500 11.5px/1 ${FONT_UI}; letter-spacing: .22em; text-transform: uppercase; color: rgba(241,227,198,.55); animation: hm-breathe 2.4s ease-in-out infinite; }
@keyframes hm-breathe { 0%,100% { opacity: .35; } 50% { opacity: .9; } }
.hm-btns { display: flex; gap: 10px; justify-content: center; margin: 4px 0 20px; }
.hm-btn { font: 600 13px/1 ${FONT_UI}; letter-spacing: .04em; padding: 11px 20px; border-radius: 999px; color: #f6ecd2; background: rgba(241,227,198,.08); border: 1px solid rgba(241,227,198,.24); cursor: pointer; transition: background .15s, transform .15s, border-color .15s; font-family: ${FONT_UI}; }
.hm-btn:hover { background: rgba(241,227,198,.16); transform: translateY(-1px); }
.hm-btn:active { transform: scale(.97); }
.hm-btn.primary { background: linear-gradient(180deg, #f0cf86, #d6a85a); color: #2a1a0e; border-color: rgba(255,240,200,.6); box-shadow: 0 6px 22px rgba(214,168,90,.28); }
.hm-btn.primary:hover { background: linear-gradient(180deg, #f8dc98, #e0b468); }
.hm-vol { display: flex; align-items: center; gap: 12px; justify-content: center; margin: 0 0 18px; font-size: 12px; color: rgba(246,236,210,.7); }
.hm-vol input[type=range] { -webkit-appearance: none; appearance: none; width: 170px; height: 4px; border-radius: 4px; background: rgba(241,227,198,.22); outline: none; }
.hm-vol input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #e8c372; border: 2px solid #2a1a0e; cursor: pointer; }
.hm-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 26px; margin: 4px 0 24px; text-align: left; }
.hm-stats div { display: flex; flex-direction: column; gap: 4px; }
.hm-stats b { font: 500 22px/1 ${FONT_TITLE}; color: #f6ecd2; }
.hm-stats span { font: 500 10.5px/1 ${FONT_UI}; letter-spacing: .16em; text-transform: uppercase; color: rgba(241,227,198,.5); }

#hm-vignette { position: fixed; inset: 0; z-index: 10; pointer-events: none; opacity: .55; background: radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(10,6,24,.5) 80%, rgba(6,3,16,.82) 100%); }
#hm-lightning { position: fixed; inset: 0; z-index: 11; pointer-events: none; opacity: 0; background: #dfe9ff; mix-blend-mode: screen; }
#hm-flash { position: fixed; inset: 0; z-index: 12; pointer-events: none; opacity: 0; }
`;

const mmss = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class HUD implements PossessionHud {
  /** Updated by GameScene each frame (screen placement of the possession panel). */
  view: HudView = { cx: 0, cy: 0, zoom: 1, w: 1, h: 1, dpr: 1 };
  /** Nearest hauntable while flying (for the key hint). */
  near: IHauntable | null = null;
  paused = false;

  private ctx: GameCtx;
  private cb: HudCallbacks;
  private root: HTMLDivElement;
  private emblem: HTMLDivElement;
  private ring: SVGCircleElement;
  private lvl: HTMLSpanElement;
  private lvlTimer = 0;
  private lastRing = -1;
  private caps: HTMLDivElement;
  private cameos = new Map<string, HTMLDivElement>();
  private camState = new Map<string, { f: number; scare: boolean }>();
  private camT = 0;
  private panel: HTMLDivElement;
  private panelName: HTMLDivElement;
  private rows: HTMLDivElement[] = [];
  private rowCache: { locked: boolean; busy: boolean; cd: number }[] = [];
  private panelObj: IHauntable | null = null;
  private panelH = 150;
  private hint: HTMLDivElement;
  private intro: HTMLDivElement | null = null;
  private pauseEl: HTMLDivElement;
  private winEl: HTMLDivElement;
  private winShown = false;
  private muteBtn: HTMLButtonElement;
  private volInput: HTMLInputElement;

  constructor(ctx: GameCtx, cb: HudCallbacks) {
    this.ctx = ctx;
    this.cb = cb;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = h('div');
    this.root.id = 'hm-hud';
    document.body.appendChild(this.root);

    // ---- emblem ----
    this.emblem = h('div', 'hm-emblem');
    this.emblem.innerHTML = `<svg viewBox="0 0 48 48"><circle class="track" cx="24" cy="24" r="20"/><circle class="ring" cx="24" cy="24" r="20"/>
      <path class="wisp" d="M24 13.5c-5.2 0-8.4 3.9-8.4 8.8v11.4l2.9-2.2 2.7 2.6 2.8-2.6 2.8 2.6 2.7-2.6 2.9 2.2V22.3c0-4.9-3.2-8.8-8.4-8.8z"/>
      <ellipse class="eye" cx="21" cy="22.6" rx="1.5" ry="2.3"/><ellipse class="eye" cx="27" cy="22.6" rx="1.5" ry="2.3"/></svg><span class="lvl"></span>`;
    this.ring = this.emblem.querySelector('.ring') as SVGCircleElement;
    this.lvl = this.emblem.querySelector('.lvl') as HTMLSpanElement;
    this.root.appendChild(this.emblem);

    // ---- cameos (initials come from the NPC defs) ----
    const cams = h('div', 'hm-cameos');
    const addCam = (n: { id: string; def: { initials: string; name: string } }): void => {
      const c = h('div', 'hm-cam');
      c.textContent = n.def.initials;
      c.title = n.def.name;
      cams.appendChild(c);
      this.cameos.set(n.id, c);
      this.camState.set(n.id, { f: -1, scare: false });
    };
    for (const n of ctx.npcs) addCam(n);
    ctx.events.on('npc:arrived', (e: { npcId: string; name: string }) => {
      const n = ctx.npcs.find((q) => q.id === e.npcId);
      if (n) addCam(n);
      this.caption(`${e.name} arrives for the party.`, 'small');
    });
    this.root.appendChild(cams);

    this.caps = h('div', 'hm-caps');
    this.root.appendChild(this.caps);

    // ---- possession panel ----
    this.panel = h('div', 'hm-panel');
    const card = h('div', 'card');
    this.panelName = h('div', 'name');
    card.appendChild(this.panelName);
    for (let i = 0; i < 3; i++) {
      const r = h('div', 'hm-row', `<span class="key">${i + 1}</span><span class="nm"></span><span class="lock">deepen the haunting</span><i class="cd"></i>`);
      r.addEventListener('click', () => this.cb.onAct(i));
      card.appendChild(r);
      this.rows.push(r);
      this.rowCache.push({ locked: false, busy: false, cd: -1 });
    }
    const foot = h('div', 'foot', `<span class="key">E</span> leave`);
    foot.addEventListener('click', () => this.cb.onLeave());
    card.appendChild(foot);
    this.panel.appendChild(card);
    this.root.appendChild(this.panel);

    this.hint = h('div', 'hm-hint', `<span class="key">E</span> possess`);
    this.root.appendChild(this.hint);

    // ---- pause ----
    this.pauseEl = h('div', 'hm-overlay dim');
    this.pauseEl.innerHTML = `<div class="hm-sheet"><div class="hm-title small">Paused</div><p class="hm-sub">The house will wait.</p>
      <div class="hm-btns"><button class="hm-btn primary" data-a="resume">Resume</button><button class="hm-btn" data-a="restart">Restart</button></div>
      <div class="hm-vol"><span>Volume</span><input type="range" min="0" max="100" step="1"><button class="hm-btn" data-a="mute" style="padding:7px 12px">Mute</button></div>
      ${this.keysHtml()}</div>`;
    this.root.appendChild(this.pauseEl);
    this.volInput = this.pauseEl.querySelector('input') as HTMLInputElement;
    this.muteBtn = this.pauseEl.querySelector('[data-a=mute]') as HTMLButtonElement;
    this.volInput.value = String(Math.round((ctx.audio.volume ?? 0.8) * 100));
    this.volInput.addEventListener('input', () => ctx.audio.setVolume(Number(this.volInput.value) / 100));
    this.muteBtn.addEventListener('click', () => {
      ctx.audio.muted = !ctx.audio.muted;
      this.muteBtn.textContent = ctx.audio.muted ? 'Unmute' : 'Mute';
    });
    (this.pauseEl.querySelector('[data-a=resume]') as HTMLElement).addEventListener('click', () => this.cb.onResume());
    (this.pauseEl.querySelector('[data-a=restart]') as HTMLElement).addEventListener('click', () => this.cb.onRestart());

    // ---- win ----
    this.winEl = h('div', 'hm-overlay dim');
    this.root.appendChild(this.winEl);

    // ---- intro ----
    let skip = false;
    try {
      skip = sessionStorage.getItem(SKIP_INTRO_KEY) === '1';
      sessionStorage.removeItem(SKIP_INTRO_KEY);
    } catch { /* ignore */ }
    if (!skip) {
      this.intro = h('div', 'hm-overlay');
      this.intro.innerHTML = `<div class="hm-sheet"><div class="hm-title">Hollowmere</div>
        <p class="hm-sub">Seven residents think they live alone — and tonight guests are arriving for a party.<br>Slip into the furniture. Haunt every last one of them out.</p>${this.keysHtml()}
        <div class="hm-go">press any key</div></div>`;
      this.root.appendChild(this.intro);
      requestAnimationFrame(() => this.intro?.classList.add('on'));
    }

    // ---- events ----
    const ev = ctx.events;
    ev.on('npc:fled', (e: { name: string }) => this.caption(`${e.name} fled Hollowmere.`, 'small'));
    ev.on('intensity:level', (e: { level: number; up: boolean }) => this.onLevel(e.level, e.up));
    ev.on('win', (e: { timeMs: number }) => this.onWin(e.timeMs));
    ev.on('npc:scream', (e: { npcId: string }) => {
      const c = this.cameos.get(e.npcId);
      if (!c) return;
      c.classList.remove('scare');
      void c.offsetWidth;
      c.classList.add('scare');
    });
    ctx.scene.events.once('shutdown', () => { this.root.remove(); style.remove(); });
  }

  private keysHtml(): string {
    const k = (s: string) => `<span class="key">${s}</span>`;
    return `<div class="hm-keys">
      <div class="k">${k('W')}${k('A')}${k('S')}${k('D')}</div><div>float through the house</div>
      <div class="k">${k('E')} / ${k('Space')}</div><div>possess · leave</div>
      <div class="k">${k('1')}${k('2')}${k('3')}</div><div>haunt</div>
      <div class="k">${k('click')}</div><div>fly to a spot · possess</div>
      <div class="k">${k('scroll')} ${k('+')}${k('−')}</div><div>zoom</div>
      <div class="k">${k('Esc')}</div><div>pause</div></div>`;
  }

  // ------------------------------------------------------------- public ----

  dismissIntro(): void {
    const el = this.intro;
    if (!el) return;
    this.intro = null;
    el.classList.remove('on');
    window.setTimeout(() => el.remove(), 800);
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.pauseEl.classList.toggle('on', p);
    if (p) {
      this.volInput.value = String(Math.round(this.ctx.audio.volume * 100));
      this.muteBtn.textContent = this.ctx.audio.muted ? 'Unmute' : 'Mute';
    }
  }

  caption(text: string, size: '' | 'small' | 'quiet' = ''): void {
    while (this.caps.children.length >= 3) this.caps.firstElementChild?.remove();
    const el = h('div', `hm-cap ${size}`.trim(), '');
    el.textContent = text;
    this.caps.appendChild(el);
    const hold = size === '' ? 2600 : 2100;
    const anim = el.animate(
      [
        { opacity: 0, transform: 'translateY(-8px) scale(.98)', offset: 0 },
        { opacity: 1, transform: 'none', offset: 0.14 },
        { opacity: 1, transform: 'none', offset: 1 - 0.28 },
        { opacity: 0, transform: 'translateY(-4px)', offset: 1 },
      ],
      { duration: hold + 1400, easing: 'ease-out' },
    );
    anim.onfinish = () => el.remove();
  }

  denyRow(i: number): void {
    const r = this.rows[i];
    if (!r) return;
    r.classList.remove('deny');
    void r.offsetWidth;
    r.classList.add('deny');
  }

  pressRow(i: number): void {
    const r = this.rows[i];
    if (!r) return;
    r.classList.remove('press');
    void r.offsetWidth;
    r.classList.add('press');
  }

  // ------------------------------------------------------------- events ----

  private onLevel(level: number, up: boolean): void {
    this.emblem.classList.remove('pulse');
    void this.emblem.offsetWidth;
    this.emblem.classList.add('pulse');
    this.lvl.textContent = INTENSITY.names[level];
    this.lvl.classList.add('on');
    this.lvlTimer = 4.5;
    if (up) this.caption(LEVEL_CAPTIONS[level] ?? '');
    else this.caption('The house settles.', 'quiet');
  }

  private onWin(timeMs: number): void {
    if (this.winShown) return;
    this.winShown = true;
    const s = this.ctx.stats;
    let fav = '—';
    let best = 0;
    for (const [id, n] of Object.entries(s.perObject)) {
      if (n > best) {
        best = n;
        fav = this.ctx.objects.find((o) => o.id === id)?.def.name ?? id;
      }
    }
    const screams = Math.max(s.screams, this.ctx.fear.totalScreams);
    this.winEl.innerHTML = `<div class="hm-sheet"><div class="hm-title small">Hollowmere is empty</div>
      <p class="hm-sub">Every resident and every party guest has fled into the night.<br>The house is yours.</p>
      <div class="hm-stats"><div><b>${mmss(timeMs)}</b><span>Time</span></div><div><b>${s.haunts}</b><span>Haunts performed</span></div>
      <div><b>${screams}</b><span>Screams caused</span></div><div><b>${fav}</b><span>Favourite object</span></div></div>
      <div class="hm-btns"><button class="hm-btn primary">Haunt again</button></div></div>`;
    (this.winEl.querySelector('button') as HTMLElement).addEventListener('click', () => this.cb.onRestart());
    window.setTimeout(() => this.winEl.classList.add('on'), 2400);
  }

  // ------------------------------------------------------------- update ----

  update(dt: number): void {
    const { ctx } = this;
    // emblem ring
    const v = ctx.intensity.value;
    if (Math.abs(v - this.lastRing) > 0.003) {
      this.lastRing = v;
      this.ring.style.strokeDashoffset = String(RING_C * (1 - v));
      this.ring.style.stroke = v > 0.78 ? '#c9a8ff' : v > 0.48 ? '#b9c4ff' : '#9fe8ff';
    }
    if (this.lvlTimer > 0) {
      this.lvlTimer -= dt;
      if (this.lvlTimer <= 0) this.lvl.classList.remove('on');
    }

    // cameos (10 Hz)
    this.camT -= dt;
    if (this.camT <= 0) {
      this.camT = 0.1;
      for (const n of ctx.npcs) {
        const el = this.cameos.get(n.id);
        const st = this.camState.get(n.id);
        if (!el || !st) continue;
        if (n.fled) {
          if (!el.classList.contains('fled')) el.classList.add('fled');
          continue;
        }
        const f = Math.round(Math.max(n.fear, n.panic * 0.6));
        if (f !== st.f) {
          st.f = f;
          el.style.setProperty('--f', String(f));
          el.style.setProperty('--c', fearColor(f));
        }
      }
    }

    this.updatePanel();

    // key hint while flying near something (until the player has the idea)
    const showHint = !this.ctx.ghost.possessing && !!this.near && ctx.stats.haunts < 3 && !this.intro && !this.paused;
    this.hint.classList.toggle('on', showHint);
  }

  private sx(x: number): number {
    const v = this.view;
    return ((x - v.cx) * v.zoom + v.w / 2) / v.dpr;
  }
  private sy(y: number): number {
    const v = this.view;
    return ((y - v.cy) * v.zoom + v.h / 2) / v.dpr;
  }

  private updatePanel(): void {
    const o = this.ctx.ghost.possessing;
    if (o !== this.panelObj) {
      this.panelObj = o;
      if (o) this.openPanel(o);
      else this.panel.classList.remove('on');
    }
    if (!o) return;
    const b = o.bounds;
    const pw = 240;
    const ph = this.panelH;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = this.sx(b.right) + 18;
    let flip = false;
    if (x + pw > vw - 12) {
      x = this.sx(b.left) - 18 - pw;
      flip = true;
    }
    x = Math.max(12, Math.min(vw - pw - 12, x));
    const y = Math.max(64, Math.min(vh - ph - 12, this.sy(b.centerY) - ph / 2));
    this.panel.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    this.panel.classList.toggle('flip', flip);

    for (let i = 0; i < 3; i++) {
      const r = this.rows[i];
      const c = this.rowCache[i];
      const locked = !o.unlocked(i);
      const busy = o.busy;
      if (locked !== c.locked) {
        c.locked = locked;
        r.classList.toggle('locked', locked);
        if (!locked) this.pressRow(i);
      }
      if (busy !== c.busy) {
        c.busy = busy;
        r.classList.toggle('busy', busy);
      }
      const cd = locked ? 0 : Math.round(o.cooldownFrac(i) * 100) / 100;
      if (cd !== c.cd) {
        c.cd = cd;
        (r.querySelector('.cd') as HTMLElement).style.transform = `scaleX(${cd})`;
      }
    }
  }

  private openPanel(o: IHauntable): void {
    this.panelName.textContent = o.def.name;
    for (let i = 0; i < 3; i++) {
      const r = this.rows[i];
      (r.querySelector('.nm') as HTMLElement).textContent = o.def.actions[i].name;
      const locked = !o.unlocked(i);
      r.classList.toggle('locked', locked);
      r.classList.remove('busy');
      this.rowCache[i] = { locked, busy: false, cd: -1 };
    }
    // restart the spring-in animation
    this.panel.classList.remove('on');
    void this.panel.offsetWidth;
    this.panel.classList.add('on');
    this.panelH = this.panel.offsetHeight || 150;
  }
}
