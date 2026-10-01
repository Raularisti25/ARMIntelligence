# Hollowmere — design contract

A Haunt-the-House-style game with 100% original art, names and sound. Phaser 3.90 + TypeScript + Vite.
All art is painted procedurally on canvases at boot (no image files). All sound is Web Audio synthesis (no audio files).
Raul's full brief is the authority for feel and quality: smooth ghost, living dollhouse, emergent NPC fear, elegant minimal UI.

## Hard rules for every module
- Read `src/types.ts` (cross-module interfaces) and `src/world/layout.ts` (all house coordinates). Do not change their exported shapes; if you must ADD a field, add it as optional.
- Own only your files (see "Module ownership"). Never edit another module's file — stub what you need behind the interfaces.
- `npm run typecheck` must pass (strict). Never use bare `tsc`.
- Textures: paint with `canvasTex()` from `src/art/paint.ts` at `ART`(=2)× and display images at scale `1/ART` (use `img()` helper). Keys are documented below.
- Animate with transforms/alpha (tweens, springs), never by re-painting canvases per frame.
- No external assets, fonts, CDNs, analytics, network. Fonts: `"Iowan Old Style", Palatino, Georgia, serif` (titles), `-apple-system, "SF Pro Text", system-ui, sans-serif` (hints).
- Original names only. Game: **Hollowmere**. House: Hollowmere House. Family: the Fairweathers.

## World
- World units: x 0..4000, y -260..1830 (`WORLD`). House shell x 200..3200. Side-view cutaway dollhouse.
- Floors (feet y = `floor`): attic 520, upper 920, ground 1320, basement 1690. Slab 26 thick under each floor line.
- 12 rooms, interior walls with doorways (opening height `DOOR_H`=236), 3 staircases, front door on the east exterior wall of the Foyer → porch → garden path → off-screen east (NPCs who flee run to x 4200 and are removed).
- Stairs are painted on the BACK wall; NPCs walking floors use stair `path` polylines and pass behind the slab front edge. Floors have no holes.
- Depth layers: `DEPTH` in config.ts. Room backgrounds 10, hauntables 20, NPCs 30, room-dark overlay 38, walls/slabs 40, light glows (ADD) 46, fx 48, apparitions 52, ghost 55, foreground parallax 60, emotes 66.
- Background: sky gradient + moon + twinkling stars (screen-anchored), far hills with tiny lit windows, mid bare trees (manual parallax: `layer.x = base + (camCX-2000)*(1-f)`), drifting clouds, foreground grass/fence silhouettes. Exterior: mansard roof band with shingle trim, two chimneys (smoke particles), turret + spire on the east with a lit round window, porch with lantern, picket fence, gate, lamp post, dead tree on the west, soil cross-section around the basement.

## Camera & rendering
- Canvas is device-pixel-ratio sharp: game size = innerWidth*dpr × innerHeight*dpr, `scale.zoom = 1/dpr`, Scale.NONE, resize on window resize.
- Camera zoom = canvasHeight / visibleH (default 1000 world units; wheel / +/- between 640 and 2050). Custom smooth follow of the ghost with velocity look-ahead (`CAMERA.follow`). Bounds = WORLD.
- Camera postFX ColorMatrix shifts hue/saturation with intensity. CSS vignette overlay in the DOM.

## Ghost (GhostController)
Cute, mischievous sheet ghost (~70 tall): soft white-cyan body, big dark oval eyes with highlights, blush, wavy hem (6 frames cycled). Free 2D float, ignores collision.
Exponential velocity smoothing (`GHOST.response` steering, `GHOST.glide` release), max 500 u/s. Spring squash/stretch along velocity, lean into motion, idle bob, eyes look toward motion + random blink, afterimage trail + wisp particles when fast, additive halo. Grows/brightens with intensity (scale 1→1.2, halo 0.35→0.75, trail cyan→violet).
Mouse: hold/click empty space = seek point; click a hauntable = fly to it then possess. Keyboard cancels seek.

