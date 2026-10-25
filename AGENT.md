# AGENT.md — Diwali Mela 3D Simulator

Read this before touching any code. It defines the world, the conventions, and the shared APIs every component must use.

## 1. What this project is

A browser-based, fully client-side 3D simulator of an Indian Diwali *mela* (festival fairground) at night. The player walks around a single connected fairground in first person, rides attractions, interacts with stalls, lights diyas, and sets off fireworks.

**Hard constraints (do not violate):**
- No backend, no database, no login, no save/load, no multiplayer. All state is in-memory for the browser session only.
- No external 3D model files (no `.glb`/`.gltf`). **All geometry is procedural** — built from Three.js primitives (box, cylinder, cone, sphere, torus, plane) with plain materials. Visual richness comes from color, emissive materials, lights, and composition, not from assets.
- Keep it performant on ordinary desktop hardware: budget object counts, limit dynamic lights and particles.

Long-term target (from the project blueprint) is 9 zones, 3 rides, shops, 3 mini-games, rangoli, sky lanterns, a movie screen, a cultural stage, and crowd NPCs. **Current work is a vertical slice** — see `TRACKER.md` for exactly what is in scope now.

## 2. Tech stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| UI framework | React 19 + TypeScript |
| 3D | `three` + `@react-three/fiber` (R3F) |
| 3D helpers | `@react-three/drei` (`KeyboardControls`, `PointerLockControls`, `Stars`, `Stats`) |
| Physics / collision | `@react-three/rapier` (Rapier WASM) |
| State | `zustand` |
| Styling | plain CSS (`src/index.css`, `src/ui/hud.css`) — no Tailwind |

Run dev server: `npm run dev`. Typecheck/build: `npm run build`.

## 3. World conventions

- **Units are meters.** Y is up. The ground plane sits at `y = 0`.
- Player capsule is ~1.8 m tall; **camera eye height is 1.6 m**.
- The player spawns at the Grand Entrance and faces **−Z** (so −Z is "into the mela", +Z is "back out the gate").
- The whole mela is one connected walkable space. There is no level loading — all zones are mounted at once at fixed world coordinates.
- Night-time scene: dark blue/purple ambient, warm point lights for stalls/lamps/diyas. Keep the sky dark enough that fireworks read clearly.

### Zone coordinates (authoritative — place new geometry relative to these)

| Zone | Center (x, z) | Notes |
|---|---|---|
| Grand Entrance | `(0, 46)` | Arch, ticket booths, welcome sign. Player spawn is `(0, 52)`. |
| Main Promenade | `(0, 10)` spanning `z = 40 → -14` | Wide path (~16 m), lamp posts, dressing stalls both sides. |
| Central Plaza | `(0, -20)` | Open circle ~13 m radius, giant centerpiece diya, signposts. |
| Ride Zone (Ferris Wheel) | `(-30, -38)` | Wheel is the tallest landmark; visible from the entrance. |
| Celebration Courtyard | `(28, -34)` | Diya stand, diya placement spots, fireworks launch pad. |
| *(reserved)* Food/Shop Street | `(-30, 6)` | Not built yet — keep clear. |
| Fun Zone | `(30, -5)` | Three mini-game booths (ring toss, balloon shoot, cup stacking) + branch path to the promenade at `x = 8`. |
| *(reserved)* Movie Zone | `(-28, 24)` | Not built yet — keep clear. |
| *(reserved)* Cultural Stage | `(26, 22)` | Not built yet — keep clear. |

- **World bounds:** walkable area is `x ∈ [-56, 56]`, `z ∈ [-62, 62]`. `Boundaries.tsx` puts invisible walls there.
- Ground mesh is 150 × 150 centered at origin.

## 4. Folder layout

```
src/
  App.tsx                     Canvas root: KeyboardControls, Physics, mounts World/Player/Manager/HUD
  main.tsx                    React root
  config/constants.ts         All tunable numbers (speeds, radii, world coords, colors)
  core/
    GameState.ts              zustand store: mode machine + interaction/ride/panel state
    KeyboardMap.ts            drei KeyboardControls key map
  player/
    PlayerController.tsx      Rapier kinematic character controller + camera rig
  world/
    World.tsx                 Composes ground, lighting, boundaries, all zones, NPCs
    Ground.tsx                Ground plane + fixed collider
    Lighting.tsx              Night ambient/hemisphere + warm fill
    Boundaries.tsx            Invisible perimeter colliders
    Decor.tsx                 Reusable dressing props (lamp post, string lights, banner, stall)
  zones/
    entrance/EntranceZone.tsx
    promenade/PromenadeZone.tsx
    rideZone/FerrisWheel.tsx          Wheel geometry + rotation + boarding Interactable
    rideZone/RideCameraRig.tsx        Camera takeover while riding
    celebrationCourtyard/CourtyardZone.tsx
    celebrationCourtyard/Diya.tsx
    celebrationCourtyard/FireworksSystem.tsx
  interaction/
    Interactable.tsx          Registration wrapper used by every zone
    InteractionManager.tsx    Per-frame nearest-target detection + E dispatch
  npc/
    NPC.tsx                   Procedural humanoid, walk/idle
    npcPaths.ts               Hardcoded waypoint data
  ui/
    HUD.tsx                   DOM overlay root
    InteractionPrompt.tsx     "[E] <label>" prompt
    PanelModal.tsx            Generic modal shell for richer interactions
    PauseMenu.tsx             Esc overlay
    hud.css
```

