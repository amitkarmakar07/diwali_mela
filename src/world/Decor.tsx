import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { PALETTE } from '../config/constants';

interface LampPostProps {
  position: [number, number, number];
  height?: number;
  color?: string;
  /**
   * Every lamp glows, but only some cast a real light. Three.js evaluates every active
   * light per fragment, so a post per 9m with its own point light was costing more frame
   * time than it was worth — the emissive bulb reads the same from a distance.
   */
  light?: boolean;
}

export function LampPost({ position, height = 5, color = PALETTE.warm, light = true }: LampPostProps) {
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
      {light && (
        <pointLight position={[0, height, 0]} color={color} intensity={32} distance={20} decay={1.9} />
      )}
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

const FLAG_COLORS = [
  PALETTE.marigold,
  PALETTE.magenta,
  PALETTE.teal,
  PALETTE.gold,
  PALETTE.deepRed,
];

interface BuntingProps {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  sag?: number;
}

/** Triangle pennants on a sagging cord — the thing that fills empty overhead sky. */
export function Bunting({ from, to, count = 16, sag = 1.1 }: BuntingProps) {
  const flags = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        const position: [number, number, number] = [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t - sag * Math.sin(Math.PI * t),
          from[2] + (to[2] - from[2]) * t,
        ];
        return { position, color: FLAG_COLORS[i % FLAG_COLORS.length] };
      }),
    [from, to, count, sag],
  );

  const cordPoints = useMemo(() => flags.map((f) => f.position), [flags]);

  return (
    <group>
      <Line points={cordPoints} color="#2a2430" lineWidth={1} />
      {flags.map((f, i) => (
        <mesh
          key={i}
          position={[f.position[0], f.position[1] - 0.22, f.position[2]]}
          rotation={[Math.PI, 0, 0]}
          scale={[1, 1, 0.22]}
        >
          <coneGeometry args={[0.19, 0.42, 4]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.28}
            roughness={0.8}
          />
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

interface CandyAwningProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  depth: number;
  stripes?: number;
  colorA?: string;
  colorB?: string;
}

/** A pitched roof panel split into alternating stripes — the candy-cane awning from the reference stall. */
export function CandyAwning({
  position,
  rotation = [0, 0, 0],
  width,
  depth,
  stripes = 5,
  colorA = PALETTE.deepRed,
  colorB = '#f2e6c9',
}: CandyAwningProps) {
  const stripeWidth = width / stripes;
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: stripes }, (_, i) => {
        const x = (i + 0.5) * stripeWidth - width / 2;
        const color = i % 2 === 0 ? colorA : colorB;
        return (
          <mesh key={i} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[stripeWidth, 0.06, depth]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

const GARLAND_COLORS = [PALETTE.marigold, PALETTE.gold];

interface GarlandProps {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  sag?: number;
}

/** Marigold garland draped along a counter front — static emissive beads, no per-frame cost. */
export function Garland({ from, to, count = 7, sag = 0.18 }: GarlandProps) {
  const beads = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        const position: [number, number, number] = [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t - sag * Math.sin(Math.PI * t),
          from[2] + (to[2] - from[2]) * t,
        ];
        return { position, color: GARLAND_COLORS[i % GARLAND_COLORS.length] };
      }),
    [from, to, count, sag],
  );
  const cordPoints = useMemo(() => beads.map((b) => b.position), [beads]);

  return (
    <group>
      <Line points={cordPoints} color="#5a4420" lineWidth={1} />
      {beads.map((b, i) => (
        <mesh key={i} position={b.position}>
          <sphereGeometry args={[0.065, 6, 6]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.5} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

interface DressingStallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  /** Picks which goods sit on the counter, so a row of stalls isn't identical. */
  variant?: number;
  /** Shop name painted on the illuminated signboard. */
  name?: string;
}

const COUNTER_SIZE: [number, number, number] = [2.6, 1.0, 1.3];
const POST_HEIGHT = 2.3;
const COUNTER_TOP = COUNTER_SIZE[1];

function CounterGoods({ variant }: { variant: number }) {
  if (variant % 3 === 0) {
    return (
      <group>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
          <mesh key={x} position={[x, COUNTER_TOP + 0.11, 0]} castShadow>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color={PALETTE.marigold} roughness={0.85} />
          </mesh>
        ))}
        {[-0.6, -0.2, 0.2, 0.6].map((x) => (
          <mesh key={x} position={[x, COUNTER_TOP + 0.29, 0]} castShadow>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color={PALETTE.gold} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }

  if (variant % 3 === 1) {
    return (
      <group>
        {[-0.75, -0.15, 0.55].map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, COUNTER_TOP + 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 0.32, 10]} />
              <meshStandardMaterial
                color={i === 1 ? PALETTE.teal : PALETTE.deepRed}
                roughness={0.6}
              />
            </mesh>
            <mesh position={[0, COUNTER_TOP + 0.35, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.06, 10]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[-0.6, COUNTER_TOP + 0.18, 0]} castShadow>
        <boxGeometry args={[0.6, 0.36, 0.5]} />
        <meshStandardMaterial color={PALETTE.magenta} roughness={0.8} />
      </mesh>
      <mesh position={[-0.6, COUNTER_TOP + 0.46, 0]} castShadow>
        <boxGeometry args={[0.44, 0.2, 0.38]} />
        <meshStandardMaterial color={PALETTE.teal} roughness={0.8} />
      </mesh>
      <mesh position={[0.35, COUNTER_TOP + 0.22, 0]} castShadow>
        <boxGeometry args={[0.7, 0.44, 0.46]} />
        <meshStandardMaterial color={PALETTE.gold} roughness={0.8} />
      </mesh>
      <mesh position={[0.95, COUNTER_TOP + 0.14, 0]} castShadow>
        <coneGeometry args={[0.18, 0.28, 8]} />
        <meshStandardMaterial color={PALETTE.marigold} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function DressingStall({
  position,
  rotation = [0, 0, 0],
  color = PALETTE.deepRed,
  variant = 0,
  name = 'Mela Dukaan',
}: DressingStallProps) {
  const counterY = COUNTER_SIZE[1] / 2;
  const corners: [number, number][] = [
    [-COUNTER_SIZE[0] / 2 + 0.12, -COUNTER_SIZE[2] / 2 + 0.12],
    [COUNTER_SIZE[0] / 2 - 0.12, -COUNTER_SIZE[2] / 2 + 0.12],
    [-COUNTER_SIZE[0] / 2 + 0.12, COUNTER_SIZE[2] / 2 - 0.12],
    [COUNTER_SIZE[0] / 2 - 0.12, COUNTER_SIZE[2] / 2 - 0.12],
  ];
  const signWidth = COUNTER_SIZE[0] + 0.5;
  const frontZ = -COUNTER_SIZE[2] / 2 - 0.05;

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

      {/* Candy-striped awning facing the counter front; the back pitch stays plain, it's rarely seen. */}
      <CandyAwning
        position={[0, POST_HEIGHT + 0.05, frontZ + 0.1]}
        rotation={[Math.PI / 10, 0, 0]}
        width={signWidth}
        depth={COUNTER_SIZE[2] * 0.9}
      />
      <mesh position={[0, POST_HEIGHT + 0.05, COUNTER_SIZE[2] * 0.15]} rotation={[-Math.PI / 10, 0, 0]} castShadow>
        <boxGeometry args={[COUNTER_SIZE[0] + 0.4, 0.06, COUNTER_SIZE[2] * 0.9]} />
        <meshStandardMaterial color={PALETTE.teal} roughness={0.75} />
      </mesh>

      {/* Row of warm bulbs along the awning's front edge — reuses the flicker already tuned for lamps. */}
      <StringLights
        from={[-signWidth / 2 + 0.2, POST_HEIGHT - 0.1, frontZ + 0.08]}
        to={[signWidth / 2 - 0.2, POST_HEIGHT - 0.1, frontZ + 0.08]}
        count={5}
        sag={0.08}
      />

      <mesh position={[0, POST_HEIGHT + 0.7, frontZ]}>
        <boxGeometry args={[signWidth, 0.5, 0.08]} />
        <meshStandardMaterial color="#241c33" roughness={0.9} />
      </mesh>
      <Text
        position={[0, POST_HEIGHT + 0.7, frontZ + 0.05]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.2}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={signWidth - 0.2}
      >
        {name}
      </Text>

      {/* Marigold garland strung along the counter's front lip. */}
      <Garland
        from={[-COUNTER_SIZE[0] / 2 + 0.1, counterY + 0.08, COUNTER_SIZE[2] / 2]}
        to={[COUNTER_SIZE[0] / 2 - 0.1, counterY + 0.08, COUNTER_SIZE[2] / 2]}
        count={6}
        sag={0.12}
      />

      <CounterGoods variant={variant} />
    </group>
  );
}
