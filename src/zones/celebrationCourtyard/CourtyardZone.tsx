import { useMemo } from "react";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { DoubleSide } from "three";
import { ZONES, COURTYARD, PALETTE } from "../../config/constants";
import { Diya } from "./Diya";
import { FireworksSystem } from "./FireworksSystem";
import { LampPost } from "../../world/Decor";

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

const RANGOLI_RINGS: Array<{ inner: number; outer: number; color: string }> = [
  { inner: 0.3, outer: 0.6, color: PALETTE.gold },
  { inner: 0.9, outer: 1.25, color: PALETTE.marigold },
  { inner: 1.55, outer: 1.95, color: PALETTE.magenta },
  { inner: 2.25, outer: 2.7, color: PALETTE.teal },
];

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
      {/* Simulated in world space, so it must sit outside the courtyard's offset group. */}
      <FireworksSystem />
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

        <pointLight
          position={[0, 6, 0]}
          color={PALETTE.warm}
          intensity={35}
          distance={30}
          decay={2}
        />
      </group>
    </>
  );
}
