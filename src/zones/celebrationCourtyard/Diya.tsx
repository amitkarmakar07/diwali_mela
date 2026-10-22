import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, PointLight } from 'three';
import { PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';

interface DiyaProps {
  id: string;
  position: [number, number, number];
  golden?: boolean;
}

const CLAY = '#8a4a2d';
const CLAY_RIM = '#6e3a22';
const WICK = '#2b1b12';

export function Diya({ id, position, golden = false }: DiyaProps) {
  const [lit, setLit] = useState(false);
  const flameRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  const flameColor = golden ? PALETTE.gold : PALETTE.flame;
  const flameScale = golden ? 1.4 : 1;
  const baseIntensity = golden ? 13 : 10;

  useFrame((_, delta) => {
    if (!lit) return;
    phase.current += delta * 6;
    const flicker = 0.85 + Math.sin(phase.current) * 0.1 + Math.sin(phase.current * 2.7) * 0.05;
    if (flameRef.current) {
      flameRef.current.scale.setScalar(flameScale * flicker);
      flameRef.current.position.y = 0.26 + Math.sin(phase.current * 1.3) * 0.012;
    }
    if (lightRef.current) {
      lightRef.current.intensity = baseIntensity * flicker;
    }
  });

  const handleInteract = () => {
    if (lit) return;
    setLit(true);
    useGame.getState().registerLitDiya();
    if (golden) useGame.getState().findGoldenDiya();
  };

  return (
    <Interactable
      id={id}
      position={position}
      radius={1.8}
      label="Light this Diya"
      onInteract={handleInteract}
      enabled={!lit}
    >
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.1, 12]} />
        <meshStandardMaterial
          color={golden ? PALETTE.gold : CLAY}
          roughness={0.85}
          metalness={golden ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 0.06, 12]} />
        <meshStandardMaterial color={golden ? PALETTE.warm : CLAY_RIM} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.08, 6]} />
        <meshStandardMaterial color={WICK} roughness={1} />
      </mesh>

      {lit && (
        <>
          <mesh ref={flameRef} position={[0, 0.26, 0]}>
            <coneGeometry args={[0.045, 0.14, 8]} />
            <meshStandardMaterial
              color={flameColor}
              emissive={flameColor}
              emissiveIntensity={golden ? 3.2 : 2.4}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            ref={lightRef}
            position={[0, 0.3, 0]}
            color={PALETTE.warm}
            intensity={baseIntensity}
            distance={7}
            decay={2}
          />
        </>
      )}
    </Interactable>
  );
}
