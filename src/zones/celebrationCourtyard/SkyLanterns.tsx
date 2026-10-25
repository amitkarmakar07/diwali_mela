import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { SKY_LANTERNS, PALETTE } from '../../config/constants';
import { Interactable } from '../../interaction/Interactable';

interface Slot {
  alive: boolean;
  life: number;
  driftPhase: number;
  driftSpeed: number;
}

interface SkyLanternsProps {
  releasePosition: [number, number, number];
}

/**
 * A small fixed-size pool of lanterns (no particle system needed — there are at most
 * SKY_LANTERNS.maxAloft of them). Each rises and drifts via useFrame, then is recycled
 * rather than ever accumulating.
 */
export function SkyLanterns({ releasePosition }: SkyLanternsProps) {
  const groupRefs = useRef<Array<Group | null>>([]);
  const slots = useRef<Slot[]>(
    Array.from({ length: SKY_LANTERNS.maxAloft }, () => ({
      alive: false,
      life: 0,
      driftPhase: 0,
      driftSpeed: 0,
    })),
  );
  const cooldownRef = useRef(0);

  const handleRelease = () => {
    if (cooldownRef.current > 0) return;
    const idx = slots.current.findIndex((s) => !s.alive);
    if (idx === -1) return;
    cooldownRef.current = SKY_LANTERNS.releaseCooldown;

    const slot = slots.current[idx];
    slot.alive = true;
    slot.life = SKY_LANTERNS.lifespan;
    slot.driftPhase = Math.random() * Math.PI * 2;
    slot.driftSpeed = 0.5 + Math.random() * 0.4;

    const group = groupRefs.current[idx];
    if (group) {
      group.position.set(
        releasePosition[0] + (Math.random() - 0.5) * 0.6,
        0.4,
        releasePosition[2] + (Math.random() - 0.5) * 0.6,
      );
      group.visible = true;
    }
  };

  useFrame((_, delta) => {
    if (cooldownRef.current > 0) cooldownRef.current -= delta;

    for (let i = 0; i < slots.current.length; i++) {
      const slot = slots.current[i];
      if (!slot.alive) continue;
      const group = groupRefs.current[i];
      if (!group) continue;

      slot.life -= delta;
      if (slot.life <= 0) {
        slot.alive = false;
        group.visible = false;
        continue;
      }

      slot.driftPhase += delta * slot.driftSpeed;
      group.position.y += SKY_LANTERNS.riseSpeed * delta;
      group.position.x += Math.sin(slot.driftPhase) * SKY_LANTERNS.driftAmount * delta;
      group.position.z += Math.cos(slot.driftPhase * 0.7) * SKY_LANTERNS.driftAmount * delta;

      const fadeStart = SKY_LANTERNS.lifespan * 0.15;
      const scale = slot.life < fadeStart ? Math.max(slot.life / fadeStart, 0.01) : 1;
      group.scale.setScalar(scale);
    }
  });

  const slotIndices = useMemo(
    () => Array.from({ length: SKY_LANTERNS.maxAloft }, (_, i) => i),
    [],
  );

  return (
    <>
      <Interactable
        id="sky-lantern-release"
        position={releasePosition}
        radius={2.5}
        label="Release a Sky Lantern"
        onInteract={handleRelease}
      />
      {slotIndices.map((i) => (
        <group
          key={i}
          ref={(g) => {
            groupRefs.current[i] = g;
          }}
          visible={false}
        >
          <mesh>
            <cylinderGeometry args={[0.18, 0.22, 0.36, 8]} />
            <meshStandardMaterial
              color={PALETTE.marigold}
              emissive={PALETTE.warm}
              emissiveIntensity={1.4}
              roughness={0.6}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.1, 0.12, 8]} />
            <meshStandardMaterial
              color={PALETTE.gold}
              emissive={PALETTE.gold}
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
