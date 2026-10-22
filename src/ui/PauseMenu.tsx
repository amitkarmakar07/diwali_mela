import { useGame } from '../core/GameState';

export function PauseMenu() {
  const mode = useGame((s) => s.mode);

  if (mode !== 'paused') {
    return null;
  }

  const handleResume = () => {
    useGame.getState().setPaused(false);
    try {
      document.querySelector('canvas')?.requestPointerLock();
    } catch (e) {
      // Browser may reject pointer lock request
    }
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
      </div>
    </div>
  );
}
