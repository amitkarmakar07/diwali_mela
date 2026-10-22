import { PALETTE } from '../config/constants';
import type { NPCProp } from './NPC';

const festiveColors = [
  PALETTE.magenta,
  PALETTE.teal,
  PALETTE.deepRed,
  PALETTE.gold,
  PALETTE.marigold,
  '#ff69b4',
  '#00ffcc',
  '#ff6b6b',
  '#7f8cff',
  '#f4a259',
];

export interface WalkerSpec {
  waypoints: [number, number][];
  speed: number;
  color: string;
  startT: number;
  prop?: NPCProp;
}

export interface IdlerSpec {
  position: [number, number];
  color: string;
  facing: number;
  prop?: NPCProp;
}

// Cursors advance once at module load, so colours and props vary across the whole
// crowd instead of repeating per group.
let colorCursor = 0;
let propCursor = 0;

function nextColor(): string {
  return festiveColors[colorCursor++ % festiveColors.length];
}

function nextProp(): NPCProp | undefined {
  propCursor += 1;
  if (propCursor % 4 === 0) return 'balloon';
  if (propCursor % 7 === 0) return 'bag';
  return undefined;
}

/**
 * A handful of NPCs walking one path abreast reads as a family out together,
 * where the same number spread evenly reads as traffic.
 */
function makeGroup(base: [number, number][], count: number, baseSpeed: number): WalkerSpec[] {
  const [ax, az] = base[0];
  const [bx, bz] = base[1];
  const len = Math.hypot(bx - ax, bz - az) || 1;
  const px = -(bz - az) / len;
  const pz = (bx - ax) / len;

  return Array.from({ length: count }, (_, i) => {
    const lateral = (i - (count - 1) / 2) * 1.2;
    return {
      waypoints: base.map(
        ([x, z]) => [x + px * lateral, z + pz * lateral] as [number, number],
      ),
      speed: baseSpeed + ((i % 3) - 1) * 0.09,
      color: nextColor(),
      startT: i * 0.06,
      prop: nextProp(),
    };
  });
}

/** Bystanders arranged around a spot, all turned toward whatever they came to see. */
function makeCluster(
  center: [number, number],
  count: number,
  radius: number,
  faceTarget: [number, number],
): IdlerSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + (((i * 37) % 7) / 7 - 0.5) * 1.4;
    const x = center[0] + Math.cos(angle) * r;
    const z = center[1] + Math.sin(angle) * r;
    return {
      position: [x, z] as [number, number],
      color: nextColor(),
      facing: Math.atan2(faceTarget[0] - x, faceTarget[1] - z),
      prop: nextProp(),
    };
  });
}

export const npcWalkers: WalkerSpec[] = [
  // Down the promenade, entrance toward the plaza.
  ...makeGroup(
    [
      [-3, 44],
      [-3, 18],
      [-3, -6],
      [-3, -17],
    ],
    4,
    1.15,
  ),
  // Back up the promenade on the other side.
  ...makeGroup(
    [
      [4, -15],
      [4, 6],
      [4, 30],
      [4, 45],
    ],
    3,
    1.05,
  ),
  // Along the food street lane.
  ...makeGroup(
    [
      [-30, 19],
      [-30, 8],
      [-30, -3],
    ],
    3,
    0.95,
  ),
  // Heading out to the ride zone, giving the carousel a wide berth.
  ...makeGroup(
    [
      [-19, -12],
      [-25, -27],
      [-29, -33],
    ],
    3,
    1.2,
  ),
  // Circling the celebration courtyard.
  ...makeGroup(
    [
      [24, -29],
      [32, -29],
      [32, -39],
      [24, -39],
    ],
    3,
    1.0,
  ),
  // Loop around the plaza centrepiece.
  ...makeGroup(
    [
      [5.5, -12],
      [-5.5, -12],
      [-5.5, -28],
      [5.5, -28],
    ],
    2,
    0.9,
  ),
];

export const npcIdlers: IdlerSpec[] = [
  // Watching the rides from a safe distance in front of each.
  ...makeCluster([-30, -29], 3, 2.9, [-30, -38]),
  ...makeCluster([-15, -15.5], 3, 2.6, [-15, -22]),
  ...makeCluster([-45, -16.5], 2, 2.5, [-45, -24]),
  // Gathered in the courtyard where the diyas and fireworks are.
  ...makeCluster([28, -27], 3, 3.0, [28, -34]),
  // Queued at the food street counters.
  ...makeCluster([-25.8, 2], 2, 1.4, [-23.6, 2]),
  ...makeCluster([-34.2, 11], 2, 1.4, [-36.4, 11]),
  // Browsing the promenade stalls.
  ...makeCluster([8.6, 24], 2, 1.8, [10.5, 24]),
  ...makeCluster([-8.6, 15], 2, 1.8, [-10.5, 15]),
  // Taking in the arch on the way in.
  ...makeCluster([0, 44], 3, 3.2, [0, 30]),
];
