import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { CAROUSEL, PALETTE } from '../../config/constants';
import { useGame, RIDE_COST } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { RideCameraRig, type RideLook } from './RideCameraRig';

const TAU = Math.PI * 2;
// Layered deck: a darker skirt below a deep pink/magenta cap (reference: Ghode Wala Jhoola).
const SKIRT_HEIGHT = 0.5;
const DECK_HEIGHT = 0.14;
const PLATFORM_HEIGHT = SKIRT_HEIGHT + DECK_HEIGHT;
const BULB_COUNT = 16;
const RING_COLORS = [PALETTE.marigold, PALETTE.teal, PALETTE.gold];
const BODY_COLORS = ['#f2ead6', '#8a5a34']; // alternating cream/white and tan/brown
const SADDLE_COLORS = [PALETTE.magenta, PALETTE.teal, PALETTE.marigold, PALETTE.gold];
// Pole runs from the deck up into the canopy, not stopping at the roofline.
const POLE_HEIGHT = CAROUSEL.columnHeight + 0.6;
const SIGN_RADIUS = 2.1;
const SIGN_POLE_HEIGHT = CAROUSEL.columnHeight + CAROUSEL.canopyHeight + 0.5;

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
        color: BODY_COLORS[i % BODY_COLORS.length],
        saddleColor: SADDLE_COLORS[i % SADDLE_COLORS.length],
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
    const { coins, openPanel } = useGame.getState();
    // Affordability gate happens before the prompt, same as the other rides, so an
    // unaffordable ride never shows a confirm the player can't accept. A panel rather
    // than a toast — the toast strip sits under the HUD bar and was clipping this.
    if (coins < RIDE_COST) {
      openPanel({
        type: 'info',
        title: 'Not enough coins',
        body: `The carousel costs ${RIDE_COST} coins and you have ${coins}. Light diyas, set off crackers or win a stall game to earn more.`,
      });
      return;
    }
    openPanel({
      type: 'confirm',
      title: 'Ride the Horse Carousel',
      body: `This ride costs ${RIDE_COST} coins. You have ${coins}. Do you want to ride?`,
      confirmLabel: 'Yes, ride',
      cancelLabel: 'No',
      onConfirm: () => {
        // boardedIndex was already picked above; that only steers the camera's seat
        // tracking and is harmless to settle early, cancelled or not. Re-check the
        // spend here so cancelling costs nothing.
        if (!useGame.getState().spendCoins(RIDE_COST)) {
          useGame.getState().showToast(`You no longer have ${RIDE_COST} coins for the carousel.`);
          return;
        }
        useGame.getState().enterRide('carousel');
      },
    });
  };

  return (
    <group position={[cx, 0, cz]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[PLATFORM_HEIGHT / 2, CAROUSEL.platformRadius]}
          position={[0, PLATFORM_HEIGHT / 2, 0]}
        />
      </RigidBody>

      {/* Darker skirt below the deck. */}
      <mesh position={[0, SKIRT_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[CAROUSEL.platformRadius * 0.92, CAROUSEL.platformRadius, SKIRT_HEIGHT, 28]} />
        <meshStandardMaterial color="#241c2e" roughness={0.9} />
      </mesh>
      {/* Deep pink/magenta deck cap. */}
      <mesh position={[0, SKIRT_HEIGHT + DECK_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[CAROUSEL.platformRadius, CAROUSEL.platformRadius, DECK_HEIGHT, 28]} />
        <meshStandardMaterial color={PALETTE.magenta} roughness={0.7} />
      </mesh>

      <group ref={mount} position={[0, PLATFORM_HEIGHT, 0]}>
        {/* Single solid brass support column, with festive accent rings. */}
        <mesh position={[0, CAROUSEL.columnHeight / 2, 0]}>
          <cylinderGeometry args={[0.42, 0.42, CAROUSEL.columnHeight, 14]} />
          <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.3} />
        </mesh>
        {[0.33, 0.66].map((frac, i) => (
          <mesh key={frac} position={[0, CAROUSEL.columnHeight * frac, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.46, 0.07, 8, 16]} />
            <meshStandardMaterial
              color={RING_COLORS[i % RING_COLORS.length]}
              emissive={RING_COLORS[i % RING_COLORS.length]}
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
        ))}

        {/* Wide, shallow conical canopy - clearly wider than the platform. */}
        <mesh position={[0, CAROUSEL.columnHeight + CAROUSEL.canopyHeight / 2, 0]}>
          <coneGeometry args={[CAROUSEL.roofRadius, CAROUSEL.canopyHeight, 20]} />
          <meshStandardMaterial color={PALETTE.marigold} roughness={0.55} />
        </mesh>

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
            <mesh position={[CAROUSEL.horseRadius, POLE_HEIGHT / 2, 0]}>
              <cylinderGeometry args={[0.07, 0.07, POLE_HEIGHT, 6]} />
              <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.3} />
            </mesh>
            <group
              position={[CAROUSEL.horseRadius, CAROUSEL.seatHeight, 0]}
              ref={(el) => {
                horseRefs.current[i] = el;
              }}
            >
              <Horse color={h.color} saddleColor={h.saddleColor} />
            </group>
          </group>
        ))}
      </group>

      {/* Arched signboard above the canopy, fixed (does not spin with the ride). */}
      <group position={[0, SIGN_POLE_HEIGHT, 0]}>
        {[-1, 1].map((dir) => (
          <mesh key={dir} position={[dir * SIGN_RADIUS, 0.7, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#c9a24b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.4, 0]}>
          <torusGeometry args={[SIGN_RADIUS, 0.12, 8, 20, Math.PI]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
        <Text
          position={[0, 1.4, 0.2]}
          font="/fonts/Mukta-Bold.ttf"
          fontSize={0.42}
          color={PALETTE.warmBright}
          anchorX="center"
          anchorY="middle"
          maxWidth={SIGN_RADIUS * 1.8}
        >
          Ghode Wala Jhoola
        </Text>
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

function Horse({ color, saddleColor }: { color: string; saddleColor: string }) {
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
      {/* Pointed ear/mane crest. */}
      <mesh position={[-0.48, -0.1, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.1, 0.4, 6]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.8} />
      </mesh>
      {/* Coloured saddle blanket. */}
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.26]} />
        <meshStandardMaterial color={saddleColor} emissive={saddleColor} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
