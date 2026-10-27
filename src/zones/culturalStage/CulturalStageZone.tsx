import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { CULTURAL_STAGE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { StringLights, Bunting } from '../../world/Decor';
import { NPC } from '../../npc/NPC';
import { CulturalStageCameraRig } from './CulturalStageCameraRig';
import { clearLocalSeat, pickSeatIndex, registerSeats, setLocalSeat } from '../../net/rideSeats';

const {
  position,
  stageWidth,
  stageDepth,
  stageZ,
  stageHeight,
  pillarX,
  pillarHeight,
  backdropZ,
  speakerX,
  speakerHeight,
  benchRowZ,
  benchX,
  seatEyeHeight,
  seatLocal,
  branchZ,
  branchInnerX,
  branchOuterX,
  branchWidth,
  towerX,
  towerZ,
  towerHeight,
  rideDuration,
} = CULTURAL_STAGE;

const BRANCH_LENGTH = branchInnerX - branchOuterX;
const STAGE_ID = 'cultural-stage';

/** Where friends sit in the audience: either side of the local seat, never at offset 0 or
 *  a friend would be sitting inside your own camera. */
const AUDIENCE_SEAT_X = [-1.6, 1.6, -3.2, 3.2, -4.8, 4.8, -6.4, 6.4];

/** This project's forward is (-sin(yaw), -cos(yaw)), so this turns a seated viewer to
 *  face the stage rather than wherever they happened to be walking. */
const AUDIENCE_FACING_YAW = Math.atan2(-(0 - seatLocal[0]), -(stageZ - seatLocal[1]));

const BRANCH_CENTER_X = (branchInnerX + branchOuterX) / 2;
const STAGE_FRONT_Z = stageZ + stageDepth / 2;
const STAGE_TOP = stageHeight;

const DANCER_COLORS = [PALETTE.marigold, PALETTE.teal, PALETTE.magenta];

function SpeakerStack({ x }: { x: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[x, 0, stageZ]}>
      <CuboidCollider args={[0.5, speakerHeight / 2, 0.5]} position={[0, speakerHeight / 2, 0]} />
      <mesh position={[0, speakerHeight / 2, 0]} castShadow>
        <boxGeometry args={[1, speakerHeight, 1]} />
        <meshStandardMaterial color="#1c1820" roughness={0.85} />
      </mesh>
      {[0.65, 1.55, 2.45].map((y, i) => (
        <mesh key={i} position={[0, y, 0.51]}>
          <circleGeometry args={[0.32, 16]} />
          <meshStandardMaterial
            color={PALETTE.gold}
            emissive={PALETTE.gold}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
      ))}
    </RigidBody>
  );
}

