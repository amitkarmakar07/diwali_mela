import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { CAROUSEL, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { RideCameraRig, type RideLook } from './RideCameraRig';

const TAU = Math.PI * 2;
const PLATFORM_HEIGHT = 0.4;
const ROOF_SEGMENTS = 12;
const BULB_COUNT = 16;
const HORSE_COLORS = [
  PALETTE.marigold,
  PALETTE.magenta,
  PALETTE.teal,
  PALETTE.deepRed,
  PALETTE.gold,
  PALETTE.warmBright,
  PALETTE.bulbColors[2],
  PALETTE.bulbColors[4],
];
const ROOF_COLORS = [PALETTE.marigold, PALETTE.magenta, PALETTE.teal, PALETTE.gold];

export function Carousel() {
  const mount = useRef<Group>(null);
  const horseRefs = useRef<(Group | null)[]>([]);
  const angle = useRef(0);
  const boardedIndex = useRef(0);
  const seat = useMemo(() => new Vector3(), []);
  const look = useMemo<RideLook>(() => ({ yaw: 0, pitch: 0 }), []);
  const [cx, , cz] = CAROUSEL.position;

  const horses = useMemo(
    () =>
      Array.from({ length: CAROUSEL.horseCount }, (_, i) => ({
        baseAngle: (i / CAROUSEL.horseCount) * TAU,
        color: HORSE_COLORS[i % HORSE_COLORS.length],
        phase: i * 1.7,
      })),
    [],
  );

  useFrame((state, delta) => {
    angle.current = (angle.current + CAROUSEL.rotationSpeed * delta) % TAU;
    if (mount.current) mount.current.rotation.y = angle.current;

    const t = state.clock.elapsedTime;
    horses.forEach((h, i) => {
      const ref = horseRefs.current[i];
      if (ref)
        ref.position.y =
          CAROUSEL.seatHeight + Math.sin(t * CAROUSEL.bobSpeed + h.phase) * CAROUSEL.bobAmplitude;
    });

    const boarded = horses[boardedIndex.current];
    // rotation.y sweeps +X toward -Z, so a horse authored at baseAngle b ends up at
    // world angle -(b + spin) in (cos, sin) terms. Getting this sign wrong orbits
    // the camera against the horses and parks it inside them.
    const a = -(boarded.baseAngle + angle.current);
    const bob = Math.sin(t * CAROUSEL.bobSpeed + boarded.phase) * CAROUSEL.bobAmplitude;
    seat.set(
      cx + Math.cos(a) * CAROUSEL.horseRadius,
      PLATFORM_HEIGHT + CAROUSEL.seatHeight + CAROUSEL.riderEye + bob,
      cz + Math.sin(a) * CAROUSEL.horseRadius,
    );

    // Horses are modelled facing radially outward, so look straight out along the
    // horse's own axis; the view then sweeps with the platform on its own.
    look.yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
    look.pitch = CAROUSEL.viewPitch;
  });

  const board = () => {
    // Board whichever horse is currently nearest the boarding pad (+Z side).
    let best = 0;
    let bestScore = -Infinity;
    horses.forEach((h, i) => {
      const score = Math.sin(-(h.baseAngle + angle.current));
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    boardedIndex.current = best;
    useGame.getState().enterRide('carousel');
  };

  return (
    <group position={[cx, 0, cz]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[PLATFORM_HEIGHT / 2, CAROUSEL.platformRadius]}
          position={[0, PLATFORM_HEIGHT / 2, 0]}
        />
      </RigidBody>

      <mesh position={[0, PLATFORM_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[CAROUSEL.platformRadius, CAROUSEL.platformRadius, PLATFORM_HEIGHT, 28]} />
        <meshStandardMaterial color="#3a2f44" roughness={0.9} />
      </mesh>

      <group ref={mount} position={[0, PLATFORM_HEIGHT, 0]}>
        {[0, 1, 2, 3].map((seg) => (
          <mesh key={seg} position={[0, (seg + 0.5) * (CAROUSEL.columnHeight / 4), 0]}>
            <cylinderGeometry args={[0.5, 0.5, CAROUSEL.columnHeight / 4, 14]} />
            <meshStandardMaterial
              color={ROOF_COLORS[seg % ROOF_COLORS.length]}
              emissive={ROOF_COLORS[seg % ROOF_COLORS.length]}
              emissiveIntensity={0.18}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        ))}

        {Array.from({ length: ROOF_SEGMENTS }, (_, i) => (
          <mesh key={i} position={[0, CAROUSEL.columnHeight + 1.1, 0]} rotation={[0, (i / ROOF_SEGMENTS) * TAU, 0]}>
            <cylinderGeometry args={[0.1, CAROUSEL.roofRadius, 2.2, 1, 1, false, 0, TAU / ROOF_SEGMENTS]} />
            <meshStandardMaterial color={ROOF_COLORS[i % ROOF_COLORS.length]} roughness={0.5} />
          </mesh>
        ))}

        {Array.from({ length: BULB_COUNT }, (_, i) => {
          const a = (i / BULB_COUNT) * TAU;
          const color = PALETTE.bulbColors[i % PALETTE.bulbColors.length];
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * (CAROUSEL.roofRadius - 0.3),
                CAROUSEL.columnHeight + 0.15,
                Math.sin(a) * (CAROUSEL.roofRadius - 0.3),
              ]}
            >
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
            </mesh>
          );
        })}

        {horses.map((h, i) => (
          <group key={i} rotation={[0, h.baseAngle, 0]}>
            <mesh position={[CAROUSEL.horseRadius, CAROUSEL.columnHeight / 2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, CAROUSEL.columnHeight, 6]} />
              <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.3} />
            </mesh>
            <group
              position={[CAROUSEL.horseRadius, CAROUSEL.seatHeight, 0]}
              ref={(el) => {
                horseRefs.current[i] = el;
              }}
            >
              <Horse color={h.color} />
            </group>
          </group>
        ))}
      </group>

      <Interactable
        id="carousel-board"
        position={[0, 1, CAROUSEL.platformRadius - 1.4]}
        radius={3.5}
        label="Ride the Horse Carousel"
        onInteract={board}
      />

      <pointLight
        position={[0, CAROUSEL.columnHeight + 1, 0]}
        color={PALETTE.warm}
        intensity={70}
        distance={26}
        decay={2}
      />

      <RideCameraRig rideId="carousel" seat={seat} look={look} duration={CAROUSEL.rideDuration} />
    </group>
  );
}

function Horse({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.85, 0.42, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.5, 0.28, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.1, 0.14, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.72, 0.52, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.28, 0.16, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[sx * 0.3, -0.42, sz * 0.11]}>
            <cylinderGeometry args={[0.045, 0.045, 0.55, 6]} />
            <meshStandardMaterial color="#e8e4d8" roughness={0.7} />
          </mesh>
        )),
      )}
      <mesh position={[-0.48, -0.1, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.1, 0.4, 6]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.26]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
