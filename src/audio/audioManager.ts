import { create } from 'zustand';

const BG_SRC = '/audio/mela_background.mp3';
const CRACKER_SRC = '/audio/cracker_sound.mp3';

const RADIO_TRACKS = [
  { title: 'Song One', src: '/audio/song1.mp3' },
  { title: 'Song Two', src: '/audio/song2.mp3' },
  { title: 'Song Three', src: '/audio/song3.mp3' },
] as const;

const BG_VOLUME = 0.22;
const RADIO_VOLUME = 0.55;
const CRACKER_VOLUME = 0.85;
const CRACKER_POOL_SIZE = 4;

export const RADIO_TRACK_COUNT = RADIO_TRACKS.length;

interface AudioStoreState {
  muted: boolean;
  trackIndex: number;
  radioPlaying: boolean;
  toggleMute: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
}

let bgAudio: HTMLAudioElement | null = null;
let radioAudio: HTMLAudioElement | null = null;
let shopAudio: HTMLAudioElement | null = null;
let crackerPool: HTMLAudioElement[] = [];
let crackerPoolIndex = 0;
let initialized = false;
let resumeAfterPause = { bg: false, radio: false };

/** Synthesised cart chime — there's no bundled sound file for a purchase, so it's a two-note Web Audio tone. */
let chimeCtx: AudioContext | null = null;

/** Autoplay can be silently rejected by the browser; swallow so it never becomes an unhandled rejection. */
function safePlay(el: HTMLAudioElement) {
  el.play().catch(() => {
    /* blocked or interrupted — store state still reflects intent */
  });
}

function loadTrack(index: number, autoplay: boolean) {
  if (!radioAudio) return;
  useAudioStore.setState({ trackIndex: index });
  radioAudio.src = RADIO_TRACKS[index].src;
  radioAudio.load();
  if (autoplay) {
    safePlay(radioAudio);
    useAudioStore.setState({ radioPlaying: true });
  }
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  muted: false,
  trackIndex: 0,
  radioPlaying: false,

  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    if (bgAudio) bgAudio.muted = muted;
    if (radioAudio) radioAudio.muted = muted;
    if (shopAudio) shopAudio.muted = muted;
    for (const el of crackerPool) el.muted = muted;
  },

  togglePlay: () => {
    if (!radioAudio) return;
    if (radioAudio.paused) {
      safePlay(radioAudio);
      set({ radioPlaying: true });
    } else {
      radioAudio.pause();
      set({ radioPlaying: false });
    }
  },

  next: () => {
    loadTrack((get().trackIndex + 1) % RADIO_TRACKS.length, true);
  },

  prev: () => {
    loadTrack((get().trackIndex - 1 + RADIO_TRACKS.length) % RADIO_TRACKS.length, true);
  },
}));

export function getRadioTrackTitle(index: number): string {
  return RADIO_TRACKS[index]?.title ?? '';
}

/**
 * Must be called from a real user-gesture handler (the Start Gate's "Enter the Mela"
 * click) — browsers silently block audio started any other way, including on load.
 */
export function initAudio() {
  if (initialized) return;
  initialized = true;

  const muted = useAudioStore.getState().muted;

  bgAudio = new Audio(BG_SRC);
  bgAudio.loop = true;
  bgAudio.volume = BG_VOLUME;
  bgAudio.muted = muted;
  safePlay(bgAudio);

  radioAudio = new Audio();
  radioAudio.volume = RADIO_VOLUME;
  radioAudio.muted = muted;
  radioAudio.addEventListener('ended', () => {
    loadTrack((useAudioStore.getState().trackIndex + 1) % RADIO_TRACKS.length, true);
  });
  loadTrack(0, true);

  crackerPool = Array.from({ length: CRACKER_POOL_SIZE }, () => {
    const el = new Audio(CRACKER_SRC);
    el.volume = CRACKER_VOLUME;
    el.muted = muted;
    return el;
  });

  // Created here, in the same user-gesture handler as everything else above, so it
  // doesn't start (or stay) suspended when playCartChime is first called later.
  chimeCtx = new AudioContext();
}

/**
 * Short two-note "cart ding" for a bag purchase, synthesised with an oscillator and a
 * gain envelope — there's no bundled sound asset for this. Silent while muted.
 */
export function playCartChime() {
  if (!chimeCtx || useAudioStore.getState().muted) return;
  if (chimeCtx.state === 'suspended') {
    chimeCtx.resume().catch(() => {
      /* resume can reject if the gesture doesn't count; the ding just stays silent */
    });
  }

  const notes = [
    { freq: 1046.5, start: 0, duration: 0.12 }, // C6
    { freq: 1568.0, start: 0.09, duration: 0.18 }, // G6
  ];

  for (const note of notes) {
    const osc = chimeCtx.createOscillator();
    const gain = chimeCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;

    const startAt = chimeCtx.currentTime + note.start;
    const endAt = startAt + note.duration;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.35, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gain);
    gain.connect(chimeCtx.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}

/**
 * One-shot cracker sound. Cycles a small pool of elements rather than reusing one, so
 * a rocket lit moments after a charkhi (or either re-triggered quickly) always gets a
 * fresh playhead instead of cutting the previous sound off.
 */
export function playCrackerSound() {
  if (crackerPool.length === 0) return;
  const el = crackerPool[crackerPoolIndex];
  crackerPoolIndex = (crackerPoolIndex + 1) % crackerPool.length;
  el.currentTime = 0;
  safePlay(el);
}

/**
 * Per-shop clip played while its panel is open. One shared element is reused (rather than
 * one per shop) since only one shop panel can ever be open at a time.
 */
export function playShopClip(src: string) {
  if (!initialized) return;
  if (!shopAudio) {
    // The vendor calls out once when the player opens the stall; looping it turns a
    // greeting into a nagging jingle for as long as the list stays open.
    shopAudio = new Audio();
    shopAudio.loop = false;
  }
  shopAudio.muted = useAudioStore.getState().muted;
  shopAudio.src = src;
  shopAudio.currentTime = 0;
  safePlay(shopAudio);
}

export function stopShopClip() {
  if (!shopAudio) return;
  shopAudio.pause();
  shopAudio.currentTime = 0;
}

/**
 * Pauses ambience + radio while the game's pause menu is up (and restores whichever of
 * them were actually playing when it resumes) — audio shouldn't keep running under a
 * menu the player expects to halt everything.
 */
export function setGameAudioPaused(paused: boolean) {
  if (!bgAudio || !radioAudio) return;
  if (paused) {
    resumeAfterPause = { bg: !bgAudio.paused, radio: !radioAudio.paused };
    bgAudio.pause();
    radioAudio.pause();
  } else {
    if (resumeAfterPause.bg) safePlay(bgAudio);
    if (resumeAfterPause.radio) {
      safePlay(radioAudio);
      useAudioStore.setState({ radioPlaying: true });
    }
  }
}
