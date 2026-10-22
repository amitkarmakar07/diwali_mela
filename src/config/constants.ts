export const PLAYER = {
  walkSpeed: 4.2,
  runSpeed: 7.4,
  eyeHeight: 1.6,
  capsuleRadius: 0.35,
  capsuleHalfHeight: 0.55,
  spawn: [0, 1.2, 60] as [number, number, number],
  gravity: -22,
  jumpSpeed: 6.5,
  mouseSensitivity: 0.0022,
};

export const INTERACT_RADIUS = 3;

export const WORLD = {
  groundSize: 150,
  minX: -56,
  maxX: 56,
  minZ: -62,
  maxZ: 62,
  wallHeight: 14,
};

export const ZONES = {
  entrance: [0, 46] as [number, number],
  promenade: [0, 10] as [number, number],
  plaza: [0, -20] as [number, number],
  rideZone: [-30, -38] as [number, number],
  carousel: [-15, -22] as [number, number],
  swingBoat: [-45, -24] as [number, number],
  foodStreet: [-30, 8] as [number, number],
  courtyard: [28, -34] as [number, number],
};

export const FOOD_STREET = {
  position: [-30, 0, 8] as [number, number, number],
  /** Lane runs along Z; stalls face inward from both sides. */
  laneHalfLength: 15,
  laneWidth: 11,
  stallOffset: 6.4,
  /** Branch path joining the lane to the main promenade at x = -8. */
  linkZ: 8,
};

export const CAROUSEL = {
  position: [-15, 0, -22] as [number, number, number],
  roofRadius: 6.2,
  platformRadius: 5.6,
  columnHeight: 4.6,
  horseCount: 8,
  horseRadius: 4.1,
  rotationSpeed: 0.42,
  bobAmplitude: 0.32,
  bobSpeed: 2.1,
  seatHeight: 1.45,
  // Eye offset above the horse's body so the rider sits on it rather than inside it.
  riderEye: 0.9,
  rideDuration: 20,
};

export const SWING_BOAT = {
  position: [-45, 0, -24] as [number, number, number],
  pivotHeight: 9.2,
  armLength: 6.8,
  maxAngle: 0.95,
  period: 4.6,
  rideDuration: 22,
  seatHeight: 1.1,
};

export const FERRIS = {
  position: [ZONES.rideZone[0], 0, ZONES.rideZone[1]] as [number, number, number],
  radius: 13,
  hubHeight: 15.5,
  gondolaCount: 12,
  rotationSpeed: 0.12,
  rideDuration: 26,
  // Gondolas hang outboard of the wheel's rims so the ride camera has a clear view.
  gondolaOffset: 2.9,
  seatDrop: -0.75,
  seatForward: 1.9,
};

export const FIREWORKS = {
  maxParticles: 1400,
  rocketSpeed: 26,
  burstParticles: 110,
  burstSpeed: 11,
  gravity: -5.2,
  particleLife: 2.1,
  trailLife: 0.5,
  cooldown: 0.45,
  launchPad: [ZONES.courtyard[0] - 2, 0, ZONES.courtyard[1] - 9] as [number, number, number],
  showLaunchCount: 7,
};

export const COURTYARD = {
  diyaCount: 8,
  litDiyaTriggersShow: 5,
};

export const PALETTE = {
  night: '#0b0a1f',
  nightFog: '#15112e',
  ground: '#3d2f28',
  path: '#6a4f3c',
  warm: '#ffb24d',
  warmBright: '#ffd79a',
  flame: '#ffc24a',
  marigold: '#ff8c1a',
  magenta: '#e0348b',
  teal: '#17b3a3',
  deepRed: '#b8213a',
  gold: '#ffcc33',
  bulbColors: ['#ff4d4d', '#ffd24d', '#4dff88', '#4db5ff', '#d44dff', '#ff944d'],
  fireworkColors: ['#ffd24d', '#ff4d6a', '#4dffa0', '#4db5ff', '#d88bff', '#fff2cc'],
};
