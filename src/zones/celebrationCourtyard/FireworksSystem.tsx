import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { FIREWORKS, COURTYARD, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';

const MAX = FIREWORKS.maxParticles;
const KIND_ROCKET = 1;
const KIND_TRAIL = 2;
const KIND_BURST = 3;
const TRAIL_INTERVAL = 0.045;
const ROCKET_COLOR = PALETTE.warmBright;
const TRAIL_COLOR = PALETTE.warm;

const scratchDir = new Vector3();
const scratchColor = new Color();

interface FinaleStage {
  duration: number;
  intervalMin: number;
  intervalMax: number;
  rocketsPerTick: number;
  colors: string[];
}

// Building rhythm -> varied colour -> rapid climax. A real choreographed sequence,
// not the uniform random drip the diya-threshold "show" used to be.
const FINALE_STAGES: FinaleStage[] = [
  { duration: 5, intervalMin: 0.9, intervalMax: 1.3, rocketsPerTick: 1, colors: [PALETTE.warmBright] },
  { duration: 5, intervalMin: 0.5, intervalMax: 0.75, rocketsPerTick: 1, colors: [PALETTE.gold, PALETTE.marigold] },
  { duration: 4.5, intervalMin: 0.3, intervalMax: 0.45, rocketsPerTick: 2, colors: PALETTE.fireworkColors },
  { duration: 1.3, intervalMin: 0.12, intervalMax: 0.12, rocketsPerTick: 3, colors: PALETTE.fireworkColors },
];

function randomOnSphere(out: Vector3) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  out.set(r * Math.cos(theta), u, r * Math.sin(theta));
}

interface Pool {
  points: Points;
  position: Float32Array;
  velocity: Float32Array;
  customColor: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  baseSize: Float32Array;
  kind: Uint8Array;
  apexY: Float32Array;
  trailTimer: Float32Array;
  alive: Uint8Array;
  free: number[];
  /** Per-rocket forced burst colour, used by the finale so a stage's colours are
   * deterministic rather than picked fresh (randomly) at burst time. */
  burstColor: Float32Array;
  forcedColor: Uint8Array;
}

