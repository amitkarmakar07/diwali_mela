import { useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { FUN_ZONE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { BoothShell } from './BoothShell';
import { MiniGameRig } from './MiniGameRig';

const GAME_ID = 'ring-toss';
const { rings: RING_COUNT, speed, gravity, pegTop, catchRadius, cooldown, maxFlight } =
  FUN_ZONE.ringToss;

const TABLE_TOP = 0.55;
const PEGS: Array<[number, number]> = [
  [0, -1.0],
  [-0.85, -0.4],
  [0.85, -0.4],
  [-0.85, -1.6],
  [0.85, -1.6],
];
const RING_COLORS = [PALETTE.gold, PALETTE.teal, PALETTE.magenta];

type RingPhase = 'ready' | 'flying' | 'resting';

interface RingBody {
  phase: RingPhase;
  x: number;
  y: number;
  z: number;
  prevY: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  flight: number;
}

function newRing(): RingBody {
  return { phase: 'ready', x: 0, y: 0, z: 0, prevY: 0, vx: 0, vy: 0, vz: 0, spin: 0, flight: 0 };
}

function prizeFor(score: number) {
  if (score >= 4) return 'a giant stuffed tiger';
  if (score >= 2) return 'a clay piggy bank';
  if (score >= 1) return 'a paper pinwheel';
  return 'a consolation sugar candy';
}

interface RingTossGameProps {
  /** Booth origin in world space; everything below is booth-local. */
  origin: [number, number, number];
}

export function RingTossGame({ origin }: RingTossGameProps) {
  const ringRefs = useRef<(Mesh | null)[]>([]);
  const pegRefs = useRef<(Group | null)[]>([]);
  const rings = useRef<RingBody[]>(Array.from({ length: RING_COUNT }, newRing));
  const ringed = useRef<boolean[]>(PEGS.map(() => false));
  const thrown = useRef(0);
  const score = useRef(0);
  const since = useRef(0);
  const outro = useRef(-1);

  const publish = (result: string | null) => {
    useGame.getState().setGameStatus({
      title: 'Ring Toss',
      hint: 'Mouse to aim · Click or Space to throw · E to leave',
      score: score.current,
      scoreLabel: 'Pegs ringed',
      attemptsLeft: RING_COUNT - thrown.current,
      attemptsLabel: 'Rings left',
      timeLeft: null,
      result,
    });
  };

  const syncMeshes = () => {
    rings.current.forEach((ring, i) => {
      const mesh = ringRefs.current[i];
      if (!mesh) return;
      mesh.visible = ring.phase !== 'ready';
      mesh.position.set(ring.x, ring.y, ring.z);
      mesh.rotation.set(Math.PI / 2, ring.spin, 0);
    });
    pegRefs.current.forEach((peg, i) => {
      if (peg) peg.scale.setScalar(ringed.current[i] ? 1.12 : 1);
    });
  };

  const reset = () => {
    rings.current = Array.from({ length: RING_COUNT }, newRing);
    ringed.current = PEGS.map(() => false);
    thrown.current = 0;
    score.current = 0;
    since.current = 0;
    outro.current = -1;
    syncMeshes();
  };

  const start = () => {
    reset();
    publish(null);
  };

  const finish = () => {
    const earned = prizeFor(score.current);
    const coinsWon = useGame.getState().awardCoins(1, 5);
    outro.current = FUN_ZONE.outroDelay;
    publish(`${score.current} of ${PEGS.length} pegs ringed — you win ${earned}!`);
    useGame.getState().showToast(`Ring Toss: ${score.current} ringed. Prize — ${earned}! +${coinsWon} coins`);
  };

  const fire = (aimOrigin: Vector3, dir: Vector3) => {
    if (outro.current >= 0) return;
    if (since.current < cooldown) return;
    const index = rings.current.findIndex((r) => r.phase === 'ready');
    if (index < 0) return;
    if (rings.current.some((r) => r.phase === 'flying')) return;

    const ring = rings.current[index];
    // Spawn in booth-local space, a little ahead of and below the eye so the ring
    // reads as thrown from the hands rather than from the camera.
    ring.x = aimOrigin.x - origin[0] + dir.x * 0.45;
    ring.y = aimOrigin.y - origin[1] + dir.y * 0.45 - 0.2;
    ring.z = aimOrigin.z - origin[2] + dir.z * 0.45;
    ring.prevY = ring.y;
    ring.vx = dir.x * speed;
    ring.vy = dir.y * speed;
    ring.vz = dir.z * speed;
    ring.flight = 0;
    ring.phase = 'flying';

    thrown.current += 1;
    since.current = 0;
    publish(null);
  };

  const frame = (delta: number) => {
    since.current += delta;

    if (outro.current >= 0) {
      outro.current -= delta;
      if (outro.current <= 0) {
        outro.current = -1;
        useGame.getState().exitGame();
      }
      return;
    }

    let scored = false;
    for (const ring of rings.current) {
      if (ring.phase !== 'flying') continue;

      ring.flight += delta;
      ring.prevY = ring.y;
      ring.vy += gravity * delta;
      ring.x += ring.vx * delta;
      ring.y += ring.vy * delta;
      ring.z += ring.vz * delta;
      ring.spin += delta * 6;

      if (ring.vy < 0 && ring.prevY > pegTop && ring.y <= pegTop) {
        const s = (ring.prevY - pegTop) / Math.max(ring.prevY - ring.y, 1e-6);
        const crossX = ring.x - ring.vx * delta * (1 - s);
        const crossZ = ring.z - ring.vz * delta * (1 - s);
        for (let p = 0; p < PEGS.length; p++) {
          if (ringed.current[p]) continue;
          const dx = crossX - PEGS[p][0];
          const dz = crossZ - PEGS[p][1];
          if (Math.hypot(dx, dz) <= catchRadius) {
            ringed.current[p] = true;
            score.current += 1;
            scored = true;
            ring.phase = 'resting';
            ring.x = PEGS[p][0];
            ring.y = pegTop - 0.04;
            ring.z = PEGS[p][1];
            break;
          }
        }
      }

      if (ring.phase !== 'flying') continue;

      const onTable = Math.abs(ring.x) < 1.7 && ring.z < 0 && ring.z > -2.1;
      const floor = onTable ? TABLE_TOP + 0.04 : 0.04;
      if (ring.y <= floor || ring.flight > maxFlight) {
        ring.phase = 'resting';
        ring.y = floor;
      }
    }

    syncMeshes();

    if (scored) publish(null);
    if (thrown.current >= RING_COUNT && !rings.current.some((r) => r.phase === 'flying')) finish();
  };

  return (
    <group position={origin}>
      <Interactable
        id="fun-ring-toss"
        position={[0, 1.2, 1.9]}
        label="Play Ring Toss"
        onInteract={() => useGame.getState().enterGame(GAME_ID)}
      />

      <MiniGameRig
        gameId={GAME_ID}
        stand={[origin[0], FUN_ZONE.standEye, origin[2] + FUN_ZONE.standZ]}
        onStart={start}
        onReset={reset}
        onFrame={frame}
        onFire={fire}
      />

      <BoothShell
        title="Chhalla Phenko"
        subtitle="RING TOSS · 5 rings, 5 pegs"
        color={PALETTE.teal}
        awningColor={PALETTE.deepRed}
      >
        <mesh position={[0, TABLE_TOP, -1.0]} receiveShadow>
          <boxGeometry args={[3.4, 0.1, 2.2]} />
          <meshStandardMaterial color="#5c3f2c" roughness={0.9} />
        </mesh>
        {[
          [-1.5, -0.1],
          [1.5, -0.1],
          [-1.5, -1.9],
          [1.5, -1.9],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, TABLE_TOP / 2, lz]}>
            <cylinderGeometry args={[0.06, 0.06, TABLE_TOP, 6]} />
            <meshStandardMaterial color="#2f2621" roughness={0.9} />
          </mesh>
        ))}

        {PEGS.map(([px, pz], i) => (
          <group key={i} position={[px, 0, pz]} ref={(el) => (pegRefs.current[i] = el)}>
            <mesh position={[0, TABLE_TOP + 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.055, 0.5, 8]} />
              <meshStandardMaterial color={PALETTE.warmBright} roughness={0.6} />
            </mesh>
            <mesh position={[0, TABLE_TOP + 0.58, 0]}>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshStandardMaterial
                color={PALETTE.marigold}
                emissive={PALETTE.marigold}
                emissiveIntensity={0.8}
              />
            </mesh>
            <mesh position={[0, TABLE_TOP + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16, 0.02, 6, 16]} />
              <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.25} />
            </mesh>
          </group>
        ))}

        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <mesh key={i} ref={(el) => (ringRefs.current[i] = el)} visible={false} castShadow>
            <torusGeometry args={[0.17, 0.035, 8, 20]} />
            <meshStandardMaterial
              color={RING_COLORS[i % RING_COLORS.length]}
              emissive={RING_COLORS[i % RING_COLORS.length]}
              emissiveIntensity={0.45}
              roughness={0.5}
            />
          </mesh>
        ))}
      </BoothShell>
    </group>
  );
}
