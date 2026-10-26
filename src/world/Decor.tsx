import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { PALETTE } from '../config/constants';

const VENDOR_SKIN = '#c89a68';

interface VendorProps {
  position: [number, number, number];
  shirt?: string;
  phase?: number;
  /** Turban colour — a cheap way to make neighbouring vendors look distinct. */
  turban?: string;
}

/**
 * Shared procedural vendor figure — torso cylinder, head sphere, turban torus, two angled
 * arms, swaying gently in useFrame. Shared so every staffed counter (food-street shops,
 * dressing stalls, booths) uses the same ~5-mesh figure instead of duplicating it.
 */
export function Vendor({ position, shirt = PALETTE.deepRed, phase = 0, turban = PALETTE.marigold }: VendorProps) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2 + phase) * 0.025;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + phase) * 0.08;
  });

  return (
    <group position={position} ref={group}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.9, 10]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color={VENDOR_SKIN} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <torusGeometry args={[0.2, 0.08, 6, 12]} />
        <meshStandardMaterial color={turban} roughness={0.8} />
      </mesh>
      <mesh position={[-0.26, 0.95, 0]} rotation={[0, 0, 0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.55, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0.26, 0.95, 0]} rotation={[0, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.55, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
    </group>
  );
}

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
  stripes = 8,
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
  /** Small brass bells interleaved between the beads, hanging a touch lower. */
  bellCount?: number;
  /** Repeating droop loops along the span — >1 reads as swagged garland, not one gentle arc. */
  swags?: number;
}

/**
 * Marigold garland draped along a counter front in sagging swags, with brass bells at the
 * low points. Beads and bells are each one instancedMesh draw call, not one mesh per bead —
 * this is what keeps a dense-looking garland cheap.
 */
