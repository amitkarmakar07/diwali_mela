import { useMemo } from "react";
import { Text } from "@react-three/drei";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { DoubleSide } from "three";
import { ZONES, COURTYARD, PALETTE } from "../../config/constants";
import { Diya } from "./Diya";
import { FireworksSystem } from "./FireworksSystem";
import { DiyaCarrySystem } from "./DiyaCarrySystem";
import { RangoliCreator } from "./RangoliCreator";
import { SkyLanterns } from "./SkyLanterns";
import { LampPost, StringLights } from "../../world/Decor";

const [cx, cz] = ZONES.courtyard;

const FLOOR_RADIUS = 16;
const WALL_RADIUS = 14.5;
const WALL_SEGMENTS = 18;
const WALL_HEIGHT = 0.9;
const WALL_THICK = 0.45;
const OPENING_CENTER = Math.PI;
const OPENING_HALF = 0.85;
const SEG_WIDTH = ((Math.PI * 2 * WALL_RADIUS) / WALL_SEGMENTS) * 0.92;

const STAND_POS: [number, number, number] = [6, 0, 4];
const STAND_TOP_Y = 0.95;

// The ring at 0.9-1.25 is the interactive rangoli (RangoliCreator) instead of a
// static one, so it is deliberately left out of this always-drawn list.
const RANGOLI_RINGS: Array<{ inner: number; outer: number; color: string }> = [
  { inner: 0.3, outer: 0.6, color: PALETTE.gold },
  { inner: 1.55, outer: 1.95, color: PALETTE.magenta },
  { inner: 2.25, outer: 2.7, color: PALETTE.teal },
];

const SKY_LANTERN_RELEASE: [number, number, number] = [-7, 0, -6];

/** Lit archway framing the wall's deliberate opening (OPENING_CENTER = pi, so the gap
 * sits at local (-WALL_RADIUS, 0, 0)). Pillars sit well inside the opening's angular
 * half-width (OPENING_HALF * WALL_RADIUS =~ 12.3m clear each way from centre), leaving
 * the walkway through the middle untouched. Styled after the main entrance arch and the
 * movie-zone gate: pillars + cone caps + beam + name board. */
const GATE_LOCAL_X = -WALL_RADIUS;
const GATE_HALF_SPAN = 4.4;
const GATE_HEIGHT = 5.2;
const GATE_PILLAR_SIZE = 0.8;

/** Lit "Diya Zone" archway at the courtyard wall's opening. The player arrives from
 * outside at local x < GATE_LOCAL_X, walking in +x toward the courtyard interior — so
 * the sign must read correctly from the -X side. Drei <Text> faces +Z by default; a
 * -90 deg yaw maps that forward face to -X (sin(-90)=-1, cos(-90)=0), the opposite of
 * the movie-zone gate's +90 deg yaw, whose approach is from the +X side instead. */
