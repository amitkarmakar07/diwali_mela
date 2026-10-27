import { useFrame } from '@react-three/fiber';
import { useNet, stepPeerMotion } from './netStore';
import { RemoteAvatar } from './RemoteAvatar';

/**
 * Mounted inside the R3F Canvas (see World.tsx). Renders every other player purely from
 * network state — no physics bodies, since the local Rapier world must stay unaware of
 * friends or physics would diverge between clients.
 */
export function RemotePlayers() {
  const peers = useNet((s) => s.peers);
  const ids = Object.keys(peers);

  // Negative priority runs this useFrame before R3F's default-priority (0) callbacks,
  // which includes every RemoteAvatar's own useFrame below — so peerMotion is advanced
  // to this frame's render time before any avatar reads it. R3F runs priority-ordered
  // callbacks ascending, and ties (same priority, default 0) run in mount order, which
  // is not guaranteed across sibling components — the explicit priority removes that race.
  useFrame(() => {
    stepPeerMotion(performance.now());
  }, -1);

  if (ids.length === 0) return null;

  return (
    <>
      {ids.map((id) => (
        <RemoteAvatar key={id} peer={peers[id]} />
      ))}
    </>
  );
}
