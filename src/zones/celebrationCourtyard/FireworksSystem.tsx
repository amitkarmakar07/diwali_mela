import { useEffect, useMemo, useRef } from 'react';
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

function spawnBurst(pool: Pool, x: number, y: number, z: number) {
  const colorHex = PALETTE.fireworkColors[Math.floor(Math.random() * PALETTE.fireworkColors.length)];
  scratchColor.set(colorHex);
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

function launchRocket(pool: Pool, x: number, z: number, apexY: number) {
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
  pool.alive[i] = 1;
  pool.alpha[i] = 1;
  pool.size[i] = pool.baseSize[i];
}

export function FireworksSystem() {
  const pool = useMemo(() => buildPool(), []);
  const cooldownRef = useRef(0);
  const showActiveRef = useRef(false);
  const showTimerRef = useRef(0);
  const showRemainingRef = useRef(0);
  const showStartedRef = useRef(false);

  const litCount = useGame((s) => s.litDiyaCount);

  useEffect(() => {
    if (showStartedRef.current) return;
    if (litCount < COURTYARD.litDiyaTriggersShow) return;
    showStartedRef.current = true;
    showActiveRef.current = true;
    showTimerRef.current = 0;
    showRemainingRef.current = FIREWORKS.showLaunchCount;
    useGame.getState().showToast('The courtyard glows! Fireworks light up the sky — Shubh Diwali!');
  }, [litCount]);

  useFrame((_, delta) => {
    if (cooldownRef.current > 0) cooldownRef.current -= delta;

    if (showActiveRef.current) {
      showTimerRef.current -= delta;
      if (showTimerRef.current <= 0 && showRemainingRef.current > 0) {
        const [px, , pz] = FIREWORKS.launchPad;
        const jx = px + (Math.random() - 0.5) * 7;
        const jz = pz + (Math.random() - 0.5) * 7;
        launchRocket(pool, jx, jz, 22 + Math.random() * 12);
        showRemainingRef.current -= 1;
        showTimerRef.current = 0.45 + Math.random() * 0.55;
        if (showRemainingRef.current <= 0) showActiveRef.current = false;
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
          spawnBurst(pool, pool.position[i3], pool.position[i3 + 1], pool.position[i3 + 2]);
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

  return (
    <>
      <primitive object={pool.points} />
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
