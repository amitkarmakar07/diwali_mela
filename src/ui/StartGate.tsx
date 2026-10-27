import './startGate.css';

interface StartGateProps {
  onEnter: () => void;
  /** Room code from the invite link, when this visit came from a friend. */
  joiningRoom?: string | null;
  playerName?: string;
  onPlayerNameChange?: (name: string) => void;
}

/** Title-gate overlay shown before `useGame().started` flips true. Pure presentation. */
export function StartGate({
  onEnter,
  joiningRoom = null,
  playerName = '',
  onPlayerNameChange,
}: StartGateProps) {
  const joining = joiningRoom !== null;

  return (
    <div className="gate-root">
      <div className="gate-status">
        <span className="gate-status-dot" />
        THE MELA IS OPEN
      </div>

      <div className="gate-season">DIWALI NIGHT &middot; 2026</div>

      <div className="gate-center">
        <div className="gate-title">
          <span className="gate-title-small">{joining ? "YOU'RE INVITED TO" : 'WELCOME TO'}</span>
          <span className="gate-title-big">Diwali Mela</span>
        </div>

        <p className="gate-invite">
          {joining
            ? 'A friend has saved you a place at the fair. Tell us your name and walk in — they will see you arrive.'
            : 'Come as the lamps are lit and the lanes fill with light — stay till the last diya burns down.'}
        </p>

        {/* Only asked for when arriving on an invite link: in single player nobody ever
            sees this name, so the normal visit shouldn't be slowed down by a form. */}
        {joining && (
          <label className="gate-name">
            <span className="gate-name-label">Your name</span>
            <input
              className="gate-name-input"
              type="text"
              value={playerName}
              maxLength={16}
              placeholder="e.g. Amit"
              autoComplete="off"
              onChange={(event) => onPlayerNameChange?.(event.target.value)}
              onKeyDown={(event) => {
                // Enter is "go" here, matching every other panel in the game.
                if (event.key === 'Enter') onEnter();
              }}
            />
          </label>
        )}

        <button className="gate-cta" onClick={onEnter}>
          {joining ? 'Join your friends' : 'Enter the Mela'}
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
