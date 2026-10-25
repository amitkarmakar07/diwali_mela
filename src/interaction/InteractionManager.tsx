import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { useGame, msSinceModeTransition } from '../core/GameState';
import { playerPosition } from '../player/playerRef';
import { interactables } from './Interactable';
import type { Control } from '../core/KeyboardMap';

/**
 * Single instance, mounted in App. Finds the nearest interactable to the player each
 * frame and dispatches E presses to it. All zones rely on this; they must not add
 * their own key listeners.
 */
function findNearest() {
  let bestId: string | null = null;
  let bestLabel: string | null = null;
  let bestDist = Infinity;

  for (const entry of interactables.values()) {
    if (!entry.enabled) continue;
    const dist = entry.position.distanceTo(playerPosition);
    if (dist <= entry.radius && dist < bestDist) {
      bestDist = dist;
      bestId = entry.id;
      bestLabel = entry.label;
    }
  }

  return { bestId, bestLabel };
}

export function InteractionManager() {
  const [sub] = useKeyboardControls<Control>();

  useFrame(() => {
    const { mode, nearestId, setNearest } = useGame.getState();
    if (mode !== 'exploring') {
      if (nearestId !== null) setNearest(null, null);
      return;
    }

    const { bestId, bestLabel } = findNearest();
    if (bestId !== nearestId) setNearest(bestId, bestLabel);
  });

  useEffect(
    () =>
      sub(
        (state) => state.interact,
        (pressed) => {
          if (!pressed) return;
          if (useGame.getState().mode !== 'exploring') return;
          // A ride or game that just released the camera did so on THIS key event, so
          // acting now would re-enter whatever the player is standing on.
          if (msSinceModeTransition() < 250) return;
          // Resolve the target on the keypress rather than trusting the id the last
          // frame cached. Key events arrive between frames, so on a slow frame the
          // cached id lags the player and the press gets dropped — which reads as
          // "E does nothing, then works a moment later".
          const { bestId } = findNearest();
          if (bestId) interactables.get(bestId)?.onInteract();
        },
      ),
    [sub],
  );

  return null;
}
