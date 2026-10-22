import { create } from 'zustand';

export type PlayerMode = 'exploring' | 'riding' | 'panel' | 'paused';

export type PanelContent =
  | { type: 'info'; title: string; body: string }
  | { type: 'shop'; title: string; items: string[] };

interface GameState {
  mode: PlayerMode;
  started: boolean;
  nearestId: string | null;
  nearestLabel: string | null;
  activeRide: string | null;
  activePanel: PanelContent | null;
  litDiyaCount: number;
  foundGoldenDiya: boolean;
  toast: string | null;

  start: () => void;
  enterRide: (rideId: string) => void;
  exitRide: () => void;
  openPanel: (panel: PanelContent) => void;
  closePanel: () => void;
  setPaused: (paused: boolean) => void;
  setNearest: (id: string | null, label: string | null) => void;
  registerLitDiya: () => void;
  findGoldenDiya: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  mode: 'exploring',
  started: false,
  nearestId: null,
  nearestLabel: null,
  activeRide: null,
  activePanel: null,
  litDiyaCount: 0,
  foundGoldenDiya: false,
  toast: null,

  start: () => set({ started: true, mode: 'exploring' }),

  enterRide: (rideId) =>
    set({ mode: 'riding', activeRide: rideId, nearestId: null, nearestLabel: null }),

  exitRide: () => set({ mode: 'exploring', activeRide: null }),

  openPanel: (panel) =>
    set({ mode: 'panel', activePanel: panel, nearestId: null, nearestLabel: null }),

  closePanel: () => set({ mode: 'exploring', activePanel: null }),

  setPaused: (paused) => {
    if (paused) {
      if (get().mode === 'paused') return;
      set({ mode: 'paused' });
    } else {
      if (get().mode !== 'paused') return;
      set({ mode: get().activeRide ? 'riding' : 'exploring' });
    }
  },

  setNearest: (id, label) => set({ nearestId: id, nearestLabel: label }),

  registerLitDiya: () => set({ litDiyaCount: get().litDiyaCount + 1 }),

  findGoldenDiya: () => {
    if (get().foundGoldenDiya) return;
    set({ foundGoldenDiya: true, toast: 'You found the hidden Golden Diya! Shubh Diwali!' });
  },

  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}));
