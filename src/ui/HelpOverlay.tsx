interface HelpOverlayProps {
  onClose: () => void;
}

/** Explains the controls and what there is to do — opened from the persistent HUD bar. */
export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="hud-modal-title">How to wander the Mela</h2>

        <div className="hud-pause-controls">
          <div className="hud-pause-controls-title">Controls</div>
          <div>W A S D / Arrow keys — Move</div>
          <div>Shift — Run</div>
          <div>Mouse — Look around</div>
          <div>E — Interact with stalls, rides and games</div>
          <div>Esc — Pause</div>
        </div>

        <div className="hud-pause-controls">
          <div className="hud-pause-controls-title">HUD shortcuts</div>
          <div>I — Bag</div>
          <div>M — Mute / unmute sound</div>
          <div>H — Help (this screen)</div>
          <div>C — Photo mode</div>
          <div>O — Settings</div>
        </div>

        <p className="hud-modal-body">
          Walk the promenade to find lit diyas, ride the Ferris wheel, carousel and swing boat,
          browse the shopping &amp; food street, play the games in the Fun Zone and catch the
          Cultural Stage. One diya among them is golden &mdash; keep an eye out.
        </p>

        <div className="hud-modal-button-group">
          <button className="hud-modal-close" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
