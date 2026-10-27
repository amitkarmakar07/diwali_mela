import type { Vector3 } from 'three';
import type { Activity, RideId, SeatSpot } from './netTypes';

/**
 * Where a friend sits while riding or watching.
 *
 * Each client runs its own copy of every ride, driven by its own clock, so the Ferris
 * wheel is at a different angle on every machine. Sending a friend's absolute position
 * would therefore drop them in mid-air. Instead a rider broadcasts only a SEAT INDEX,
 * and each client asks its OWN ride where that seat is right now. Both players then see
 * "he's in gondola 3", correctly placed, on their own wheel.
 *
 * Rides register a resolver on mount; the renderer calls `resolveSeat` each frame. This
 * follows the module-level registry the interactables already use rather than putting
 * per-frame data through React.
 */

/**
 * Writes the seat's CURRENT world position into `out` and returns the yaw the sitter
 * should face. Returns null when that seat index doesn't exist.
 */
export type SeatResolver = (seatIndex: number, out: Vector3) => number | null;

type Registration = { count: number; resolve: SeatResolver };

const registry = new Map<string, Registration>();

/** Called by a ride on mount. Returns an unregister function for the effect cleanup. */
export function registerSeats(id: RideId | SeatSpot, count: number, resolve: SeatResolver): () => void {
  registry.set(id, { count, resolve });
  return () => {
    // Only clear if we're still the current owner — guards against a remount race where
    // the new instance registered before the old one's cleanup ran.
    if (registry.get(id)?.resolve === resolve) registry.delete(id);
  };
}

export function resolveSeat(id: RideId | SeatSpot, seatIndex: number, out: Vector3): number | null {
  const entry = registry.get(id);
  if (!entry) return null;
  return entry.resolve(seatIndex, out);
}

export function seatCount(id: RideId | SeatSpot): number {
  return registry.get(id)?.count ?? 0;
}

/**
 * Which seat the LOCAL player took, so the network layer can broadcast it.
 *
 * Rides choose a seat themselves (the Ferris wheel boards whichever gondola is nearest
 * the ground), and that choice is not in the game store, so they publish it here as they
 * board. Mutated in place to keep it off the React path.
 */
export const localSeat: { ride: RideId | SeatSpot | null; index: number } = {
  ride: null,
  index: 0,
};

export function setLocalSeat(ride: RideId | SeatSpot, index: number): void {
  localSeat.ride = ride;
  localSeat.index = index;
}

export function clearLocalSeat(): void {
  localSeat.ride = null;
  localSeat.index = 0;
}

/** Builds the activity to broadcast from whatever the local player is currently doing. */
export function activityForRide(ride: RideId | SeatSpot, index: number): Activity {
  return ride === 'movie' || ride === 'stage'
    ? { k: 'sit', p: ride, s: index }
    : { k: 'ride', r: ride, s: index };
}
