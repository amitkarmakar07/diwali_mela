import { PALETTE } from '../config/constants';

const festiveColors = [
  PALETTE.magenta,
  PALETTE.teal,
  PALETTE.deepRed,
  PALETTE.gold,
  PALETTE.marigold,
  '#ff69b4',
  '#00ffcc',
  '#ff6b6b',
];

export const npcWalkers = [
  {
    waypoints: [[-4, 38], [-4, 8], [-4, -12]] as [number, number][],
    speed: 1.2,
    color: festiveColors[0],
  },
  {
    waypoints: [[3, 40], [3, 10], [3, -10]] as [number, number][],
    speed: 1.0,
    color: festiveColors[1],
  },
  {
    waypoints: [[0, 46], [0, 20], [0, -16]] as [number, number][],
    speed: 1.3,
    color: festiveColors[2],
  },
  {
    waypoints: [[-6, 42], [-6, 15], [-6, -14]] as [number, number][],
    speed: 1.1,
    color: festiveColors[3],
  },
  {
    waypoints: [[5, -15], [-5, -15], [-4, -25], [5, -25]] as [number, number][],
    speed: 0.9,
    color: festiveColors[4],
  },
  {
    waypoints: [[24, -30], [32, -30], [31, -38], [24, -30]] as [number, number][],
    speed: 1.15,
    color: festiveColors[5],
  },
  {
    waypoints: [[28, -20], [28, -35], [28, -20]] as [number, number][],
    speed: 1.25,
    color: festiveColors[6],
  },
];

export const npcIdlers = [
  {
    position: [-2, 45] as [number, number],
    color: festiveColors[0],
    facing: 0,
  },
  {
    position: [2, 44] as [number, number],
    color: festiveColors[1],
    facing: 0,
  },
  {
    position: [-7, 15] as [number, number],
    color: festiveColors[2],
    facing: 0,
  },
  {
    position: [6, 8] as [number, number],
    color: festiveColors[3],
    facing: 0,
  },
  {
    position: [-28, -34] as [number, number],
    color: festiveColors[4],
    facing: -Math.PI / 2,
  },
  {
    position: [26, -33] as [number, number],
    color: festiveColors[5],
    facing: 0,
  },
];
