import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { ZONES, PALETTE } from '../../config/constants';
import { LampPost, StringLights, Banner, DressingStall } from '../../world/Decor';

const [plazaX, plazaZ] = ZONES.plaza;
const PROMENADE_X = 8.5;
const LAMP_ZS = Array.from({ length: 7 }, (_, i) => 40 - i * 9);
const STALL_X = 10.5;

// Reserved zones from AGENT.md §3 — not yet in ZONES because nothing is built there.
const FOOD_STREET: [number, number] = [-30, 6];
const CULTURAL_STAGE: [number, number] = [26, 22];

const SIGN_TARGETS = [
  { label: 'Ride Zone', x: ZONES.rideZone[0], z: ZONES.rideZone[1] },
  { label: 'Celebration Courtyard', x: ZONES.courtyard[0], z: ZONES.courtyard[1] },
  { label: 'Food Street', x: FOOD_STREET[0], z: FOOD_STREET[1] },
  { label: 'Cultural Stage', x: CULTURAL_STAGE[0], z: CULTURAL_STAGE[1] },
];

const STALL_SPECS: Array<{ x: number; z: number; color: string; rotation: number }> = [
  { x: -STALL_X, z: 33, color: PALETTE.marigold, rotation: -Math.PI / 2 },
  { x: STALL_X, z: 24, color: PALETTE.teal, rotation: Math.PI / 2 },
  { x: -STALL_X, z: 15, color: PALETTE.magenta, rotation: -Math.PI / 2 },
  { x: STALL_X, z: 6, color: PALETTE.deepRed, rotation: Math.PI / 2 },
  { x: -STALL_X, z: -3, color: PALETTE.gold, rotation: -Math.PI / 2 },
  { x: STALL_X, z: -11, color: PALETTE.marigold, rotation: Math.PI / 2 },
];

const BENCH_SPECS: Array<[number, number]> = [
  [7, -26],
  [-7, -26],
  [7, -14],
  [-7, -14],
];

export function PromenadeZone() {
  const bannerGroup = useRef<Group>(null);

  useFrame((state) => {
    if (bannerGroup.current) {
      bannerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.025;
    }
  });

  return (
    <group>
      {LAMP_ZS.map((z) => (
        <group key={z}>
          <LampPost position={[-PROMENADE_X, 0, z]} height={5} />
          <LampPost position={[PROMENADE_X, 0, z]} height={5} />
        </group>
      ))}

      {LAMP_ZS.filter((_, i) => i % 2 === 0).map((z) => (
        <StringLights key={z} from={[-PROMENADE_X, 5, z]} to={[PROMENADE_X, 5, z]} count={12} sag={1.4} />
      ))}

      {STALL_SPECS.map((s, i) => (
        <DressingStall key={i} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0]} color={s.color} />
      ))}

      <group ref={bannerGroup}>
        <Banner position={[-PROMENADE_X, 4.2, 31]} rotation={[0, 0, 0]} width={3} />
        <Banner position={[PROMENADE_X, 4.2, 13]} rotation={[0, 0, 0]} width={3} />
        <Banner position={[-PROMENADE_X, 4.2, -5]} rotation={[0, 0, 0]} width={3} />
      </group>

      <group position={[plazaX, 0, plazaZ]}>
        <RigidBody type="fixed" colliders={false}>
          <CylinderCollider args={[0.55, 3.2]} position={[0, 0.55, 0]} />
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[3.2, 3.4, 0.4, 28]} />
            <meshStandardMaterial color={PALETTE.ground} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[2.5, 2.9, 0.35, 28]} />
            <meshStandardMaterial color={PALETTE.path} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[1.8, 2.2, 0.3, 24]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.7} />
          </mesh>
        </RigidBody>

        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[1.5, 1.9, 0.55, 20]} />
          <meshStandardMaterial
            color={PALETTE.gold}
            emissive={PALETTE.warm}
            emissiveIntensity={0.5}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <torusGeometry args={[1.55, 0.14, 8, 32]} />
          <meshStandardMaterial color={PALETTE.marigold} emissive={PALETTE.marigold} emissiveIntensity={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial
            color={PALETTE.flame}
            emissive={PALETTE.flame}
            emissiveIntensity={1.1}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 2.85, 0]}>
          <coneGeometry args={[0.32, 0.9, 10]} />
          <meshStandardMaterial
            color={PALETTE.warmBright}
            emissive={PALETTE.warmBright}
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>

        <pointLight position={[0, 2.6, 0]} color={PALETTE.warm} intensity={60} distance={22} decay={2} />

        <group position={[-8, 0, -5]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.18, 2.8, 8]} />
            <meshStandardMaterial color="#473a52" roughness={0.6} />
          </mesh>
          {SIGN_TARGETS.map((t, i) => {
            const dx = t.x - (plazaX - 8);
            const dz = t.z - (plazaZ - 5);
            const angle = Math.atan2(dx, dz);
            return (
              <group key={t.label} position={[0, 2.6 - i * 0.55, 0]} rotation={[0, angle, 0]}>
                <mesh position={[0, 0, 0.5]}>
                  <boxGeometry args={[0.55, 0.4, 1.4]} />
                  <meshStandardMaterial color={PALETTE.teal} roughness={0.7} />
                </mesh>
                <Text
                  position={[0, 0, 1.22]}
                  rotation={[0, 0, 0]}
                  font="/fonts/Mukta-Bold.ttf"
                  fontSize={0.24}
                  color={PALETTE.warmBright}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={1.2}
                >
                  {t.label}
                </Text>
              </group>
            );
          })}
        </group>

        {BENCH_SPECS.map(([x, z]) => (
          <RigidBody key={`${x}-${z}`} type="fixed" colliders={false} position={[x, 0, z]}>
            <CuboidCollider args={[0.9, 0.25, 0.4]} position={[0, 0.45, 0]} />
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[1.8, 0.1, 0.5]} />
              <meshStandardMaterial color="#5b4a3e" roughness={0.8} />
            </mesh>
            {[-0.75, 0.75].map((lx) => (
              <mesh key={lx} position={[lx, 0.2, 0]}>
                <boxGeometry args={[0.12, 0.4, 0.45]} />
                <meshStandardMaterial color="#3a2f28" roughness={0.9} />
              </mesh>
            ))}
          </RigidBody>
        ))}
      </group>
    </group>
  );
}
