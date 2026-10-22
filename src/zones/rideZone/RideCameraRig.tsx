import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Euler, type Vector3 } from 'three';
import { useGame } from '../../core/GameState';
import { playerLook } from '../../player/playerRef';
import type { Control } from '../../core/KeyboardMap';

const camEuler = new Euler(0, 0, 0, 'YXZ');

interface RideCameraRigProps {
  rideId: string;
  /** Seat world position, mutated in place by the ride each frame. */
  seat: Vector3;
  duration: number;
}

/**
 * Takes over the camera while its ride is active and owns the ride's exit path.
 * Rides subscribe to E themselves because InteractionManager only dispatches
 * interactions while the player is in 'exploring' mode.
 */
export function RideCameraRig({ rideId, seat, duration }: RideCameraRigProps) {
  const camera = useThree((s) => s.camera);
  const elapsed = useRef(0);
  const [sub] = useKeyboardControls<Control>();

  useEffect(
    () =>
      sub(
        (s) => s.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, activeRide, exitRide } = useGame.getState();
          // Small grace period so the boarding press doesn't immediately exit.
          if (mode === 'riding' && activeRide === rideId && elapsed.current > 1.2) exitRide();
        },
      ),
    [sub, rideId],
  );

  useFrame((_, delta) => {
    const { mode, activeRide, exitRide } = useGame.getState();
    const active = mode === 'riding' && activeRide === rideId;

    if (!active) {
      elapsed.current = 0;
      return;
    }

    elapsed.current += delta;
    camera.position.copy(seat);
    camEuler.set(playerLook.pitch, playerLook.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);

    if (elapsed.current >= duration) exitRide();
  });

  return null;
}
