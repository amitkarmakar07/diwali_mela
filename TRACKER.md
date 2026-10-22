# TRACKER.md — Diwali Mela 3D Simulator

Task status for the current build. Read `AGENT.md` first for world conventions and shared APIs.
Mark items `[x]` when done, `[~]` when in progress.

## Current milestone: Vertical Slice 1

Goal: one connected walkable mela with Entrance → Promenade → Plaza → Ferris Wheel → Celebration Courtyard, a working interaction system, diya lighting, and fireworks. Proves out every system the remaining zones will reuse.

### Setup
- [x] Scaffold Vite + React + TypeScript
- [x] Install `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `zustand`, `@types/three`
- [x] Write `AGENT.md` (world spec + shared APIs)
- [x] Write `TRACKER.md`

### Foundation (critical — everything depends on these)
- [x] `config/constants.ts` — world coords, speeds, radii, palette
- [x] `core/GameState.ts` — zustand store + mode machine
- [x] `core/KeyboardMap.ts` — drei key map
- [x] `player/playerRef.ts` — shared live player position
- [x] `player/PlayerController.tsx` — Rapier kinematic character controller + camera, pointer lock
- [x] `interaction/Interactable.tsx` — registration wrapper
- [x] `interaction/InteractionManager.tsx` — per-frame nearest-target + E dispatch
- [x] `App.tsx` — Canvas, KeyboardControls, Physics, system mounting
- [x] `main.tsx` / `App.css` / `index.css` — fullscreen canvas, StrictMode removed

### World
- [x] `world/Ground.tsx` — ground plane + fixed collider
- [x] `world/Lighting.tsx` — night ambient + warm fill
- [x] `world/Boundaries.tsx` — invisible perimeter walls
- [x] `world/Decor.tsx` — reusable lamp post / string lights / banner / dressing stall
- [x] `world/World.tsx` — composes everything

### Courtyard, NPCs, UI
- [x] `zones/celebrationCourtyard/CourtyardZone.tsx` — floor, rangoli rings, planter wall, diya stand
- [x] `zones/celebrationCourtyard/Diya.tsx` — lit/unlit state, flickering flame + light
- [x] `zones/celebrationCourtyard/FireworksSystem.tsx` — pooled rocket + burst particles
- [x] `npc/NPC.tsx` + `npc/npcPaths.ts` — 7 walkers, 6 idlers
- [x] `ui/*` — HUD, start gate, prompt, panel, pause menu, toast

### Milestone 2 — typography + remaining rides
- [x] Festive typography: **Yatra One** (display) + **Mukta** (UI), loaded from Google Fonts
      for DOM and from `public/fonts/*.ttf` for drei `<Text>` (works offline, no CORS)
- [x] Restyled HUD: gradient glowing title, ornamental divider, uppercase tracked buttons/hints
- [x] Spawn pulled back to z=60 and path extended so the lit arch frames the opening view
- [x] `zones/rideZone/Carousel.tsx` — rotating canopy, 8 bobbing horses on poles, ride id `carousel`
- [x] `zones/rideZone/SwingBoat.tsx` — pendulum boat on an A-frame, ride id `swing-boat`

### Milestone 3 — Shopping & Food Street
- [x] Git repository initialised; first commit covers the whole vertical slice
- [x] Shop panel upgraded: selectable items with rupee prices and notes, vendor subtitle,
      "Take it" button firing a hand-over toast (`ShopItem` in `core/GameState.ts`)
- [x] `zones/foodStreet/FoodStreetZone.tsx` — market lane at `ZONES.foodStreet` (-30, 8)
      with four interactive shops, vendor figures, steam, seating and a branch path
      linking the lane to the promenade

### Zones
- [x] `zones/entrance/EntranceZone.tsx` — arch, welcome sign, ticket booths
- [x] `zones/promenade/PromenadeZone.tsx` — path, lamp posts, dressing stalls, central plaza centerpiece
- [x] `zones/rideZone/FerrisWheel.tsx` — procedural wheel, gondolas, continuous rotation, boarding hotspot
- [x] `zones/rideZone/RideCameraRig.tsx` — camera takeover + exit path
### Integration & polish
- [x] Wire everything together, resolve cross-file issues
- [x] `npm run build` typechecks clean
- [ ] Performance pass on real GPU hardware (only verified under software rendering)

## Verification status

Verified by driving a real Chrome instance against the dev server (software WebGL, so
frame rate was low but behaviour is representative).

- [x] Loads with no console or page errors; title gate → "Enter the Mela" starts the game
- [x] WASD movement works; player stands on the ground and is blocked by solid props
- [x] Proximity prompt appears/clears by distance (`Read the Mela Information Board`)
- [x] E opens the info panel; Escape closes it and returns to exploring
- [x] Diyas prompt, light on E, increment the counter, and stay lit
- [x] Hidden golden diya fires its toast: "You found the hidden Golden Diya!"
- [x] Lighting 5 diyas auto-triggers the fireworks show toast
- [x] Manual launch pad fires a rocket with a trail that bursts into a colourful aerial burst
- [x] Ferris wheel: prompt → E boards → mode becomes `riding`, camera rides the gondola
      with a clear aerial view of the mela, and the HUD shows "[E] Get off the ride"
- [x] NPCs walk their loops and idle without jitter
- [x] Carousel: prompt → board → rotates with the rider seated on a horse facing outward
      → auto-exits back to exploring
- [x] Swing boat: prompt → board → camera swings through the arc → "[E] Get off the ride"
- [x] Food street reachable on foot from the promenade via the branch path
- [x] All four shops prompt and open their panel (jalebi, street food, toys, accessories)
- [x] Shop purchase: select an item → "Take it" → hand-over toast, panel closes, back to exploring

Not yet verified (needs a human at a real browser):
- [ ] Mouse look and pointer lock (headless Chrome refuses pointer lock)
- [ ] Shift-to-run speed in practice
- [ ] Ride auto-exit after `FERRIS.rideDuration` and exit-by-E
- [ ] Pause menu resume path
- [ ] Sustained frame rate with fireworks + NPCs on real GPU hardware
- [ ] Window resize does not break the view or HUD

## Deferred to later milestones

Fun Zone mini-games (ring toss, ball throw, cup stacking), rangoli creator, sky lanterns, carry-and-place diyas, full choreographed fireworks finale, Outdoor Movie Zone, Cultural Stage, full NPC behavior states (browsing/queueing/reacting), map/minimap, opening cinematic, photo mode, audio/ambient sound, settings menu, public facilities.

**Open decision:** audio and the movie-screen video have no source yet — procedurally synthesise, generate, or user-supplied files? Needs answering before those two items start.
