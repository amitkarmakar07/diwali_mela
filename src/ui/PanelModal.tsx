import { useEffect, useState } from 'react';
import { playCartChime, playShopClip, setGameAudioPaused, stopShopClip } from '../audio/audioManager';
import { useGame } from '../core/GameState';

export function PanelModal() {
  const activePanel = useGame((s) => s.activePanel);
  const closePanel = useGame((s) => s.closePanel);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [activePanel]);

  // Shop clip takes over from ambience + radio for as long as this panel stays open, on
  // every close path (Close, buy, Esc, Enter) since they all route through closePanel
  // and land here as activePanel becoming null — reusing setGameAudioPaused's own
  // pause/resume bookkeeping rather than duplicating it.
  useEffect(() => {
    if (activePanel?.type === 'shop' && activePanel.audio) {
      const src = activePanel.audio;
      setGameAudioPaused(true);
      playShopClip(src);
      return () => {
        stopShopClip();
        setGameAudioPaused(false);
      };
    }
    return undefined;
  }, [activePanel]);

  if (!activePanel) return null;

  const buy = () => {
    if (activePanel.type !== 'shop' || selected === null) return;
    const item = activePanel.items[selected];
    const { addToBag, awardCoins, showToast } = useGame.getState();
    addToBag(item);
    playCartChime();
    const coins = awardCoins(1, 2);
    showToast(`${item.name} added to the bag! +${coins} coins`);
    closePanel();
  };

  const confirmAction = () => {
    if (activePanel.type !== 'confirm') return;
    const { onConfirm } = activePanel;
    // Close first — onConfirm must see mode 'exploring', not 'panel' (see GameState's comment).
    closePanel();
    onConfirm();
  };

  return (
    <div className="hud-modal-overlay">
      <div className="hud-modal-card">
        <h2 className="hud-modal-title">{activePanel.title}</h2>

        {activePanel.type === 'info' && <p className="hud-modal-body">{activePanel.body}</p>}

        {activePanel.type === 'confirm' && <p className="hud-modal-body">{activePanel.body}</p>}

        {activePanel.type === 'shop' && (
          <>
            {activePanel.subtitle && <p className="hud-modal-subtitle">{activePanel.subtitle}</p>}
            <ul className="hud-shop-items">
              {activePanel.items.map((item, i) => (
                <li key={item.name}>
                  <button
                    type="button"
                    className={`hud-shop-item${selected === i ? ' is-selected' : ''}`}
                    onClick={() => setSelected(i)}
                  >
                    <span className="hud-shop-item-main">
                      <span className="hud-shop-item-name">{item.name}</span>
                      {item.note && <span className="hud-shop-item-note">{item.note}</span>}
                    </span>
                    <span className="hud-shop-item-price">₹{item.price}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="hud-modal-helper">
          {activePanel.type === 'confirm'
            ? 'Press Enter to go back without choosing — Esc works too'
            : 'Press Enter or Esc to go back'}
        </div>

        <div className="hud-modal-button-group">
          {activePanel.type === 'confirm' ? (
            <>
              <button className="hud-modal-close" onClick={closePanel}>
                {activePanel.cancelLabel ?? 'Cancel'}
              </button>
              <button className="hud-modal-buy" onClick={confirmAction}>
                {activePanel.confirmLabel}
              </button>
            </>
          ) : (
            <>
              {activePanel.type === 'shop' && (
                <button className="hud-modal-buy" onClick={buy} disabled={selected === null}>
                  {selected === null ? 'Pick something' : 'Take it'}
                </button>
              )}
              <button className="hud-modal-close" onClick={closePanel}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
