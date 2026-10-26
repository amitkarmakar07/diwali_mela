import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Text, useKeyboardControls } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Euler, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import { MOVIE_ZONE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { LampPost, StringLights, Bunting } from '../../world/Decor';
import { NPC } from '../../npc/NPC';
import { setGameAudioPaused } from '../../audio/audioManager';
import { playerLook } from '../../player/playerRef';
import type { Control } from '../../core/KeyboardMap';

const {
  position,
  padHalfWidth,
  padHalfDepth,
  screenZ,
  screenWidth,
  screenHeight,
  framePostX,
  frameHeight,
  signHeight,
  projectorZ,
  projectorHeight,
  benchRowZ,
  benchX,
  seatEyeHeight,
  branchZ,
  branchInnerX,
  branchOuterX,
  branchWidth,
  pathSideOffset,
  gateHeight,
  gatePillarSize,
  pathLampX,
} = MOVIE_ZONE;

const BRANCH_LENGTH = branchOuterX - branchInnerX;
const BRANCH_CENTER_X = (branchInnerX + branchOuterX) / 2;
const RIDE_ID = 'movie-screen';
const YOUTUBE_EMBED_SRC = 'https://www.youtube.com/embed/z4SA0ciEoO8?autoplay=1&rel=0';

/** Front-row viewing spot: just ahead of the first bench row, clear of both the benches
 * (row at z = benchRowZ[0] = -3.2, half-depth 0.4 -> edge at -3.6, a 0.8m gap below) and the
 * projector stand (box at z = projectorZ = 3.2, half-size 0.45, miles further back). */
const SEAT_LOCAL_X = 0;
const SEAT_LOCAL_Z = benchRowZ[0] - 1.2;
/** This project's forward vector is (-sin(yaw), -cos(yaw)); with the screen straight ahead
 * on -z (dx = screenX - seatX = 0, dz = screenZ - seatZ = -9 - (-4.4) = -4.6) the seat-to-
 * screen yaw is atan2(-dx, -dz) = atan2(0, 4.6) = 0 — dead ahead, no turn needed. */
const SEAT_FACING_YAW = Math.atan2(-(0 - SEAT_LOCAL_X), -(screenZ - SEAT_LOCAL_Z));

const camEuler = new Euler(0, 0, 0, 'YXZ');

/** Pale emissive saturates to flat white above ~1.3, so the "on" look stays well under that. */
const SCREEN_IDLE_INTENSITY = 0.16;
const SCREEN_LIVE_INTENSITY = 1.15;
const SCREEN_IDLE_COLOR = '#2a3a4a';
const SCREEN_LIVE_COLOR = '#aee0ff';

/**
 * The YouTube iframe, transformed into the screen plane with drei's <Html transform>.
 * Mounted only while `screening` is true (see Screen below) — an iframe is a live DOM
 * element and a video stream running the whole session, not something to leave parked.
 * CSS px -> world units: with distanceFactor left at its default baseline, Html divides
 * the object's scale by 40 before sizing the div, so scale = worldSize * 40 / cssPx.
 * An 800x420 div at scale 0.4 lands exactly on the 8 x 4.2 screen panel.
 */
function FilmPlayer() {
  useEffect(() => {
    // Pointer lock makes the in-world iframe unclickable (needed if autoplay-with-sound
    // is blocked and the viewer has to click play/unmute), so release it for the show.
    document.exitPointerLock?.();
    // The film and the mela's own ambience/radio must not play over each other.
    setGameAudioPaused(true);
    return () => setGameAudioPaused(false);
  }, []);

  return (
    <Html
      transform
      occlude="blending"
      position={[0, screenHeight / 2 + 0.3, 0.14]}
      scale={0.4}
      zIndexRange={[30, 0]}
    >
      <div style={{ width: '800px', height: '420px' }}>
        <iframe
          title="Outdoor Movie Zone screening"
          src={YOUTUBE_EMBED_SRC}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </Html>
  );
}

function Screen({ screening }: { screening: boolean }) {
  const panel = useRef<Mesh>(null);

  useFrame((state) => {
    const mat = panel.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    if (screening) {
      // Gentle flicker while "playing" so the idle/live states read clearly apart.
      mat.emissiveIntensity = SCREEN_LIVE_INTENSITY + Math.sin(state.clock.elapsedTime * 9) * 0.05;
    } else {
      mat.emissiveIntensity = SCREEN_IDLE_INTENSITY;
    }
  });

  return (
    <group position={[0, 0, screenZ]}>
      {/* Proscenium posts + top beam */}
      <RigidBody type="fixed" colliders={false}>
        {[-framePostX, framePostX].map((x, i) => (
          <group key={i}>
            <CuboidCollider args={[0.22, frameHeight / 2, 0.22]} position={[x, frameHeight / 2, 0]} />
            <mesh position={[x, frameHeight / 2, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, frameHeight, 8]} />
              <meshStandardMaterial color="#2f2621" roughness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, frameHeight, 0]} castShadow>
          <boxGeometry args={[framePostX * 2 + 0.5, 0.3, 0.35]} />
          <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* The screen panel itself — flat emissive, no texture, idle vs. "playing" look. */}
      <mesh ref={panel} position={[0, screenHeight / 2 + 0.3, 0.05]} castShadow>
        <boxGeometry args={[screenWidth, screenHeight, 0.12]} />
        <meshStandardMaterial
          color={screening ? SCREEN_LIVE_COLOR : SCREEN_IDLE_COLOR}
          emissive={screening ? SCREEN_LIVE_COLOR : SCREEN_IDLE_COLOR}
          emissiveIntensity={screening ? SCREEN_LIVE_INTENSITY : SCREEN_IDLE_INTENSITY}
          roughness={0.5}
        />
      </mesh>

      {/* The film itself — only mounted while actually playing, sitting a hair in front of
          the idle panel so the DOM iframe doesn't z-fight the geometry behind it. */}
      {screening && <FilmPlayer />}

      {/* Marquee sign above the beam */}
      <mesh position={[0, signHeight, 0.05]}>
        <boxGeometry args={[framePostX * 1.6, 0.9, 0.08]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.3} metalness={0.4} roughness={0.5} />
      </mesh>
      <Text
        position={[0, signHeight, 0.12]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.38}
        color={PALETTE.deepRed}
        anchorX="center"
        anchorY="middle"
        maxWidth={framePostX * 1.5}
      >
        Mela Open-Air Talkies
      </Text>

      <StringLights from={[-framePostX, frameHeight - 0.15, 0.3]} to={[framePostX, frameHeight - 0.15, 0.3]} count={10} sag={0.22} />
    </group>
  );
}

function ProjectorStand({ screening }: { screening: boolean }) {
  const beam = useRef<Mesh>(null);

  useFrame(() => {
    const mat = beam.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.opacity = screening ? 0.12 : 0.03;
  });

  const beamLength = Math.abs(screenZ) - projectorZ - 0.6;

  return (
    <group position={[0, 0, projectorZ]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.45, projectorHeight / 2, 0.45]} position={[0, projectorHeight / 2, 0]} />
        <mesh position={[0, projectorHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.9, projectorHeight, 0.9]} />
          <meshStandardMaterial color="#3a2f28" roughness={0.85} />
        </mesh>
      </RigidBody>
      <mesh position={[0, projectorHeight + 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.5, 14]} />
        <meshStandardMaterial color="#1c1820" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, projectorHeight + 0.18, -0.3]}>
        <circleGeometry args={[0.14, 14]} />
        <meshStandardMaterial
          color={PALETTE.warmBright}
          emissive={PALETTE.warmBright}
          emissiveIntensity={screening ? 1.1 : 0.2}
          roughness={0.4}
        />
      </mesh>
      {/* Faint projection beam toward the screen — purely cosmetic, brightens while screening. */}
      <mesh
        ref={beam}
        position={[0, projectorHeight + 0.18, -0.3 - beamLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[screenWidth / 2.4, beamLength, 20, 1, true]} />
        <meshStandardMaterial
          color={PALETTE.warmBright}
          emissive={PALETTE.warmBright}
          emissiveIntensity={0.6}
          transparent
          opacity={0.05}
          depthWrite={false}
          side={2}
        />
      </mesh>
    </group>
  );
}

