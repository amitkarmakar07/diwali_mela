import { useEffect } from 'react';
import { getRadioTrackTitle, useAudioStore } from '../audio/audioManager';
import { useGame } from '../core/GameState';
import './radioPlayer.css';

/** Compact radio-styled widget — bottom-left, clear of the top-right HudBar and the bottom-right minimap. */
export function RadioPlayer() {
  const trackIndex = useAudioStore((s) => s.trackIndex);
  const playing = useAudioStore((s) => s.radioPlaying);
  const next = useAudioStore((s) => s.next);
  const prev = useAudioStore((s) => s.prev);
  const togglePlay = useAudioStore((s) => s.togglePlay);

  // While pointer lock holds the cursor frozen and hidden, mouseenter can never fire and
  // these buttons are unreachable — so the radio needs keys to be usable during play at all.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const { started, mode } = useGame.getState();
      if (!started || mode === 'paused') return;

      const key = e.key.toLowerCase();
      if (key === 'n') next();
      else if (key === 'b') prev();
      else if (key === 'p') togglePlay();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, togglePlay]);

  // Kept for when the cursor is already free (paused, or an overlay is open): releasing
  // the lock on hover lets a click land on the button instead of the canvas.
  const handleMouseEnter = () => {
    if (useGame.getState().mode === 'exploring') {
      try {
        document.exitPointerLock();
      } catch {
        /* no lock held — nothing to release */
      }
    }
  };

  return (
    <div className="radio-player" onMouseEnter={handleMouseEnter}>
      <div className="radio-player-header">
        <span className="radio-dot" />
        Mela Radio
      </div>
      <div className="radio-track-title">{getRadioTrackTitle(trackIndex)}</div>
      <div className="radio-controls">
        <button type="button" className="radio-btn" onClick={prev} aria-label="Previous track" title="Previous">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 6h2v12H6zM20 6v12l-10-6z" />
          </svg>
        </button>
        <button
          type="button"
          className="radio-btn radio-btn-play"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 5l12 7-12 7z" />
            </svg>
          )}
        </button>
        <button type="button" className="radio-btn" onClick={next} aria-label="Next track" title="Next">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M16 6h2v12h-2zM4 6v12l10-6z" />
          </svg>
        </button>
      </div>
      <div className="radio-keys">B · P · N</div>
    </div>
  );
}