export function Garland({ from, to, count = 10, sag = 0.18, bellCount = 0, swags = 1 }: GarlandProps) {
  const curve = (t: number): [number, number, number] => [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t - sag * Math.abs(Math.sin(Math.PI * t * swags)),
    from[2] + (to[2] - from[2]) * t,
  ];

  const beads = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        return { position: curve(t), color: GARLAND_COLORS[i % GARLAND_COLORS.length] };
      }),
    [from, to, count, sag, swags],
  );
  const cordPoints = useMemo(() => beads.map((b) => b.position), [beads]);

  const bells = useMemo(
    () =>
      bellCount > 0
        ? Array.from({ length: bellCount }, (_, i) => {
            const t = (i + 0.5) / bellCount;
            const [x, y, z] = curve(t);
            return [x, y - 0.1, z] as [number, number, number];
          })
        : [],
    [from, to, bellCount, sag, swags],
  );

  const beadRef = useRef<InstancedMesh>(null);
  const bellRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = beadRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const col = new Color();
    beads.forEach((b, i) => {
      dummy.position.set(b.position[0], b.position[1], b.position[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.set(b.color);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [beads]);

  useEffect(() => {
    const mesh = bellRef.current;
    if (!mesh || bells.length === 0) return;
    const dummy = new Object3D();
    bells.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [bells]);

  return (
    <group>
      <Line points={cordPoints} color="#5a4420" lineWidth={1} />
      <instancedMesh ref={beadRef} args={[undefined, undefined, Math.max(count, 1)]}>
        <sphereGeometry args={[0.065, 6, 6]} />
        <meshStandardMaterial vertexColors emissive={PALETTE.marigold} emissiveIntensity={0.3} roughness={0.6} />
      </instancedMesh>
      {bellCount > 0 && (
        <instancedMesh ref={bellRef} args={[undefined, undefined, bellCount]} castShadow>
          <coneGeometry args={[0.045, 0.09, 6]} />
          <meshStandardMaterial
            color={PALETTE.gold}
            emissive={PALETTE.gold}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.35}
          />
        </instancedMesh>
      )}
    </group>
  );
}

const MAROON = '#5c1824';
const MAROON_LIGHT = '#7a2230';

interface ClothSkirtProps {
  position: [number, number, number];
  width: number;
  height?: number;
  stripes?: number;
  colorA?: string;
  colorB?: string;
}

/**
 * Counter front panel — a deep maroon/red cloth with a subtle two-tone weave, plus a grid of
 * small gold "motifs" standing in for the busy embroidered pattern. The motif grid is one
 * instancedMesh draw call regardless of how many dots it has.
 */
export function ClothSkirt({
  position,
  width,
  height = 0.5,
  stripes = 5,
  colorA = MAROON,
  colorB = MAROON_LIGHT,
}: ClothSkirtProps) {
  const stripeWidth = width / stripes;
  const motifCols = Math.max(Math.round(width / 0.22), 4);
  const motifRows = 3;
  const motifCount = motifCols * motifRows;
  const motifRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = motifRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    let i = 0;
    for (let r = 0; r < motifRows; r++) {
      for (let c = 0; c < motifCols; c++) {
        const x = (c + 0.5) * (width / motifCols) - width / 2;
        const y = (r + 0.5) * (height / motifRows) - height / 2;
        dummy.position.set(x, y, 0.035);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [width, height, motifCols, motifRows]);

  return (
    <group position={position}>
      {Array.from({ length: stripes }, (_, i) => {
        const x = (i + 0.5) * stripeWidth - width / 2;
        const color = i % 2 === 0 ? colorA : colorB;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[stripeWidth * 0.98, height, 0.05]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.85} />
          </mesh>
        );
      })}
      <instancedMesh ref={motifRef} args={[undefined, undefined, motifCount]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.gold}
          emissive={PALETTE.gold}
          emissiveIntensity={0.4}
          metalness={0.4}
          roughness={0.4}
        />
      </instancedMesh>
    </group>
  );
}

interface GlowBackdropProps {
  position: [number, number, number];
  width: number;
  height: number;
  stripeCount?: number;
}

/**
 * The lit-interior backdrop behind the goods: a bright emissive plate with vertical red/gold
 * stripes layered over its upper half (a striped cloth backdrop). Emissive material only — no
 * light is added — and the stripes are one instancedMesh draw call.
 */
export function GlowBackdrop({ position, width, height, stripeCount = 7 }: GlowBackdropProps) {
  const stripeWidth = width / stripeCount;
  const upperHeight = height * 0.55;
  const stripeRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = stripeRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const col = new Color();
    for (let i = 0; i < stripeCount; i++) {
      const x = (i + 0.5) * stripeWidth - width / 2;
      dummy.position.set(x, height / 2 - upperHeight / 2, 0.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.set(i % 2 === 0 ? PALETTE.deepRed : PALETTE.gold);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [stripeCount, stripeWidth, width, height, upperHeight]);

  return (
    <group position={position}>
      {/* A pale emissive above ~1.3 saturates to flat white and swallows the stripes,
          so the backdrop has to be a warm amber held just under that. */}
      <mesh>
        <boxGeometry args={[width, height, 0.03]} />
        <meshStandardMaterial
          color={PALETTE.marigold}
          emissive={PALETTE.marigold}
          emissiveIntensity={1.15}
          roughness={1}
        />
      </mesh>
      <instancedMesh ref={stripeRef} args={[undefined, undefined, stripeCount]}>
        <boxGeometry args={[stripeWidth * 0.8, upperHeight, 0.015]} />
        <meshStandardMaterial vertexColors emissive={PALETTE.deepRed} emissiveIntensity={0.55} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

/**
 * One instanced draw call standing in for a whole heap of sweets — far cheaper than
 * one mesh per laddoo, which is how the counter gets to look crowded within budget.
 */
function SphereHeap({
  positions,
  color,
  radius = 0.09,
  squashY = 1,
}: {
  positions: Array<[number, number, number]>;
  color: string;
  radius?: number;
  squashY?: number;
}) {
  const ref = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(1, squashY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions, squashY]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow>
      <sphereGeometry args={[radius, 7, 6]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </instancedMesh>
  );
}

/** Irregular pile, not a tidy ring — a jittered spiral reads as heaped sweets. */
function heapPositions(count: number, spread: number, baseY: number): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, i) => {
    const a = i * 2.4;
    const r = spread * (0.3 + 0.6 * (((i * 53) % 10) / 10));
    const y = baseY + ((i * 17) % 5) * 0.015;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
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

const VENDOR_SHIRTS = [PALETTE.deepRed, PALETTE.teal, PALETTE.magenta];
const VENDOR_TURBANS = [PALETTE.marigold, PALETTE.gold, PALETTE.teal];

/** Shallow basket/tray — the bowl a heap sits in, so the pile reads as served, not floating. */
function Tray({ x, z, radius, color }: { x: number; z: number; radius: number; color: string }) {
  return (
    <mesh position={[x, COUNTER_TOP + 0.03, z]} castShadow>
      <cylinderGeometry args={[radius, radius * 1.1, 0.06, 14]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function CounterGoods({ variant }: { variant: number }) {
  if (variant % 3 === 0) {
    // The reference stall's signature spread: three big pale khoya/barfi domes front-and-
    // centre (cream, pale green, cream), with a heap of small orange laddoo filling the rest.
    const laddoo = useMemo(() => heapPositions(14, 0.58, COUNTER_TOP + 0.08), []);
    const domeColors = ['#f2e6c9', '#cfe0a8', '#f2e6c9'];
    return (
      <group>
        <group position={[0, 0, 0.18]}>
          <SphereHeap positions={laddoo} color={PALETTE.marigold} radius={0.085} />
        </group>
        {[-0.62, 0, 0.62].map((x, i) => (
          <mesh key={i} position={[x, COUNTER_TOP + 0.02, -0.12]} scale={[1, 0.62, 1]} castShadow>
            <sphereGeometry args={[0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={domeColors[i]} roughness={0.75} />
          </mesh>
        ))}
      </group>
    );
  }

  if (variant % 3 === 1) {
    const greens = useMemo(() => heapPositions(8, 0.3, COUNTER_TOP + 0.08), []);
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
        <Tray x={1.0} z={0.15} radius={0.32} color={PALETTE.marigold} />
        <group position={[1.0, 0, 0.15]}>
          <SphereHeap positions={greens} color={PALETTE.teal} radius={0.07} />
        </group>
        {[0, 1].map((i) => (
          <mesh key={i} position={[-1.05, COUNTER_TOP + 0.05 + i * 0.08, -0.35]} castShadow>
            <cylinderGeometry args={[0.15, 0.17, 0.07, 10]} />
            <meshStandardMaterial color="#e8c99a" roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }

  const petals = useMemo(() => heapPositions(9, 0.32, COUNTER_TOP + 0.07), []);
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
      <Tray x={1.0} z={0.1} radius={0.34} color={PALETTE.marigold} />
      <group position={[1.0, 0, 0.1]}>
        <SphereHeap positions={petals} color={PALETTE.marigold} radius={0.075} />
      </group>
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
        count={9}
        sag={0.08}
      />

      {/* Gold border frame sitting behind the maroon nameboard, matching the reference signage. */}
      <mesh position={[0, POST_HEIGHT + 0.7, frontZ + 0.015]}>
        <boxGeometry args={[signWidth + 0.1, 0.58, 0.05]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.25} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, POST_HEIGHT + 0.7, frontZ]}>
        <boxGeometry args={[signWidth, 0.5, 0.08]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.85} />
      </mesh>
      {/* This stall fronts on -Z, so the name has to sit at a *lower* z than the 0.08-deep
          panel behind it. A +offset buried the text inside the board and every sign read blank.
          drei <Text> faces +Z by default, which is correct for a viewer on the +Z side — but the
          customer stands on the -Z (frontZ) side looking toward +Z, so without a 180° yaw the
          glyphs render back-to-front (mirrored) from where anyone actually reads the sign. */}
      <Text
        position={[0, POST_HEIGHT + 0.7, frontZ - 0.07]}
        rotation={[0, Math.PI, 0]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.2}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={signWidth - 0.2}
      >
        {name}
      </Text>

      {/* Glowing striped backdrop, set back far enough that the vendor stands in front of
          it and reads as a silhouette against the light. At the counter's back edge it sat
          between the customer and the vendor and hid them entirely. */}
      <GlowBackdrop
        position={[0, counterY + 0.7, COUNTER_SIZE[2] / 2 + 0.85]}
        width={COUNTER_SIZE[0] - 0.2}
        height={1.2}
      />

      {/* Patterned cloth skirt on the counter's front face — same side as the awning/sign. */}
      <ClothSkirt position={[0, 0.28, frontZ + 0.07]} width={COUNTER_SIZE[0] - 0.2} height={0.5} />

      {/* Marigold garland swagged across the counter's front lip, with brass bells at the dips. */}
      <Garland
        from={[-COUNTER_SIZE[0] / 2 + 0.1, counterY + 0.08, -COUNTER_SIZE[2] / 2]}
        to={[COUNTER_SIZE[0] / 2 - 0.1, counterY + 0.08, -COUNTER_SIZE[2] / 2]}
        count={10}
        sag={0.14}
        bellCount={3}
        swags={3}
      />

      <CounterGoods variant={variant} />

      {/* Vendor stands on the far side from frontZ (the awning/sign side), facing the counter. */}
      <Vendor
        position={[0, 0, COUNTER_SIZE[2] / 2 + 0.4]}
        shirt={VENDOR_SHIRTS[variant % VENDOR_SHIRTS.length]}
        turban={VENDOR_TURBANS[(variant + 1) % VENDOR_TURBANS.length]}
        phase={(position[0] + position[2]) * 0.3}
      />
    </group>
  );
}