function Bench({ x, z }: { x: number; z: number }) {
  const seats: Array<[number, string]> = [
    [-0.6, PALETTE.marigold],
    [0, PALETTE.teal],
    [0.6, PALETTE.magenta],
  ];
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.0, 0.22, 0.4]} position={[0, 0.4, 0]} />
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.0, 0.08, 0.5]} />
          <meshStandardMaterial color="#5b4a3e" roughness={0.8} />
        </mesh>
        {[-0.85, 0.85].map((lx) => (
          <mesh key={lx} position={[lx, 0.18, 0]}>
            <boxGeometry args={[0.1, 0.36, 0.4]} />
            <meshStandardMaterial color="#3a2f28" roughness={0.9} />
          </mesh>
        ))}
      </RigidBody>
      {seats.map(([sx, color], i) => (
        <NPC key={i} mode="seated" position={[sx, 0]} color={color} facing={0} />
      ))}
    </group>
  );
}

/** Lit archway at branchOuterX, the junction where the branch leaves the promenade —
 * the "arrival" moment, styled after the main entrance gate (pillars + beam + name board). */
function MovieGate() {
  return (
    <group position={[branchOuterX, 0, branchZ]}>
      <RigidBody type="fixed" colliders={false}>
        {[-pathSideOffset, pathSideOffset].map((z) => (
          <group key={z}>
            <CuboidCollider
              args={[gatePillarSize / 2, gateHeight / 2, gatePillarSize / 2]}
              position={[0, gateHeight / 2, z]}
            />
            <mesh position={[0, gateHeight / 2, z]} castShadow>
              <boxGeometry args={[gatePillarSize, gateHeight, gatePillarSize]} />
              <meshStandardMaterial color={PALETTE.deepRed} emissive={PALETTE.deepRed} emissiveIntensity={0.25} roughness={0.75} />
            </mesh>
            <mesh position={[0, gateHeight + 0.3, z]}>
              <coneGeometry args={[0.55, 0.65, 4]} />
              <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.35} roughness={0.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, gateHeight + 0.55, 0]}>
          <boxGeometry args={[gatePillarSize * 1.2, 0.5, pathSideOffset * 2 + gatePillarSize]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.3} metalness={0.3} roughness={0.5} />
        </mesh>
      </RigidBody>

      {/* Name board on the beam, facing +x so it reads coming off the promenade. */}
      <mesh position={[0, gateHeight + 1.35, 0]}>
        <boxGeometry args={[0.1, 1.0, pathSideOffset * 1.4]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.75} />
      </mesh>
      <Text
        position={[0.07, gateHeight + 1.35, 0]}
        rotation={[0, Math.PI / 2, 0]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.42}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={pathSideOffset * 1.3}
      >
        Movie Zone
      </Text>

      <StringLights from={[0, gateHeight, -pathSideOffset]} to={[0, gateHeight, pathSideOffset]} count={8} sag={0.12} />
    </group>
  );
}

/** Lamp posts, overhead string lights and bunting the length of the branch, so the whole
 * route off the promenade reads as lit and intentional rather than a dark gap. Most lamps
 * glow emissive-only (light=false); only one pair-end gets a real point light each. */
function PathLighting() {
  return (
    <>
      {pathLampX.map((x, i) => {
        const first = i === 0;
        const last = i === pathLampX.length - 1;
        return (
          <group key={x}>
            <LampPost position={[x, 0, branchZ - pathSideOffset]} height={5} light={first} />
            <LampPost position={[x, 0, branchZ + pathSideOffset]} height={5} light={last} />
          </group>
        );
      })}
      <StringLights from={[branchInnerX, 5, branchZ]} to={[branchOuterX, 5, branchZ]} count={16} sag={1.3} />
      <Bunting from={[branchInnerX, 5.5, branchZ]} to={[branchOuterX, 5.5, branchZ]} count={13} sag={1.0} />
    </>
  );
}

/** Screen-flanking torches and a lit canopy over the seating — the zone's own light, not
 * just the approach to it. Of the 4 lamp posts added here only 2 carry a real point light
 * (one by the screen, one over the seats); the rest glow emissive-only like PathLighting's. */
function ZoneLighting() {
  const screenLampX = framePostX + 2.4;
  const screenLampZ = screenZ + 1.3;
  const seatLampX: [number, number] = [benchX[0] - 2.4, benchX[1] + 2.4];
  const seatLampZ: [number, number] = [benchRowZ[0] - 1.5, benchRowZ[benchRowZ.length - 1] + 1.5];

  return (
    <>
      {/* Screen surround: a lit post either side of the proscenium, facing the seats. */}
      <LampPost position={[-screenLampX, 0, screenLampZ]} height={frameHeight} light />
      <LampPost position={[screenLampX, 0, screenLampZ]} height={frameHeight} light={false} />

      {/* Seating corners. */}
      <LampPost position={[seatLampX[0], 0, seatLampZ[0]]} height={5.5} light={false} />
      <LampPost position={[seatLampX[1], 0, seatLampZ[0]]} height={5.5} light />
      <LampPost position={[seatLampX[0], 0, seatLampZ[1]]} height={5.5} light={false} />
      <LampPost position={[seatLampX[1], 0, seatLampZ[1]]} height={5.5} light={false} />

      {/* Canopy of string lights criss-crossing over the benches, plus a bunting line down
          the middle, so looking up from a seat reads as lit rather than open dark sky. */}
      <StringLights from={[seatLampX[0], 6, seatLampZ[0]]} to={[seatLampX[1], 6, seatLampZ[1]]} count={14} sag={0.5} />
      <StringLights from={[seatLampX[0], 6, seatLampZ[1]]} to={[seatLampX[1], 6, seatLampZ[0]]} count={14} sag={0.5} />
      <Bunting
        from={[seatLampX[0], 6.4, (seatLampZ[0] + seatLampZ[1]) / 2]}
        to={[seatLampX[1], 6.4, (seatLampZ[0] + seatLampZ[1]) / 2]}
        count={11}
        sag={0.4}
      />
    </>
  );
}

/**
 * Follows RideCameraRig/CulturalStageCameraRig's pattern (own E subscription, since
 * InteractionManager ignores input once mode leaves 'exploring') but with no auto-exit
 * duration — the film runs until the viewer presses E. On sitting down it snaps the
 * player's look to the screen so E never starts the show mid-glance at something else;
 * on leaving it levels the heading and hands off to exitRide(). Re-acquiring pointer lock
 * (released on entry so the iframe is clickable) is PlayerController's job alone — it
 * already retries on every mode return to 'exploring' via its own store subscription.
 * A second retry loop here used to race that one: two independent requestPointerLock
 * callers firing on the same transition caused repeated lock/unlock churn (each unlock
 * while "exploring" trips PlayerController's auto-pause), which read as the reported
 * lag/freeze right after pressing E.
 */
function MovieCameraRig({ seat, facingYaw }: { seat: Vector3; facingYaw: number }) {
  const camera = useThree((s) => s.camera);
  const elapsed = useRef(0);
  const wasActive = useRef(false);
  const [sub] = useKeyboardControls<Control>();

  const leave = useCallback(() => {
    playerLook.yaw = facingYaw;
    playerLook.pitch = 0;
    useGame.getState().exitRide();
  }, [facingYaw]);

  useEffect(
    () =>
      sub(
        (s) => s.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, activeRide } = useGame.getState();
          if (mode === 'riding' && activeRide === RIDE_ID && elapsed.current > 0.6) leave();
        },
      ),
    [sub, leave],
  );

  useFrame((_, delta) => {
    const { mode, activeRide } = useGame.getState();
    const active = mode === 'riding' && activeRide === RIDE_ID;

    if (!active) {
      elapsed.current = 0;
      wasActive.current = false;
      return;
    }

    if (!wasActive.current) {
      wasActive.current = true;
      playerLook.yaw = facingYaw;
      playerLook.pitch = 0.05;
    }

    elapsed.current += delta;
    camera.position.copy(seat);
    camEuler.set(playerLook.pitch, playerLook.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);
  });

  return null;
}

