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
  funZone: [30, -5] as [number, number],
  courtyard: [28, -34] as [number, number],
  culturalStage: [26, 22] as [number, number],
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

export const FUN_ZONE = {
  position: [ZONES.funZone[0], 0, ZONES.funZone[1]] as [number, number, number],
  padWidth: 28,
  padDepth: 18,
  padCenterZ: -0.5,
  /** Branch path joining the carnival pad to the main promenade edge at x = 8. */
  branchZ: -2,
  branchInnerX: -13,
  branchOuterX: -22,
  branchWidth: 3.6,
  /** Booth origins in zone-local space. Every booth faces +Z, so in-game yaw 0 aims at its targets. */
  boothZ: -6,
  boothX: [-8.5, 0, 8.5] as [number, number, number],
  /** Booth-local eye the view locks to during a game: clear of the counter at z = 1.0. */
  standZ: 2.3,
  standEye: 1.6,
  /** Aim is clamped so the player cannot spin away from the booth mid-game. */
  yawLimit: 0.55,
  pitchMin: -0.5,
  pitchMax: 0.45,
  /** Grace period before E exits, so the entering press is not read as "leave". */
  exitGrace: 0.6,
  /** Delay between the final attempt resolving and the automatic return to exploring. */
  outroDelay: 2.4,
  ringToss: {
    rings: 6,
    speed: 8.5,
    gravity: -9.8,
    pegTop: 1.05,
    catchRadius: 0.27,
    cooldown: 0.35,
    maxFlight: 2.6,
  },
  balloonShoot: {
    cols: 5,
    rows: 2,
    shots: 12,
    spacingX: 0.65,
    rowY: [1.32, 2.0] as [number, number],
    boardZ: -1.12,
    radius: 0.24,
    /** Half the 0.68 row gap: any lower leaves a band between rows that can hit nothing. */
    hitRadius: 0.34,
    tracerSpeed: 26,
    cooldown: 0.22,
  },
  cupStack: {
    balls: 12,
    duration: 30,
    speed: 11,
    gravity: -9.8,
    tableZ: -1.0,
    tableTop: 0.9,
    cupRadius: 0.13,
    cupHeight: 0.26,
    rows: 4,
    hitRadius: 0.22,
    cooldown: 0.3,
    maxFlight: 2.2,
  },
};

export const CULTURAL_STAGE = {
  position: [ZONES.culturalStage[0], 0, ZONES.culturalStage[1]] as [number, number, number],
  stageWidth: 10,
  stageDepth: 6,
  /** Stage sits toward the back of the pad; audience benches fill the space in front of it. */
  stageZ: -6,
  stageHeight: 1.0,
  pillarX: 5.2,
  pillarHeight: 5.5,
  backdropZ: -8.8,
  speakerX: 6.3,
  speakerHeight: 3,
  benchRowZ: [-1.2, 1.2, 3.6] as [number, number, number],
  benchX: [-2.6, 2.6] as [number, number],
  /** Eye height of a seated audience member — lower than PLAYER.eyeHeight. */
  seatEyeHeight: 1.05,
  seatLocal: [0, -1.0] as [number, number],
  /** Branch path joining the pad to the main promenade edge at x = 8.5. */
  branchZ: 0,
  branchInnerX: -9,
  branchOuterX: -17.5,
  branchWidth: 3.4,
  towerX: 7.6,
  towerZ: -3.2,
  towerHeight: 4.6,
  rideDuration: 26,
};

export const CAROUSEL = {
  position: [-15, 0, -22] as [number, number, number],
  // Wide, shallow tent canopy - noticeably wider than the platform (reference: Ghode Wala Jhoola).
  roofRadius: 7.6,
  canopyHeight: 2.4,
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
  /** Riders look outward across the fairground with a slight downward tilt. */
  viewPitch: -0.12,
  rideDuration: 20,
};

export const SWING_BOAT = {
  position: [-45, 0, -24] as [number, number, number],
  pivotHeight: 9.2,
  armLength: 6.8,
  maxAngle: 0.95,
  period: 4.6,
  rideDuration: 22,
  /** Eye height above the keel: just clear of the 1.2 m hull wall, not inside it. */
  seatHeight: 1.45,
  /** Along the hull (+X), ahead of the swing arm so the mast is behind the camera. */
  seatForward: 0.6,
  /** Look along the boat toward the mela (+X); A-frame legs frame the edges. */
  viewYaw: -Math.PI / 2,
  viewPitch: 0.1,
  /** Extra upward tilt at the apexes - this ride is deliberately sky-heavy. */
  skyTilt: 0.55,
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
  /** The gondola view stays aimed here: the heart of the mela, seen from height. */
  lookTarget: [0, 1.5, 0] as [number, number, number],
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
