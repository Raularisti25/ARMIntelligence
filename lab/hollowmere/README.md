# Hollowmere — a small ghost, a big house

Local 2D haunting game (Phaser 3 + TypeScript + Vite). You are a ghost: float through a Victorian mansion, possess furniture, and scare everyone out. Original art/sound, generated in code.

## Run it (for Aidan)
```bash
cd lab/hollowmere
npm ci
npm run dev        # http://localhost:5918
npm run typecheck  # must stay clean
```
Controls: WASD/arrows move · Space/E possess/leave · 1/2/3 haunt actions · Esc pause.

## Where things live
- `BRIEF.md` / `DESIGN.md` — the authority on intent + module ownership.
- `src/data/objects*.ts` — haunt abilities (data-driven; add an object = add an entry).
- `src/data/npcs.ts` — residents + **party guests** (`GUEST_ARRIVALS`, arrival seconds after first input).
- `src/entities/NPCController.ts` — behaviour state machine, fear bar, worried/pacing behaviour.
- `src/systems/FearSystem.ts` — scare perception, group effects, **fear contagion**.
- `src/config.ts` → `FEAR` — the single knob block for how easy people are to scare.

## State (2026-10-01)
Done: guests arrive through the front door in waves; every person has a fear bar and leaves when it fills; lingering fear makes people glance behind, tremble, hug themselves, pace and group up; fear spreads a little between neighbours (capped).
Not yet verified: runtime play-test of the new guest/fear code (typecheck only). First thing to do: run it, watch a few waves, tune `FEAR` and arrival times.
Ideas for Aidan: new haunt objects, more guest bodies/hair, a doorbell sound, balancing 15 people.
