import { useGame } from '../core/GameState';

export function InteractionPrompt() {
  const mode = useGame((s) => s.mode);
  const nearestLabel = useGame((s) => s.nearestLabel);

  if (mode !== 'exploring' || !nearestLabel) {
    return null;
  }

  return (
    <div className="hud-interaction-prompt">
      <div className="hud-prompt-pill">
        <div className="hud-key-badge">E</div>
        <span>{nearestLabel}</span>
      </div>
    </div>
  );
}
