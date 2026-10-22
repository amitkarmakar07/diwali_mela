import { Vector3 } from 'three';
import { PLAYER } from '../config/constants';

/** Live player feet position, mutated in place each frame by PlayerController. */
export const playerPosition = new Vector3(...PLAYER.spawn);

/** Camera yaw in radians, written by the look controller, read by movement. */
export const playerLook = { yaw: 0, pitch: 0 };