## Possession (PossessionSystem + HauntableObject)
Nearest hauntable within `GHOST.reach` of its bounds gets a soft pulsing glow (preFX Glow on its main image; fallback ADD tinted copy). Space/E possesses instantly: ghost squeezes into the object (≈120 ms), object squash-bounce + puff + whoosh. Space/E again leaves (ghost springs out upward). Keys 1/2/3 trigger actions. While possessed the object breathes slightly with a faint aura and the DOM action panel shows next to it.
Each object: data-driven `ObjectDef` (types.ts) with ≥3 escalating `ActionDef`s (tier 1/2/3). Tier unlocks: tier 2 at intensity level ≥1, tier 3 at level ≥2. Per-action cooldown; one action at a time per object. An action = sound recipe id + `Fx[]` timeline + `emits[]` scare broadcasts.
Fx primitives are implemented ONCE in HauntableObject (`shake, wobble, hop, float, squash, rotate, scaleX, move, spin, show, frames, light, aura, particles, apparition, throw, dark, shakeCam, flash, sfx, lunge, lookAtNpc`). Every object must feel unique through its parts + fx combination. 29 objects across the 12 rooms (list in layout.ts `HAUNTABLE_PLACEMENTS`).

## People (NPCController + FearSystem)
7 residents (data/npcs.ts): Augustus Fairweather (skeptic father), Marigold Fairweather (mother), Toby (curious child), Great-Aunt Hester (brave, hard of hearing, cane), Mr. Pruitt (stoic butler), Nell (jumpy maid), Mrs. Dobbs (superstitious cook).
Built from part images in a Container (legs, torso, arms, head, face overlay) so walk cycles, hunching, looking behind (head flip), trembling, arms-up terror runs, screaming (head back), stumbling (fall + get up), crouch-hiding are transform animations. Faces: calm, blink, curious, skeptic, nervous, scared, terror, scream. Emote glyphs above heads: ?, !, !!, …, sweat.
Per-NPC: traits courage, curiosity, awareness, skepticism, speed, voice pitch; state fear 0..100, panic 0..100, memory of seen events (novelty decays repeats), max fear reached (fear floor = 0.5×max).
Perception: same room = sees (awareness gates subtle events, facing matters); adjacent rooms hear if noise ≥0.5 (×0.4·noise); 2 rooms if noise ≥1.2 (×0.2). Hard of hearing scales hearing.
impact = scare·100 · novelty · (1−0.55·courage) · (1+0.6·fear/100) · (1+0.15·recentScares) · dark 1.35 · group(0.85 calm company / 1.3 if someone panicking) · perception · rand(0.8..1.2). fear += 0.55·impact, panic += 1.1·impact.
Reaction ladder with jittered thresholds: low → investigate (curiosity roll) or glance ("?"); ≥22 startle (gasp) → nervous / seek company; ≥50 scream + run away; ≥80 hide (if fearful & spot nearby) or run; fear ≥100 → FLEE (exit through Foyer front door, scream, leave). Running NPCs may stumble. Screams broadcast `scream` events (contagion); panicked runners emit presence events in rooms they cross; fleeing emits `flee`. Group-ups: nervous people go to the room with the most people. Rooms with recent big scares are avoided in routines. Hiding inside a wardrobe makes the hider invisible; haunting that object doubles their impact and they burst out.
Routine life: POIs (layout.ts) with poses stand/sit/read/cook/clean/play/warm/tv/look; calm pairs mumble (voice blips). Panic decays ~8/s·(0.5+courage); fear decays 0.6/s when calm, never below floor.

