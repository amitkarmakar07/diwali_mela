import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { FUN_ZONE, PALETTE } from '../../config/constants';
import { Banner, Bunting, DressingStall, LampPost, StringLights } from '../../world/Decor';
import { BalloonShootGame } from './BalloonShootGame';
import { CupStackGame } from './CupStackGame';
import { RingTossGame } from './RingTossGame';

const {
  position,
  padWidth,
  padDepth,
  padCenterZ,
  branchZ,
  branchInnerX,
  branchOuterX,
  branchWidth,
  boothZ,
  boothX,
} = FUN_ZONE;

const BOOTH_ORIGINS = boothX.map(
  (bx) => [position[0] + bx, 0, position[2] + boothZ] as [number, number, number],
);

const BRANCH_LENGTH = branchInnerX - branchOuterX;
const BRANCH_CENTER_X = (branchInnerX + branchOuterX) / 2;
const ARCH_X = branchInnerX + 0.5;
const ARCH_PILLAR_X = 2.2;
const ARCH_HEIGHT = 5.2;

const LAMPS: Array<[number, number]> = [
  [-12.5, 5.5],
  [0, 6.8],
  [12.5, 5.5],
  [-12.5, -7.5],
  [12.5, -7.5],
];

const FILLERS: Array<[number, number, number, string]> = [
  [12.6, 0.5, Math.PI / 2, PALETTE.gold],
  [12.6, -3.5, Math.PI / 2, PALETTE.teal],
  [-12.6, 2.5, -Math.PI / 2, PALETTE.magenta],
];

function PrizeWheel({
  position: pos,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  const wheel = useRef<Group>(null);

  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.z -= delta * 0.5;
  });

  return (
    <group position={pos} rotation={[0, rotationY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.1, 0.14]} position={[0, 1.1, 0]} />
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 2.2, 8]} />
          <meshStandardMaterial color="#3a3240" metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>
      <group ref={wheel} position={[0, 2.6, 0]}>
        <mesh>
          <torusGeometry args={[1.0, 0.07, 8, 28]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.4} />
        </mesh>
        {PALETTE.bulbColors.map((color, i) => {
          const a = (i / PALETTE.bulbColors.length) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, 0, a]}>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.46, 0.96, 0.04]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.6} />
              </mesh>
              <mesh position={[0, 1.0, 0.05]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={PALETTE.warmBright} emissive={PALETTE.warmBright} emissiveIntensity={1.4} />
              </mesh>
            </group>
          );
        })}
      </group>
      <mesh position={[0, 3.75, 0.1]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.1, 0.3, 4]} />
        <meshStandardMaterial color={PALETTE.warmBright} emissive={PALETTE.warmBright} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function EntryArch() {
  return (
    <group position={[ARCH_X, 0, branchZ]}>
      {[-ARCH_PILLAR_X, ARCH_PILLAR_X].map((z) => (
        <RigidBody key={z} type="fixed" colliders={false}>
          <CylinderCollider args={[ARCH_HEIGHT / 2, 0.22]} position={[0, ARCH_HEIGHT / 2, z]} />
          <mesh position={[0, ARCH_HEIGHT / 2, z]} castShadow>
            <cylinderGeometry args={[0.2, 0.26, ARCH_HEIGHT, 10]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
          </mesh>
          <mesh position={[0, ARCH_HEIGHT + 0.2, z]}>
            <sphereGeometry args={[0.24, 12, 12]} />
            <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.6} />
          </mesh>
        </RigidBody>
      ))}

      <mesh position={[0, ARCH_HEIGHT - 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.9, ARCH_PILLAR_X * 2 + 0.5]} />
        <meshStandardMaterial color={PALETTE.magenta} roughness={0.75} />
      </mesh>
      <Text
        position={[0.2, ARCH_HEIGHT - 0.38, 0]}
        rotation={[0, Math.PI / 2, 0]}
        font="/fonts/YatraOne-Regular.ttf"
        fontSize={0.5}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
      >
        Fun Zone
      </Text>
      <Text
        position={[-0.2, ARCH_HEIGHT - 0.38, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        font="/fonts/YatraOne-Regular.ttf"
        fontSize={0.5}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
      >
        Fun Zone
      </Text>

      <StringLights
        from={[0, ARCH_HEIGHT - 0.9, -ARCH_PILLAR_X]}
        to={[0, ARCH_HEIGHT - 0.9, ARCH_PILLAR_X]}
        count={9}
        sag={0.45}
      />
      <pointLight
        position={[0, ARCH_HEIGHT - 1.2, 0]}
        color={PALETTE.marigold}
        intensity={22}
        distance={14}
        decay={2}
      />
    </group>
  );
}

export function FunZone() {
  const bannerGroup = useRef<Group>(null);

  useFrame((state) => {
    if (bannerGroup.current) {
      bannerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.15) * 0.022;
    }
  });

  return (
    <>
      <group position={position}>
        <mesh position={[0, 0.02, padCenterZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[padWidth, padDepth]} />
          <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
        </mesh>

        {/* Slightly above the pad: the two paths overlap where the branch meets it. */}
        <mesh
          position={[BRANCH_CENTER_X, 0.03, branchZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[BRANCH_LENGTH, branchWidth]} />
          <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
        </mesh>

        <EntryArch />

        {LAMPS.map(([x, z]) => (
          <LampPost key={`${x}-${z}`} position={[x, 0, z]} height={4.8} />
        ))}

        <StringLights from={[-12.5, 4.8, 5.5]} to={[0, 4.8, 6.8]} count={11} sag={1.1} />
        <StringLights from={[0, 4.8, 6.8]} to={[12.5, 4.8, 5.5]} count={11} sag={1.1} />
        <Bunting from={[-12.5, 5.2, -7.5]} to={[-12.5, 5.2, 5.5]} count={13} sag={1.0} />
        <Bunting from={[12.5, 5.2, -7.5]} to={[12.5, 5.2, 5.5]} count={13} sag={1.0} />

        <group ref={bannerGroup}>
          <Banner position={[-12.5, 4.1, 1.5]} width={2.6} color={PALETTE.marigold} />
          <Banner position={[12.5, 4.1, -3.5]} width={2.6} color={PALETTE.teal} />
        </group>

        {FILLERS.map(([x, z, rotation, color], i) => (
          <DressingStall
            key={i}
            position={[x, 0, z]}
            rotation={[0, rotation, 0]}
            color={color}
            variant={i + 2}
          />
        ))}

        <PrizeWheel position={[-5.5, 0, 4.6]} rotationY={-Math.PI / 2} />
        <PrizeWheel position={[5.5, 0, 4.6]} rotationY={-Math.PI / 2} />
      </group>

      <RingTossGame origin={BOOTH_ORIGINS[0]} />
      <BalloonShootGame origin={BOOTH_ORIGINS[1]} />
      <CupStackGame origin={BOOTH_ORIGINS[2]} />
    </>
  );
}
