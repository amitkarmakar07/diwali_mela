import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { PALETTE } from '../config/constants';

export type NPCProp = 'balloon' | 'bag';

interface NPCProps {
  mode: 'walk' | 'idle';
  waypoints?: [number, number][];
  position?: [number, number];
  speed?: number;
  color?: string;
  facing?: number;
  prop?: NPCProp;
  /** Fraction along the first leg to start at, so a group doesn't stack on one point. */
  startT?: number;
}

export function NPC({
  mode,
  waypoints,
  position,
  speed = 1.2,
  color,
  facing = 0,
  prop,
  startT = 0,
}: NPCProps) {
  const root = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);

  const start = useMemo<[number, number]>(() => {
    if (mode === 'walk' && waypoints?.length) {
      const [a, b] = [waypoints[0], waypoints[1] ?? waypoints[0]];
      return [a[0] + (b[0] - a[0]) * startT, a[1] + (b[1] - a[1]) * startT];
    }
    return position ?? [0, 0];
  }, [mode, waypoints, position, startT]);

  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const propColor = useMemo(
    () => PALETTE.bulbColors[Math.floor(Math.random() * PALETTE.bulbColors.length)],
    [],
  );
  const shirt = color ?? PALETTE.marigold;

  // Starting mid-leg means the next target is the leg's end, not the leg's start.
  const walk = useRef({ index: startT > 0 ? 1 : 0, x: start[0], z: start[1], yaw: facing, t: 0 });

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;

    const s = walk.current;
    s.t += delta;

    if (mode === 'walk' && waypoints && waypoints.length >= 2) {
      const [tx, tz] = waypoints[s.index];
      const dx = tx - s.x;
      const dz = tz - s.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.4) {
        s.index = (s.index + 1) % waypoints.length;
      } else {
        const step = Math.min((speed * delta) / dist, 1);
        s.x += dx * step;
        s.z += dz * step;

        const targetYaw = Math.atan2(dx, dz);
        const diff = Math.atan2(Math.sin(targetYaw - s.yaw), Math.cos(targetYaw - s.yaw));
        s.yaw += diff * Math.min(delta * 4, 1);
      }

      const stride = Math.sin(s.t * speed * 3.1 + phase);
      const swing = stride * 0.42;
      if (leftLeg.current) leftLeg.current.rotation.x = swing;
      if (rightLeg.current) rightLeg.current.rotation.x = -swing;
      if (leftArm.current) leftArm.current.rotation.x = -swing * 0.6;
      if (rightArm.current) rightArm.current.rotation.x = swing * 0.6;
      g.position.y = Math.abs(stride) * 0.045;
    } else {
      const breathe = Math.sin(s.t * 1.1 + phase);
      g.position.y = breathe * 0.022;
      g.rotation.z = Math.sin(s.t * 0.7 + phase) * 0.018;
      if (leftArm.current) leftArm.current.rotation.x = breathe * 0.05;
      if (rightArm.current) rightArm.current.rotation.x = -breathe * 0.05;
    }

    g.position.x = s.x;
    g.position.z = s.z;
    g.rotation.y = s.yaw;
  });

  return (
    <group ref={root} position={[start[0], 0, start[1]]} rotation={[0, facing, 0]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.62, 0.24]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#c98e63" roughness={0.9} />
      </mesh>

      {/* Limbs hang from pivot groups so they swing from the shoulder/hip. */}
      <group ref={leftArm} position={[-0.26, 1.24, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.065, 0.055, 0.5, 6]} />
          <meshStandardMaterial color={shirt} roughness={0.8} />
        </mesh>
        {prop === 'bag' && (
          <mesh position={[0, -0.62, 0.04]} castShadow>
            <boxGeometry args={[0.24, 0.28, 0.14]} />
            <meshStandardMaterial color={propColor} roughness={0.75} />
          </mesh>
        )}
      </group>
      <group ref={rightArm} position={[0.26, 1.24, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.065, 0.055, 0.5, 6]} />
          <meshStandardMaterial color={shirt} roughness={0.8} />
        </mesh>
        {prop === 'balloon' && (
          <group position={[0, -0.48, 0]}>
            <mesh position={[0, 0.78, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 1.56, 4]} />
              <meshStandardMaterial color="#d8d2e0" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.73, 0]} castShadow>
              <sphereGeometry args={[0.17, 12, 10]} />
              <meshStandardMaterial
                color={propColor}
                emissive={propColor}
                emissiveIntensity={0.35}
                roughness={0.5}
              />
            </mesh>
          </group>
        )}
      </group>
      <group ref={leftLeg} position={[-0.11, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.7, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.11, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.7, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
