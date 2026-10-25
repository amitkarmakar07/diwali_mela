import { useMemo, useState } from 'react';
import { DoubleSide } from 'three';
import { PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';

type CellShape = 'petal' | 'diamond' | 'spoke';

interface RangoliCell {
  x: number;
  z: number;
  rotY: number;
  scale: [number, number, number];
  color: string;
  shape: CellShape;
}

interface RangoliDesign {
  id: string;
  name: string;
  cells: RangoliCell[];
  /** Emissive accent drawn in the centre once the design is complete. */
  centerColor: string;
}

const LOTUS_COLORS = [PALETTE.marigold, PALETTE.gold, PALETTE.magenta, PALETTE.teal, PALETTE.warm, PALETTE.deepRed];
const LOTUS: RangoliDesign = {
  id: 'lotus',
  name: 'Lotus',
  centerColor: PALETTE.gold,
  cells: Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    const r = 1.08;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      rotY: -angle,
      scale: [0.5, 0.26, 0.14],
      color: LOTUS_COLORS[i],
      shape: 'petal',
    };
  }),
};

const STAR_COLORS = [PALETTE.gold, PALETTE.marigold];
const STAR: RangoliDesign = {
  id: 'star',
  name: 'Star Chakra',
  centerColor: PALETTE.warmBright,
  cells: Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const r = 1.0;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      rotY: -angle,
      scale: [0.62, 0.12, 0.17],
      color: STAR_COLORS[i % STAR_COLORS.length],
      shape: 'spoke',
    };
  }),
};

const PEACOCK_COLORS = [PALETTE.teal, PALETTE.gold, PALETTE.magenta];
const PEACOCK: RangoliDesign = {
  id: 'peacock',
  name: 'Peacock Fan',
  centerColor: PALETTE.teal,
  cells: Array.from({ length: 7 }, (_, i) => {
    // A half-circle fan of feathers behind the centre, not a full ring.
    const angle = -Math.PI * 0.62 + (i / 6) * Math.PI * 1.24;
    const r = 1.05;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      rotY: -angle,
      scale: [0.46, 0.3, 0.13],
      color: PEACOCK_COLORS[i % PEACOCK_COLORS.length],
      shape: 'petal',
    };
  }),
};

const GRID_COLORS = [PALETTE.gold, PALETTE.deepRed];
const GRID: RangoliDesign = {
  id: 'grid',
  name: 'Geometric Grid',
  centerColor: PALETTE.marigold,
  cells: (() => {
    const spacing = 0.62;
    const offsets = [-spacing, 0, spacing];
    const cells: RangoliCell[] = [];
    let i = 0;
    for (const ox of offsets) {
      for (const oz of offsets) {
        if (ox === 0 && oz === 0) continue; // centre stays reserved for the completion mark
        cells.push({
          x: ox,
          z: oz,
          rotY: Math.PI / 4,
          scale: [0.24, 0.1, 0.24],
          color: GRID_COLORS[i % GRID_COLORS.length],
          shape: 'diamond',
        });
        i++;
      }
    }
    return cells;
  })(),
};

const DESIGNS: RangoliDesign[] = [LOTUS, STAR, PEACOCK, GRID];

interface RangoliCreatorProps {
  position: [number, number, number];
}

/** A finite, step-by-step rangoli: one cell appears per E press until the chosen
 * design is complete. The design is picked from a nearby sign before building starts. */
export function RangoliCreator({ position }: RangoliCreatorProps) {
  const [designIndex, setDesignIndex] = useState(0);
  const [step, setStep] = useState(0);
  const design = DESIGNS[designIndex];
  const complete = step >= design.cells.length;

  const signPosition = useMemo<[number, number, number]>(
    () => [position[0] + 1.9, position[1], position[2] + 1.9],
    [position],
  );

  const handleCycleDesign = () => {
    if (step > 0) return;
    setDesignIndex((i) => (i + 1) % DESIGNS.length);
  };

  const handleBuild = () => {
    if (complete) return;
    const next = step + 1;
    setStep(next);
    if (next >= design.cells.length) {
      useGame.getState().showToast(`The ${design.name} rangoli is complete — Shubh Diwali!`);
    }
  };

  return (
    <>
      <Interactable
        id="rangoli-design-select"
        position={signPosition}
        radius={2.2}
        label={`Rangoli Design: ${design.name} (E to change)`}
        onInteract={handleCycleDesign}
        enabled={step === 0}
      >
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.1, 0.8, 0.5]} />
          <meshStandardMaterial
            color="#4a3a33"
            emissive={design.centerColor}
            emissiveIntensity={0.35}
            roughness={0.8}
          />
        </mesh>
      </Interactable>

      <Interactable
        id="rangoli-creator"
        position={position}
        radius={2.2}
        label={complete ? 'Rangoli Complete' : `Add to the ${design.name} Rangoli`}
        onInteract={handleBuild}
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

        {design.cells.map((cell, i) => (
          <mesh
            key={`${design.id}-${i}`}
            visible={i < step}
            position={[cell.x, 0.05, cell.z]}
            rotation={[-Math.PI / 2, 0, cell.rotY]}
            scale={cell.scale}
          >
            {cell.shape === 'diamond' ? (
              <boxGeometry args={[1, 1, 0.4]} />
            ) : (
              <sphereGeometry args={[1, 10, 8]} />
            )}
            <meshStandardMaterial
              color={cell.color}
              emissive={cell.color}
              emissiveIntensity={complete ? 0.55 : 0.4}
              roughness={0.55}
            />
          </mesh>
        ))}

        {complete && (
          <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.42, 20]} />
            <meshStandardMaterial
              color={design.centerColor}
              emissive={design.centerColor}
              emissiveIntensity={0.7}
              roughness={0.5}
            />
          </mesh>
        )}
      </Interactable>
    </>
  );
}