## Haunting intensity (HauntingIntensitySystem)
Value 0..1, levels at `INTENSITY.levels` (Quiet, Stirring, Haunted, Awakened). Gains from fear dealt (+0.12 per 100 impact) and +0.05 per fled resident; slow decay toward 0.6×peak. Tier unlocks with hysteresis (−0.12). Drives: scare multiplier (1, 1.05, 1.12, 1.25), color grade, vignette, light flicker rate, dust density, ambient poltergeist touches at level ≥2 (doors slam, small jitters — no scare), lightning + thunder at level 3, ghost strength, audio layers. Level-up: emblem pulse + whisper + a one-line italic serif caption fading at top ("The house stirs…", "Something answers.", "Hollowmere awakens.").

## Audio (AudioManager)
Web Audio graph: per-sound StereoPanner + gain → master → compressor; reverb send via generated-IR Convolver. Positional from camera center (pan by x, distance falloff, extra attenuation across floors). Ambience: wind (filtered noise, gusts), low drone (dissonant layers + tremolo grow with intensity), random creaks, grandfather-clock tick, fireplace crackle loop, furnace rumble, thunder. Footsteps per NPC step (weight/run), voices per NPC pitch: mumble, hmm, gasp, yelp, scream, whimper. Every object action has its own recipe (piano notes/arpeggio/cluster, clock bongs, glass shimmer/crack, water gurgle/splash, creaks, thumps, crystal tinkle, fire roar, TV static, phone ring, typewriter, metal clank, growl/roar, lamp buzz/pop, wind whoosh, jack-in-the-box tune, etc.). Audio context resumes on first input. Master volume + mute.

## UI (HUD, DOM overlay — never a canvas HUD)
Almost nothing on screen while flying. Top-left: tiny wisp emblem with a thin circular progress ring (intensity) + level name caption that appears on change. Top-right: 7 small resident cameos (initials) whose ring tint deepens with fear; fled → faded outline. Possession panel: small translucent card beside the object (object name in italic small caps, rows `[1] name` / `[2]` / `[3]`, locked rows dimmed with "deepen the haunting", cooldown underline, `E leave`), revealed with a spring transition. Intro card on load (title, one-line premise, controls), fades on first input. Escape = pause overlay (resume, restart, volume, controls). Win overlay when all 7 fled (time, haunts performed, screams caused, favourite object, "Haunt again"). Transient captions ("Nell fled Hollowmere.").

## Module ownership (one worker per module, separate worktrees/branches)
| Module | Files |
| --- | --- |
| A. World art | `src/art/paint.ts` (exists — extend helpers only), `src/art/roomArt.ts`, `src/art/structureArt.ts` |
| B. Objects | `src/art/objectArt.ts`, `src/data/objects.ts`, `src/entities/HauntableObject.ts` |
| C. People | `src/art/characterArt.ts`, `src/data/npcs.ts`, `src/entities/NPCController.ts`, `src/systems/FearSystem.ts`, `src/systems/RoomSystem.ts` |
| D. Audio | `src/systems/AudioManager.ts` |
| E. Core | `index.html`, `src/main.ts`, `src/scenes/*`, `src/entities/GhostController.ts`, `src/art/fxArt.ts`, `src/systems/PossessionSystem.ts`, `src/systems/HauntingIntensitySystem.ts`, `src/systems/EffectsManager.ts`, `src/ui/HUD.ts`, `scripts/*`, `launch.sh` |

Each module exports exactly the function/class named in types.ts `// MODULE` comments.

## Launch
`launch.sh` (repo copy) ensures deps (npm install when node_modules missing/stale), builds when src is newer than dist, starts `scripts/serve.mjs` (zero-dep static server, port 5917, exits 45 s after the page stops pinging `/__alive`), opens Chrome in app mode with its own profile (`--app=… --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required`), fallback default browser. `npm run install-game` builds and copies a frozen runtime to `~/Games/Hollowmere` (dist, serve.mjs, play.sh, Hollowmere.app via osacompile) so a macOS Shortcut ("Open App" Hollowmere, or "Run Shell Script" `~/Games/Hollowmere/play.sh`) works independent of git checkouts.

