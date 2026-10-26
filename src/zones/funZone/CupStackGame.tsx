import { useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { FUN_ZONE, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { BoothShell } from './BoothShell';
import { MiniGameRig } from './MiniGameRig';

const GAME_ID = 'cup-stack';
const {
  balls: BALL_COUNT,
  duration,
  speed,
  gravity,
  tableZ,
  tableTop,
  cupRadius,
  cupHeight,
  rows,
  hitRadius,
  cooldown,
  maxFlight,
} = FUN_ZONE.cupStack;

const DECK_Y = tableTop + 0.05;
const FALL_DURATION = 0.5;
// Ball steps are capped well under a cup's size so a long frame cannot tunnel through the stack.
const SUB_STEP = 0.012;

interface CupSpec {
  x: number;
  y: number;
  row: number;
  color: string;
}

const CUPS: CupSpec[] = [];
for (let r = 0; r < rows; r++) {
  const count = rows - r;
  for (let i = 0; i < count; i++) {
    CUPS.push({
      x: (i - (count - 1) / 2) * 0.3,
      y: DECK_Y + cupRadius + r * cupHeight,
      row: r,
      color: r % 2 === 0 ? PALETTE.warmBright : PALETTE.magenta,
    });
  }
}

// Retuned for 5 balls (was 12): a hit also topples cups stacked above it, so clearing
// all CUPS.length is still possible via chain reactions, but the middle tiers are
// lower since there are far fewer throws to work with.
function prizeFor(down: number) {
  if (down >= CUPS.length) return 'the grand prize hamper';
  if (down >= 5) return 'a brass diya set';
  if (down >= 3) return 'a bag of sugar batasha';
  return 'a consolation balloon';
}

interface CupStackGameProps {
  /** Booth origin in world space; everything below is booth-local. */
  origin: [number, number, number];
}

export function CupStackGame({ origin }: CupStackGameProps) {
  const cupRefs = useRef<(Group | null)[]>([]);
  const ballRef = useRef<Mesh>(null);
  const fallT = useRef<number[]>(CUPS.map(() => -1));
  const fallDir = useRef<number[]>(CUPS.map(() => 1));
  const ball = useRef({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, flight: 0 });
  const thrown = useRef(0);
  const down = useRef(0);
  const since = useRef(0);
  const remaining = useRef(duration);
  const shownSecond = useRef(-1);
  const outro = useRef(-1);

  const publish = (result: string | null) => {
    shownSecond.current = Math.ceil(remaining.current);
    useGame.getState().setGameStatus({
      title: 'Pyramid Giraao',
      hint: 'Mouse to aim · Click or Space to throw · E to leave',
      score: down.current,
      scoreLabel: 'Cups down',
      attemptsLeft: BALL_COUNT - thrown.current,
      attemptsLabel: 'Balls left',
      timeLeft: Math.max(0, shownSecond.current),
      result,
    });
  };

  const syncMeshes = () => {
    CUPS.forEach((cup, i) => {
      const group = cupRefs.current[i];
      if (!group) return;
      const t = fallT.current[i];
      if (t < 0) {
        group.position.set(cup.x, cup.y, tableZ);
        group.rotation.set(0, 0, 0);
        return;
      }
      const p = Math.min(1, t / FALL_DURATION);
      const ease = p * p * (3 - 2 * p);
      group.position.set(
        cup.x + fallDir.current[i] * 0.22 * ease,
        cup.y + (DECK_Y + cupRadius - cup.y) * ease,
        tableZ - 0.4 * ease,
      );
      group.rotation.set(-Math.PI / 2 * ease, 0, fallDir.current[i] * 0.35 * ease);
    });
    const mesh = ballRef.current;
    if (mesh) {
      mesh.visible = ball.current.active;
      mesh.position.set(ball.current.x, ball.current.y, ball.current.z);
    }
  };

  const reset = () => {
    fallT.current = CUPS.map(() => -1);
    ball.current.active = false;
    thrown.current = 0;
    down.current = 0;
    since.current = 0;
    remaining.current = duration;
    shownSecond.current = -1;
    outro.current = -1;
    syncMeshes();
  };

  const start = () => {
    reset();
    publish(null);
  };

  const finish = () => {
    const earned = prizeFor(down.current);
    const coinsWon = useGame.getState().awardCoins(1, 5);
    // The clock can run out mid-throw; drop the ball so it does not hang in the air.
    ball.current.active = false;
    syncMeshes();
    outro.current = FUN_ZONE.outroDelay;
    publish(`${down.current} of ${CUPS.length} cups down — you win ${earned}!`);
    useGame.getState().showToast(`Pyramid Giraao: ${down.current} cups down. Prize — ${earned}! +${coinsWon} coins`);
  };

  const topple = (index: number, fromX: number) => {
    fallT.current[index] = 0;
    fallDir.current[index] = fromX <= CUPS[index].x ? 1 : -1;
    down.current += 1;
    // A cup never floats: anything resting on the one that was hit comes down too.
    CUPS.forEach((cup, i) => {
      if (fallT.current[i] >= 0) return;
      if (cup.row <= CUPS[index].row) return;
      if (Math.abs(cup.x - CUPS[index].x) > 0.33) return;
      fallT.current[i] = 0;
      fallDir.current[i] = cup.x <= CUPS[index].x ? -1 : 1;
      down.current += 1;
    });
  };

  const fire = (aimOrigin: Vector3, dir: Vector3) => {
    if (outro.current >= 0) return;
    if (ball.current.active) return;
    if (since.current < cooldown) return;
    if (thrown.current >= BALL_COUNT) return;

    const b = ball.current;
    b.x = aimOrigin.x - origin[0] + dir.x * 0.4;
    b.y = aimOrigin.y - origin[1] + dir.y * 0.4 - 0.18;
    b.z = aimOrigin.z - origin[2] + dir.z * 0.4;
    b.vx = dir.x * speed;
    b.vy = dir.y * speed;
    b.vz = dir.z * speed;
    b.flight = 0;
    b.active = true;

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

    remaining.current = Math.max(0, remaining.current - delta);

    for (let i = 0; i < CUPS.length; i++) {
      if (fallT.current[i] >= 0 && fallT.current[i] < FALL_DURATION) fallT.current[i] += delta;
    }

    const b = ball.current;
    let scored = false;
    if (b.active) {
      const steps = Math.max(1, Math.ceil(delta / SUB_STEP));
      const step = delta / steps;
      for (let s = 0; s < steps && b.active; s++) {
        b.flight += step;
        b.vy += gravity * step;
        b.x += b.vx * step;
        b.y += b.vy * step;
        b.z += b.vz * step;

        if (Math.abs(b.z - tableZ) < 0.22) {
          for (let i = 0; i < CUPS.length; i++) {
            if (fallT.current[i] >= 0) continue;
            if (Math.abs(b.x - CUPS[i].x) > hitRadius) continue;
            if (Math.abs(b.y - CUPS[i].y) > hitRadius) continue;
            topple(i, b.x);
            scored = true;
            b.active = false;
            break;
          }
        }

        if (b.active && (b.y <= 0.05 || b.flight > maxFlight)) b.active = false;
      }
    }

    syncMeshes();

    const ranOut = thrown.current >= BALL_COUNT && !b.active;
    if (scored || Math.ceil(remaining.current) !== shownSecond.current) publish(null);
    if (down.current >= CUPS.length || ranOut || remaining.current <= 0) finish();
  };

  return (
    <group position={origin}>
      <Interactable
        id="fun-cup-stack"
        position={[0, 1.2, 1.9]}
        label="Play Cup Stacking"
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
        title="Pyramid Giraao"
        subtitle={`CUP STACKING · ${duration}s, ${BALL_COUNT} balls`}
        color={PALETTE.marigold}
        awningColor={PALETTE.magenta}
      >
        <mesh position={[0, tableTop, tableZ]} receiveShadow>
          <boxGeometry args={[3.0, 0.1, 1.6]} />
          <meshStandardMaterial color="#5c3f2c" roughness={0.9} />
        </mesh>
        {[
          [-1.3, -0.3],
          [1.3, -0.3],
          [-1.3, -1.7],
          [1.3, -1.7],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, tableTop / 2, lz]}>
            <cylinderGeometry args={[0.06, 0.06, tableTop, 6]} />
            <meshStandardMaterial color="#2f2621" roughness={0.9} />
          </mesh>
        ))}

        {CUPS.map((cup, i) => (
          <group key={i} ref={(el) => (cupRefs.current[i] = el)} position={[cup.x, cup.y, tableZ]}>
            <mesh castShadow>
              <cylinderGeometry args={[cupRadius, cupRadius * 0.72, cupHeight, 14]} />
              <meshStandardMaterial color={cup.color} roughness={0.55} metalness={0.15} />
            </mesh>
            <mesh position={[0, cupHeight / 2 - 0.02, 0]}>
              <torusGeometry args={[cupRadius * 0.95, 0.015, 6, 16]} />
              <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}

        <mesh ref={ballRef} visible={false} castShadow>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial
            color={PALETTE.deepRed}
            emissive={PALETTE.deepRed}
            emissiveIntensity={0.5}
            roughness={0.5}
          />
        </mesh>

        <mesh position={[-2.0, 1.2, 0.9]}>
          <cylinderGeometry args={[0.28, 0.3, 0.3, 14]} />
          <meshStandardMaterial color="#3a3240" metalness={0.4} roughness={0.6} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-2.0 + (i - 1) * 0.12, 1.4, 0.9 + (i % 2) * 0.1]}>
            <sphereGeometry args={[0.075, 10, 10]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.6} />
          </mesh>
        ))}
      </BoothShell>
    </group>
  );
}
