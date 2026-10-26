import { useMemo, useRef, useState } from 'react';
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

/** Local offsets (relative to the stand's own position) for the static unlit lanterns
 * resting on its tabletop. */
const STAND_LANTERN_OFFSETS: Array<[number, number]> = [
  [-0.35, -0.15],
  [-0.1, 0.18],
  [0.15, -0.12],
  [0.35, 0.15],
];

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

  // Mirrors ready/full/cooling into the prompt label so running out of aloft slots (or
  // being mid-cooldown) reads as a reason rather than a silent no-op — the project has
  // shipped that wart before.
  const releaseStateRef = useRef<'ready' | 'full' | 'cooling'>('ready');
  const [releaseState, setReleaseState] = useState<'ready' | 'full' | 'cooling'>('ready');

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

    const full = slots.current.every((s) => s.alive);
    const nextState: typeof releaseStateRef.current =
      cooldownRef.current > 0 ? 'cooling' : full ? 'full' : 'ready';
    if (nextState !== releaseStateRef.current) {
      releaseStateRef.current = nextState;
      setReleaseState(nextState);
    }

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

  const releaseLabel =
    releaseState === 'full'
      ? 'All Lanterns Aloft'
      : releaseState === 'cooling'
        ? 'Releasing...'
        : 'Release a Sky Lantern';

  return (
    <>
      <Interactable
        id="sky-lantern-release"
        position={releasePosition}
        radius={2.5}
        label={releaseLabel}
        onInteract={handleRelease}
      >
        {/* The stand itself — decorative only, no collider, so it never pushes the
            player out of INTERACT_RADIUS. */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.4, 8]} />
          <meshStandardMaterial color="#4a3a33" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.08, 0.7]} />
          <meshStandardMaterial color="#6e3a22" roughness={0.8} />
        </mesh>
        {STAND_LANTERN_OFFSETS.map(([ox, oz], i) => (
          <group key={i} position={[ox, 0.64, oz]}>
            <mesh>
              <cylinderGeometry args={[0.14, 0.17, 0.28, 8]} />
              <meshStandardMaterial
                color={PALETTE.marigold}
                emissive={PALETTE.warm}
                emissiveIntensity={0.25}
                roughness={0.65}
              />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <coneGeometry args={[0.08, 0.1, 8]} />
              <meshStandardMaterial
                color={PALETTE.gold}
                emissive={PALETTE.gold}
                emissiveIntensity={0.3}
                roughness={0.6}
              />
            </mesh>
          </group>
        ))}
      </Interactable>
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
