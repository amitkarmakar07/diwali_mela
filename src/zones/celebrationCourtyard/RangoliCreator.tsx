import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, InstancedMesh, Object3D } from 'three';
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
  /** Emissive accent drawn in the centre once the design is complete, and shared by
   * every dotted-border instance of this design. */
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

/** Dots traced around the whole rangoli's rim, growing in step with the build so the
 * dotted border fills in alongside the petals instead of popping in all at once. */
const BORDER_DOTS = 28;
const BORDER_RADIUS = 1.62;
const BORDER_DOT_SCALE = 0.065;
/** Two accent dots per cell (inner + outer along its own radial line), tracing the
 * petal's edge in fine coloured powder the way a real rangoli's borders are dotted. */
const ACCENT_RADII = [0.78, 1.22];
const ACCENT_DOT_SCALE = 0.07;

const dummy = new Object3D();
const dummyColor = new Color();

interface RangoliCreatorProps {
  position: [number, number, number];
}

/** A finite, step-by-step rangoli: one cell appears per E press until the chosen
 * design is complete. The design is picked from a nearby sign before building starts.
 *
 * Rendering: every cell's body, every cell's two border-accent dots, and the whole
 * rim's dotted border are each one instancedMesh (3 draw calls total, independent of
 * how many cells a design has), instead of one mesh per cell as before. Unbuilt
 * instances are scaled to zero rather than toggled with React's `visible` prop, since
 * instancedMesh has no per-instance visibility. */
export function RangoliCreator({ position }: RangoliCreatorProps) {
  const [designIndex, setDesignIndex] = useState(0);
  const [step, setStep] = useState(0);
  const design = DESIGNS[designIndex];
  const complete = step >= design.cells.length;

  const bodiesRef = useRef<InstancedMesh>(null);
  const accentsRef = useRef<InstancedMesh>(null);
  const borderRef = useRef<InstancedMesh>(null);

  const signPosition = useMemo<[number, number, number]>(
    () => [position[0] + 1.9, position[1], position[2] + 1.9],
    [position],
  );

  // Cell bodies: same shapes/positions/rotations the per-mesh version used, just
  // written into instance matrices instead of separate <mesh> elements. Colour comes
  // from vertexColors so each petal keeps its own hue under one shared material.
  useEffect(() => {
    const mesh = bodiesRef.current;
    if (!mesh) return;
    design.cells.forEach((cell, i) => {
      const built = i < step;
      dummy.position.set(cell.x, built ? 0.05 : 0, cell.z);
      dummy.rotation.set(-Math.PI / 2, 0, cell.rotY);
      dummy.scale.set(built ? cell.scale[0] : 0, built ? cell.scale[1] : 0, built ? cell.scale[2] : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      dummyColor.set(cell.color);
      mesh.setColorAt(i, dummyColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [design, step]);

  // Border-accent dots bracketing each petal, placed along that cell's own line from
  // the hub so they trace its edge regardless of the design's layout.
  useEffect(() => {
    const mesh = accentsRef.current;
    if (!mesh) return;
    design.cells.forEach((cell, i) => {
      const built = i < step;
      const angle = Math.atan2(cell.z, cell.x);
      const baseR = Math.hypot(cell.x, cell.z);
      ACCENT_RADII.forEach((rScale, d) => {
        const idx = i * ACCENT_RADII.length + d;
        const r = baseR * rScale;
        dummy.position.set(Math.cos(angle) * r, built ? 0.09 : 0, Math.sin(angle) * r);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(built ? ACCENT_DOT_SCALE : 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [design, step]);

  // Outer dotted rim, revealed in proportion to build progress.
  useEffect(() => {
    const mesh = borderRef.current;
    if (!mesh) return;
    const fraction = design.cells.length === 0 ? 1 : step / design.cells.length;
    const builtDots = Math.round(fraction * BORDER_DOTS);
    for (let i = 0; i < BORDER_DOTS; i++) {
      const angle = (i / BORDER_DOTS) * Math.PI * 2;
      const built = i < builtDots;
      dummy.position.set(Math.cos(angle) * BORDER_RADIUS, built ? 0.06 : 0, Math.sin(angle) * BORDER_RADIUS);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(built ? BORDER_DOT_SCALE : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [design, step]);

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

        {/* The hub medallion — a concentric powder band laid down before the petals,
            the way a real rangoli's rings are drawn in before its floral motif. */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.3, 24]} />
          <meshStandardMaterial
            color={design.centerColor}
            emissive={design.centerColor}
            emissiveIntensity={0.3}
            roughness={0.6}
            side={DoubleSide}
          />
        </mesh>

        <instancedMesh key={`${design.id}-body`} ref={bodiesRef} args={[undefined, undefined, Math.max(design.cells.length, 1)]}>
          {design.cells[0]?.shape === 'diamond' ? (
            <boxGeometry args={[1, 1, 0.4]} />
          ) : (
            <sphereGeometry args={[1, 10, 8]} />
          )}
          <meshStandardMaterial vertexColors emissive={PALETTE.warm} emissiveIntensity={0.4} roughness={0.55} />
        </instancedMesh>

        <instancedMesh
          key={`${design.id}-accent`}
          ref={accentsRef}
          args={[undefined, undefined, Math.max(design.cells.length * ACCENT_RADII.length, 1)]}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={design.centerColor}
            emissive={design.centerColor}
            emissiveIntensity={0.5}
            roughness={0.5}
          />
        </instancedMesh>

        <instancedMesh ref={borderRef} args={[undefined, undefined, BORDER_DOTS]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={design.centerColor}
            emissive={design.centerColor}
            emissiveIntensity={0.5}
            roughness={0.5}
          />
        </instancedMesh>

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
