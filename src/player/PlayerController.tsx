import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { Euler, Vector3 } from 'three';
import { PLAYER } from '../config/constants';
import { useGame } from '../core/GameState';
import { playerLook, playerPosition } from './playerRef';
import type { Control } from '../core/KeyboardMap';

const MAX_PITCH = Math.PI / 2 - 0.05;

const moveDir = new Vector3();
const desired = new Vector3();
const camEuler = new Euler(0, 0, 0, 'YXZ');

export function PlayerController() {
  const body = useRef<RapierRigidBody>(null);
  const verticalVel = useRef(0);
  const { world } = useRapier();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [, getKeys] = useKeyboardControls<Control>();

  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);

  useEffect(() => {
    const ctrl = world.createCharacterController(0.02);
    ctrl.enableAutostep(0.45, 0.2, true);
    ctrl.enableSnapToGround(0.6);
    ctrl.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    ctrl.setMinSlopeSlideAngle((35 * Math.PI) / 180);
    ctrl.setApplyImpulsesToDynamicBodies(false);
    controller.current = ctrl;
    return () => {
      world.removeCharacterController(ctrl);
      controller.current = null;
    };
  }, [world]);

  // Mouse look while pointer is locked. Kept custom (rather than drei's
  // PointerLockControls) so yaw is shared with movement and the camera can be
  // handed off cleanly to ride rigs.
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const lookMode = useGame.getState().mode;
      if (lookMode !== 'exploring' && lookMode !== 'riding') return;
      playerLook.yaw -= e.movementX * PLAYER.mouseSensitivity;
      playerLook.pitch -= e.movementY * PLAYER.mouseSensitivity;
      playerLook.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, playerLook.pitch));
    };

    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      const { started, mode, setPaused } = useGame.getState();
      if (!locked && started && mode === 'exploring') setPaused(true);
    };

    // Browsers block re-locking for a moment after Escape, so let a click on the
    // world recover mouse look instead of stranding the player without it.
    const onClick = () => {
      const { started, mode } = useGame.getState();
      if (!started || mode !== 'exploring') return;
      if (document.pointerLockElement === canvas) return;
      canvas.requestPointerLock?.();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('pointerlockchange', onLockChange);
    canvas.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('click', onClick);
    };
  }, [gl]);

  useFrame((_, rawDelta) => {
    const rb = body.current;
    const ctrl = controller.current;
    if (!rb || !ctrl) return;

    const delta = Math.min(rawDelta, 0.05);
    const { mode } = useGame.getState();
    const translation = rb.translation();

    playerPosition.set(translation.x, translation.y, translation.z);

    if (mode === 'riding') return;

    if (mode === 'exploring') {
      const keys = getKeys();
      const speed = keys.run ? PLAYER.runSpeed : PLAYER.walkSpeed;

      const forward = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
      const strafe = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

      moveDir.set(0, 0, 0);
      if (forward !== 0 || strafe !== 0) {
        const sin = Math.sin(playerLook.yaw);
        const cos = Math.cos(playerLook.yaw);
        moveDir.x = -sin * forward + cos * strafe;
        moveDir.z = -cos * forward - sin * strafe;
        moveDir.normalize().multiplyScalar(speed * delta);
      }

      const grounded = ctrl.computedGrounded();
      if (grounded && verticalVel.current <= 0) {
        verticalVel.current = keys.jump ? PLAYER.jumpSpeed : -0.5;
      } else {
        verticalVel.current += PLAYER.gravity * delta;
      }

      desired.set(moveDir.x, verticalVel.current * delta, moveDir.z);

      const collider = rb.collider(0);
      ctrl.computeColliderMovement(collider, desired);
      const movement = ctrl.computedMovement();

      rb.setNextKinematicTranslation({
        x: translation.x + movement.x,
        y: translation.y + movement.y,
        z: translation.z + movement.z,
      });
    }

    camEuler.set(playerLook.pitch, playerLook.yaw, 0);
    camera.quaternion.setFromEuler(camEuler);
    // Capsule origin is its center; offset to put the eye at eyeHeight above the feet.
    camera.position.set(
      translation.x,
      translation.y + PLAYER.eyeHeight - (PLAYER.capsuleHalfHeight + PLAYER.capsuleRadius),
      translation.z,
    );
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={PLAYER.spawn}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[PLAYER.capsuleHalfHeight, PLAYER.capsuleRadius]} />
    </RigidBody>
  );
}
