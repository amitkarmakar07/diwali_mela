import { create } from 'zustand';

/**
 * Whether photo mode is hiding HUD chrome. MiniGameHUD needs this too, but App.tsx
 * mounts it as HUD's sibling (not its child) and is off-limits to edit, so this can't
 * just be useState inside HUD.tsx — it needs to be a store both can read.
 */
interface PhotoModeStore {
  active: boolean;
  setActive: (active: boolean) => void;
}

export const usePhotoMode = create<PhotoModeStore>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));
