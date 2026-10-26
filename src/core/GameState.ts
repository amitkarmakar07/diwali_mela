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
  | {
      type: 'shop';
      title: string;
      subtitle?: string;
      items: ShopItem[];
      /** Shop-specific clip (a path under /audio) played while the panel is open. */
      audio?: string;
    }
  | {
      type: 'confirm';
      title: string;
      body: string;
      confirmLabel: string;
      cancelLabel?: string;
      /** Runs after the panel closes, so the action sees 'exploring', not 'panel'. */
      onConfirm: () => void;
    };

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

/**
 * A HUD overlay releases pointer lock on purpose so it can be clicked. PlayerController
 * otherwise reads that same unlock as the player hitting Escape and pauses the game —
 * which made opening anything by keyboard shortcut flash the pause menu first.
 */
let uiOverlayOpen = false;

export function setUiOverlayOpen(open: boolean) {
  uiOverlayOpen = open;
}

export function isUiOverlayOpen() {
  return uiOverlayOpen;
}

export function msSinceModeTransition() {
  return performance.now() - lastTransitionAt;
}

/**
 * Progress survives a refresh. Only what the player earned is kept — mode, panels and
 * ride state are session-scoped and restoring them would reload the player mid-ride.
 * Every read and write is guarded: storage throws in private mode and can return
 * anything, so a corrupt blob must degrade to a fresh mela rather than a broken one.
 */
const STORAGE_KEY = 'diwali-mela/progress/v1';

interface PersistedProgress {
  coins: number;
  bagItems: BagItem[];
  litDiyaCount: number;
  foundGoldenDiya: boolean;
}

function loadProgress(): PersistedProgress {
  const empty: PersistedProgress = {
    coins: 0,
    bagItems: [],
    litDiyaCount: 0,
    foundGoldenDiya: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      coins: Number.isFinite(parsed.coins) ? Number(parsed.coins) : 0,
      bagItems: Array.isArray(parsed.bagItems)
        ? parsed.bagItems.filter(
            (b): b is BagItem =>
              !!b && typeof b.name === 'string' && Number.isFinite(b.quantity),
          )
        : [],
      litDiyaCount: Number.isFinite(parsed.litDiyaCount) ? Number(parsed.litDiyaCount) : 0,
      foundGoldenDiya: parsed.foundGoldenDiya === true,
    };
  } catch {
    return empty;
  }
}

function saveProgress(p: PersistedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota or private mode — progress just stays session-only */
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
  useGame.setState({ coins: 0, bagItems: [], litDiyaCount: 0, foundGoldenDiya: false });
}

const restored = loadProgress();

export const useGame = create<GameState>((set, get) => ({
  mode: 'exploring',
  started: false,
  nearestId: null,
  nearestLabel: null,
  activeRide: null,
  activeGame: null,
  gameStatus: null,
  activePanel: null,
  litDiyaCount: restored.litDiyaCount,
  foundGoldenDiya: restored.foundGoldenDiya,
  toast: null,
  bagItems: restored.bagItems,
  coins: restored.coins,

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

// Persist only the earned fields, and only when one of them actually changes — the store
// also churns on mode, nearest target and toasts many times a second while walking.
useGame.subscribe((state, prev) => {
  if (
    state.coins === prev.coins &&
    state.bagItems === prev.bagItems &&
    state.litDiyaCount === prev.litDiyaCount &&
    state.foundGoldenDiya === prev.foundGoldenDiya
  ) {
    return;
  }
  saveProgress({
    coins: state.coins,
    bagItems: state.bagItems,
    litDiyaCount: state.litDiyaCount,
    foundGoldenDiya: state.foundGoldenDiya,
  });
});
