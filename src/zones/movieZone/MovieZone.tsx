import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Mesh, MeshStandardMaterial } from 'three';
import { MOVIE_ZONE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { StringLights, Bunting } from '../../world/Decor';
import { NPC } from '../../npc/NPC';

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
  branchZ,
  branchInnerX,
  branchOuterX,
  branchWidth,
  entrySignX,
} = MOVIE_ZONE;

const BRANCH_LENGTH = branchOuterX - branchInnerX;
const BRANCH_CENTER_X = (branchInnerX + branchOuterX) / 2;

/** Pale emissive saturates to flat white above ~1.3, so the "on" look stays well under that. */
const SCREEN_IDLE_INTENSITY = 0.16;
const SCREEN_LIVE_INTENSITY = 1.15;
const SCREEN_IDLE_COLOR = '#2a3a4a';
const SCREEN_LIVE_COLOR = '#aee0ff';

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

function EntrySign() {
  return (
    <group position={[entrySignX, 0, branchZ]}>
      <RigidBody type="fixed" colliders={false}>
        {[-1.1, 1.1].map((x, i) => (
          <group key={i}>
            <CuboidCollider args={[0.1, 1.3, 0.1]} position={[x, 1.3, 0]} />
            <mesh position={[x, 1.3, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 2.6, 8]} />
              <meshStandardMaterial color="#2f2621" roughness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[2.6, 0.55, 0.1]} />
          <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
        </mesh>
      </RigidBody>
      <Text
        position={[0, 2.5, 0.08]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.26}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.4}
      >
        Outdoor Movie Zone
      </Text>
      <StringLights from={[-1.1, 2.2, 0.1]} to={[1.1, 2.2, 0.1]} count={6} sag={0.1} />
    </group>
  );
}

export function MovieZone() {
  const mode = useGame((s) => s.mode);
  const activeRide = useGame((s) => s.activeRide);
  const screening = mode === 'riding' && activeRide === 'movie-screen';

  const startScreening = () => {
    useGame.getState().showToast('The projector flickers on — enjoy the show!');
    useGame.getState().enterRide('movie-screen');
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

      <EntrySign />

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
