import { useEffect } from 'react';
import { useGame } from '../core/GameState';
import './MovieOverlay.css';

const YOUTUBE_EMBED_SRC = 'https://www.youtube.com/embed/z4SA0ciEoO8?autoplay=1&rel=0';

/**
 * YouTube's embed cannot be used as a WebGL texture (cross-origin + ToS), so the screen
 * in the 3D scene is procedural geometry and this is a plain DOM iframe laid over it —
 * reusing the same "watching a ride" game mode (mode 'riding', activeRide 'movie-screen')
 * that MovieZone sets when the player interacts with the screen's hotspot.
 */
export function MovieOverlay() {
  const mode = useGame((s) => s.mode);
  const activeRide = useGame((s) => s.activeRide);
  const open = mode === 'riding' && activeRide === 'movie-screen';

  useEffect(() => {
    if (!open) return;
    // Pointer lock makes a DOM overlay unclickable, so release it the instant the
    // screen opens. The player re-acquires it with a click on the canvas after closing.
    document.exitPointerLock?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useGame.getState().exitRide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="movie-overlay" role="dialog" aria-label="Outdoor movie screening">
      <div className="movie-overlay-frame">
        <button
          type="button"
          className="movie-overlay-close"
          onClick={() => useGame.getState().exitRide()}
        >
          Close ✕
        </button>
        <div className="movie-overlay-screen">
          <iframe
            className="movie-overlay-video"
            src={YOUTUBE_EMBED_SRC}
            title="Outdoor Movie Zone screening"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="movie-overlay-hint">Press Esc or Close to step away from the screen</div>
      </div>
    </div>
  );
}
