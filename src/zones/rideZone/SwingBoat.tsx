import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { PALETTE, SWING_BOAT } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { RideCameraRig, type RideLook } from './RideCameraRig';

const TAU = Math.PI * 2;
const TOWER_OFFSET = 2.6;
const LEG_SPREAD = 1.5;
const LEG_TILT = Math.PI / 13;
const HULL_LENGTH = 3.2;
const HULL_WIDTH = 1.5;
const HULL_WALL = 1.2;

export function SwingBoat() {
  const swingGroup = useRef<Group>(null);
  const seat = useMemo(() => new Vector3(), []);
  const look = useMemo<RideLook>(() => ({ yaw: 0, pitch: 0 }), []);
  const [cx, , cz] = SWING_BOAT.position;

  useFrame((state) => {
    // Bounded pendulum oscillation: a pure function of elapsed time, no accumulator needed.
    const t = state.clock.elapsedTime;
    const angle = SWING_BOAT.maxAngle * Math.sin((TAU * t) / SWING_BOAT.period);
    if (swingGroup.current) swingGroup.current.rotation.x = angle;

    const armDist = SWING_BOAT.armLength - SWING_BOAT.seatHeight;
    seat.set(
      cx + SWING_BOAT.seatForward,
      SWING_BOAT.pivotHeight - armDist * Math.cos(angle),
      cz - armDist * Math.sin(angle),
    );

    // Seated looking along the hull; tilt further skyward the nearer either apex,
    // which is the point of this ride - deck and A-frame below, sky above.
    look.yaw = SWING_BOAT.viewYaw;
    look.pitch = SWING_BOAT.viewPitch + Math.abs(angle) * SWING_BOAT.skyTilt;
  });

  const board = () => {
    useGame.getState().enterRide('swing-boat');
  };

  return (
    <group position={[cx, 0, cz]}>
      <RigidBody type="fixed" colliders={false}>
        {[-TOWER_OFFSET, TOWER_OFFSET].map((x) =>
          [-1, 1].map((dir) => (
            <CuboidCollider
              key={`${x}-${dir}`}
              args={[0.22, SWING_BOAT.pivotHeight / 2, 0.22]}
              position={[x, SWING_BOAT.pivotHeight / 2, dir * LEG_SPREAD]}
              rotation={[dir * -LEG_TILT, 0, 0]}
            />
          )),
        )}
      </RigidBody>

      {[-TOWER_OFFSET, TOWER_OFFSET].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((dir) => (
            <mesh key={dir} position={[0, SWING_BOAT.pivotHeight / 2, dir * LEG_SPREAD]} rotation={[dir * -LEG_TILT, 0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.3, SWING_BOAT.pivotHeight, 8]} />
              <meshStandardMaterial color="#473a52" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[0, SWING_BOAT.pivotHeight, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, TOWER_OFFSET * 2 + 0.6, 10]} />
        <meshStandardMaterial color="#6b5676" metalness={0.6} roughness={0.4} />
      </mesh>

      <group ref={swingGroup} position={[0, SWING_BOAT.pivotHeight, 0]}>
        <mesh position={[0, -SWING_BOAT.armLength / 2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, SWING_BOAT.armLength, 6]} />
          <meshStandardMaterial color="#8a7596" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Boat group origin sits at the keel, armLength below the pivot. */}
        <group position={[0, -SWING_BOAT.armLength, 0]}>
          <mesh position={[0, HULL_WALL / 2, 0]} castShadow>
            <boxGeometry args={[HULL_LENGTH, HULL_WALL, HULL_WIDTH]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.6} />
          </mesh>
          <mesh position={[HULL_LENGTH / 2 - 0.2, HULL_WALL + 0.15, 0]}>
            <coneGeometry args={[0.35, 0.6, 4]} />
            <meshStandardMaterial color={PALETTE.marigold} roughness={0.5} />
          </mesh>
          <mesh position={[-HULL_LENGTH / 2 + 0.2, HULL_WALL + 0.1, 0]}>
            <coneGeometry args={[0.3, 0.45, 4]} />
            <meshStandardMaterial color={PALETTE.marigold} roughness={0.5} />
          </mesh>
          {[-0.8, 0, 0.8].map((bx) => (
            <mesh key={bx} position={[bx, 0.45, 0]}>
              <boxGeometry args={[0.4, 0.14, HULL_WIDTH - 0.3]} />
              <meshStandardMaterial color="#5b4a66" roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, HULL_WALL - 0.15, HULL_WIDTH / 2 + 0.02]}>
            <boxGeometry args={[HULL_LENGTH - 0.3, 0.3, 0.06]} />
            <meshStandardMaterial color={PALETTE.teal} emissive={PALETTE.teal} emissiveIntensity={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0, HULL_WALL - 0.15, -HULL_WIDTH / 2 - 0.02]}>
            <boxGeometry args={[HULL_LENGTH - 0.3, 0.3, 0.06]} />
            <meshStandardMaterial color={PALETTE.magenta} emissive={PALETTE.magenta} emissiveIntensity={0.3} roughness={0.6} />
          </mesh>
        </group>
      </group>

      <group position={[TOWER_OFFSET + 1.6, 0, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.8, 1.2, 0.8]} />
          <meshStandardMaterial color="#3a2f44" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.9, 0.1, 0.9]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.3} />
        </mesh>
      </group>

      <Interactable
        id="swing-boat-board"
        position={[TOWER_OFFSET + 1.6, 1, -1.6]}
        radius={3.2}
        label="Ride the Swing Boat"
        onInteract={board}
      />

      <pointLight
        position={[0, SWING_BOAT.pivotHeight * 0.6, 0]}
        color={PALETTE.warm}
        intensity={60}
        distance={24}
        decay={2}
      />

      <RideCameraRig
        rideId="swing-boat"
        seat={seat}
        look={look}
        duration={SWING_BOAT.rideDuration}
      />
    </group>
  );
}
