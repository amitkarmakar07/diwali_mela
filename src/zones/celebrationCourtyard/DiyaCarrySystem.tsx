import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { DIYA_CARRY, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { playerPosition } from '../../player/playerRef';
import { Interactable, interactables, type InteractableEntry } from '../../interaction/Interactable';
import { Diya } from './Diya';

const PLACE_ID = 'diya-place-spot';
const scratchForward = new Vector3();

interface PlacedDiya {
  id: string;
  position: [number, number, number];
}

/**
 * Lets the player pick an unlit diya up from the tray, carry it in view, and set it
 * down wherever they're standing — already lit. Mounted at the top level (world
 * space), like FireworksSystem, so it can read playerPosition directly.
 */
export function DiyaCarrySystem() {
  const [trayRemaining, setTrayRemaining] = useState(DIYA_CARRY.trayCount);
  const [carrying, setCarrying] = useState(false);
  const [placed, setPlaced] = useState<PlacedDiya[]>([]);
  const carryGroupRef = useRef<Group>(null);
  const nextIndex = useRef(0);

  const handlePickUp = () => {
    if (carrying || trayRemaining <= 0) return;
    setCarrying(true);
    setTrayRemaining((n) => n - 1);
  };

  const handlePlace = () => {
    const pos: [number, number, number] = [playerPosition.x, 0, playerPosition.z];
    const id = `placed-diya-${nextIndex.current++}`;
    setPlaced((list) => [...list, { id, position: pos }]);
    setCarrying(false);
    useGame.getState().registerLitDiya();
  };

  // The "place" prompt has no fixed spot — it must follow the player wherever they
  // choose to set the diya down — so its registry entry is mutated directly each
  // frame instead of going through Interactable's static position prop.
  useEffect(() => {
    return () => {
      interactables.delete(PLACE_ID);
    };
  }, []);

  useFrame((state) => {
    let entry = interactables.get(PLACE_ID);
    if (!entry) {
      entry = {
        id: PLACE_ID,
        position: new Vector3(),
        radius: 2,
        label: 'Place Diya Here',
        enabled: false,
        onInteract: () => handlePlace(),
      } satisfies InteractableEntry;
      interactables.set(PLACE_ID, entry);
    }
    entry.enabled = carrying;
    if (carrying) entry.position.copy(playerPosition);

    if (carrying && carryGroupRef.current) {
      const cam = state.camera;
      scratchForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
      carryGroupRef.current.position
        .copy(cam.position)
        .addScaledVector(scratchForward, DIYA_CARRY.carryForwardOffset);
      carryGroupRef.current.position.y -= DIYA_CARRY.carryDropOffset;
      carryGroupRef.current.quaternion.copy(cam.quaternion);
    }
  });

  return (
    <>
      <Interactable
        id="diya-tray-pickup"
        position={DIYA_CARRY.trayPosition}
        radius={2.5}
        label="Pick Up a Diya"
        onInteract={handlePickUp}
        enabled={!carrying && trayRemaining > 0}
      />

      {placed.map((d, i) => (
        <Diya
          key={d.id}
          id={d.id}
          position={d.position}
          initialLit
          light={i < DIYA_CARRY.maxPlacedLights}
        />
      ))}

      {carrying && (
        <group ref={carryGroupRef}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.08, 10]} />
            <meshStandardMaterial color="#8a4a2d" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.04, 0.12, 8]} />
            <meshStandardMaterial
              color={PALETTE.flame}
              emissive={PALETTE.flame}
              emissiveIntensity={2.2}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </>
  );
}
