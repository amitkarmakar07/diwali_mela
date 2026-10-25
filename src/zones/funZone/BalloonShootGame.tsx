import { useRef } from 'react';
import type { Mesh, Vector3 } from 'three';
import { FUN_ZONE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { BoothShell } from './BoothShell';
import { MiniGameRig } from './MiniGameRig';

const GAME_ID = 'balloon-shoot';
const {
  cols,
  rows,
  shots: SHOT_COUNT,
  spacingX,
  rowY,
  boardZ,
  radius,
  hitRadius,
  tracerSpeed,
  cooldown,
} = FUN_ZONE.balloonShoot;

const POP_DURATION = 0.3;
const TRACER_COUNT = 4;

// Level from the stand, the ray crosses the board almost exactly between the two rows,
// so the game opened with the crosshair on the one spot that can hit nothing.
const AIM_PITCH = Math.atan2(rowY[1] - FUN_ZONE.standEye, FUN_ZONE.standZ - boardZ);

interface Balloon {
  x: number;
  y: number;
  color: string;
  popT: number;
}

interface Tracer {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

const BALLOONS: Array<{ x: number; y: number; color: string }> = [];
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    BALLOONS.push({
      x: (c - (cols - 1) / 2) * spacingX,
      y: rowY[r],
      color: PALETTE.bulbColors[(r * cols + c) % PALETTE.bulbColors.length],
    });
  }
}

function prizeFor(hits: number) {
  if (hits >= 9) return 'the top-shelf stuffed elephant';
  if (hits >= 6) return 'a glass bangle set';
  if (hits >= 3) return 'a packet of sparklers';
  return 'a consolation whistle';
}

interface BalloonShootGameProps {
  /** Booth origin in world space; everything below is booth-local. */
  origin: [number, number, number];
}