## 5. Shared APIs — use these, do not invent parallel systems

### 5.1 Game state (`src/core/GameState.ts`)

```ts
type PlayerMode = 'exploring' | 'riding' | 'minigame' | 'panel' | 'paused';

useGame.getState() / useGame(selector)
```

Fields: `mode`, `nearestId`, `nearestLabel`, `activeRide`, `activeGame`, `gameStatus`, `activePanel`, `litDiyaCount`, `foundGoldenDiya`.

Actions: `enterRide(rideId)`, `exitRide()`, `enterGame(gameId)`, `exitGame()`, `setGameStatus(status)`, `openPanel(panel)`, `closePanel()`, `setPaused(bool)`, `setNearest(id, label)`, `registerLitDiya()`, `findGoldenDiya()`.

**Rules:**
- Player input is only honored when `mode === 'exploring'`. Every system that reads input must early-return otherwise.
- Read state inside `useFrame` via `useGame.getState()` (non-reactive) — **never** subscribe with a selector inside a per-frame loop, it causes re-render storms.
- Only React UI components (HUD) may subscribe reactively with selectors.

### 5.2 Interactables (`src/interaction/Interactable.tsx`)

Any zone marks a hotspot by wrapping or placing this component. It renders its children (if any) at `position` and registers itself in the interaction registry.

```tsx
<Interactable
  id="ferris-wheel-board"       // unique string
  position={[x, y, z]}          // world position used for distance checks
  radius={3}                    // optional, default INTERACT_RADIUS
  label="Ride the Ferris Wheel" // shown as "[E] Ride the Ferris Wheel"
  onInteract={() => { ... }}    // fired on E press when this is the nearest target
  enabled={true}                // optional; false hides it from detection
>
  {/* optional visual, e.g. a glowing pad */}
</Interactable>
```

`InteractionManager` (mounted once in `App.tsx`) does the rest: each frame it finds the nearest enabled interactable within radius of the player, writes it to the store, and on a rising-edge `E` press calls its `onInteract`. **Do not add your own key listeners for interaction.**

### 5.3 Player position

`PlayerController` writes the live player position into a module-level ref exported from `src/player/playerRef.ts`:

```ts
import { playerPosition } from '../player/playerRef';  // THREE.Vector3, mutated in place
```

Read it in `useFrame` loops (NPCs, interaction manager, LOD). Never clone it per frame in hot paths.

### 5.4 Rides

A ride = an `Interactable` whose `onInteract` calls `enterRide('<rideId>')`, plus a camera rig that takes over while `mode === 'riding' && activeRide === '<rideId>'`. The rig must:
1. Freeze player movement (automatic: `PlayerController` early-returns when mode ≠ `exploring`).
2. Drive the camera to the seat/gondola world transform each frame.
3. Provide an exit path — `E` again, or an automatic timeout — that calls `exitRide()` and returns the camera to the player.

`RideCameraRig.tsx` is the reference implementation. Reuse this pattern for future rides and for seated activities (movie zone, stage audience).

## 6. Code conventions

- TypeScript throughout; prefer explicit prop interfaces on components.
- One component per file, named export matching filename.
- All tunable numbers live in `src/config/constants.ts` — no magic numbers scattered in components.
- Animate with `useFrame((state, delta) => ...)` and **scale motion by `delta`**, never by assuming a fixed frame rate.
- Reuse scratch `THREE.Vector3`/`Quaternion` objects declared at module scope in hot loops; do not allocate inside `useFrame`.
- Static world geometry that should block the player must be wrapped in `<RigidBody type="fixed">` with an explicit collider. Purely decorative geometry (and NPCs) gets no collider.
- Emissive materials (`meshStandardMaterial` with `emissive` + `emissiveIntensity`) are the cheap way to make bulbs/flames/signs glow — prefer them over adding more real lights. Keep real `pointLight`s to a small budget.
- Keep comments rare: only where a constraint or non-obvious reason needs explaining.

## 7. Verification

There is no automated test suite (deliberate — this is a visual/interactive app). Verify manually:

```
npm run dev     # then open the printed localhost URL
npm run build   # must typecheck clean
```

Manual checklist lives in `TRACKER.md` under "Verification". Core things to always re-check after a change: pointer lock works, player can't fall through the ground or leave the bounds, prompts appear/disappear by distance, every interaction can be exited back to `exploring` mode, and FPS stays smooth with fireworks active.

## 8. Working agreement for agents

- `TRACKER.md` is the source of truth for task status. Update it when you complete something.
- Respect the zone coordinate table in §3 so zones don't overlap.
- Don't refactor the shared systems in §5 to suit one component — if the shared API is genuinely insufficient, say so rather than forking it.
- Don't add dependencies without a clear reason; the stack in §2 is deliberate.
