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

### Milestone 4 — Atmosphere pass (from `ref.mp4` reference study)

Reference reviewed 2026-10-22: a low-poly night mela. Confirms our primitive-geometry art
direction; the gaps are **crowd life**, **decoration density** and **what the ride view frames**.
Vendor dialogue/voice was explicitly dropped from scope by the user.

Priority 1 — crowd life (cheapest, biggest read)
- [x] NPCs walk in loose groups of 2-4 sharing a path with per-member lateral + start offsets
      (`makeGroup` in `npc/npcPaths.ts`)
- [x] Prop variants (balloon on a string, carry bag) on a minority of NPCs
- [x] Idlers clustered at attraction fronts facing what they came to see (`makeCluster`)
- [x] Crowd raised from 13 to ~38 NPCs so the promenade reads as busy

Priority 2 — decoration density
- [x] `Bunting` component (triangle pennants on a sagging cord) in `world/Decor.tsx`
- [x] Bunting strung the full length of the promenade, alternating with the light spans
- [x] String lights on *every* lamp-post span (was every other)
- [x] `CounterGoods` — three goods variants (sweets pile / jars / stacked boxes) on stall counters
- [x] Bunting + lights carried into the Food Street lane
- [x] Ground and path palette warmed (`#3d2f28` / `#6a4f3c`) and hemisphere bounce raised —
      the fairground floor was rendering near-black against the reference's lit packed earth

Priority 3 — ride view framing
- [x] Ferris view audited in-browser: it did frame the mela, but ~45% of the frame was empty
      sky mid-arc and ~60% at the top, because `RideCameraRig` passed `playerLook.pitch`
      straight through and a level gaze from 28m up points at sky
- [x] Height-proportional downward tilt in `RideCameraRig` (`seat.y / 26 * 0.5`, clamped):
      negligible on the carousel, ~7° on the swing boat, ~29° at the Ferris apex.
      Mouse look still layers on top. One number to retune if it feels forced.
- [ ] Ride structure (spoke/arm/beam) at frame edges so the view reads as "on a ride" —
      deferred, the carousel canopy below already gives foreground depth

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

- [x] Crowd reads as busy: grouped walkers + attraction clusters, balloons/bags visible
- [x] Bunting and light spans fill the overhead view the length of the promenade
- [x] Ground renders as lit packed earth, not near-black
- [x] Ferris ride auto-exits back to `exploring` after `FERRIS.rideDuration`
- [x] Ride camera at the Ferris apex frames the mela below, not empty sky

Not yet verified (needs a human at a real browser):
- [ ] Mouse look and pointer lock (headless Chrome refuses pointer lock)
- [ ] Shift-to-run speed in practice
- [ ] Whether the ride's downward tilt feels natural or yanked
- [ ] Pause menu resume path
- [ ] Sustained frame rate with fireworks + NPCs on real GPU hardware
- [ ] Window resize does not break the view or HUD

## Milestone 5 — User playtest feedback (2026-10-22, with reference screenshots)

First real playtest on the user's own GPU. Reference screenshots supplied for stalls, the
horse ride, the swing boat, all three ride viewpoints, and the landing page.

P0 — breaks the feel, fix first
- [ ] **(7) Input lag / E not registering.** Pressing E to light a diya sometimes does
      nothing, then responds later. Real frame-rate problem on actual hardware — the
      long-deferred performance pass is now a live bug, not a hypothetical.
- [ ] **(5) Ride viewpoints wrong + lock the mouse during rides.** Match the supplied
      reference framing per ride. While riding, the player must NOT be able to look
      around — the ride owns the camera completely.

P1 — dark areas the user called out
- [ ] **(1) Ride zone is too dark**, swing boat especially. Add lighting.
- [ ] **(3) Diya area feels isolated and unlit.** Add light so it reads as part of the mela.

P2 — contained
- [ ] **(6) Landing page** should match the supplied reference layout, but **all English,
      no Hindi**, and titled **Diwali Mela** (the reference says Dussehra Mela).

P3 — large visual overhaul
- [ ] **(2) Restyle every shop/stall/game booth** to the reference stall design: striped
      awning, large illuminated signboard, bulb row, marigold garlands, goods on display —
      each with a relevant Indian name (e.g. "Sharma Ji Ki Chaat", "Khilone Ki Dukaan").
- [ ] **(4) Remodel the carousel** to the reference "Ghode Wala Jhoola" (horses on poles
      under a wide conical canopy) **and the swing boat** to the reference design
      (teal A-frame legs, wooden boat).

## Milestone 6 — Second playtest feedback (2026-10-25, with stall reference)

- [ ] **(1) Shops need to look properly dressed, per the supplied "Sharma Ji Ki Chaat"
      reference.** We have the striped awning, signboard, bulb row and garland, but the
      reference is far denser: trays and baskets heaped with goods, a warm glowing
      interior, brass bells hung along the garland, and patterned cloth panels below the
      counter. Apply to every stall and booth.
- [ ] **(2) Crackers in the diya zone** — rockets that climb and burst in the sky, and
      charkhi (ground spinners) that spin with fire for 4-5 seconds.
- [ ] **(3) Rangoli designs** — let the player choose between several patterns rather
      than the single fixed one.

## Deferred to later milestones

Ordered by the build sequence agreed after the reference study:

1. **Fun Zone mini-games** — ring toss, ball throw, cup stacking. The reference's
   "Nishana Lagao" balloon-shoot (grid of balloons, "3 shots left · 0 hit" counter,
   prize toast) is a good model for the throw game's scoring UI.
2. **Minimap + persistent HUD bar** — reference keeps a live minimap bottom-right and a
   Sound / Music / Bag / Photo / Help bar top-right at all times. Worth doing before more
   zones land, since navigation gets harder with each one.
3. Cultural Stage and Outdoor Movie Zone — reference models both as one "Ram Leela ground":
   proscenium stage, flanking speakers, roofline string lights, rows of seated NPCs.
4. Rangoli creator, sky lanterns, carry-and-place diyas, choreographed fireworks finale.
5. Richer NPC behaviour states (browsing/queueing/reacting), opening cinematic, photo mode,
   settings menu, public facilities, audio/ambient sound.

**Open decision:** audio and the movie-screen video have no source yet — procedurally synthesise, generate, or user-supplied files? Needs answering before those two items start.