function DiyaGate() {
  return (
    <group position={[GATE_LOCAL_X, 0, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {[-GATE_HALF_SPAN, GATE_HALF_SPAN].map((z) => (
          <group key={z}>
            <CuboidCollider
              args={[GATE_PILLAR_SIZE / 2, GATE_HEIGHT / 2, GATE_PILLAR_SIZE / 2]}
              position={[0, GATE_HEIGHT / 2, z]}
            />
            <mesh position={[0, GATE_HEIGHT / 2, z]} castShadow>
              <boxGeometry args={[GATE_PILLAR_SIZE, GATE_HEIGHT, GATE_PILLAR_SIZE]} />
              <meshStandardMaterial color={PALETTE.deepRed} emissive={PALETTE.deepRed} emissiveIntensity={0.25} roughness={0.75} />
            </mesh>
            <mesh position={[0, GATE_HEIGHT + 0.3, z]}>
              <coneGeometry args={[0.5, 0.6, 4]} />
              <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.35} roughness={0.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, GATE_HEIGHT + 0.55, 0]}>
          <boxGeometry args={[GATE_PILLAR_SIZE * 1.2, 0.5, GATE_HALF_SPAN * 2 + GATE_PILLAR_SIZE]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.3} metalness={0.3} roughness={0.5} />
        </mesh>
      </RigidBody>

      {/* Name board on the beam, facing -x so it reads coming in from outside the courtyard. */}
      <mesh position={[0, GATE_HEIGHT + 1.2, 0]}>
        <boxGeometry args={[0.1, 0.9, GATE_HALF_SPAN * 1.4]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.75} />
      </mesh>
      <Text
        position={[-0.07, GATE_HEIGHT + 1.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.4}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={GATE_HALF_SPAN * 1.3}
      >
        Diya Zone
      </Text>

      <StringLights from={[0, GATE_HEIGHT, -GATE_HALF_SPAN]} to={[0, GATE_HEIGHT, GATE_HALF_SPAN]} count={8} sag={0.12} />
    </group>
  );
}

const STACKED_DIYA_OFFSETS: Array<[number, number]> = [
  [-0.5, 0.15],
  [-0.22, 0.1],
  [0.05, 0.2],
];

function diyaLocalPosition(i: number, total: number): [number, number, number] {
  if (i === total - 1) return [STAND_POS[0], STAND_TOP_Y + 0.08, STAND_POS[2]];

  const rangoliSlots = Math.min(2, total - 1);
  if (i < rangoliSlots) {
    const angle = (i / rangoliSlots) * Math.PI * 2 + Math.PI / 4;
    return [Math.cos(angle) * 5, 0, Math.sin(angle) * 5];
  }

  const edgeIndex = i - rangoliSlots;
  const edgeCount = Math.max(1, total - rangoliSlots - 1);
  const span = Math.PI * 2 - OPENING_HALF * 2 - 0.6;
  const startAngle = OPENING_CENTER + OPENING_HALF + 0.3;
  const angle =
    startAngle +
    (edgeCount > 1 ? (edgeIndex / (edgeCount - 1)) * span : span / 2);
  return [Math.cos(angle) * 11, 0, Math.sin(angle) * 11];
}

export function CourtyardZone() {
  const wallAngles = useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < WALL_SEGMENTS; i++) {
      const angle = (i / WALL_SEGMENTS) * Math.PI * 2;
      const diff = Math.atan2(
        Math.sin(angle - OPENING_CENTER),
        Math.cos(angle - OPENING_CENTER),
      );
      if (Math.abs(diff) < OPENING_HALF) continue;
      angles.push(angle);
    }
    return angles;
  }, []);

  const diyaPositions = useMemo(
    () =>
      Array.from({ length: COURTYARD.diyaCount }, (_, i) =>
        diyaLocalPosition(i, COURTYARD.diyaCount),
      ),
    [],
  );

  return (
    <>
      {/* Simulated in world space, so these must sit outside the courtyard's offset group. */}
      <FireworksSystem />
      <DiyaCarrySystem />
      <group position={[cx, 0, cz]}>
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[FLOOR_RADIUS, 48]} />
          <meshStandardMaterial color="#2f2438" roughness={0.95} />
        </mesh>

        {RANGOLI_RINGS.map((ring, i) => (
          <mesh
            key={i}
            position={[0, 0.045, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[ring.inner, ring.outer, 48]} />
            <meshStandardMaterial
              color={ring.color}
              emissive={ring.color}
              emissiveIntensity={0.35}
              roughness={0.6}
              side={DoubleSide}
            />
          </mesh>
        ))}

        {wallAngles.map((angle, idx) => {
          const x = Math.cos(angle) * WALL_RADIUS;
          const z = Math.sin(angle) * WALL_RADIUS;
          const rotY = angle + Math.PI / 2;
          return (
            <RigidBody
              key={idx}
              type="fixed"
              colliders={false}
              position={[x, 0, z]}
              rotation={[0, rotY, 0]}
            >
              <CuboidCollider
                args={[SEG_WIDTH / 2, WALL_HEIGHT / 2, WALL_THICK / 2]}
                position={[0, WALL_HEIGHT / 2, 0]}
              />
              <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[SEG_WIDTH, WALL_HEIGHT, WALL_THICK]} />
                <meshStandardMaterial
                  color={PALETTE.deepRed}
                  roughness={0.85}
                />
              </mesh>
              <mesh position={[0, WALL_HEIGHT + 0.08, 0]}>
                <boxGeometry args={[SEG_WIDTH * 0.9, 0.18, WALL_THICK * 1.1]} />
                <meshStandardMaterial
                  color={PALETTE.gold}
                  emissive={PALETTE.warm}
                  emissiveIntensity={0.25}
                  roughness={0.6}
                />
              </mesh>
            </RigidBody>
          );
        })}

        <RigidBody type="fixed" colliders={false} position={STAND_POS}>
          <CylinderCollider args={[0.45, 1.15]} position={[0, 0.45, 0]} />
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 0.8, 12]} />
            <meshStandardMaterial color="#4a3a33" roughness={0.85} />
          </mesh>
          <mesh position={[0, STAND_TOP_Y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.15, 1.15, 0.12, 16]} />
            <meshStandardMaterial
              color={PALETTE.marigold}
              emissive={PALETTE.warm}
              emissiveIntensity={0.15}
              roughness={0.7}
            />
          </mesh>

          {STACKED_DIYA_OFFSETS.map(([ox, oz], i) => (
            <group key={i} position={[ox, STAND_TOP_Y + 0.07, oz + 0.55]}>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.15, 0.18, 0.08, 10]} />
                <meshStandardMaterial color="#8a4a2d" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.09, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.05, 10]} />
                <meshStandardMaterial color="#6e3a22" roughness={0.85} />
              </mesh>
            </group>
          ))}
        </RigidBody>

        {diyaPositions.map((pos, i) => (
          <Diya key={i} id={`courtyard-diya-${i}`} position={pos} />
        ))}
        <Diya id="golden-diya" position={[8.4, 0, 4.6]} golden />

        <RangoliCreator position={[0, 0, 0]} />
        <SkyLanterns releasePosition={SKY_LANTERN_RELEASE} />

        <LampPost
          position={[-9.32, 0, 11.11]}
          height={5}
          color={PALETTE.marigold}
        />
        <LampPost
          position={[-9.32, 0, -11.11]}
          height={5}
          color={PALETTE.marigold}
        />
        <LampPost position={[14, 0, 0]} height={5} color={PALETTE.teal} />

        <DiyaGate />

        {/* Diyas carry no light until they're lit, so without this the ring the player is
            meant to walk up to and light sits in the dark and reads as unfinished. */}
        <pointLight
          position={[0, 6, 0]}
          color={PALETTE.warm}
          intensity={95}
          distance={40}
          decay={1.7}
        />
        <pointLight
          position={[0, 2.2, 0]}
          color={PALETTE.warmBright}
          intensity={40}
          distance={22}
          decay={1.8}
        />
      </group>
    </>
  );
}
