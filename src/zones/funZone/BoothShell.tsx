import type { ReactNode } from 'react';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { PALETTE } from '../../config/constants';
import { StringLights, CandyAwning, Garland } from '../../world/Decor';

const METAL = '#3a3240';
const WOOD_DARK = '#2f2621';

const POSTS: Array<[number, number]> = [
  [-2.5, 1.4],
  [2.5, 1.4],
  [-2.5, -1.6],
  [2.5, -1.6],
];

interface BoothShellProps {
  title: string;
  subtitle: string;
  color: string;
  awningColor: string;
  children?: ReactNode;
}

function PrizeShelf({ position, colors }: { position: [number, number, number]; colors: string[] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.0, 0.06, 0.4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      {colors.map((c, i) => (
        <group key={i} position={[(i - (colors.length - 1) / 2) * 0.32, 0.2, 0]}>
          <mesh>
            <sphereGeometry args={[0.13, 10, 10]} />
            <meshStandardMaterial color={c} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color={c} roughness={0.75} />
          </mesh>
          {[-0.07, 0.07].map((ex) => (
            <mesh key={ex} position={[ex, 0.22, 0.02]}>
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Shared carnival booth: counter, back wall, roof and signage, all facing +Z.
 * Games mount their targets as children in this same booth-local space.
 */
export function BoothShell({ title, subtitle, color, awningColor, children }: BoothShellProps) {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.6, 0.5, 0.4]} position={[0, 0.5, 1.0]} />
        <mesh position={[0, 0.5, 1.0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 1.0, 0.8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.05, 1.0]} castShadow>
          <boxGeometry args={[5.3, 0.1, 0.95]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>

        <CuboidCollider args={[2.6, 1.45, 0.08]} position={[0, 1.45, -1.75]} />
        <mesh position={[0, 1.45, -1.75]} receiveShadow>
          <boxGeometry args={[5.2, 2.9, 0.16]} />
          <meshStandardMaterial color="#241c33" roughness={0.9} />
        </mesh>

        {[-2.56, 2.56].map((x) => (
          <group key={x}>
            <CuboidCollider args={[0.08, 1.45, 1.6]} position={[x, 1.45, -0.2]} />
            <mesh position={[x, 1.45, -0.2]} receiveShadow>
              <boxGeometry args={[0.16, 2.9, 3.2]} />
              <meshStandardMaterial color="#2c2340" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </RigidBody>

      {POSTS.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.5, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 3.0, 8]} />
          <meshStandardMaterial color={METAL} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {/* Candy-striped awning over the booth, matching the reference stall design. */}
      <CandyAwning position={[0, 3.05, -0.1]} width={5.7} depth={3.5} colorA={awningColor} />
      <mesh position={[0, 2.82, 1.62]}>
        <boxGeometry args={[5.7, 0.42, 0.1]} />
        <meshStandardMaterial color={awningColor} emissive={awningColor} emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-2.4 + i * 0.6, 2.61, 1.62]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.18, 0.26, 3]} />
          <meshStandardMaterial color={PALETTE.gold} roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 3.62, 0.9]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[5.0, 0.86, 0.12]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
      </mesh>
      <Text
        position={[0, 3.72, 0.99]}
        rotation={[-0.12, 0, 0]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.34}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
      <Text
        position={[0, 3.42, 0.95]}
        rotation={[-0.12, 0, 0]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.17}
        color={PALETTE.gold}
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>

      <StringLights from={[-2.5, 2.95, 1.45]} to={[2.5, 2.95, 1.45]} count={11} sag={0.5} />

      {/* Marigold garland draped along the counter's front lip. */}
      <Garland from={[-2.4, 1.08, 1.4]} to={[2.4, 1.08, 1.4]} count={9} sag={0.15} />

      <PrizeShelf position={[-1.75, 2.0, -1.5]} colors={PALETTE.bulbColors.slice(0, 3)} />
      <PrizeShelf position={[1.75, 2.0, -1.5]} colors={PALETTE.bulbColors.slice(3, 6)} />

      <pointLight position={[0, 2.5, 0.5]} color={PALETTE.warm} intensity={26} distance={13} decay={2} />

      {children}
    </group>
  );
}
