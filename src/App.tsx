import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { keyboardMap } from './core/KeyboardMap';
import { PlayerController } from './player/PlayerController';
import { InteractionManager } from './interaction/InteractionManager';
import { World } from './world/World';
import { HUD } from './ui/HUD';
import { PALETTE, PLAYER } from './config/constants';
import './App.css';

export default function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <div className="app-root">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: 72, near: 0.1, far: 400, position: PLAYER.spawn }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[PALETTE.night]} />
          <fog attach="fog" args={[PALETTE.nightFog, 28, 165]} />
          <Stars radius={220} depth={60} count={2600} factor={5} saturation={0} fade speed={0.4} />

          <Suspense fallback={null}>
            <Physics gravity={[0, PLAYER.gravity, 0]}>
              <World />
              <PlayerController />
            </Physics>
            <InteractionManager />
          </Suspense>
        </Canvas>
        <HUD />
      </div>
    </KeyboardControls>
  );
}
