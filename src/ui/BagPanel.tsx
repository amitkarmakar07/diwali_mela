import { useGame } from '../core/GameState';

interface BagPanelProps {
  onClose: () => void;
}

/** Lists what the player is carrying — in-memory only for the session, nothing is saved. */
export function BagPanel({ onClose }: BagPanelProps) {
  const bagItems = useGame((s) => s.bagItems);

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="hud-modal-title">Your Bag</h2>

        {bagItems.length === 0 ? (
          <p className="hud-modal-body">Nothing in the bag yet — go treat yourself at a stall.</p>
        ) : (
          <ul className="hud-shop-items">
            {bagItems.map((item) => (
              <li key={item.name}>
                <div className="hud-shop-item">
                  <span className="hud-shop-item-main">
                    <span className="hud-shop-item-name">
                      {item.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </span>
                  </span>
                  <span className="hud-shop-item-price">₹{item.price * item.quantity}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

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
