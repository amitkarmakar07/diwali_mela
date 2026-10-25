import { useGame } from '../core/GameState';
import './minigame.css';

export function MiniGameHUD() {
  const mode = useGame((s) => s.mode);
  const status = useGame((s) => s.gameStatus);

  if (mode !== 'minigame' || !status) {
    return null;
  }

  return (
    <div className="mg-root">
      <div className="mg-card">
        <div className="mg-title">{status.title}</div>
        <div className="mg-stats">
          <div className="mg-stat">
            <span className="mg-stat-value">{status.score}</span>
            <span className="mg-stat-label">{status.scoreLabel}</span>
          </div>
          <div className="mg-stat">
            <span className="mg-stat-value">{status.attemptsLeft}</span>
            <span className="mg-stat-label">{status.attemptsLabel}</span>
          </div>
          {status.timeLeft !== null && (
            <div className={`mg-stat${status.timeLeft <= 5 ? ' is-urgent' : ''}`}>
              <span className="mg-stat-value">{status.timeLeft}s</span>
              <span className="mg-stat-label">Time left</span>
            </div>
          )}
        </div>
        <div className="mg-hint">{status.hint}</div>
      </div>

      <div className="mg-crosshair">
        <span className="mg-crosshair-dot" />
      </div>

      {status.result && <div className="mg-result">{status.result}</div>}

      <div className="mg-exit">
        <div className="mg-pill">
          <div className="mg-key">E</div>
          <span>Leave the booth</span>
        </div>
      </div>
    </div>
  );
}
