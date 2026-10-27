import type { RefObject } from 'react';
import type { Group } from 'three';

export type NPCProp = 'balloon' | 'bag';

interface HumanoidBodyProps {
  /** Torso/sleeve colour. */
  shirtColor: string;
  prop?: NPCProp;
  /** Colour of the carried prop (bag or balloon) — callers own the randomness so repeated
   * renders (e.g. a remote avatar re-rendering on peer-info change) don't reroll it. */
  propColor: string;
  /** Seated figures start with the hip-pivoted leg rotation NPC.tsx uses for benches/rides;
   * the animating parent is still free to overwrite rotation.x on these refs every frame. */
  seated: boolean;
  leftArmRef: RefObject<Group | null>;
  rightArmRef: RefObject<Group | null>;
  leftLegRef: RefObject<Group | null>;
  rightLegRef: RefObject<Group | null>;
}

/**
 * The fairground character's visual body only — no root transform, no animation. A parent
 * (NPC.tsx's waypoint walker, or a remote avatar driven by network motion) owns the root
 * group's position/rotation and drives these pivot refs every frame; this component just
 * guarantees both look like the same body.
 */
export function HumanoidBody({
  shirtColor,
  prop,
  propColor,
  seated,
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
}: HumanoidBodyProps) {
  const legRotation: [number, number, number] = seated ? [0.95, 0, 0] : [0, 0, 0];

  return (
    <>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.62, 0.24]} />
        <meshStandardMaterial color={shirtColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#c98e63" roughness={0.9} />
      </mesh>

      {/* Limbs hang from pivot groups so they swing from the shoulder/hip. */}
      <group ref={leftArmRef} position={[-0.26, 1.24, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.065, 0.055, 0.5, 6]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>
        {prop === 'bag' && (
          <mesh position={[0, -0.62, 0.04]} castShadow>
            <boxGeometry args={[0.24, 0.28, 0.14]} />
            <meshStandardMaterial color={propColor} roughness={0.75} />
          </mesh>
        )}
      </group>
      <group ref={rightArmRef} position={[0.26, 1.24, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.065, 0.055, 0.5, 6]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
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
      <group ref={leftLegRef} position={[-0.11, 0.7, 0]} rotation={legRotation}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.7, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.11, 0.7, 0]} rotation={legRotation}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.7, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
    </>
  );
}
