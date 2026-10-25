import './startGate.css';

interface StartGateProps {
  onEnter: () => void;
}

/** Title-gate overlay shown before `useGame().started` flips true. Pure presentation. */
export function StartGate({ onEnter }: StartGateProps) {
  return (
    <div className="gate-root">
      <div className="gate-status">
        <span className="gate-status-dot" />
        THE MELA IS OPEN
      </div>

      <div className="gate-season">DIWALI NIGHT &middot; 2026</div>

      <div className="gate-center">
        <div className="gate-title">
          <span className="gate-title-small">WELCOME TO</span>
          <span className="gate-title-big">Diwali Mela</span>
        </div>

        <p className="gate-invite">
          Come as the lamps are lit and the lanes fill with light &mdash; stay till the last diya
          burns down.
        </p>

        <button className="gate-cta" onClick={onEnter}>
          Enter the Mela
        </button>

        <div className="gate-features">WANDER FREELY &middot; PLAY GAMES &middot; LOSE TRACK OF TIME</div>

        <div className="gate-secondary">
          <details className="gate-disclosure">
            <summary>Controls</summary>
            <div className="gate-disclosure-body">
              <div>WASD to move, mouse to look around</div>
              <div>Press E to interact with objects</div>
              <div>Press Esc to pause at any time</div>
            </div>
          </details>
          <details className="gate-disclosure">
            <summary>About this place</summary>
            <div className="gate-disclosure-body">
              A festive fairground built for wandering &mdash; rides, stalls, games and a hundred
              small lights to find.
            </div>
          </details>
        </div>
      </div>

      <div className="gate-note">No sign-in, no save file &mdash; just the fair, waiting for you tonight.</div>
      <div className="gate-credit">Hand-built, with love, for the Festival of Lights.</div>
    </div>
  );
}
