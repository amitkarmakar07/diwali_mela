/**
 * Wire format for multiplayer. Kept deliberately tiny: every field here is sent many
 * times a second to every other player, and in a peer-to-peer mesh each client uploads
 * its own copy to each peer, so bytes multiply with the number of friends.
 *
 * These are `type` aliases, not `interface`s, on purpose — Trystero constrains payloads
 * to its `JsonValue`, and a TS `interface` has no implicit index signature so it fails
 * that constraint while an equivalent `type` satisfies it.
 */

export type RideId = 'ferris-wheel' | 'carousel' | 'swing-boat';

/** Places you sit rather than ride: the film benches and the stage audience. */
export type SeatSpot = 'movie' | 'stage';

/**
 * What a player is doing, so friends see them in the right place doing the right thing.
 * Short keys because this rides along in every identity and activity packet.
 *
 * `s` is a seat index, not a world position. Each client runs its own copy of a ride, so
 * a wheel is at a different angle on every machine; sending an absolute position would
 * put a friend in mid-air. Sending "seat 3" instead lets each client place them on its
 * OWN wheel, which looks correct to everyone.
 */
export type Activity =
  | { k: 'walk' }
  | { k: 'ride'; r: RideId; s: number }
  | { k: 'sit'; p: SeatSpot; s: number }
  | { k: 'play'; g: string };

export const WALKING: Activity = { k: 'walk' };

/** Who a peer is. Sent once on meeting, and again to each newly arrived peer. */
export type HelloPayload = {
  name: string;
  color: string;
  act: Activity;
};

/** Position and heading. The hot path — sent on a timer while moving. */
export type MovePayload = {
  x: number;
  z: number;
  /** Yaw in radians. */
  yw: number;
};

/** Sent only when the activity actually changes, never on a timer. */
export type ActPayload = {
  act: Activity;
};

/** A peer as the rest of the app sees it. Identity and activity only — never position. */
export type PeerInfo = {
  id: string;
  name: string;
  color: string;
  activity: Activity;
};

/**
 * Live motion for one peer, mutated at network rate and read every frame.
 *
 * This is deliberately NOT React state. Positions change ~12 times a second per peer;
 * putting them in a store would re-render the tree constantly, which is exactly what
 * the existing `playerPosition` / `playerLook` module refs avoid. Same pattern here.
 */
export type PeerMotion = {
  /** Timestamped samples waiting to be played out, oldest first. */
  buffer: { t: number; x: number; z: number; yw: number }[];
  /** Smoothed values the renderer reads. Mutated in place. */
  x: number;
  z: number;
  yw: number;
  /** performance.now() of the last packet, for dropping silent peers. */
  lastSeen: number;
};

export type ConnectionStatus = 'offline' | 'connecting' | 'online' | 'error';
