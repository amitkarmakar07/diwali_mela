import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { PALETTE } from '../config/constants';

interface LampPostProps {
  position: [number, number, number];
  height?: number;
  color?: string;
}

export function LampPost({ position, height = 5, color = PALETTE.warm }: LampPostProps) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, height, 8]} />
        <meshStandardMaterial color="#3a3240" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.26, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, height, 0]} color={color} intensity={18} distance={14} decay={2} />
    </group>
  );
}

interface StringLightsProps {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  sag?: number;
}

export function StringLights({ from, to, count = 14, sag = 1.2 }: StringLightsProps) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        const position: [number, number, number] = [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t - sag * Math.sin(Math.PI * t),
          from[2] + (to[2] - from[2]) * t,
        ];
        return { position, color: PALETTE.bulbColors[i % PALETTE.bulbColors.length], phase: t * Math.PI * 4 };
      }),
    [from, to, count, sag],
  );

  const wirePoints = useMemo(() => bulbs.map((b) => b.position), [bulbs]);
  const bulbRefs = useRef<(Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    bulbRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.9 + 0.4 * Math.sin(t * 3 + bulbs[i].phase);
    });
  });

  return (
    <group>
      <Line points={wirePoints} color="#2a2430" lineWidth={1} />
      {bulbs.map((b, i) => (
        <mesh key={i} position={b.position} ref={(el) => (bulbRefs.current[i] = el)}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

interface BannerProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  color?: string;
}

export function Banner({ position, rotation = [0, 0, 0], width = 3, color = PALETTE.marigold }: BannerProps) {
  const height = width * 0.4;
  const tasselOffsets = useMemo(() => Array.from({ length: 5 }, (_, i) => (i + 0.5) / 5 - 0.5), []);
  const sway = useRef<Group>(null);

  useFrame((state) => {
    if (sway.current) sway.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.03;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={sway}>
        <mesh castShadow>
          <boxGeometry args={[width, height, 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.7} />
        </mesh>
        {tasselOffsets.map((tx, i) => (
          <mesh key={i} position={[tx * width, -height / 2 - 0.12, 0]}>
            <coneGeometry args={[0.07, 0.24, 6]} />
            <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

interface DressingStallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

const COUNTER_SIZE: [number, number, number] = [2.6, 1.0, 1.3];
const POST_HEIGHT = 2.3;

export function DressingStall({ position, rotation = [0, 0, 0], color = PALETTE.deepRed }: DressingStallProps) {
  const counterY = COUNTER_SIZE[1] / 2;
  const corners: [number, number][] = [
    [-COUNTER_SIZE[0] / 2 + 0.12, -COUNTER_SIZE[2] / 2 + 0.12],
    [COUNTER_SIZE[0] / 2 - 0.12, -COUNTER_SIZE[2] / 2 + 0.12],
    [-COUNTER_SIZE[0] / 2 + 0.12, COUNTER_SIZE[2] / 2 - 0.12],
    [COUNTER_SIZE[0] / 2 - 0.12, COUNTER_SIZE[2] / 2 - 0.12],
  ];

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[COUNTER_SIZE[0] / 2, COUNTER_SIZE[1] / 2, COUNTER_SIZE[2] / 2]}
          position={[0, counterY, 0]}
        />
        <mesh position={[0, counterY, 0]} castShadow receiveShadow>
          <boxGeometry args={COUNTER_SIZE} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </RigidBody>

      {corners.map(([cx, cz], i) => (
        <mesh key={i} position={[cx, POST_HEIGHT / 2, cz]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
          <meshStandardMaterial color="#3a3240" roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, POST_HEIGHT + 0.05, -COUNTER_SIZE[2] * 0.15]} rotation={[Math.PI / 10, 0, 0]} castShadow>
        <boxGeometry args={[COUNTER_SIZE[0] + 0.4, 0.06, COUNTER_SIZE[2] * 0.9]} />
        <meshStandardMaterial color={PALETTE.marigold} roughness={0.75} />
      </mesh>
      <mesh position={[0, POST_HEIGHT + 0.05, COUNTER_SIZE[2] * 0.15]} rotation={[-Math.PI / 10, 0, 0]} castShadow>
        <boxGeometry args={[COUNTER_SIZE[0] + 0.4, 0.06, COUNTER_SIZE[2] * 0.9]} />
        <meshStandardMaterial color={PALETTE.teal} roughness={0.75} />
      </mesh>

      <mesh position={[0, POST_HEIGHT + 0.55, -COUNTER_SIZE[2] / 2 - 0.05]}>
        <boxGeometry args={[1.1, 0.4, 0.06]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}
