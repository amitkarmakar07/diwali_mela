import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Euler, Vector3 } from 'three';
import { FUN_ZONE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { playerLook } from '../../player/playerRef';
import type { Control } from '../../core/KeyboardMap';

const camEuler = new Euler(0, 0, 0, 'YXZ');
const aimEuler = new Euler(0, 0, 0, 'YXZ');
const aimOrigin = new Vector3();
const aimDir = new Vector3();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface MiniGameRigProps {
  gameId: string;
  /** World eye position the view locks to while this game runs. */
  stand: [number, number, number];
  /** Starting aim. Games whose targets sit above eye level set their own. */
  aimPitch?: number;
  onStart: () => void;
  onReset: () => void;
  onFrame: (delta: number, elapsed: number) => void;
  onFire: (origin: Vector3, dir: Vector3) => void;
}

/**
 * Camera and input takeover for one booth game. Mini-games subscribe to E and the
 * throw keys themselves because InteractionManager only dispatches while the player
 * is in 'exploring' mode — same arrangement as RideCameraRig.
 */
export function MiniGameRig({
  gameId,
  stand,
  aimPitch = 0.02,
  onStart,
  onReset,
  onFrame,
  onFire,
}: MiniGameRigProps) {
  const camera = useThree((s) => s.camera);
  const [sub] = useKeyboardControls<Control>();
  const active = useRef(false);
  const elapsed = useRef(0);

  const handlers = useRef({ onStart, onReset, onFrame, onFire });
  handlers.current = { onStart, onReset, onFrame, onFire };

  const fire = useRef<() => void>(() => {});
  fire.current = () => {
    if (!active.current) return;
    const { mode, activeGame } = useGame.getState();
    if (mode !== 'minigame' || activeGame !== gameId) return;
    aimOrigin.set(stand[0], stand[1], stand[2]);
    aimDir.set(0, 0, -1).applyEuler(aimEuler.set(playerLook.pitch, playerLook.yaw, 0));
    handlers.current.onFire(aimOrigin, aimDir);
  };

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      fire.current();
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(
    () =>
      sub(
        (s) => s.jump,
        (pressed) => {
          if (pressed) fire.current();
        },
      ),
    [sub],
  );

  useEffect(
    () =>
      sub(
        (s) => s.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, activeGame, exitGame } = useGame.getState();
          if (mode !== 'minigame' || activeGame !== gameId) return;
          if (elapsed.current > FUN_ZONE.exitGrace) exitGame();
        },
      ),
    [sub, gameId],
  );

  useFrame((_, rawDelta) => {
    const { mode, activeGame } = useGame.getState();

    if (activeGame !== gameId) {
      if (active.current) {
        active.current = false;
        handlers.current.onReset();
      }
      return;
    }

    if (!active.current) {
      active.current = true;
      elapsed.current = 0;
      playerLook.yaw = 0;
      playerLook.pitch = aimPitch;
      handlers.current.onStart();
    }

    if (mode !== 'minigame') return;

    playerLook.yaw = clamp(playerLook.yaw, -FUN_ZONE.yawLimit, FUN_ZONE.yawLimit);
    playerLook.pitch = clamp(playerLook.pitch, FUN_ZONE.pitchMin, FUN_ZONE.pitchMax);

    camera.position.set(stand[0], stand[1], stand[2]);
    camEuler.set(playerLook.pitch, playerLook.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);

    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    handlers.current.onFrame(delta, elapsed.current);
  });

  return null;
}
