"""Headed WebGL regression: intro, terrain, steering, guests and a real-haunt win.
Run through arm-check. No direct fear/state/event writes are used to win.
"""
import json
import mimetypes
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
if not (root / 'node_modules').exists():
    cached = os.environ.get('HOLLOWMERE_NODE_MODULES')
    if cached and Path(cached).is_dir():
        shutil.copytree(cached, root / 'node_modules', symlinks=True)
    else:
        subprocess.run(['npm', 'ci', '--cache', '/private/tmp/hollowmere-npm-cache'], cwd=root, check=True)
subprocess.run(['npm', 'run', 'build'], cwd=root, check=True)
out = Path(tempfile.mkdtemp(prefix='hollowmere-proof-'))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, args=['--autoplay-policy=no-user-gesture-required', '--use-angle=metal'])
    pg = browser.new_page(viewport={'width':1280, 'height':800})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    def asset(route):
        from urllib.parse import urlparse
        rel = urlparse(route.request.url).path.lstrip('/') or 'index.html'
        path = (root / 'dist' / rel).resolve()
        if not path.is_relative_to((root / 'dist').resolve()) or not path.is_file():
            route.fulfill(status=404, body='missing asset')
            return
        route.fulfill(status=200, body=path.read_bytes(), content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream')
    pg.route('http://hollowmere.test/**', asset)
    pg.goto('http://hollowmere.test/')
    pg.wait_for_function('!!window.__hollow')
    pg.wait_for_timeout(1200)
    assert pg.locator('[data-a=start]').count() == 1, 'intro must have an explicit Start button'
    assert 'guests' in pg.locator('.hm-overlay.on').inner_text(), 'intro explains the party'
    before = pg.evaluate('window.__hollow.ctx.now()')
    pg.wait_for_timeout(1100)
    assert pg.evaluate('window.__hollow.ctx.now()') == before, 'timer/game must wait for Start'
    assert len(pg.evaluate('window.__hollow.guests()')) == 8, 'guests wait for Start'
    pg.screenshot(path=str(out / 'intro.png'))
    pg.locator('[data-a=start]').click()
    pg.wait_for_timeout(1100)
    assert pg.locator('.hm-clock').inner_text() != '0:00', 'live timer advances after Start'
    terrain = pg.evaluate('''() => {
        const objs = window.__hollow.scene.children.list;
        // Phaser >=3.60 TileSprites render through an internal UUID texture;
        // the source image key lives on displayTexture.
        const key = o => o.displayTexture?.key ?? o.texture?.key;
        const soil = objs.find(o => key(o) === 'st:soil');
        const slabs = objs.filter(o => ['st:slab', 'st:slabStone'].includes(key(o)));
        const darks = objs.filter(o => key(o)?.startsWith('st:dark:'));
        return {type:soil.type, x:soil.x, y:soil.y, w:soil.displayWidth, h:soil.displayHeight,
            slabs:slabs.map(o => ({type:o.type, w:o.displayWidth})),
            darks:darks.map(o => ({w:o.displayWidth, h:o.displayHeight}))};
    }''')
    assert terrain['type'] == 'TileSprite', terrain
    assert terrain['x'] + terrain['w'] >= 4000 and terrain['y'] + terrain['h'] >= 1830, terrain
    assert all(o['type'] == 'TileSprite' and o['w'] == 3000 for o in terrain['slabs']), terrain
    assert all(o['h'] >= 280 for o in terrain['darks']), terrain
    pg.evaluate('window.__hollow.teleport(3500, 1510)')
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(out / 'basement-right.png'))
    pg.evaluate('window.__hollow.teleport(1600, 1690)')
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(out / 'basement-below.png'))
    pg.evaluate('window.__hollow.teleport(1500, 880)')
    t0 = pg.evaluate('window.__hollow.ctx.now()')
    pg.keyboard.down('ArrowRight')
    pg.wait_for_timeout(180)
    steering = pg.evaluate('({x:window.__hollow.ctx.ghost.x,vx:window.__hollow.ctx.ghost.vx,t:window.__hollow.ctx.now()})')
    pg.keyboard.up('ArrowRight')
    # Judge in GAME time: Playwright's keydown->evaluate latency varies run to run.
    # GHOST response 4.8 / maxSpeed 420 => v(t) = 420*(1-exp(-4.8 t)); no jump past max.
    import math
    held = (steering['t'] - t0) / 1000
    expect = 420 * (1 - math.exp(-4.8 * held))
    steering.update(held=held, expect=expect)
    assert 0.05 < held < 1 and steering['vx'] < 420 and 0.6 * expect < steering['vx'] < 1.4 * expect, steering
    pg.wait_for_timeout(1200)
    assert abs(pg.evaluate('window.__hollow.ctx.ghost.vx')) < 15, 'release glides to rest'
    pg.keyboard.press('Escape')
    paused = pg.evaluate('window.__hollow.ctx.now()')
    pg.wait_for_timeout(1100)
    assert pg.evaluate('window.__hollow.ctx.now()') == paused, 'pause freezes clock'
    pg.keyboard.press('Escape')
    pg.evaluate('window.__hollow.speed(8)')
    # Exercise the actual world update, including drift at the exterior boundary.
    for x,y in [(250,900),(3160,980),(3550,1150),(1600,850)]:
        pg.evaluate('([x,y]) => window.__hollow.teleport(x,y)', [x,y])
        for _ in range(5):
            pg.wait_for_timeout(160)
            inside = pg.evaluate('''() => window.__hollow.scene.children.list.filter(o =>
                o.texture?.key === 'st:mote' && o.visible && o.alpha > 0 &&
                o.x >= 160 && o.x <= 3240).length''')
            assert inside == 0, f'{inside} motes inside house'
    # Guests arrive by their normal schedule, with accelerated simulation time.
    pg.wait_for_function('window.__hollow.guests().length === 0', timeout=45000)
    assert len(pg.evaluate('window.__hollow.npcs()')) == 15, 'all 8 guests arrive'
    pg.screenshot(path=str(out / 'party.png'))
    # Top bar: the clock must not collide with the full 15-face cameo row or captions.
    overlaps = pg.evaluate('''() => {
        const r = e => e.getBoundingClientRect();
        const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const clock = r(document.querySelector('.hm-clock'));
        const others = [...document.querySelectorAll('.hm-cam, .hm-cap')].map(r);
        const caps = [...document.querySelectorAll('.hm-cap')].map(r);
        const cams = [...document.querySelectorAll('.hm-cam')].map(r);
        return {clock: others.filter(o => hit(clock, o)).length,
                capsOnCams: caps.filter(c => cams.some(m => hit(c, m))).length};
    }''')
    assert overlaps == {'clock': 0, 'capsOnCams': 0}, overlaps
    # Bot uses possession/actions and normal cooldowns; it never writes fear,
    # NPC state, intensity or the win event. Target an occupied room and use
    # its strongest available action; novelty encourages switching objects.
    pg.evaluate('''() => {
        window.__hmBot = setInterval(() => {
            const h = window.__hollow, c = h.ctx;
            if (c.stats.fled.length === 15) { clearInterval(window.__hmBot); return; }
            const candidates = [];
            for (const o of c.objects) {
                if (o.busy) continue;
                const present = c.npcs.filter(n => !n.fled && n.state !== 'flee' && n.room === o.room);
                if (!present.length) continue;
                for (let i=2;i>=0;i--) {
                    if (!o.unlocked(i) || o.cooldownLeft(i)>0) continue;
                    const a = o.def.actions[i];
                    const repeats = c.stats.perObject[o.id] || 0;
                    const fear = Math.max(...present.map(n => n.fear));
                    candidates.push({o,i,score:a.scare*(1+fear/100)*present.length/(1+repeats*.06)});
                    break;
                }
            }
            candidates.sort((a,b) => b.score-a.score);
            const pick = candidates[0];
            if (pick) { h.possess(pick.o.id); h.act(pick.i+1); }
        }, 160);
    }''')
    for i in range(180):
        pg.wait_for_timeout(500)
        state = pg.evaluate('({fled:window.__hollow.ctx.stats.fled.length, haunts:window.__hollow.ctx.stats.haunts, level:window.__hollow.intensity().level})')
        if i % 20 == 0:
            print('progress', json.dumps(state), flush=True)
        if state['fled'] == 15:
            break
    assert state['fled'] == 15, {'state':state, 'npcs':pg.evaluate('window.__hollow.npcs()')}
    assert state['haunts'] > 0 and state['level'] == 3, state
    pg.wait_for_timeout(2800)
    assert 'Hollowmere is empty' in pg.locator('.hm-overlay.on').inner_text(), 'real win overlay'
    probe = '({now: window.__hollow.ctx.now(), won: window.__hollow.scene.won, paused: window.__hollow.scene.paused, started: window.__hollow.scene.started, fled: window.__hollow.ctx.stats.fled.length})'
    first = pg.evaluate(probe)
    finished = first['now']
    pg.wait_for_timeout(1100)
    later = pg.evaluate(probe)
    assert later['now'] == finished, {'msg': 'record clock freezes at victory', 'first': first, 'later': later}
    best = pg.evaluate("Number(localStorage.getItem('hollowmere-best-ms'))")
    assert best > 0 and abs(best-finished) < 1, {'best':best,'finished':finished}
    pg.screenshot(path=str(out / 'win.png'))
    # An ordinary reload restores the persisted record on the intro.
    pg.reload()
    pg.wait_for_function('!!window.__hollow')
    pg.wait_for_timeout(900)
    assert 'Record:' in pg.locator('.hm-overlay.on').inner_text(), 'best survives reload'
    assert pg.evaluate('window.__hollow.ctx.now()') == 0, 'new game waits at zero'
    assert not errors, errors
    print('HOLLOWMERE_PLAYTEST_PASS', json.dumps({'terrain':terrain,'steering':steering,'win':state,'bestMs':best,'artifacts':str(out),'pageErrors':errors}), flush=True)
    browser.close()
