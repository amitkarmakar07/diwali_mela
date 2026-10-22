export type Control = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump' | 'interact';

export const keyboardMap: { name: Control; keys: string[] }[] = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'back', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'run', keys: ['Shift'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'interact', keys: ['e', 'E'] },
];
