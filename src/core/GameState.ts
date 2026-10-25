import { create } from 'zustand';

export type PlayerMode = 'exploring' | 'riding' | 'minigame' | 'panel' | 'paused';

export interface ShopItem {
  name: string;
  /** Rupees — cosmetic only, nothing is tracked or spent. */
  price: number;
  note?: string;
}

/** Scoreboard a running mini-game publishes for MiniGameHUD. */
export interface MiniGameStatus {
  title: string;
  hint: string;
  score: number;
  scoreLabel: string;
  attemptsLeft: number;
  attemptsLabel: string;
  timeLeft: number | null;
  result: string | null;
}

export type PanelContent =
  | { type: 'info'; title: string; body: string }
  | { type: 'shop'; title: string; subtitle?: string; items: ShopItem[] };

interface GameState {
  mode: PlayerMode;
  started: boolean;
  nearestId: string | null;
  nearestLabel: string | null;
  activeRide: string | null;
  activeGame: string | null;
  gameStatus: MiniGameStatus | null;
  activePanel: PanelContent | null;
  litDiyaCount: number;
  foundGoldenDiya: boolean;
  toast: string | null;

  start: () => void;
  enterRide: (rideId: string) => void;
  exitRide: () => void;
  enterGame: (gameId: string) => void;
  exitGame: () => void;
  setGameStatus: (status: MiniGameStatus | null) => void;
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
  activeGame: null,
  gameStatus: null,
  activePanel: null,
  litDiyaCount: 0,
  foundGoldenDiya: false,
  toast: null,

  start: () => set({ started: true, mode: 'exploring' }),

  enterRide: (rideId) =>
    set({ mode: 'riding', activeRide: rideId, nearestId: null, nearestLabel: null }),

  exitRide: () => set({ mode: 'exploring', activeRide: null }),

  enterGame: (gameId) =>
    set({ mode: 'minigame', activeGame: gameId, nearestId: null, nearestLabel: null }),

  exitGame: () => set({ mode: 'exploring', activeGame: null, gameStatus: null }),

  setGameStatus: (status) => set({ gameStatus: status }),

  openPanel: (panel) =>
    set({ mode: 'panel', activePanel: panel, nearestId: null, nearestLabel: null }),

  closePanel: () => set({ mode: 'exploring', activePanel: null }),

  setPaused: (paused) => {
    if (paused) {
      if (get().mode === 'paused') return;
      set({ mode: 'paused' });
    } else {
      if (get().mode !== 'paused') return;
      const { activeRide, activeGame } = get();
      set({ mode: activeRide ? 'riding' : activeGame ? 'minigame' : 'exploring' });
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
