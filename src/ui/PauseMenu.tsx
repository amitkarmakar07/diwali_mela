import { useGame } from '../core/GameState';
import { MadeByCredit } from './MadeByCredit';

export function PauseMenu() {
  const mode = useGame((s) => s.mode);

  if (mode !== 'paused') {
    return null;
  }

  const handleResume = () => {
    // Resuming puts the mode back to 'exploring' and PlayerController re-locks on that
    // transition. A second request from here would race it on the same event.
    useGame.getState().setPaused(false);
  };

  return (
    <div className="hud-pause-overlay">
      <div className="hud-pause-card">
        <h2 className="hud-pause-title">Paused</h2>

        <div className="hud-pause-controls">
          <div className="hud-pause-controls-title">Controls</div>
          <div>W A S D — Move</div>
          <div>Shift — Run</div>
          <div>Mouse — Look</div>
          <div>E — Interact</div>
          <div>Esc — Pause</div>
        </div>

        <button className="hud-pause-button" onClick={handleResume}>
          Resume
        </button>

        {/* The in-world credit under the Mela Map is hidden while paused, so it lives here
            instead — and a paused player is the one with time to read it. */}
        <MadeByCredit placement="panel" />
      </div>
    </div>
  );
}
