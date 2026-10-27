interface HudBarProps {
  onHelp: () => void;
  onPhoto: () => void;
  onSettings: () => void;
  onBag: () => void;
  onFriends: () => void;
  /** Friends currently in the mela with you, excluding yourself. */
  friendCount: number;
  /** True once this tab is in a room, so the button can show it's live. */
  inRoom: boolean;
  bagCount: number;
  muted: boolean;
  onToggleMute: () => void;
}

/** Persistent top-right control row — the HUD's other half to the bottom-right minimap. */
export function HudBar({
  onHelp,
  onPhoto,
  onSettings,
  onBag,
  onFriends,
  friendCount,
  inRoom,
  bagCount,
  muted,
  onToggleMute,
}: HudBarProps) {
  return (
    <div className="hud-bar">
      <button
        type="button"
        className={`hud-bar-btn${inRoom ? ' hud-bar-btn-live' : ''}`}
        onClick={onFriends}
        aria-label={
          inRoom
            ? `Friends, ${friendCount} here — key F`
            : 'Invite friends — key F'
        }
        title={inRoom ? `Friends (${friendCount}) — F` : 'Invite friends (F)'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="8.5" r="3.2" />
          <path d="M3.4 19.2a5.8 5.8 0 0 1 11.2 0" strokeLinecap="round" />
          <path d="M16.2 6.2a3 3 0 0 1 0 5.6M17.6 19.2a5.9 5.9 0 0 0-1.5-3.9" strokeLinecap="round" />
        </svg>
        <span className="hud-bar-label">Friends{inRoom && friendCount > 0 ? ` (${friendCount})` : ''}</span>
        <span className="hud-bar-key" aria-hidden="true">F</span>
      </button>

      <button
        type="button"
        className="hud-bar-btn"
        onClick={onBag}
        aria-label={`Bag, ${bagCount} item${bagCount === 1 ? '' : 's'} — key I`}
        title="Bag (I)"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8z" strokeLinejoin="round" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
        </svg>
        <span className="hud-bar-label">Bag{bagCount > 0 ? ` (${bagCount})` : ''}</span>
        <span className="hud-bar-key" aria-hidden="true">I</span>
      </button>

      <button
        type="button"
        className="hud-bar-btn"
        onClick={onToggleMute}
        aria-label={`${muted ? 'Unmute sound' : 'Mute sound'} — key M`}
        title={`${muted ? 'Unmute sound' : 'Mute sound'} (M)`}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinejoin="round" />
            <path d="M17 9l5 6M22 9l-5 6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinejoin="round" />
            <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
          </svg>
        )}
        <span className="hud-bar-label">{muted ? 'Muted' : 'Sound'}</span>
        <span className="hud-bar-key" aria-hidden="true">M</span>
      </button>

      <button type="button" className="hud-bar-btn" onClick={onHelp} aria-label="Help — key H" title="Help (H)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.4 9.3a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1 .9-1 1.7v.4" strokeLinecap="round" />
          <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        <span className="hud-bar-label">Help</span>
        <span className="hud-bar-key" aria-hidden="true">H</span>
      </button>

      <button
        type="button"
        className="hud-bar-btn"
        onClick={onPhoto}
        aria-label="Photo mode — key C"
        title="Photo mode (C)"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
        <span className="hud-bar-label">Photo</span>
        <span className="hud-bar-key" aria-hidden="true">C</span>
      </button>

      <button
        type="button"
        className="hud-bar-btn"
        onClick={onSettings}
        aria-label="Settings — key O"
        title="Settings (O)"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.3-2.4H9.9l-.3 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L5.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1l.3 2.4h4.2l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5z" />
        </svg>
        <span className="hud-bar-label">Settings</span>
        <span className="hud-bar-key" aria-hidden="true">O</span>
      </button>
    </div>
  );
}

interface PhotoModeBarProps {
  onExit: () => void;
  onSave: () => void;
  saveMessage: string | null;
}

/** Replaces HudBar while photo mode hides the rest of the chrome — still needs an exit. */
export function PhotoModeBar({ onExit, onSave, saveMessage }: PhotoModeBarProps) {
  return (
    <div className="hud-bar hud-bar-photo">
      {saveMessage && <span className="hud-bar-save-msg">{saveMessage}</span>}
      <span className="hud-bar-hint">Press Enter or Esc to go back</span>
      <button type="button" className="hud-bar-btn hud-bar-btn-save" onClick={onSave}>
        Save photo
      </button>
      <button type="button" className="hud-bar-btn hud-bar-btn-exit" onClick={onExit}>
        Exit photo mode
      </button>
    </div>
  );
}
