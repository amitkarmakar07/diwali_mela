import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { WORLD } from '../config/constants';

const THICKNESS = 1;

export function Boundaries() {
  const { minX, maxX, minZ, maxZ, wallHeight } = WORLD;
  const halfHeight = wallHeight / 2;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        args={[width / 2, halfHeight, THICKNESS / 2]}
        position={[centerX, halfHeight, minZ]}
      />
      <CuboidCollider
        args={[width / 2, halfHeight, THICKNESS / 2]}
        position={[centerX, halfHeight, maxZ]}
      />
      <CuboidCollider
        args={[THICKNESS / 2, halfHeight, depth / 2]}
        position={[minX, halfHeight, centerZ]}
      />
      <CuboidCollider
        args={[THICKNESS / 2, halfHeight, depth / 2]}
        position={[maxX, halfHeight, centerZ]}
      />
    </RigidBody>
  );
}