export function MovieZone() {
  const mode = useGame((s) => s.mode);
  const activeRide = useGame((s) => s.activeRide);
  const screening = mode === 'riding' && activeRide === RIDE_ID;

  const seat = useMemo(
    () => new Vector3(position[0] + SEAT_LOCAL_X, position[1] + seatEyeHeight, position[2] + SEAT_LOCAL_Z),
    [],
  );

  const startScreening = () => {
    useGame.getState().showToast('The projector flickers on — enjoy the show!');
    useGame.getState().enterRide(RIDE_ID);
  };

  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[padHalfWidth * 2, padHalfDepth * 2]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={0.95} />
      </mesh>

      <mesh position={[BRANCH_CENTER_X, 0.02, branchZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BRANCH_LENGTH, branchWidth]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
      </mesh>

      <Screen screening={screening} />
      <ProjectorStand screening={screening} />

      {benchRowZ.map((z) =>
        benchX.map((x) => <Bench key={`${x}-${z}`} x={x} z={z} />),
      )}

      <Bunting from={[-framePostX, frameHeight + 0.5, screenZ]} to={[framePostX, frameHeight + 0.5, screenZ]} count={9} sag={0.2} />

      <MovieGate />
      <PathLighting />
      <ZoneLighting />
      <MovieCameraRig seat={seat} facingYaw={SEAT_FACING_YAW} />

      <Interactable
        id="movie-screen-watch"
        position={[0, 1.2, benchRowZ[0] - 1.2]}
        radius={3}
        label="Watch the movie screening"
        onInteract={startScreening}
      />
    </group>
  );
}