## Debug hook
`window.__hollow` (always on): `{ game, scene, teleport(x,y), possess(id), act(n), npcs(), intensity(v?), speed(mult) }` for scripted play-tests.

## Layout numbers (decided — encode in src/world/layout.ts, do not re-derive)
Ext walls x 200..230 and 3170..3200. Interior wall centers listed; doorway in every interior wall unless noted.
- ATTIC (floor 520; interior polygon (240,510)→(540,205)→(2860,205)→(3160,510), mansard roof outline eaves (170,520)→(520,170)→(2880,170)→(3230,520); turret 2950..3150 spire to y −60; chimneys ~x 900 and 2200): Attic 240..1700 (walk 410..1680: round window x1000 y330 r46; hanging bulb x780 y240; Rocking Chair 760, Dress Form 1180, Old Trunk 1480; front crates hide 560) | Nursery 1700..3160 (walk 1720..2990: star wallpaper, round window x2700; crib decor 1900 = hide; Rocking Horse 2050, Jack-in-the-Box on small table 2560, Porcelain Doll on stool 2880). Wall 1700 open arch.
- UPPER (ceil 546, floor 920): Bathroom 230..760 (window x330; Mirror wall x360 y720 over sink decor; Bathtub 560 = hide behind; sconce x470) | Master Bedroom 760..1500 (Bed 960 = hide under, nightstand+Lamp 1130, Curtains at arched window x1250, Wardrobe 1405 = hide INSIDE) | Study 1500..2200 (window x1640; Desk 1760 with typewriter + green lamp, Stag Head wall x1900 y650, Bookshelf 2080) | Upper Hall 2200..3170 (attic stairs on back wall; Suit of Armor 2780; Portrait wall x3040 y650; sconce 2960). Walls 760 door, 1500 door, 2200 open arch.
- GROUND (ceil 946, floor 1320): Kitchen 230..820 (Stove 330, counter+sink decor 505 under window x520, Refrigerator 650 (1950s rounded), cellar stair top at back x760; hanging lamp 500) | Dining 820..1440 (Chandelier ceiling x1130 over dining table decor = hide under, China Cabinet 1355, window x960) | Parlor 1440..2340 (Piano 1560, sofa decor 1760 = hide behind, bay window x1860, Television 1960 (1950s console), side table + Telephone 2060, Fireplace 2220) | Foyer 2340..3170 (Grandfather Clock 2405, grand stairs on back wall, Coat Stand 3080, lantern near front door, front door in ext wall 3170..3200). Walls 820 swing door, 1440 open, 2340 open arch.
- BASEMENT (ceil 1346, floor 1690): Cellar 230..1300 (Wine Rack 950, barrels decor 1150-1220 = hide, bulb 820) | Boiler 1300..2500 (Furnace 1700, coal pile decor 1950 = hide, washtub 2250, bulb 2100). Wall 1300 door; 2500..3170 solid earth/foundation.
- Stairs (NPC polylines, feet y): cellar [(760,1320),(736,1346),(400,1690)] kitchen↔cellar; grand [(2470,1320),(2850,946),(2880,920)] foyer↔upper hall; attic [(2640,920),(2290,546),(2250,520)] upper hall↔nursery.
- Exit path: (3150,1320)→(3230,1320) porch→(3480,1320) steps→(3540,1340)→(4200,1340). Garden y 1340.
- Starting spots: Augustus study desk, Marigold parlor piano, Toby nursery, Hester parlor sofa, Pruitt foyer, Nell bathroom, Dobbs kitchen stove. Ghost starts in the attic near x 1000.
- Calibration: tier1 scare 0.10–0.16 noise 0.2–0.6 cd ~3 s; tier2 0.25–0.38 noise 0.5–1.0 cd ~6 s; tier3 0.55–0.80 noise 1.0–1.6 cd ~10 s. Scream contagion scare 0.18·panic/100 noise 1.0. Target full clear ≈ 10–15 min.
