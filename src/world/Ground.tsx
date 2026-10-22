import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { PALETTE, WORLD, ZONES } from '../config/constants';

export function Ground() {
  const pathLength = 62 - -30;
  const pathCenterZ = (62 + -30) / 2;
  const [plazaX, plazaZ] = ZONES.plaza;

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[75, 0.1, 75]} position={[0, -0.1, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[WORLD.groundSize, WORLD.groundSize]} />
          <meshStandardMaterial color={PALETTE.ground} roughness={0.95} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 0.02, pathCenterZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, pathLength]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.85} />
      </mesh>

      <mesh position={[plazaX, 0.03, plazaZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[13, 32]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.85} />
      </mesh>
    </>
  );
}
