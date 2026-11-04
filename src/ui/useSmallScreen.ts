import { useEffect, useState } from 'react';

/** Below this the mela is unplayable: the HUD bar, minimap and panels all collide. */
const MIN_WIDTH = 820;

/**
 * Deliberately conservative about what counts as "too small": a narrow window, OR a
 * device whose PRIMARY pointer is a finger and which can't hover. Checking the primary
 * pointer rather than `any-pointer` keeps touchscreen laptops on the desktop path, where
 * they belong — a false positive here locks a real player out of the game entirely.
 */
function isSmallScreen(): boolean {
  if (typeof window === 'undefined') return false;
  const touchOnly = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
  return window.innerWidth < MIN_WIDTH || touchOnly;
}

export function useSmallScreen(): boolean {
  const [small, setSmall] = useState(isSmallScreen);

  useEffect(() => {
    // Rotating a tablet or dragging a desktop window narrower should flip this live,
    // rather than stranding someone on whichever side they happened to load on.
    const update = () => setSmall(isSmallScreen());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return small;
}
