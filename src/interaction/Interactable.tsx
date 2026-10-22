import { useEffect, useRef, type ReactNode } from 'react';
import { Group, Vector3 } from 'three';
import { INTERACT_RADIUS } from '../config/constants';

export interface InteractableEntry {
  id: string;
  position: Vector3;
  radius: number;
  label: string;
  enabled: boolean;
  onInteract: () => void;
}

/** Module-level registry; read by InteractionManager each frame. */
export const interactables = new Map<string, InteractableEntry>();

interface InteractableProps {
  id: string;
  position: [number, number, number];
  label: string;
  onInteract: () => void;
  radius?: number;
  enabled?: boolean;
  children?: ReactNode;
}

export function Interactable({
  id,
  position,
  label,
  onInteract,
  radius = INTERACT_RADIUS,
  enabled = true,
  children,
}: InteractableProps) {
  const anchor = useRef<Group>(null);
  const handler = useRef(onInteract);
  handler.current = onInteract;

  useEffect(() => {
    const world = new Vector3(...position);
    // Zones place hotspots in their own local space, so resolve the anchor's
    // world transform instead of trusting the raw prop.
    if (anchor.current) {
      anchor.current.updateWorldMatrix(true, false);
      anchor.current.getWorldPosition(world);
    }

    const entry: InteractableEntry = {
      id,
      position: world,
      radius,
      label,
      enabled,
      onInteract: () => handler.current(),
    };
    interactables.set(id, entry);
    return () => {
      interactables.delete(id);
    };
  }, [id, position[0], position[1], position[2], radius, label, enabled]);

  return (
    <group ref={anchor} position={position}>
      {children}
    </group>
  );
}