function Backdrop() {
  return (
    <group position={[0, 0, backdropZ]}>
      <mesh position={[0, pillarHeight / 2, 0]} castShadow>
        <boxGeometry args={[stageWidth - 0.6, pillarHeight, 0.3]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
      </mesh>
      <mesh position={[0, pillarHeight - 0.3, 0.2]}>
        <torusGeometry args={[1.6, 0.12, 8, 28]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      {[-2.6, 2.6].map((x, i) => (
        <mesh key={i} position={[x, pillarHeight - 0.3, 0.2]}>
          <coneGeometry args={[0.55, 1.4, 10]} />
          <meshStandardMaterial
            color={PALETTE.marigold}
            emissive={PALETTE.marigold}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

function StageSteps() {
  const steps = 3;
  return (
    <>
      {Array.from({ length: steps }).map((_, i) => {
        const h = STAGE_TOP * ((steps - i) / steps);
        const z = STAGE_FRONT_Z + 0.5 + i * 0.5;
        return (
          <RigidBody key={i} type="fixed" colliders={false} position={[0, 0, z]}>
            <CuboidCollider args={[1.4, h / 2, 0.25]} position={[0, h / 2, 0]} />
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.8, h, 0.5]} />
              <meshStandardMaterial color="#4a3a30" roughness={0.85} />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

function Performer({ x, color, phase }: { x: number; color: string; phase: number }) {
  const group = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 2.6 + phase;
    if (group.current) {
      group.current.position.y = STAGE_TOP + Math.abs(Math.sin(t)) * 0.12;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.9;
    }
    const swing = Math.sin(t) * 0.9;
    if (leftArm.current) leftArm.current.rotation.z = swing + 0.6;
    if (rightArm.current) rightArm.current.rotation.z = -swing - 0.6;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.5;
    if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.5;
  });

  return (
    <group ref={group} position={[x, STAGE_TOP, stageZ]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.36, 0.58, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#c98e63" roughness={0.85} />
      </mesh>
      <group ref={leftArm} position={[-0.24, 1.02, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.46, 6]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.24, 1.02, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.46, 6]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      </group>
      <group ref={leftLeg} position={[-0.1, 0.5, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.065, 0.06, 0.5, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.1, 0.5, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.065, 0.06, 0.5, 6]} />
          <meshStandardMaterial color="#241d33" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Bench({ x, z }: { x: number; z: number }) {
  const seats: Array<[number, string]> = [
    [-0.6, PALETTE.marigold],
    [0, PALETTE.teal],
    [0.6, PALETTE.magenta],
  ];
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.0, 0.22, 0.4]} position={[0, 0.4, 0]} />
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.0, 0.08, 0.5]} />
          <meshStandardMaterial color="#5b4a3e" roughness={0.8} />
        </mesh>
        {[-0.85, 0.85].map((lx) => (
          <mesh key={lx} position={[lx, 0.18, 0]}>
            <boxGeometry args={[0.1, 0.36, 0.4]} />
            <meshStandardMaterial color="#3a2f28" roughness={0.9} />
          </mesh>
        ))}
      </RigidBody>
      {seats.map(([sx, color], i) => (
        <NPC key={i} mode="seated" position={[sx, 0]} color={color} facing={0} />
      ))}
    </group>
  );
}

function WatchTower() {
  const legs: Array<[number, number]> = [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7],
  ];
  return (
    <group position={[towerX, 0, towerZ]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.9, towerHeight / 2, 0.9]} position={[0, towerHeight / 2, 0]} />
        {legs.map(([lx, lz], i) => (
          <mesh key={i} position={[lx, towerHeight / 2, lz]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, towerHeight, 6]} />
            <meshStandardMaterial color="#4a3a30" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, towerHeight, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.12, 1.9]} />
          <meshStandardMaterial color="#5b4a3e" roughness={0.8} />
        </mesh>
      </RigidBody>
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a, i) => (
        <mesh key={i} position={[0, towerHeight + 0.45, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[1.9, 0.5, 0.04]} />
          <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, towerHeight + 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 5]} />
        <meshStandardMaterial color="#3a2f28" roughness={0.8} />
      </mesh>
      <mesh position={[0.3, towerHeight + 1.5, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.marigold}
          emissive={PALETTE.marigold}
          emissiveIntensity={0.35}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

export function CulturalStageZone() {
  const pad = useMemo(() => Math.max(stageWidth, 18), []);

  const seat = useMemo(
    () =>
      new Vector3(
        position[0] + seatLocal[0],
        position[1] + seatEyeHeight,
        position[2] + seatLocal[1],
      ),
    [],
  );

  // Friends in the audience sit on this client's own ground, beside the local seat — see
  // net/rideSeats for why a seat index travels and a position doesn't.
  useEffect(
    () =>
      registerSeats('stage', AUDIENCE_SEAT_X.length, (index, out) => {
        const offset = AUDIENCE_SEAT_X[index];
        if (offset === undefined) return null;
        out.set(
          position[0] + seatLocal[0] + offset,
          position[1] + seatEyeHeight,
          position[2] + seatLocal[1],
        );
        return AUDIENCE_FACING_YAW;
      }),
    [],
  );

  // Leaving happens through the camera rig and the HUD button, neither of them here, so
  // watch the store rather than hooking each exit.
  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (prev.activeRide === STAGE_ID && state.activeRide !== STAGE_ID) clearLocalSeat();
      }),
    [],
  );

  const enterAudience = () => {
    useGame.getState().showToast('You find a seat as the dhol begins — the Ramleela troupe takes the stage.');
    setLocalSeat('stage', pickSeatIndex(AUDIENCE_SEAT_X.length));
    useGame.getState().enterRide(STAGE_ID);
  };

  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[pad, pad]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={0.95} />
      </mesh>

      <mesh position={[BRANCH_CENTER_X, 0.02, branchZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BRANCH_LENGTH, branchWidth]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
      </mesh>

      {/* Stage platform */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[stageWidth / 2, stageHeight / 2, stageDepth / 2]} position={[0, stageHeight / 2, stageZ]} />
        <mesh position={[0, stageHeight / 2, stageZ]} castShadow receiveShadow>
          <boxGeometry args={[stageWidth, stageHeight, stageDepth]} />
          <meshStandardMaterial color="#4a3a30" roughness={0.85} />
        </mesh>
      </RigidBody>
      <StageSteps />

      {/* Proscenium pillars + beam */}
      <RigidBody type="fixed" colliders={false}>
        {[-pillarX, pillarX].map((x, i) => (
          <group key={i}>
            <CuboidCollider args={[0.25, pillarHeight / 2, 0.25]} position={[x, pillarHeight / 2, stageZ]} />
            <mesh position={[x, pillarHeight / 2, stageZ]} castShadow>
              <cylinderGeometry args={[0.22, 0.26, pillarHeight, 10]} />
              <meshStandardMaterial color={PALETTE.deepRed} roughness={0.8} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, pillarHeight, stageZ]} castShadow>
          <boxGeometry args={[pillarX * 2 + 0.6, 0.35, 0.4]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.35} roughness={0.6} />
        </mesh>
      </RigidBody>

      <Backdrop />
      <SpeakerStack x={-speakerX} />
      <SpeakerStack x={speakerX} />
      <WatchTower />

      {DANCER_COLORS.map((color, i) => (
        <Performer key={i} x={(i - 1) * 2.1} color={color} phase={(i * Math.PI) / 1.5} />
      ))}

      <StringLights
        from={[-pillarX, pillarHeight - 0.2, stageZ]}
        to={[pillarX, pillarHeight - 0.2, stageZ]}
        count={9}
        sag={0.3}
      />
      <Bunting
        from={[-pillarX, pillarHeight + 0.4, stageZ]}
        to={[pillarX, pillarHeight + 0.4, stageZ]}
        count={11}
        sag={0.25}
      />

      {/* Colored stage wash — kept to two real lights, everything else is emissive. */}
      <pointLight position={[-3, STAGE_TOP + 2.4, stageZ + 1]} color={PALETTE.magenta} intensity={26} distance={12} decay={2} />
      <pointLight position={[3, STAGE_TOP + 2.4, stageZ + 1]} color={PALETTE.teal} intensity={26} distance={12} decay={2} />

      {benchRowZ.map((z) =>
        benchX.map((x) => <Bench key={`${x}-${z}`} x={x} z={z} />),
      )}

      <Interactable
        id="cultural-stage-watch"
        position={[0, 1.2, seatLocal[1] - 0.6]}
        radius={3}
        label="Watch the performance"
        onInteract={enterAudience}
      />

      <CulturalStageCameraRig rideId="cultural-stage" seat={seat} facingYaw={0} duration={rideDuration} />
    </group>
  );
}
