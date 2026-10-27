import { create } from 'zustand';
import { INTERP_DELAY_MS, PLAYER_COLORS, loadSavedPlayer, savePlayerProfile } from './netConfig';
import { WALKING } from './netTypes';
import type { Activity, ConnectionStatus, MovePayload, PeerInfo, PeerMotion } from './netTypes';

interface NetState {
  status: ConnectionStatus;
  roomId: string | null;
  selfName: string;
  selfColor: string;
  /** What this player is doing, mirrored here so the invite panel can show it. */
  selfActivity: Activity;
  /** Identity and activity only. Positions live in `peerMotion` below. */
  peers: Record<string, PeerInfo>;
  /** The room hit MAX_PEERS and further arrivals are being ignored. */
  roomFull: boolean;

  setStatus: (status: ConnectionStatus) => void;
  setRoomId: (roomId: string | null) => void;
  setProfile: (name: string, color: string) => void;
  setSelfActivity: (activity: Activity) => void;
  setRoomFull: (full: boolean) => void;
  upsertPeer: (id: string, partial: Partial<PeerInfo>) => void;
  removePeer: (id: string) => void;
  clearPeers: () => void;
}

const saved = loadSavedPlayer();

/** First-time players get a random colour rather than all defaulting to the same gold,
 *  so a room of friends who never opened the colour picker still reads apart. */
const defaultColor = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

/** Shown until a peer's `hello` arrives, which is usually within a frame or two. */
const PLACEHOLDER_NAME = 'Friend';

export const useNet = create<NetState>((set) => ({
  status: 'offline',
  roomId: null,
  selfName: saved?.name ?? '',
  selfColor: saved?.color ?? defaultColor,
  selfActivity: WALKING,
  peers: {},
  roomFull: false,

  setStatus: (status) => set({ status }),
  setRoomId: (roomId) => set({ roomId }),

  setProfile: (name, color) => {
    set({ selfName: name, selfColor: color });
    savePlayerProfile({ name, color });
  },

  setSelfActivity: (selfActivity) => set({ selfActivity }),

  setRoomFull: (roomFull) => set((s) => (s.roomFull === roomFull ? s : { roomFull })),

  upsertPeer: (id, partial) =>
    set((s) => {
      const existing = s.peers[id];
      const next: PeerInfo = existing
        ? { ...existing, ...partial, id }
        : {
            id,
            name: partial.name ?? PLACEHOLDER_NAME,
            color: partial.color ?? PLAYER_COLORS[0],
            activity: partial.activity ?? WALKING,
          };
      return { peers: { ...s.peers, [id]: next } };
    }),

  removePeer: (id) =>
    set((s) => {
      if (!(id in s.peers)) return s;
      const peers = { ...s.peers };
      delete peers[id];
      return { peers };
    }),

  // Returning the state unchanged is a real no-op in zustand, so leaving a room twice
  // doesn't wake every subscriber.
  clearPeers: () => set((s) => (Object.keys(s.peers).length === 0 ? s : { peers: {} })),
}));

/**
 * Live positions, deliberately outside React. Each peer rewrites this ~12 times a
 * second, which through a store would re-render the whole tree; `playerPosition` and
 * `playerLook` dodge the same problem the same way.
 */
export const peerMotion = new Map<string, PeerMotion>();

/**
 * Roughly a second of history at MOVE_HZ — far more than INTERP_DELAY_MS needs, so a
 * burst of late packets can't shove the bracketing pair off the front, while a peer
 * whose tab was backgrounded can't hand us minutes of stale samples to replay.
 */
const MAX_SAMPLES = 12;

export function ingestMove(peerId: string, p: MovePayload, nowMs: number): void {
  let motion = peerMotion.get(peerId);
  if (!motion) {
    // Seed the rendered values from this first packet. Starting them at zero would make
    // every arriving friend slide in across the mela from the world origin.
    motion = { buffer: [], x: p.x, z: p.z, yw: p.yw, lastSeen: nowMs };
    peerMotion.set(peerId, motion);
  }
  motion.lastSeen = nowMs;
  motion.buffer.push({ t: nowMs, x: p.x, z: p.z, yw: p.yw });
  if (motion.buffer.length > MAX_SAMPLES) {
    motion.buffer.splice(0, motion.buffer.length - MAX_SAMPLES);
  }
}

/**
 * Plays the sample buffers out at `nowMs - INTERP_DELAY_MS`, so there is always a pair
 * of real packets to interpolate between instead of a snap on each arrival. Call once
 * per frame before reading `peerMotion`.
 */
export function stepPeerMotion(nowMs: number): void {
  const renderAt = nowMs - INTERP_DELAY_MS;

  for (const motion of peerMotion.values()) {
    const buf = motion.buffer;
    if (buf.length === 0) continue;

    // Advance to the newest sample that render time has already reached; it is the lower
    // end of the bracket, so everything strictly before it is spent and can go.
    let base = 0;
    while (base + 1 < buf.length && buf[base + 1].t <= renderAt) base++;
    if (base > 0) buf.splice(0, base);

    const from = buf[0];
    const to = buf[1];

    if (!to || renderAt <= from.t) {
      // Nothing newer has landed yet (or the delay hasn't caught up to the first packet).
      // Hold rather than extrapolate: a guessed position has to be taken back when the
      // real one arrives, which reads as the avatar twitching backwards.
      motion.x = from.x;
      motion.z = from.z;
      motion.yw = from.yw;
      continue;
    }

    const span = to.t - from.t;
    const k = span > 0 ? Math.min(1, (renderAt - from.t) / span) : 1;
    motion.x = from.x + (to.x - from.x) * k;
    motion.z = from.z + (to.z - from.z) * k;
    // Shortest way round the circle. Lerping the raw difference sends a peer who turns
    // past -PI spinning the long way, as NPC.tsx found with its wander headings.
    const turn = Math.atan2(Math.sin(to.yw - from.yw), Math.cos(to.yw - from.yw));
    motion.yw = from.yw + turn * k;
  }
}

export function removePeerMotion(id: string): void {
  peerMotion.delete(id);
}

export function clearPeerMotion(): void {
  peerMotion.clear();
}
