import { useEffect, useRef, useState } from 'react';
import { useNet } from '../net/netStore';
import { createRoomId, inviteUrlFor, setRoomInUrl, clearRoomInUrl, PLAYER_COLORS, MAX_PEERS } from '../net/netConfig';
import './invite.css';

interface InvitePanelProps {
  onClose: () => void;
}

const NAME_SUGGESTIONS = ['Sparkler Pal', 'Diya Friend', 'Mela Wanderer', 'Rangoli Kid'];

function suggestedName(): string {
  return NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)];
}

const STATUS_COPY: Record<string, string> = {
  offline: 'Not connected',
  connecting: 'Connecting…',
  online: 'Connected',
  error: 'Something went wrong connecting — try leaving and creating a new link.',
};

/** Invite + identity panel. Follows PanelModal/BagPanel's overlay conventions so it reads
 * as part of the same HUD, even though it's opened from outside that modal union type. */
export function InvitePanel({ onClose }: InvitePanelProps) {
  const roomId = useNet((s) => s.roomId);
  const status = useNet((s) => s.status);
  const peers = useNet((s) => s.peers);
  const selfName = useNet((s) => s.selfName);
  const selfColor = useNet((s) => s.selfColor);

  const [name, setName] = useState(() => selfName || suggestedName());
  const [copied, setCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // selfName can change from under us (e.g. restored from storage after mount) —
  // keep the field in sync as long as the player hasn't started typing their own value.
  useEffect(() => {
    if (selfName) setName(selfName);
  }, [selfName]);

  const commitName = (value: string) => {
    const trimmed = value.slice(0, 16);
    setName(trimmed);
    useNet.getState().setProfile(trimmed || suggestedName(), selfColor);
  };

  const pickColor = (color: string) => {
    useNet.getState().setProfile(name || suggestedName(), color);
  };

  const createInvite = () => {
    const id = createRoomId();
    useNet.getState().setRoomId(id);
    setRoomInUrl(id);
  };

  const leaveRoom = () => {
    useNet.getState().setRoomId(null);
    clearRoomInUrl();
  };

  const copyLink = async () => {
    if (!roomId) return;
    const link = inviteUrlFor(roomId);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard API can throw in insecure contexts or without permission — fall back
      // to a manual select so the player can still Ctrl+C it themselves.
      linkInputRef.current?.select();
    }
    window.setTimeout(() => setCopied(false), 1500);
  };

  const peerList = Object.values(peers);
  const roomFull = peerList.length >= MAX_PEERS;

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-card invite-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="hud-modal-title">Invite Friends</h2>

        {roomId === null ? (
          <>
            <p className="hud-modal-body">
              Share a link and your friends can walk this mela with you, live.
            </p>
            <div className="hud-modal-button-group invite-button-group">
              <button className="hud-modal-buy" onClick={createInvite}>
                Create invite link
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`invite-status invite-status-${status}`}>{STATUS_COPY[status]}</div>

            <div className="invite-code">{roomId}</div>

            <div className="invite-link-row">
              <input
                ref={linkInputRef}
                className="invite-link-input"
                type="text"
                readOnly
                value={inviteUrlFor(roomId)}
                aria-label="Invite link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="hud-modal-close invite-copy-btn" onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            {roomFull && <p className="invite-full-notice">This mela room is full right now.</p>}

            <div className="invite-peer-list">
              <div className="invite-peer-heading">Here now</div>
              <ul>
                <li className="invite-peer">
                  <span className="invite-peer-dot" style={{ backgroundColor: selfColor }} />
                  <span className="invite-peer-name">{name || suggestedName()} (you)</span>
                </li>
                {peerList.map((peer) => (
                  <li key={peer.id} className="invite-peer">
                    <span className="invite-peer-dot" style={{ backgroundColor: peer.color }} />
                    <span className="invite-peer-name">{peer.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hud-modal-button-group invite-button-group">
              <button className="hud-modal-close" onClick={leaveRoom}>
                Leave room
              </button>
            </div>
          </>
        )}

        <div className="invite-profile">
          <label className="invite-profile-label" htmlFor="invite-name-input">
            Your name
          </label>
          <input
            id="invite-name-input"
            className="invite-name-input"
            type="text"
            maxLength={16}
            value={name}
            onChange={(e) => commitName(e.target.value)}
            placeholder={suggestedName()}
          />
          <div className="invite-swatch-row" role="group" aria-label="Your colour">
            {PLAYER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`invite-swatch${color === selfColor ? ' is-selected' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Use colour ${color}`}
                aria-pressed={color === selfColor}
                onClick={() => pickColor(color)}
              />
            ))}
          </div>
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