// Preallocated once: a single Points draw call with fixed-size typed-array
// buffers. Fireworks spawn/die constantly, so re-allocating geometry per
// particle or per firework would thrash the GC and break batching.
function buildPool(): Pool {
  const geometry = new BufferGeometry();
  const position = new Float32Array(MAX * 3);
  const customColor = new Float32Array(MAX * 3);
  const size = new Float32Array(MAX);
  const alpha = new Float32Array(MAX);

  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('customColor', new BufferAttribute(customColor, 3));
  geometry.setAttribute('size', new BufferAttribute(size, 1));
  geometry.setAttribute('alpha', new BufferAttribute(alpha, 1));

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new ShaderMaterial({
    uniforms: { pointTexture: { value: texture } },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      attribute vec3 customColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = customColor;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, vAlpha * tex.a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  const free: number[] = [];
  for (let i = MAX - 1; i >= 0; i--) free.push(i);

  return {
    points,
    position,
    velocity: new Float32Array(MAX * 3),
    customColor,
    size,
    alpha,
    life: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
    baseSize: new Float32Array(MAX),
    kind: new Uint8Array(MAX),
    apexY: new Float32Array(MAX),
    trailTimer: new Float32Array(MAX),
    alive: new Uint8Array(MAX),
    free,
    burstColor: new Float32Array(MAX * 3),
    forcedColor: new Uint8Array(MAX),
  };
}

function allocSlot(pool: Pool): number | null {
  if (pool.free.length === 0) return null;
  return pool.free.pop()!;
}

function freeSlot(pool: Pool, i: number) {
  pool.alive[i] = 0;
  pool.size[i] = 0;
  pool.alpha[i] = 0;
}

function spawnTrail(pool: Pool, x: number, y: number, z: number) {
  const i = allocSlot(pool);
  if (i === null) return;
  const i3 = i * 3;
  pool.position[i3] = x;
  pool.position[i3 + 1] = y;
  pool.position[i3 + 2] = z;
  pool.velocity[i3] = (Math.random() - 0.5) * 0.4;
  pool.velocity[i3 + 1] = -0.3 - Math.random() * 0.5;
  pool.velocity[i3 + 2] = (Math.random() - 0.5) * 0.4;
  pool.kind[i] = KIND_TRAIL;
  pool.life[i] = FIREWORKS.trailLife;
  pool.maxLife[i] = FIREWORKS.trailLife;
  pool.baseSize[i] = 3 + Math.random() * 1.5;
  scratchColor.set(TRAIL_COLOR);
  pool.customColor[i3] = scratchColor.r;
  pool.customColor[i3 + 1] = scratchColor.g;
  pool.customColor[i3 + 2] = scratchColor.b;
  pool.alive[i] = 1;
  pool.alpha[i] = 1;
  pool.size[i] = pool.baseSize[i];
}

function spawnBurst(
  pool: Pool,
  x: number,
  y: number,
  z: number,
  forcedRGB?: { r: number; g: number; b: number } | null,
) {
  if (forcedRGB) {
    scratchColor.setRGB(forcedRGB.r, forcedRGB.g, forcedRGB.b);
  } else {
    const colorHex = PALETTE.fireworkColors[Math.floor(Math.random() * PALETTE.fireworkColors.length)];
    scratchColor.set(colorHex);
  }
  for (let n = 0; n < FIREWORKS.burstParticles; n++) {
    const i = allocSlot(pool);
    if (i === null) break;
    const i3 = i * 3;
    randomOnSphere(scratchDir);
    const speed = FIREWORKS.burstSpeed * (0.7 + Math.random() * 0.3);
    pool.position[i3] = x;
    pool.position[i3 + 1] = y;
    pool.position[i3 + 2] = z;
    pool.velocity[i3] = scratchDir.x * speed;
    pool.velocity[i3 + 1] = scratchDir.y * speed;
    pool.velocity[i3 + 2] = scratchDir.z * speed;
    pool.kind[i] = KIND_BURST;
    const life = FIREWORKS.particleLife * (0.75 + Math.random() * 0.3);
    pool.life[i] = life;
    pool.maxLife[i] = life;
    pool.baseSize[i] = 5 + Math.random() * 4;
    pool.customColor[i3] = scratchColor.r;
    pool.customColor[i3 + 1] = scratchColor.g;
    pool.customColor[i3 + 2] = scratchColor.b;
    pool.alive[i] = 1;
    pool.alpha[i] = 1;
    pool.size[i] = pool.baseSize[i];
  }
}

function launchRocket(pool: Pool, x: number, z: number, apexY: number, forcedColorHex?: string) {
  const i = allocSlot(pool);
  if (i === null) return;
  const i3 = i * 3;
  pool.position[i3] = x;
  pool.position[i3 + 1] = 0.3;
  pool.position[i3 + 2] = z;
  pool.velocity[i3] = (Math.random() - 0.5) * 0.6;
  pool.velocity[i3 + 1] = FIREWORKS.rocketSpeed;
  pool.velocity[i3 + 2] = (Math.random() - 0.5) * 0.6;
  pool.kind[i] = KIND_ROCKET;
  pool.apexY[i] = apexY;
  pool.trailTimer[i] = 0;
  pool.life[i] = 10;
  pool.maxLife[i] = 10;
  pool.baseSize[i] = 6;
  scratchColor.set(ROCKET_COLOR);
  pool.customColor[i3] = scratchColor.r;
  pool.customColor[i3 + 1] = scratchColor.g;
  pool.customColor[i3 + 2] = scratchColor.b;
  if (forcedColorHex) {
    scratchColor.set(forcedColorHex);
    pool.forcedColor[i] = 1;
    pool.burstColor[i3] = scratchColor.r;
    pool.burstColor[i3 + 1] = scratchColor.g;
    pool.burstColor[i3 + 2] = scratchColor.b;
  } else {
    pool.forcedColor[i] = 0;
  }
  pool.alive[i] = 1;
  pool.alpha[i] = 1;
  pool.size[i] = pool.baseSize[i];
}

export function FireworksSystem() {
  const pool = useMemo(() => buildPool(), []);
  const cooldownRef = useRef(0);
  const showStartedRef = useRef(false);

  // Refs drive the per-frame finale logic (cheap, no re-renders); finaleActive is a
  // thin mirror of finaleActiveRef so the manual-trigger prompt can react to it.
  const finaleActiveRef = useRef(false);
  const finaleStageIndexRef = useRef(0);
  const finaleStageTimeRef = useRef(0);
  const finaleTickTimerRef = useRef(0);
  const [finaleActive, setFinaleActive] = useState(false);

  const litCount = useGame((s) => s.litDiyaCount);

  const startFinale = () => {
    finaleActiveRef.current = true;
    finaleStageIndexRef.current = 0;
    finaleStageTimeRef.current = FINALE_STAGES[0].duration;
    finaleTickTimerRef.current = 0;
    setFinaleActive(true);
    useGame.getState().showToast('The finale begins — Shubh Diwali!');
  };

  useEffect(() => {
    if (showStartedRef.current) return;
    if (litCount < COURTYARD.litDiyaTriggersShow) return;
    showStartedRef.current = true;
    startFinale();
  }, [litCount]);

  useFrame((_, delta) => {
    if (cooldownRef.current > 0) cooldownRef.current -= delta;

    if (finaleActiveRef.current) {
      const stage = FINALE_STAGES[finaleStageIndexRef.current];
      finaleStageTimeRef.current -= delta;
      finaleTickTimerRef.current -= delta;

      if (finaleTickTimerRef.current <= 0) {
        const [px, , pz] = FIREWORKS.launchPad;
        for (let n = 0; n < stage.rocketsPerTick; n++) {
          const jx = px + (Math.random() - 0.5) * 8;
          const jz = pz + (Math.random() - 0.5) * 8;
          const color = stage.colors[Math.floor(Math.random() * stage.colors.length)];
          launchRocket(pool, jx, jz, 20 + Math.random() * 14, color);
        }
        finaleTickTimerRef.current =
          stage.intervalMin + Math.random() * (stage.intervalMax - stage.intervalMin);
      }

      if (finaleStageTimeRef.current <= 0) {
        const nextStage = finaleStageIndexRef.current + 1;
        if (nextStage >= FINALE_STAGES.length) {
          finaleActiveRef.current = false;
          setFinaleActive(false);
          useGame.getState().showToast('Shubh Diwali! The sky show has ended.');
        } else {
          finaleStageIndexRef.current = nextStage;
          finaleStageTimeRef.current = FINALE_STAGES[nextStage].duration;
          finaleTickTimerRef.current = 0;
        }
      }
    }

    for (let i = 0; i < MAX; i++) {
      if (!pool.alive[i]) continue;
      const i3 = i * 3;

      if (pool.kind[i] === KIND_ROCKET) {
        pool.position[i3] += pool.velocity[i3] * delta;
        pool.position[i3 + 1] += pool.velocity[i3 + 1] * delta;
        pool.position[i3 + 2] += pool.velocity[i3 + 2] * delta;
        pool.trailTimer[i] -= delta;
        if (pool.trailTimer[i] <= 0) {
          pool.trailTimer[i] = TRAIL_INTERVAL;
          spawnTrail(pool, pool.position[i3], pool.position[i3 + 1], pool.position[i3 + 2]);
        }
        if (pool.position[i3 + 1] >= pool.apexY[i]) {
          const forced = pool.forcedColor[i]
            ? { r: pool.burstColor[i3], g: pool.burstColor[i3 + 1], b: pool.burstColor[i3 + 2] }
            : null;
          spawnBurst(pool, pool.position[i3], pool.position[i3 + 1], pool.position[i3 + 2], forced);
          freeSlot(pool, i);
          pool.free.push(i);
        }
        continue;
      }

      pool.velocity[i3 + 1] += FIREWORKS.gravity * delta;
      pool.position[i3] += pool.velocity[i3] * delta;
      pool.position[i3 + 1] += pool.velocity[i3 + 1] * delta;
      pool.position[i3 + 2] += pool.velocity[i3 + 2] * delta;
      pool.life[i] -= delta;
      if (pool.life[i] <= 0) {
        freeSlot(pool, i);
        pool.free.push(i);
        continue;
      }
      const f = pool.life[i] / pool.maxLife[i];
      pool.alpha[i] = f;
      pool.size[i] = pool.baseSize[i] * (0.35 + 0.65 * f);
    }

    const posAttr = pool.points.geometry.getAttribute('position') as BufferAttribute;
    const colorAttr = pool.points.geometry.getAttribute('customColor') as BufferAttribute;
    const sizeAttr = pool.points.geometry.getAttribute('size') as BufferAttribute;
    const alphaAttr = pool.points.geometry.getAttribute('alpha') as BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  const handleLaunch = () => {
    if (cooldownRef.current > 0) return;
    cooldownRef.current = FIREWORKS.cooldown;
    const [px, , pz] = FIREWORKS.launchPad;
    launchRocket(pool, px, pz, 22 + Math.random() * 12);
  };

  const finaleCooldownRef = useRef(0);
  const handleTriggerFinale = () => {
    if (finaleActiveRef.current || finaleCooldownRef.current > 0) return;
    finaleCooldownRef.current = FIREWORKS.finaleCooldown;
    startFinale();
  };

  return (
    <>
      <primitive object={pool.points} />
      <Interactable
        id="fireworks-finale-trigger"
        position={[FIREWORKS.launchPad[0] + 2.4, 0, FIREWORKS.launchPad[2]]}
        radius={3}
        label={finaleActive ? 'Finale Underway' : 'Launch the Finale'}
        onInteract={handleTriggerFinale}
        enabled={!finaleActive}
      >
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.6, 0.7, 0.16, 12]} />
          <meshStandardMaterial
            color={PALETTE.deepRed}
            emissive={PALETTE.gold}
            emissiveIntensity={0.3}
            roughness={0.7}
          />
        </mesh>
      </Interactable>
      <Interactable
        id="fireworks-launch-pad"
        position={FIREWORKS.launchPad}
        radius={3}
        label="Launch a Firework"
        onInteract={handleLaunch}
      >
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <cylinderGeometry args={[1.3, 1.5, 0.2, 16]} />
          <meshStandardMaterial color="#3a2f44" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.7, 12, 1, true]} />
          <meshStandardMaterial
            color={PALETTE.deepRed}
            emissive={PALETTE.marigold}
            emissiveIntensity={0.3}
            roughness={0.6}
            side={DoubleSide}
          />
        </mesh>
      </Interactable>
    </>
  );
}
