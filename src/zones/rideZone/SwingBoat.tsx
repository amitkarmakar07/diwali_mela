import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { PALETTE, SWING_BOAT } from '../../config/constants';
import { useGame, RIDE_COST } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { clearLocalSeat, registerSeats, setLocalSeat } from '../../net/rideSeats';
import { RideCameraRig, type RideLook } from './RideCameraRig';

const TAU = Math.PI * 2;
const TOWER_OFFSET = 2.6;
const LEG_SPREAD = 1.5;
const LEG_TILT = Math.PI / 13;
const HULL_LENGTH = 3.2;
const HULL_WIDTH = 1.5;
const HULL_WALL = 1.2;
const TIMBER = '#b9834f';
const TIMBER_DARK = '#8a6038';
const BOAT_BULB_COUNT = 6;
/**
 * It is one boat, so "seats" are places along the hull's length (+X), spread over the
 * plank run. The ride camera sits a touch ahead of seat 2 to keep the swing arm out of
 * frame, which is near enough that friends read as sitting alongside us.
 */
const SEAT_OFFSETS = [-1.2, -0.4, 0.4, 1.2];
const LOCAL_SEAT = 2;

export function SwingBoat() {
  const swingGroup = useRef<Group>(null);
  const seat = useMemo(() => new Vector3(), []);
  const look = useMemo<RideLook>(() => ({ yaw: 0, pitch: 0 }), []);
  const [cx, , cz] = SWING_BOAT.position;
  // Swing angle kept on a ref so a seat can be placed on the hull outside useFrame.
  const swingAngle = useRef(0);

  /**
   * Writes the world position of a seat `alongHull` metres down the boat into `out`.
   * The hull pivots about X, so height and depth come from the swing angle alone and are
   * shared by every seat - which is what lets a friend inherit OUR hull's current tilt.
   */
  const hullSeat = useCallback(
    (alongHull: number, out: Vector3) => {
      const armDist = SWING_BOAT.armLength - SWING_BOAT.seatHeight;
      out.set(
        cx + alongHull,
        SWING_BOAT.pivotHeight - armDist * Math.cos(swingAngle.current),
        cz - armDist * Math.sin(swingAngle.current),
      );
    },
    [cx, cz],
  );

  useFrame((state) => {
    // Bounded pendulum oscillation: a pure function of elapsed time, no accumulator needed.
    const t = state.clock.elapsedTime;
    const angle = SWING_BOAT.maxAngle * Math.sin((TAU * t) / SWING_BOAT.period);
    swingAngle.current = angle;
    if (swingGroup.current) swingGroup.current.rotation.x = angle;

    hullSeat(SWING_BOAT.seatForward, seat);

    // Seated looking along the hull; tilt further skyward the nearer either apex,
    // which is the point of this ride - deck and A-frame below, sky above.
    look.yaw = SWING_BOAT.viewYaw;
    look.pitch = SWING_BOAT.viewPitch + Math.abs(angle) * SWING_BOAT.skyTilt;
  });

  useEffect(
    () =>
      registerSeats('swing-boat', SEAT_OFFSETS.length, (index, out) => {
        if (index < 0 || index >= SEAT_OFFSETS.length) return null;
        hullSeat(SEAT_OFFSETS[index], out);
        // Everyone aboard faces the same way: along the boat, toward the mela.
        return SWING_BOAT.viewYaw;
      }),
    [hullSeat],
  );

  // The exit paths all sit outside this file - RideCameraRig's E key and its timer, and
  // the HUD's leave button - so watch the store rather than duplicating them: losing the
  // active ride means we are out of the boat.
  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (prev.activeRide === 'swing-boat' && state.activeRide !== 'swing-boat') clearLocalSeat();
      }),
    [],
  );

  const board = () => {
    const { coins, openPanel } = useGame.getState();
    // A panel rather than a toast: the toast strip runs under the HUD bar, which was
    // clipping this message mid-sentence.
    if (coins < RIDE_COST) {
      openPanel({
        type: 'info',
        title: 'Not enough coins',
        body: `The swing boat costs ${RIDE_COST} coins and you have ${coins}. Light diyas, set off crackers or win a stall game to earn more.`,
      });
      return;
    }
    openPanel({
      type: 'confirm',
      title: 'Ride the Swing Boat',
      body: `This ride costs ${RIDE_COST} coins. You have ${coins}. Do you want to ride?`,
      confirmLabel: 'Yes, ride',
      cancelLabel: 'No',
      onConfirm: () => {
        // Re-check at confirm time, not the earlier check, so cancelling never spends.
        if (!useGame.getState().spendCoins(RIDE_COST)) {
          useGame.getState().showToast(`You no longer have ${RIDE_COST} coins for the swing boat.`);
          return;
        }
        // Published only once the fare is paid, so cancelling or a failed spend never
        // leaves us broadcasting a seat we never took.
        setLocalSeat('swing-boat', LOCAL_SEAT);
        useGame.getState().enterRide('swing-boat');
      },
    });
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

      {/* Prominent teal/turquoise A-frame legs splaying outward - the ride's signature colour. */}
      {[-TOWER_OFFSET, TOWER_OFFSET].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((dir) => (
            <mesh key={dir} position={[0, SWING_BOAT.pivotHeight / 2, dir * LEG_SPREAD]} rotation={[dir * -LEG_TILT, 0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.3, SWING_BOAT.pivotHeight, 8]} />
              <meshStandardMaterial color={PALETTE.teal} metalness={0.4} roughness={0.45} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[0, SWING_BOAT.pivotHeight, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, TOWER_OFFSET * 2 + 0.6, 10]} />
        <meshStandardMaterial color={PALETTE.teal} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Small warm bulbs along the crossbeam - the ride zone reads dark here, this is free light via emissive. */}
      {Array.from({ length: BOAT_BULB_COUNT }, (_, i) => {
        const x = -TOWER_OFFSET + (i / (BOAT_BULB_COUNT - 1)) * TOWER_OFFSET * 2;
        const color = PALETTE.bulbColors[i % PALETTE.bulbColors.length];
        return (
          <mesh key={i} position={[x, SWING_BOAT.pivotHeight - 0.3, 0]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
          </mesh>
        );
      })}

      <group ref={swingGroup} position={[0, SWING_BOAT.pivotHeight, 0]}>
        <mesh position={[0, -SWING_BOAT.armLength / 2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, SWING_BOAT.armLength, 6]} />
          <meshStandardMaterial color="#8a7596" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Boat group origin sits at the keel, armLength below the pivot. */}
        <group position={[0, -SWING_BOAT.armLength, 0]}>
          {/* Warm tan timber hull. */}
          <mesh position={[0, HULL_WALL / 2, 0]} castShadow>
            <boxGeometry args={[HULL_LENGTH, HULL_WALL, HULL_WIDTH]} />
            <meshStandardMaterial color={TIMBER} roughness={0.7} />
          </mesh>
          {/* Stepped/ridged deck - rows of planks across the hull. */}
          {[-1.1, -0.55, 0, 0.55, 1.1].map((bx, i) => (
            <mesh key={bx} position={[bx, HULL_WALL + 0.03, 0]}>
              <boxGeometry args={[0.3, 0.1, HULL_WIDTH - 0.1]} />
              <meshStandardMaterial color={i % 2 === 0 ? TIMBER : TIMBER_DARK} roughness={0.75} />
            </mesh>
          ))}
          {/* Deep red/maroon bow and stern trim. */}
          <mesh position={[HULL_LENGTH / 2 - 0.2, HULL_WALL + 0.15, 0]}>
            <coneGeometry args={[0.35, 0.6, 4]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.5} />
          </mesh>
          <mesh position={[-HULL_LENGTH / 2 + 0.2, HULL_WALL + 0.1, 0]}>
            <coneGeometry args={[0.3, 0.45, 4]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.5} />
          </mesh>
          {/* Maroon gunwale trim along both top edges of the hull. */}
          <mesh position={[0, HULL_WALL - 0.1, HULL_WIDTH / 2 + 0.02]}>
            <boxGeometry args={[HULL_LENGTH - 0.3, 0.18, 0.08]} />
            <meshStandardMaterial
              color={PALETTE.deepRed}
              emissive={PALETTE.deepRed}
              emissiveIntensity={0.15}
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0, HULL_WALL - 0.1, -HULL_WIDTH / 2 - 0.02]}>
            <boxGeometry args={[HULL_LENGTH - 0.3, 0.18, 0.08]} />
            <meshStandardMaterial
              color={PALETTE.deepRed}
              emissive={PALETTE.deepRed}
              emissiveIntensity={0.15}
              roughness={0.6}
            />
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
        intensity={90}
        distance={30}
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
