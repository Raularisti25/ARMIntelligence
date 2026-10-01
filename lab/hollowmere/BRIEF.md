# Raul's brief (verbatim intent, 2026-10-01) — the authority for Hollowmere

Build a complete, playable local desktop game faithful to the core loop of the old Flash game Haunt the House, with entirely original art, characters, sounds, names, environments and assets.

CORE FANTASY: a small ghost haunting a large house; floats freely through walls/floors/ceilings; possesses household objects to scare the humans until they flee.

CORE LOOP: 1 fly around the house; 2 approach an object; 3 possess it instantly; 4 gain ~3 object-specific haunting actions; 5 perform increasingly scary animations; 6 nearby humans react based on what they saw, personality, current fear and existing panic; 7 build the house's overall haunting intensity; 8 more frightening abilities unlock as intensity rises; 9 scare everyone out.

HOUSE: one large side-view dollhouse mansion (first complete level): attic, bedrooms, bathroom, kitchen, dining room, living room, study, hallway, basement. Much of the house visible at once, like a living dollhouse.

GHOST MOVEMENT: exceptionally smooth; free 2D float; ignores collision; slight inertia; subtle stretch/trail when fast; gentle idle bob; instant response without twitchiness. Target 60 FPS.

POSSESSION: most meaningful objects possessable — piano, grandfather clock, mirror, painting, bathtub, bed, wardrobe, chandelier, fireplace, television, telephone, bookshelf, stove, refrigerator, rocking chair, desk, suit of armor, mounted animal head, lamp, curtains. Subtle contextual glow when near (no label clutter). Possession immediate. Very small contextual control UI for the possessed object's actions. ~3 escalating actions per object, unique per object (e.g. Piano: keys quietly play themselves → frantic supernatural melody → piano violently comes alive. Mirror: reflection moves incorrectly → ghostly figure appears → terrifying apparition bursts toward viewer).

FEAR: not binary. Every human has fear, panic, curiosity, courage, awareness, memory of recent supernatural events. Small hauntings → investigate. Repeated/stronger → nervous walking, looking behind, grouping together, running, screaming, stumbling, hiding, eventually fleeing. Humans react to each other (a screaming runner raises nearby fear). Avoid predictable scripted reactions; the house should feel alive.

HAUNTING INTENSITY: global meter. Low: subtle abilities only, humans skeptical. As fear spreads: stronger abilities unlock, lighting slightly more supernatural, ambient audio evolves, ghost visually stronger, mansion increasingly chaotic. NOT a giant HUD meter — elegant.

ART: high-quality stylized 2D/2.5D illustrated: beautiful haunted mansion, warm Victorian interiors, strong silhouettes, layered parallax, volumetric-looking moonlight, dust particles, candlelight, soft shadows, expressive animated characters. Ghost cute, mischievous, slightly eerie, not horrific. Extremely clean visual hierarchy. Avoid generic mobile look, giant buttons, excessive HUD, cheap gradients, clutter, generic AI-UI styling.

ANIMATION (extremely important): curtains move, candles flicker, clocks tick, humans shift posture, ghost stretches/compresses, possessed objects shake differently by intensity, doors sway, lights react, particles respond to supernatural events. Easing and spring motion. GPU-friendly transforms/opacity.

SOUND (major): positional object sounds, room ambience, footsteps, whispers, creaking wood, wind, object-specific possession sounds, NPC screams/reactions, escalating supernatural ambience; audio intensity follows haunting level.

CONTROLS (desktop first): WASD/arrows move; Space or E possess/leave; 1,2,3 abilities; Escape pause; mouse where natural.

UI: minimal; nothing obstructs the mansion while flying; elegantly reveal actions when possessing; consistent spacing, strong typography, subtle translucent surfaces only when necessary, clear keyboard hints, accessible contrast, no unnecessary panels. Player watches the house react, not menus. Pleasure = experimentation ("what happens if I possess THAT?").

LOCAL ONLY: no deployment/accounts/backend/analytics/cloud/auth/multiplayer. Launchable from a macOS Shortcut with one action: one simple launch script, automatic dependency/startup handling, auto-open localhost, no manual setup each time.

ENGINEERING: simplest architecture for smooth 2D — Phaser 3 + TypeScript + Vite. Modular: GhostController, PossessionSystem, HauntableObject, NPCController, FearSystem, HauntingIntensitySystem, RoomSystem, AudioManager, EffectsManager. Data-driven haunt abilities so new objects are easy to add.

FIRST DELIVERABLE — no fake menu or static mockup; an actually fun vertical slice: playable ghost, one detailed mansion, ≥6 rooms, ≥15 possessable objects, ≥3 haunt actions for major objects, several humans moving through the house, functioning fear propagation, humans eventually fleeing, escalating haunting level, polished animations, sound, win state. Then polish aggressively.

QUALITY BAR: premium first-party interaction quality. Priorities: 1 fun, 2 responsiveness, 3 emergent NPC reactions, 4 animation quality, 5 atmosphere, 6 graphical fidelity. Don't sacrifice gameplay for menus/architecture. Build it, run it, play-test the main loop, fix obvious bugs, leave a one-click local launcher.
