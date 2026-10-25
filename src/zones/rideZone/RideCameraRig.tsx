import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Euler, type Vector3 } from 'three';
import { useGame } from '../../core/GameState';
import { playerLook } from '../../player/playerRef';
import type { Control } from '../../core/KeyboardMap';

const camEuler = new Euler(0, 0, 0, 'YXZ');
const MAX_PITCH = Math.PI / 2 - 0.05;

/** Camera orientation owned by a ride, mutated in place each frame alongside its seat. */
export interface RideLook {
  yaw: number;
  pitch: number;
}

interface RideCameraRigProps {
  rideId: string;
  /** Seat world position, mutated in place by the ride each frame. */
  seat: Vector3;
  /** Framing chosen by the ride, mutated in place each frame. */
  look: RideLook;
  duration: number;
}

/**
 * Takes over the camera while its ride is active and owns the ride's exit path.
 * The ride dictates both seat and framing; mouse look is ignored for the whole
 * duration (PlayerController stops feeding playerLook while mode is 'riding').
 * Rides subscribe to E themselves because InteractionManager only dispatches
 * interactions while the player is in 'exploring' mode.
 */
export function RideCameraRig({ rideId, seat, look, duration }: RideCameraRigProps) {
  const camera = useThree((s) => s.camera);
  const elapsed = useRef(0);
  const [sub] = useKeyboardControls<Control>();

  const leave = useCallback(() => {
    // Ride framings are steeply tilted; hand back the same heading but level, so
    // the player resumes walking without staring at the sky or their feet.
    playerLook.yaw = look.yaw;
    playerLook.pitch = 0;
    useGame.getState().exitRide();
  }, [look]);

  useEffect(
    () =>
      sub(
        (s) => s.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, activeRide } = useGame.getState();
          // Small grace period so the boarding press doesn't immediately exit.
          if (mode === 'riding' && activeRide === rideId && elapsed.current > 1.2) leave();
        },
      ),
    [sub, rideId, leave],
  );

  useFrame((_, delta) => {
    const { mode, activeRide } = useGame.getState();

    if (mode !== 'riding' || activeRide !== rideId) {
      elapsed.current = 0;
      return;
    }

    elapsed.current += delta;
    camera.position.copy(seat);
    const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.pitch));
    camEuler.set(pitch, look.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);

    if (elapsed.current >= duration) leave();
  });

  return null;
}
