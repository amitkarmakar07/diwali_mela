import { useMemo, useState } from 'react';
import { DoubleSide } from 'three';
import { PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';

const STEPS = 6;
const PETAL_RADIUS = 1.08;
const PETAL_COLORS = [
  PALETTE.marigold,
  PALETTE.gold,
  PALETTE.magenta,
  PALETTE.teal,
  PALETTE.warm,
  PALETTE.deepRed,
];

interface RangoliCreatorProps {
  position: [number, number, number];
}

/** A finite, step-by-step rangoli: one petal appears per E press until the ring is complete. */
export function RangoliCreator({ position }: RangoliCreatorProps) {
  const [step, setStep] = useState(0);
  const complete = step >= STEPS;

  const petals = useMemo(
    () =>
      Array.from({ length: STEPS }, (_, i) => {
        const angle = (i / STEPS) * Math.PI * 2;
        return { x: Math.cos(angle) * PETAL_RADIUS, z: Math.sin(angle) * PETAL_RADIUS, angle };
      }),
    [],
  );

  const handleInteract = () => {
    if (complete) return;
    const next = step + 1;
    setStep(next);
    if (next >= STEPS) {
      useGame.getState().showToast('The rangoli is complete — Shubh Diwali!');
    }
  };

  return (
    <Interactable
      id="rangoli-creator"
      position={position}
      radius={2.2}
      label={complete ? 'Rangoli Complete' : 'Add a Petal to the Rangoli'}
      onInteract={handleInteract}
      enabled={!complete}
    >
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.3, 32]} />
        <meshStandardMaterial
          color="#3a2f44"
          roughness={0.9}
          side={DoubleSide}
          transparent
          opacity={0.6}
        />
      </mesh>

      {petals.map((p, i) => (
        <mesh
          key={i}
          visible={i < step}
          position={[p.x, 0.05, p.z]}
          rotation={[-Math.PI / 2, 0, -p.angle]}
          scale={[0.5, 0.26, 0.14]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color={PETAL_COLORS[i]}
            emissive={PETAL_COLORS[i]}
            emissiveIntensity={complete ? 0.55 : 0.4}
            roughness={0.55}
          />
        </mesh>
      ))}

      {complete && (
        <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 20]} />
          <meshStandardMaterial
            color={PALETTE.gold}
            emissive={PALETTE.gold}
            emissiveIntensity={0.7}
            roughness={0.5}
          />
        </mesh>
      )}
    </Interactable>
  );
}