export function BalloonShootGame({ origin }: BalloonShootGameProps) {
  const balloonRefs = useRef<(Mesh | null)[]>([]);
  const tracerRefs = useRef<(Mesh | null)[]>([]);
  const balloons = useRef<Balloon[]>(BALLOONS.map((b) => ({ ...b, popT: -1 })));
  const tracers = useRef<Tracer[]>(
    Array.from({ length: TRACER_COUNT }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
    })),
  );
  const fired = useRef(0);
  const hits = useRef(0);
  const since = useRef(0);
  const outro = useRef(-1);

  const publish = (result: string | null) => {
    useGame.getState().setGameStatus({
      title: 'Nishana Lagao',
      hint: 'Mouse to aim · Click or Space to shoot · E to leave',
      score: hits.current,
      scoreLabel: 'Balloons popped',
      attemptsLeft: SHOT_COUNT - fired.current,
      attemptsLabel: 'Shots left',
      timeLeft: null,
      result,
    });
  };

  const syncMeshes = () => {
    balloons.current.forEach((balloon, i) => {
      const mesh = balloonRefs.current[i];
      if (!mesh) return;
      if (balloon.popT < 0) {
        mesh.visible = true;
        mesh.scale.setScalar(1);
        return;
      }
      const t = balloon.popT / POP_DURATION;
      if (t >= 1) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.scale.setScalar(t < 0.35 ? 1 + t : Math.max(0.001, 1.35 * (1 - (t - 0.35) / 0.65)));
    });
    tracers.current.forEach((tracer, i) => {
      const mesh = tracerRefs.current[i];
      if (!mesh) return;
      mesh.visible = tracer.active;
      mesh.position.set(tracer.x, tracer.y, tracer.z);
    });
  };

  const reset = () => {
    balloons.current = BALLOONS.map((b) => ({ ...b, popT: -1 }));
    tracers.current.forEach((t) => {
      t.active = false;
    });
    fired.current = 0;
    hits.current = 0;
    since.current = 0;
    outro.current = -1;
    syncMeshes();
  };

  const start = () => {
    reset();
    publish(null);
  };

  const finish = () => {
    const earned = prizeFor(hits.current);
    outro.current = FUN_ZONE.outroDelay;
    publish(`${hits.current} of ${BALLOONS.length} balloons popped — you win ${earned}!`);
    useGame.getState().showToast(`Nishana Lagao: ${hits.current} popped. Prize — ${earned}!`);
  };

  const fire = (aimOrigin: Vector3, dir: Vector3) => {
    if (outro.current >= 0) return;
    if (since.current < cooldown) return;
    if (fired.current >= SHOT_COUNT) return;

    const tracer = tracers.current.find((t) => !t.active);
    const localX = aimOrigin.x - origin[0];
    const localY = aimOrigin.y - origin[1];
    const localZ = aimOrigin.z - origin[2];

    if (tracer) {
      tracer.active = true;
      tracer.x = localX + dir.x * 0.4;
      tracer.y = localY + dir.y * 0.4 - 0.12;
      tracer.z = localZ + dir.z * 0.4;
      tracer.vx = dir.x * tracerSpeed;
      tracer.vy = dir.y * tracerSpeed;
      tracer.vz = dir.z * tracerSpeed;
      tracer.life = 0;
    }

    fired.current += 1;
    since.current = 0;

    // The pellet is fast enough to treat as a ray: resolve the hit analytically so
    // scoring never depends on the frame step, and let the tracer be decoration.
    if (dir.z < -0.1) {
      const t = (boardZ - localZ) / dir.z;
      const hitX = localX + dir.x * t;
      const hitY = localY + dir.y * t;
      let best = -1;
      let bestDist = hitRadius;
      balloons.current.forEach((balloon, i) => {
        if (balloon.popT >= 0) return;
        const dist = Math.hypot(hitX - balloon.x, hitY - balloon.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      if (best >= 0) {
        balloons.current[best].popT = 0;
        hits.current += 1;
      }
    }

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

    for (const balloon of balloons.current) {
      if (balloon.popT >= 0 && balloon.popT < POP_DURATION) balloon.popT += delta;
    }

    for (const tracer of tracers.current) {
      if (!tracer.active) continue;
      tracer.life += delta;
      tracer.x += tracer.vx * delta;
      tracer.y += tracer.vy * delta;
      tracer.z += tracer.vz * delta;
      if (tracer.z <= boardZ || tracer.life > 0.6) tracer.active = false;
    }

    syncMeshes();

    if (fired.current >= SHOT_COUNT && !tracers.current.some((t) => t.active)) finish();
  };

  return (
    <group position={origin}>
      <Interactable
        id="fun-balloon-shoot"
        position={[0, 1.2, 1.9]}
        label="Play Balloon Shoot"
        onInteract={() => useGame.getState().enterGame(GAME_ID)}
      />

      <MiniGameRig
        gameId={GAME_ID}
        stand={[origin[0], FUN_ZONE.standEye, origin[2] + FUN_ZONE.standZ]}
        aimPitch={AIM_PITCH}
        onStart={start}
        onReset={reset}
        onFrame={frame}
        onFire={fire}
      />

      <BoothShell
        title="Nishana Lagao"
        subtitle="BALLOON SHOOT · 12 shots, 10 balloons"
        color={PALETTE.magenta}
        awningColor={PALETTE.teal}
      >
        <mesh position={[0, 1.66, boardZ - 0.26]} receiveShadow>
          <boxGeometry args={[3.9, 1.5, 0.12]} />
          <meshStandardMaterial color="#1b1430" roughness={0.95} />
        </mesh>
        {[-1.95, 1.95].map((x) => (
          <mesh key={x} position={[x, 1.66, boardZ - 0.26]}>
            <boxGeometry args={[0.12, 1.6, 0.16]} />
            <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.2} />
          </mesh>
        ))}

        {BALLOONS.map((balloon, i) => (
          <group key={i} position={[balloon.x, balloon.y, boardZ]}>
            <mesh ref={(el) => (balloonRefs.current[i] = el)} castShadow>
              <sphereGeometry args={[radius, 14, 12]} />
              <meshStandardMaterial
                color={balloon.color}
                emissive={balloon.color}
                emissiveIntensity={0.4}
                roughness={0.45}
              />
            </mesh>
            <mesh position={[0, -radius - 0.05, 0]}>
              <coneGeometry args={[0.05, 0.1, 6]} />
              <meshStandardMaterial color={balloon.color} roughness={0.6} />
            </mesh>
          </group>
        ))}

        {Array.from({ length: TRACER_COUNT }).map((_, i) => (
          <mesh key={i} ref={(el) => (tracerRefs.current[i] = el)} visible={false}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial
              color={PALETTE.warmBright}
              emissive={PALETTE.warmBright}
              emissiveIntensity={2}
            />
          </mesh>
        ))}

        <mesh position={[-2.1, 1.3, 0.6]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[0.9, 0.1, 0.1]} />
          <meshStandardMaterial color="#2f2621" roughness={0.9} />
        </mesh>
        <mesh position={[2.1, 1.3, 0.6]} rotation={[0, -0.5, 0]}>
          <boxGeometry args={[0.9, 0.1, 0.1]} />
          <meshStandardMaterial color="#2f2621" roughness={0.9} />
        </mesh>
      </BoothShell>
    </group>
  );
}
