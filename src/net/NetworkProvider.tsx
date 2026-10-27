import { useEffect } from 'react';
import { joinRoom } from 'trystero';
import { useGame } from '../core/GameState';
import { playerLook, playerPosition } from '../player/playerRef';
import {
  APP_ID,
  MAX_PEERS,
  MOVE_EPSILON,
  MOVE_INTERVAL_MS,
  PEER_TIMEOUT_MS,
  YAW_EPSILON,
} from './netConfig';
import { clearPeerMotion, ingestMove, peerMotion, removePeerMotion, useNet } from './netStore';
import { WALKING } from './netTypes';
import type { ActPayload, Activity, HelloPayload, MovePayload } from './netTypes';
import { activityForRide, localSeat } from './rideSeats';

/**
 * joinRoom is synchronous and the relays give no "connected" event, so the only honest
 * signals are a peer arriving and onJoinError firing. A lone host would otherwise sit on
 * "connecting" forever with an invite link they can't trust, so after this long without
 * an error we call it online — long enough for a rejected join to have come back.
 */
const RELAY_SETTLE_MS = 1500;

/** Remote names are untrusted input; the profile UI caps its own at the same length. */
const MAX_NAME = 16;

function currentActivity(): Activity {
  const { mode, activeGame } = useGame.getState();
  // Rides publish their own seat index as they board, and a seat is all that can be sent
  // — see rideSeats for why an absolute position would drop a friend in mid-air.
  if (mode === 'riding' && localSeat.ride) return activityForRide(localSeat.ride, localSeat.index);
  if (mode === 'minigame' && activeGame) return { k: 'play', g: activeGame };
  return WALKING;
}

/** Cheap value identity, so a re-derived but unchanged activity sends nothing. */
function activityKey(a: Activity): string {
  switch (a.k) {
    case 'ride':
      return `ride:${a.r}:${a.s}`;
    case 'sit':
      return `sit:${a.p}:${a.s}`;
    case 'play':
      return `play:${a.g}`;
    default:
      return 'walk';
  }
}

/**
 * Owns the whole peer-to-peer lifecycle. Renders nothing and lives outside the Canvas,
 * so it sends on a timer rather than in useFrame.
 *
 * With no room in the store this does nothing whatsoever: no relay sockets, no timers,
 * no subscriptions. Single player must not pay for multiplayer existing.
 */
