import { useGame } from '../core/GameState';

export function PanelModal() {
  const activePanel = useGame((s) => s.activePanel);
  const closePanel = useGame((s) => s.closePanel);

  if (!activePanel) {
    return null;
  }

  return (
    <div className="hud-modal-overlay">
      <div className="hud-modal-card">
        <h2 className="hud-modal-title">{activePanel.title}</h2>

        {activePanel.type === 'info' && (
          <p className="hud-modal-body">{activePanel.body}</p>
        )}

        {activePanel.type === 'shop' && (
          <ul className="hud-modal-items">
            {activePanel.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}

        <div className="hud-modal-helper">Press Esc to close</div>

        <div className="hud-modal-button-group">
          <button className="hud-modal-close" onClick={closePanel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
