import { create } from 'zustand';

export type PlayerMode = 'exploring' | 'riding' | 'minigame' | 'panel' | 'paused';

export interface ShopItem {
  name: string;
  /** Rupees — cosmetic only, nothing is tracked or spent. */
  price: number;
  note?: string;
}

/** A line in the player's bag — repeat purchases of the same item bump quantity rather than duplicating. */
export interface BagItem {
  name: string;
  price: number;
  quantity: number;
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
  coins: number;
  activeRide: string | null;
  activeGame: string | null;
  gameStatus: MiniGameStatus | null;
  activePanel: PanelContent | null;
  litDiyaCount: number;
  foundGoldenDiya: boolean;
  toast: string | null;
  bagItems: BagItem[];

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
  addToBag: (item: ShopItem) => void;
  /** Awards a random amount in [min, max] and returns it, so callers can name it in a toast. */
  awardCoins: (min: number, max: number) => number;
  /** Returns false and spends nothing when the player can't afford it. */
  spendCoins: (cost: number) => boolean;
}

/** Rides are paid for with coins earned elsewhere in the mela. */
export const RIDE_COST = 10;

/**
 * One keypress must cause at most one mode change. Both the ride rigs and
 * InteractionManager listen for E on the same key event, so leaving a ride flips the
 * mode to 'exploring' mid-event and the very same press then reaches InteractionManager
 * — which would re-board the player onto the hotspot they are still standing on.
 */
let lastTransitionAt = -Infinity;

export function markModeTransition() {
  lastTransitionAt = performance.now();
}

export function msSinceModeTransition() {
  return performance.now() - lastTransitionAt;
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
  bagItems: [],
  coins: 0,

  start: () => {
    markModeTransition();
    set({ started: true, mode: 'exploring' });
  },

  enterRide: (rideId) => {
    markModeTransition();
    set({ mode: 'riding', activeRide: rideId, nearestId: null, nearestLabel: null });
  },

  exitRide: () => {
    markModeTransition();
    set({ mode: 'exploring', activeRide: null });
  },

  enterGame: (gameId) => {
    markModeTransition();
    set({ mode: 'minigame', activeGame: gameId, nearestId: null, nearestLabel: null });
  },

  exitGame: () => {
    markModeTransition();
    set({ mode: 'exploring', activeGame: null, gameStatus: null });
  },

  setGameStatus: (status) => set({ gameStatus: status }),

  openPanel: (panel) => {
    markModeTransition();
    set({ mode: 'panel', activePanel: panel, nearestId: null, nearestLabel: null });
  },

  closePanel: () => {
    markModeTransition();
    set({ mode: 'exploring', activePanel: null });
  },

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

  awardCoins: (min, max) => {
    const amount = min + Math.floor(Math.random() * (max - min + 1));
    set({ coins: get().coins + amount });
    return amount;
  },

  spendCoins: (cost) => {
    const { coins } = get();
    if (coins < cost) return false;
    set({ coins: coins - cost });
    return true;
  },

  addToBag: (item) => {
    const bagItems = get().bagItems;
    const existing = bagItems.findIndex((b) => b.name === item.name);
    if (existing === -1) {
      set({ bagItems: [...bagItems, { name: item.name, price: item.price, quantity: 1 }] });
    } else {
      const next = [...bagItems];
      next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
      set({ bagItems: next });
    }
  },
}));
