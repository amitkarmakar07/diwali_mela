import { useState } from 'react';
import { PLAYER } from '../config/constants';

interface SettingsPanelProps {
  minimapEnabled: boolean;
  onToggleMinimap: (enabled: boolean) => void;
  onClose: () => void;
}

const MIN_SENSITIVITY = 0.0008;
const MAX_SENSITIVITY = 0.006;

/** Only real, wired-up options: mouse sensitivity and the minimap toggle. */
export function SettingsPanel({ minimapEnabled, onToggleMinimap, onClose }: SettingsPanelProps) {
  // Seeded from the live value (not a baked-in default) so the slider reflects whatever
  // is actually in effect if the panel is reopened after a change.
  const [sensitivity, setSensitivity] = useState(PLAYER.mouseSensitivity);

  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    PLAYER.mouseSensitivity = value; // read live, every frame, by PlayerController
  };

  const sensitivityPct = Math.round(
    ((sensitivity - MIN_SENSITIVITY) / (MAX_SENSITIVITY - MIN_SENSITIVITY)) * 100,
  );

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="hud-modal-title">Settings</h2>

        <div className="hud-settings-row">
          <label htmlFor="hud-sensitivity">Mouse sensitivity</label>
          <input
            id="hud-sensitivity"
            type="range"
            min={MIN_SENSITIVITY}
            max={MAX_SENSITIVITY}
            step={0.0002}
            value={sensitivity}
            onChange={(e) => handleSensitivityChange(Number(e.target.value))}
          />
          <span className="hud-settings-value">{sensitivityPct}%</span>
        </div>

        <div className="hud-settings-row">
          <label htmlFor="hud-minimap-toggle">Show minimap</label>
          <input
            id="hud-minimap-toggle"
            type="checkbox"
            checked={minimapEnabled}
            onChange={(e) => onToggleMinimap(e.target.checked)}
          />
        </div>

        <div className="hud-modal-helper">Press Enter or Esc to go back</div>

        <div className="hud-modal-button-group">
          <button className="hud-modal-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
