import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { useGame } from '../core/GameState';
import { playerPosition } from '../player/playerRef';
import { interactables } from './Interactable';
import type { Control } from '../core/KeyboardMap';

/**
 * Single instance, mounted in App. Finds the nearest interactable to the player each
 * frame and dispatches E presses to it. All zones rely on this; they must not add
 * their own key listeners.
 */
export function InteractionManager() {
  const [sub] = useKeyboardControls<Control>();

  useFrame(() => {
    const { mode, nearestId, setNearest } = useGame.getState();
    if (mode !== 'exploring') {
      if (nearestId !== null) setNearest(null, null);
      return;
    }

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

    if (bestId !== nearestId) setNearest(bestId, bestLabel);
  });

  useEffect(
    () =>
      sub(
        (state) => state.interact,
        (pressed) => {
          if (!pressed) return;
          const { mode, nearestId } = useGame.getState();
          if (mode !== 'exploring' || !nearestId) return;
          interactables.get(nearestId)?.onInteract();
        },
      ),
    [sub],
  );

  return null;
}
