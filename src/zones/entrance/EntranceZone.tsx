import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { ZONES, PALETTE } from '../../config/constants';
import { Interactable } from '../../interaction/Interactable';
import { useGame } from '../../core/GameState';
import { LampPost, StringLights, Banner } from '../../world/Decor';

const [cx, cz] = ZONES.entrance;
const PILLAR_X = 8;
const PILLAR_HEIGHT = 9;
const PILLAR_SIZE = 1.1;

export function EntranceZone() {
  const bannerGroup = useRef<Group>(null);

  useFrame((state) => {
    if (bannerGroup.current) {
      bannerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
    }
  });

  return (
    <group position={[cx, 0, cz]}>
      {[-PILLAR_X, PILLAR_X].map((x) => (
        <RigidBody key={x} type="fixed" colliders={false} position={[x, 0, 0]}>
          <CuboidCollider args={[PILLAR_SIZE / 2, PILLAR_HEIGHT / 2, PILLAR_SIZE / 2]} position={[0, PILLAR_HEIGHT / 2, 0]} />
          <mesh position={[0, PILLAR_HEIGHT / 2, 0]} castShadow>
            <boxGeometry args={[PILLAR_SIZE, PILLAR_HEIGHT, PILLAR_SIZE]} />
            <meshStandardMaterial color={PALETTE.marigold} emissive={PALETTE.marigold} emissiveIntensity={0.25} roughness={0.7} />
          </mesh>
          <mesh position={[0, PILLAR_HEIGHT + 0.3, 0]}>
            <coneGeometry args={[0.9, 0.9, 4]} />
            <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.4} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}

      <mesh position={[0, PILLAR_HEIGHT + 0.6, 0]}>
        <boxGeometry args={[PILLAR_X * 2 + PILLAR_SIZE, 1.1, 1]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.7} />
      </mesh>
      <mesh position={[0, PILLAR_HEIGHT + 1.4, 0]}>
        <boxGeometry args={[PILLAR_X * 2 + PILLAR_SIZE + 0.6, 0.3, 1.1]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.warm} emissiveIntensity={0.3} roughness={0.5} />
      </mesh>

      <Text
        position={[0, PILLAR_HEIGHT + 0.65, 0.52]}
        font="/fonts/YatraOne-Regular.ttf"
        fontSize={1.15}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
        outlineWidth={0.03}
        outlineColor={PALETTE.marigold}
      >
        DIWALI MELA
      </Text>

      <group ref={bannerGroup}>
        <Banner position={[0, PILLAR_HEIGHT + 2.1, 0]} rotation={[0, 0, 0]} width={2.4} />
      </group>

      {[-4.5, 4.5].map((x) => (
        <RigidBody key={x} type="fixed" colliders={false} position={[x, 0, -4.5]}>
          <CuboidCollider args={[1.1, 1.1, 1]} position={[0, 1.1, 0]} />
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[2.2, 2.2, 2]} />
            <meshStandardMaterial color={PALETTE.teal} roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[2.6, 0.3, 2.4]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}

      <LampPost position={[-PILLAR_X - 2.5, 0, -8]} height={5} />
      <LampPost position={[PILLAR_X + 2.5, 0, -8]} height={5} />

      <StringLights from={[-PILLAR_X, PILLAR_HEIGHT, 0]} to={[PILLAR_X, PILLAR_HEIGHT, 0]} count={14} sag={1.2} />

      <Interactable
        id="entrance-info-board"
        position={[4.5, 1.2, -1.5]}
        radius={3}
        label="Read the Mela Information Board"
        onInteract={() =>
          useGame.getState().openPanel({
            type: 'info',
            title: 'Welcome to Diwali Mela',
            body:
              'Shubh Diwali and welcome! Walk straight ahead down the promenade to reach the Central Plaza. ' +
              "From there, head southwest for the Ride Zone and its giant Ferris Wheel, or southeast for the " +
              'Celebration Courtyard, where you can light diyas and set off fireworks.\n\n' +
              'Controls: WASD to move, Shift to run, Mouse to look around, E to interact, Esc to pause.',
          })
        }
      >
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
          <boxGeometry args={[1.6, 2, 0.15]} />
          <meshStandardMaterial color={PALETTE.ground} roughness={0.8} />
        </mesh>
      </Interactable>

      <pointLight position={[-PILLAR_X, PILLAR_HEIGHT - 1, 2]} color={PALETTE.warm} intensity={55} distance={22} decay={2} />
      <pointLight position={[PILLAR_X, PILLAR_HEIGHT - 1, 2]} color={PALETTE.warm} intensity={55} distance={22} decay={2} />
    </group>
  );
}
