import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Euler, type Vector3 } from 'three';
import { useGame } from '../../core/GameState';
import { playerLook } from '../../player/playerRef';
import type { Control } from '../../core/KeyboardMap';

const camEuler = new Euler(0, 0, 0, 'YXZ');

interface CulturalStageCameraRigProps {
  rideId: string;
  /** Static seat eye position in world space. */
  seat: Vector3;
  /** Yaw to face on sitting down, so the player looks at the stage rather than wherever they walked in from. */
  facingYaw: number;
  duration: number;
}

/**
 * Camera takeover for watching the performance, following the RideCameraRig pattern
 * exactly (seat + exit grace + auto-return). The one addition is snapping the player's
 * look to the stage on sitting down, since unlike a gondola a bench doesn't orient the rider.
 */
export function CulturalStageCameraRig({ rideId, seat, facingYaw, duration }: CulturalStageCameraRigProps) {
  const camera = useThree((s) => s.camera);
  const elapsed = useRef(0);
  const wasActive = useRef(false);
  const [sub] = useKeyboardControls<Control>();

  useEffect(
    () =>
      sub(
        (s) => s.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, activeRide, exitRide } = useGame.getState();
          if (mode === 'riding' && activeRide === rideId && elapsed.current > 0.6) exitRide();
        },
      ),
    [sub, rideId],
  );

  useFrame((_, delta) => {
    const { mode, activeRide, exitRide } = useGame.getState();
    const active = mode === 'riding' && activeRide === rideId;

    if (!active) {
      elapsed.current = 0;
      wasActive.current = false;
      return;
    }

    if (!wasActive.current) {
      wasActive.current = true;
      playerLook.yaw = facingYaw;
      playerLook.pitch = 0.08;
    }

    elapsed.current += delta;
    camera.position.copy(seat);
    camEuler.set(playerLook.pitch, playerLook.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);

    if (elapsed.current >= duration) exitRide();
  });

  return null;
}
