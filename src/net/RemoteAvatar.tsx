import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import type { PeerInfo } from './netTypes';
import { peerMotion } from './netStore';
import { resolveSeat } from './rideSeats';
import { HumanoidBody } from '../npc/HumanoidBody';
import { NPC_SEATED_DROP } from '../npc/NPC';

/** Mirrors NPC.tsx's walk-branch stride maths, but driven by measured speed instead of a
 * fixed `speed` prop — a remote avatar has no waypoints of its own to derive speed from. */
const STRIDE_FREQ = 3.1;
const STRIDE_AMPLITUDE = 0.42;
const ARM_SWING_SCALE = 0.6;
const WALK_BOB_AMPLITUDE = 0.045;
const BREATH_FREQ = 1.1;
const BREATH_AMPLITUDE = 0.022;
const ARM_BREATH_AMPLITUDE = 0.05;
/** Below this measured speed (m/s) the avatar reads as standing still, not shuffling. */
const WALK_SPEED_EPSILON = 0.15;
/** Metres. Nearer than this and a friend fills the screen instead of being in it. */
const TOO_CLOSE = 1.1;

function activityHint(peer: PeerInfo): string | null {
  const act = peer.activity;
  switch (act.k) {
    case 'walk':
      return null;
    case 'ride':
      switch (act.r) {
        case 'ferris-wheel':
          return 'on the Ferris wheel';
        case 'carousel':
          return 'on the carousel';
        case 'swing-boat':
          return 'on the swing boat';
      }
      return null;
    case 'sit':
      return act.p === 'movie' ? 'watching the film' : 'watching the show';
    case 'play':
      return `playing ${act.g.replace(/-/g, ' ')}`;
  }
}

interface RemoteAvatarProps {
  peer: PeerInfo;
}

/**
 * One other player, placed purely from network data — no RigidBody, no colliders, so the
 * local Rapier world stays unaware of friends and physics can't diverge between clients.
 */
export function RemoteAvatar({ peer }: RemoteAvatarProps) {
  const root = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);

  const seatScratch = useMemo(() => new Vector3(), []);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  // prevX/prevZ start as NaN so the very first frame measures zero speed instead of a
  // spike from (0,0) to wherever the peer actually is.
  const anim = useRef({ t: 0, prevX: Number.NaN, prevZ: Number.NaN });

  const activity = peer.activity;
  const seated = activity.k === 'ride' || activity.k === 'sit';
  const hint = activityHint(peer);

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const motion = peerMotion.get(peer.id);
    if (!motion) return;

    // Everyone enters at the same spawn point, so two friends who join together start
    // standing inside each other and the whole screen is a wall of torso. Hide a friend
    // who is closer than arm's length: at that range they'd be blocking the view rather
    // than appearing in it, and they fade straight back in as either of you steps away.
    const camera = state.camera;
    const near = Math.hypot(camera.position.x - motion.x, camera.position.z - motion.z) < TOO_CLOSE;
    g.visible = !near;
    if (near) return;

    const s = anim.current;
    s.t += delta;

    let x = motion.x;
    let z = motion.z;
    let yaw = motion.yw;

    if (activity.k === 'ride' || activity.k === 'sit') {
      const seatId = activity.k === 'ride' ? activity.r : activity.p;
      const seatYaw = resolveSeat(seatId, activity.s, seatScratch);
      if (seatYaw !== null) {
        x = seatScratch.x;
        z = seatScratch.z;
        yaw = seatYaw;
      }
      // else: seat not mounted yet on this client — fall back to the interpolated
      // walking position already loaded into x/z/yaw above, per spec.
    }

    const dx = Number.isNaN(s.prevX) ? 0 : x - s.prevX;
    const dz = Number.isNaN(s.prevZ) ? 0 : z - s.prevZ;
    const speed = delta > 0 ? Math.hypot(dx, dz) / delta : 0;
    s.prevX = x;
    s.prevZ = z;

    g.position.x = x;
    g.position.z = z;
    g.rotation.y = yaw;

    if (seated) {
      const breathe = Math.sin(s.t * BREATH_FREQ + phase);
      g.position.y = NPC_SEATED_DROP + breathe * BREATH_AMPLITUDE;
      if (leftLeg.current) leftLeg.current.rotation.x = 0.95;
      if (rightLeg.current) rightLeg.current.rotation.x = 0.95;
      if (leftArm.current) leftArm.current.rotation.x = breathe * ARM_BREATH_AMPLITUDE;
      if (rightArm.current) rightArm.current.rotation.x = -breathe * ARM_BREATH_AMPLITUDE;
    } else if (speed > WALK_SPEED_EPSILON) {
      const stride = Math.sin(s.t * speed * STRIDE_FREQ + phase);
      const swing = stride * STRIDE_AMPLITUDE;
      if (leftLeg.current) leftLeg.current.rotation.x = swing;
      if (rightLeg.current) rightLeg.current.rotation.x = -swing;
      if (leftArm.current) leftArm.current.rotation.x = -swing * ARM_SWING_SCALE;
      if (rightArm.current) rightArm.current.rotation.x = swing * ARM_SWING_SCALE;
      g.position.y = Math.abs(stride) * WALK_BOB_AMPLITUDE;
    } else {
      const breathe = Math.sin(s.t * BREATH_FREQ + phase);
      g.position.y = breathe * BREATH_AMPLITUDE;
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
      if (leftArm.current) leftArm.current.rotation.x = breathe * ARM_BREATH_AMPLITUDE;
      if (rightArm.current) rightArm.current.rotation.x = -breathe * ARM_BREATH_AMPLITUDE;
    }
  });

  return (
    <group ref={root}>
      <HumanoidBody
        shirtColor={peer.color}
        propColor={peer.color}
        seated={seated}
        leftArmRef={leftArm}
        rightArmRef={rightArm}
        leftLegRef={leftLeg}
        rightLegRef={rightLeg}
      />
      {/* Billboard faces the camera every frame; Text must live INSIDE it — drei's Text
          faces +Z by default and reads mirrored from behind otherwise. */}
      <Billboard position={[0, 1.95, 0]} follow>
        <Text
          font="/fonts/Mukta-Bold.ttf"
          fontSize={0.2}
          color={peer.color}
          outlineWidth={0.014}
          outlineColor="#1a1030"
          anchorX="center"
          anchorY="bottom"
        >
          {peer.name}
        </Text>
        {hint && (
          <Text
            position={[0, -0.22, 0]}
            font="/fonts/Mukta-Bold.ttf"
            fontSize={0.14}
            color="#f3e9d8"
            outlineWidth={0.01}
            outlineColor="#1a1030"
            anchorX="center"
            anchorY="bottom"
          >
            {hint}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