export function NetworkProvider() {
  const roomId = useNet((s) => s.roomId);

  useEffect(() => {
    if (!roomId) return;

    const net = useNet.getState();
    net.setStatus('connecting');

    // Handlers can outlive the room: a relay error or an in-flight send resolves after a
    // hot reload swapped this effect, and without the guard it would write status or
    // peers belonging to a room that no longer exists.
    let disposed = false;

    const room = joinRoom({ appId: APP_ID }, roomId, {
      onJoinError: (details) => {
        if (disposed) return;
        console.warn('[net] could not join room', details);
        useNet.getState().setStatus('error');
      },
    });

    const hello = room.makeAction<HelloPayload>('hello');
    const move = room.makeAction<MovePayload>('move');
    const act = room.makeAction<ActPayload>('act');

    const goOnline = () => {
      const { status, setStatus } = useNet.getState();
      if (!disposed && status === 'connecting') setStatus('online');
    };
    const settleTimer = window.setTimeout(goOnline, RELAY_SETTLE_MS);

    /** An over-cap arrival is never admitted, so its packets are dropped on the floor. */
    const isKnown = (peerId: string) => peerId in useNet.getState().peers;

    /** Identity is the one message worth accepting from a peer onPeerJoin hasn't yet
     *  announced — losing it would leave them called "Friend" for the whole session. */
    const canIntroduce = (peerId: string) => {
      const { peers } = useNet.getState();
      return peerId in peers || Object.keys(peers).length < MAX_PEERS;
    };

    const sendHello = (target: string) => {
      const { selfName, selfColor, selfActivity } = useNet.getState();
      hello
        .send({ name: selfName, color: selfColor, act: selfActivity }, { target })
        .catch(() => {
          /* peer vanished mid-handshake — onPeerLeave will tidy up */
        });
    };

    room.onPeerJoin = (peerId) => {
      if (Object.keys(room.getPeers()).length > MAX_PEERS) {
        // In a mesh every client uploads its position to every other, so cost grows with
        // the square of the room. Past the cap we stay silent instead of melting a phone's
        // uplink; the flag lets the invite panel say the room is full.
        useNet.getState().setRoomFull(true);
        return;
      }
      // Placeholder identity first so the friend appears the moment they connect, then
      // our hello crosses with theirs and both sides fill in name and colour.
      useNet.getState().upsertPeer(peerId, {});
      sendHello(peerId);
      // Position too, aimed at just them. Moves are only sent when they change, so a
      // player standing still is silent — without this an arriving friend sees nothing
      // where we are standing until we happen to take a step.
      move
        .send({ x: playerPosition.x, z: playerPosition.z, yw: playerLook.yaw }, { target: peerId })
        .catch(() => {
          /* gone again already; onPeerLeave will tidy up */
        });
      goOnline();
    };

    room.onPeerLeave = (peerId) => {
      const { removePeer, setRoomFull } = useNet.getState();
      removePeer(peerId);
      removePeerMotion(peerId);
      if (Object.keys(room.getPeers()).length <= MAX_PEERS) setRoomFull(false);
    };

    hello.onMessage = (p, ctx) => {
      if (!canIntroduce(ctx.peerId)) return;
      useNet.getState().upsertPeer(ctx.peerId, {
        name: p.name.slice(0, MAX_NAME) || 'Friend',
        color: p.color,
        activity: p.act,
      });
    };

    act.onMessage = (p, ctx) => {
      if (!isKnown(ctx.peerId)) return;
      useNet.getState().upsertPeer(ctx.peerId, { activity: p.act });
    };

    move.onMessage = (p, ctx) => {
      if (!isKnown(ctx.peerId)) return;
      ingestMove(ctx.peerId, p, performance.now());
    };

    // NaN so the first tick always sends: a friend joining needs to know where we are
    // even if we haven't taken a step since connecting.
    let sentX = NaN;
    let sentZ = NaN;
    let sentYaw = NaN;

    const sendTimer = window.setInterval(() => {
      const { x, z } = playerPosition;
      const yaw = playerLook.yaw;
      if (
        Math.abs(x - sentX) < MOVE_EPSILON &&
        Math.abs(z - sentZ) < MOVE_EPSILON &&
        Math.abs(yaw - sentYaw) < YAW_EPSILON
      ) {
        return;
      }
      sentX = x;
      sentZ = z;
      sentYaw = yaw;
      move.send({ x, z, yw: yaw }).catch(() => {
        /* a peer dropped between ticks; the next packet goes to whoever is left */
      });
    }, MOVE_INTERVAL_MS);

    let sentActivityKey = activityKey(WALKING);

    const pushActivity = () => {
      const next = currentActivity();
      const key = activityKey(next);
      if (key === sentActivityKey) return;
      sentActivityKey = key;
      useNet.getState().setSelfActivity(next);
      act.send({ act: next }).catch(() => {
        /* nobody listening right now; the next hello carries the activity anyway */
      });
    };

    // Boarding is always a mode change, and rides set their seat before calling
    // enterRide, so the store is the one event that covers every transition. No timer:
    // an activity that hasn't changed must cost nothing.
    const unsubscribeGame = useGame.subscribe(pushActivity);

    // Identity only crossed on the join handshake, so renaming yourself or picking a new
    // colour mid-session left friends looking at the old name over your head for good.
    // Debounced because the name field fires this on every keystroke and only the
    // settled value is worth a broadcast.
    let profileTimer = 0;
    const unsubscribeProfile = useNet.subscribe((s, prev) => {
      if (s.selfName === prev.selfName && s.selfColor === prev.selfColor) return;
      window.clearTimeout(profileTimer);
      profileTimer = window.setTimeout(() => {
        if (disposed) return;
        const { selfName, selfColor, selfActivity } = useNet.getState();
        hello.send({ name: selfName, color: selfColor, act: selfActivity }).catch(() => {
          /* nobody to tell yet; the next join handshake carries it anyway */
        });
      }, 400);
    });

    const sweepTimer = window.setInterval(() => {
      const live = room.getPeers();
      const now = performance.now();
      for (const id of Object.keys(useNet.getState().peers)) {
        // A peer standing perfectly still sends no move packets, so a stale lastSeen on a
        // live connection means idle, not gone. Only a peer the room itself has stopped
        // listing is dropped — the leftover from a leave we never saw, such as a tab
        // killed or a laptop slept mid-stride.
        if (id in live) continue;
        const motion = peerMotion.get(id);
        if (motion && now - motion.lastSeen < PEER_TIMEOUT_MS) continue;
        useNet.getState().removePeer(id);
        removePeerMotion(id);
      }
    }, PEER_TIMEOUT_MS / 3);

    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
      window.clearInterval(sendTimer);
      window.clearInterval(sweepTimer);
      window.clearTimeout(profileTimer);
      unsubscribeGame();
      unsubscribeProfile();
      // Null the handlers before leaving: a half-torn-down room that still answers is how
      // a hot reload ends up with two of every avatar.
      room.onPeerJoin = null;
      room.onPeerLeave = null;
      hello.onMessage = null;
      move.onMessage = null;
      act.onMessage = null;
      room.leave().catch(() => {
        /* already gone */
      });
      const leaving = useNet.getState();
      leaving.clearPeers();
      leaving.setRoomFull(false);
      leaving.setStatus('offline');
      clearPeerMotion();
    };
  }, [roomId]);

  return null;
}
