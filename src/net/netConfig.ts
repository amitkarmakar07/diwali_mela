/** Room identity, invite links and the tuning numbers for multiplayer. */

/**
 * Namespaces this game on the public signalling relays. Bump the suffix if the wire
 * format ever changes incompatibly, so old tabs can't join new rooms and send garbage.
 */
export const APP_ID = 'diwali-mela-v1';

export const ROOM_PARAM = 'room';

/** Position sends per second. 12 is smooth once interpolated and stays cheap on mobile
 * uplink, where each client uploads its own position once per peer. */
export const MOVE_HZ = 12;
export const MOVE_INTERVAL_MS = 1000 / MOVE_HZ;

/** Don't send if the player has barely moved — standing still should cost nothing. */
export const MOVE_EPSILON = 0.02;
export const YAW_EPSILON = 0.02;

/**
 * Render peers this far behind real time. Without a delay there is nothing to
 * interpolate between and remote players snap from packet to packet; with it they move
 * continuously. Roughly one and a half send intervals.
 */
export const INTERP_DELAY_MS = 120;

/** Drop a peer whose packets stopped arriving — covers a tab closed without a clean leave. */
export const PEER_TIMEOUT_MS = 15000;

/**
 * Past this the mesh gets expensive: every client sends its position to every other, so
 * upload grows with the number of friends. Beyond ~8 this needs a relay server instead.
 */
export const MAX_PEERS = 8;

/** Avatar colours, picked to stay distinct against the night palette. */
export const PLAYER_COLORS = [
  '#ffcc33',
  '#ff6b6b',
  '#4db5ff',
  '#4dff88',
  '#d88bff',
  '#ff8c1a',
  '#36d7c4',
  '#ff5fa2',
] as const;

/** No ambiguous characters — these codes get read aloud and retyped. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoomId(): string {
  let code = '';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `diya-${code}`;
}

/** The room in the current URL, or null for a normal single-player visit. */
export function roomIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(ROOM_PARAM);
  if (!raw) return null;
  const clean = raw.trim().slice(0, 32);
  return /^[A-Za-z0-9-]+$/.test(clean) ? clean : null;
}

export function inviteUrlFor(roomId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_PARAM, roomId);
  url.hash = '';
  return url.toString();
}

/** Put the room in the address bar without reloading, so the link is copyable and a
 * refresh keeps you in the same room. */
export function setRoomInUrl(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_PARAM, roomId);
  window.history.replaceState({}, '', url.toString());
}

export function clearRoomInUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState({}, '', url.toString());
}

const NAME_KEY = 'diwali-mela/player/v1';

export type SavedPlayer = { name: string; color: string };

export function loadSavedPlayer(): SavedPlayer | null {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPlayer>;
    if (typeof parsed?.name !== 'string' || typeof parsed?.color !== 'string') return null;
    return { name: parsed.name.slice(0, 16), color: parsed.color };
  } catch {
    /* private mode or corrupt value — fall back to asking again */
    return null;
  }
}

export function savePlayerProfile(profile: SavedPlayer): void {
  try {
    localStorage.setItem(NAME_KEY, JSON.stringify(profile));
  } catch {
    /* quota or private mode — the name just won't be remembered */
  }
}
