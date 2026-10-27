import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { keyboardMap } from './core/KeyboardMap';
import { PlayerController } from './player/PlayerController';
import { InteractionManager } from './interaction/InteractionManager';
import { World } from './world/World';
import { HUD } from './ui/HUD';
import { MiniGameHUD } from './ui/MiniGameHUD';
import { NetworkProvider } from './net/NetworkProvider';
import { useNet } from './net/netStore';
import { roomIdFromUrl } from './net/netConfig';
import { useGame } from './core/GameState';
import { PALETTE, PLAYER } from './config/constants';
import './App.css';

export default function App() {
  const started = useGame((s) => s.started);

  // Joining is deliberately deferred until the player actually walks in. Connecting while
  // they are still reading the title screen would park a motionless ghost at the spawn
  // point on their friends' screens. Setting the room id is the only trigger the network
  // layer needs — it does nothing at all while that stays null, so single player is
  // completely untouched by any of this.
  useEffect(() => {
    if (!started) return;
    const fromLink = roomIdFromUrl();
    if (fromLink && useNet.getState().roomId === null) useNet.getState().setRoomId(fromLink);
  }, [started]);

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="app-root">
        {/* Shadows are off on purpose: a shadow pass re-renders every caster in the scene,
            and at night the warm point lights carry the depth cues anyway. Keeping them
            cost roughly half the frame rate and made E-to-interact feel unresponsive. */}
        <Canvas
          dpr={[1, 1.25]}
          camera={{ fov: 72, near: 0.1, far: 400, position: PLAYER.spawn }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
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
        <MiniGameHUD />
        {/* Outside the Canvas on purpose: this is a connection, not a 3D object, and it
            drives its sends from a timer rather than the render loop. */}
        <NetworkProvider />
      </div>
    </KeyboardControls>
  );
}
