import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { FERRIS, PALETTE } from '../../config/constants';
import { useGame, RIDE_COST } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { RideCameraRig, type RideLook } from './RideCameraRig';

const TAU = Math.PI * 2;

export function FerrisWheel() {
  const wheel = useRef<Group>(null);
  const angle = useRef(0);
  const boardedIndex = useRef(0);
  const seat = useMemo(() => new Vector3(), []);
  const look = useMemo<RideLook>(() => ({ yaw: 0, pitch: 0 }), []);
  const [cx, , cz] = FERRIS.position;

  const gondolas = useMemo(
    () =>
      Array.from({ length: FERRIS.gondolaCount }, (_, i) => ({
        baseAngle: (i / FERRIS.gondolaCount) * TAU,
        color: PALETTE.bulbColors[i % PALETTE.bulbColors.length],
      })),
    [],
  );

  useFrame((_, delta) => {
    angle.current = (angle.current + FERRIS.rotationSpeed * delta) % TAU;
    if (wheel.current) wheel.current.rotation.z = angle.current;

    const a = gondolas[boardedIndex.current].baseAngle + angle.current;
    seat.set(
      cx + Math.cos(a) * FERRIS.radius,
      FERRIS.hubHeight + Math.sin(a) * FERRIS.radius + FERRIS.seatDrop,
      cz + FERRIS.gondolaOffset + FERRIS.seatForward,
    );

    // Hold the whole mela in frame for the entire orbit: aim at its heart and let
    // the climb do the tilting, so the horizon rides up into the top of the frame.
    const dx = FERRIS.lookTarget[0] - seat.x;
    const dz = FERRIS.lookTarget[2] - seat.z;
    look.yaw = Math.atan2(-dx, -dz);
    look.pitch = Math.atan2(FERRIS.lookTarget[1] - seat.y, Math.hypot(dx, dz));
  });

  const board = () => {
    // Board whichever gondola is nearest the bottom of the wheel right now.
    let best = 0;
    let bestY = Infinity;
    gondolas.forEach((g, i) => {
      const y = Math.sin(g.baseAngle + angle.current);
      if (y < bestY) {
        bestY = y;
        best = i;
      }
    });
    boardedIndex.current = best;
    const { coins, showToast, openPanel } = useGame.getState();
    // Check affordability before prompting so a player who can't pay never sees a
    // confirm they can't accept - they get the same refusal toast as before.
    if (coins < RIDE_COST) {
      showToast(`The Ferris wheel costs ${RIDE_COST} coins. Light diyas or win a stall game to earn some.`);
      return;
    }
    openPanel({
      type: 'confirm',
      title: 'Ride the Giant Ferris Wheel',
      body: `This ride costs ${RIDE_COST} coins. You have ${coins}. Do you want to ride?`,
      confirmLabel: 'Yes, ride',
      cancelLabel: 'No',
      onConfirm: () => {
        // Re-check here, not just at prompt time - coins could have been spent elsewhere
        // while the panel was open, and cancelling must never cost anything.
        if (!useGame.getState().spendCoins(RIDE_COST)) {
          useGame.getState().showToast(`You no longer have ${RIDE_COST} coins for the Ferris wheel.`);
          return;
        }
        useGame.getState().enterRide('ferris-wheel');
      },
    });
  };

  return (
    <group position={[cx, 0, cz]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.1, 1.6]} position={[0, 1.1, 0]} />
      </RigidBody>

      {/* Support A-frames */}
      {[-2.4, 2.4].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-1, 1].map((dir) => (
            <mesh
              key={dir}
              position={[dir * 4.2, FERRIS.hubHeight / 2, 0]}
              rotation={[0, 0, (-dir * Math.PI) / 16]}
              castShadow
            >
              <cylinderGeometry args={[0.32, 0.45, FERRIS.hubHeight, 10]} />
              <meshStandardMaterial color="#473a52" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Hub */}
      <mesh position={[0, FERRIS.hubHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 5.6, 14]} />
        <meshStandardMaterial color="#6b5676" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Base platform */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[7.5, 7.5, 0.24, 24]} />
        <meshStandardMaterial color="#3a2f44" roughness={0.9} />
      </mesh>

      {/* Rotating wheel */}
      <group ref={wheel} position={[0, FERRIS.hubHeight, 0]}>
        {[-1.3, 1.3].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[FERRIS.radius, 0.22, 8, 64]} />
            <meshStandardMaterial
              color={PALETTE.gold}
              emissive={PALETTE.warm}
              emissiveIntensity={0.55}
              metalness={0.4}
              roughness={0.4}
            />
          </mesh>
        ))}

        {gondolas.map((g, i) => (
          <group key={i} rotation={[0, 0, g.baseAngle]}>
            {/* Spoke */}
            <mesh position={[FERRIS.radius / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, FERRIS.radius, 6]} />
              <meshStandardMaterial color="#8a7596" metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Gondola, counter-rotated so it hangs level */}
            <group
              position={[FERRIS.radius, 0, FERRIS.gondolaOffset]}
              rotation={[0, 0, -g.baseAngle]}
            >
              <CounterRotated angleRef={angle}>
                <mesh position={[0, -0.95, 0]} castShadow>
                  <boxGeometry args={[1.7, 1.3, 2.0]} />
                  <meshStandardMaterial color={g.color} roughness={0.6} />
                </mesh>
                <mesh position={[0, -0.22, 0]}>
                  <coneGeometry args={[1.35, 0.5, 4]} />
                  <meshStandardMaterial
                    color={g.color}
                    emissive={g.color}
                    emissiveIntensity={0.35}
                    roughness={0.5}
                  />
                </mesh>
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.6, 5]} />
                  <meshStandardMaterial color="#5b4a66" />
                </mesh>
              </CounterRotated>
            </group>
          </group>
        ))}
      </group>

      {/* Boarding pad */}
      <Interactable
        id="ferris-wheel-board"
        position={[0, 1, 4.2]}
        radius={3.6}
        label="Ride the Giant Ferris Wheel"
        onInteract={board}
      />
      <mesh position={[0, 0.26, 4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 24]} />
        <meshStandardMaterial
          color={PALETTE.marigold}
          emissive={PALETTE.marigold}
          emissiveIntensity={0.45}
          roughness={0.7}
        />
      </mesh>

      <pointLight
        position={[0, FERRIS.hubHeight, 3]}
        color={PALETTE.warm}
        intensity={90}
        distance={34}
        decay={2}
      />

      <RideCameraRig
        rideId="ferris-wheel"
        seat={seat}
        look={look}
        duration={FERRIS.rideDuration}
      />
    </group>
  );
}

/** Keeps a gondola level as the wheel turns. */
function CounterRotated({
  angleRef,
  children,
}: {
  angleRef: { current: number };
  children: React.ReactNode;
}) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (g.current) g.current.rotation.z = -angleRef.current;
  });
  return <group ref={g}>{children}</group>;
}
