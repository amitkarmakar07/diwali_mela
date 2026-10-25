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
  dwellTimes?: number[];
}

export interface IdlerSpec {
  position: [number, number];
  color: string;
  facing: number;
  prop?: NPCProp;
  reactsToSky?: boolean;
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

/** Wanders between a couple of stall fronts, pausing at each as if looking at the goods. */
function makeBrowsers(
  stops: [number, number][],
  count: number,
  baseSpeed: number,
  dwell: number,
): WalkerSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    waypoints: stops,
    speed: baseSpeed + ((i % 3) - 1) * 0.05,
    color: nextColor(),
    startT: i * 0.4,
    prop: nextProp(),
    dwellTimes: stops.map((_, j) => dwell + ((i + j) % 2) * 0.8),
  }));
}

/** A short line that creeps toward the serve point and resets — reads as a queue
 * shuffling forward without scripting a hand-off between individual bodies. */
function makeQueue(
  servePoint: [number, number],
  awayDir: [number, number],
  count: number,
): WalkerSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const gap = 0.75 * (i + 1);
    const back: [number, number] = [
      servePoint[0] + awayDir[0] * gap,
      servePoint[1] + awayDir[1] * gap,
    ];
    return {
      waypoints: [back, servePoint],
      speed: 0.4,
      color: nextColor(),
      startT: 0,
      prop: nextProp(),
      dwellTimes: [1.4 + i * 0.35, 2.2],
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
  // Queued at the food street counters. The serve point stands clear of the counter —
  // the stalls themselves sit at x = -23.6 and -36.4, so queueing on those exact
  // coordinates would put the line inside the stall.
  ...makeQueue([-25.8, 2], [-1, 0], 2),
  ...makeQueue([-34.2, 11], [1, 0], 2),
  // Browsing the promenade stalls from the path side. Stalls are at x = +-10.5 and
  // the browse stops must stay on the walkway, not on the stall itself.
  ...makeBrowsers(
    [
      [8.2, 24],
      [8.2, 6],
    ],
    2,
    0.5,
    2.8,
  ),
  ...makeBrowsers(
    [
      [-8.2, 15],
      [-8.2, 33],
    ],
    2,
    0.5,
    2.8,
  ),
];

export const npcIdlers: IdlerSpec[] = [
  // Watching the rides from a safe distance in front of each.
  ...makeCluster([-30, -29], 3, 2.9, [-30, -38]),
  ...makeCluster([-15, -15.5], 3, 2.6, [-15, -22]),
  ...makeCluster([-45, -16.5], 2, 2.5, [-45, -24]),
  // Gathered in the courtyard where the diyas and fireworks are — they look up when the sky lights up.
  ...makeCluster([28, -27], 3, 3.0, [28, -34]).map((n) => ({ ...n, reactsToSky: true })),
  // Taking in the arch on the way in.
  ...makeCluster([0, 44], 3, 3.2, [0, 30]),
];
