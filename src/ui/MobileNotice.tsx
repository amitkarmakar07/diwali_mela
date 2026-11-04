import './mobileNotice.css';

/**
 * Shown instead of the game on phones. A handset can't play this: the controls are WASD
 * plus mouse-look through pointer lock, neither of which exists on touch, and the scene
 * is a heavy WebGL build that would cook the device before it got anywhere.
 *
 * `useSmallScreen` (its own file, so fast refresh keeps working here) decides when.
 */
export function MobileNotice() {
  return (
    <div className="mobile-notice">
      <div className="mobile-notice-card">
        <svg className="mobile-notice-diya" viewBox="0 0 64 64" width="84" height="84" aria-hidden="true">
          <defs>
            <radialGradient id="mn-glow" cx="50%" cy="44%" r="52%">
              <stop offset="0%" stopColor="#ffcc33" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#ff8c1a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ff8c1a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="mn-flame" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#fff4d0" />
              <stop offset="45%" stopColor="#ffcc33" />
              <stop offset="100%" stopColor="#ff7a18" />
            </linearGradient>
            <linearGradient id="mn-bowl" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4703a" />
              <stop offset="100%" stopColor="#8c3f1d" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="28" r="24" fill="url(#mn-glow)" />
          <path d="M32 14c6 7 9.2 12 9.2 16.6A9.2 9.2 0 0 1 22.8 30.6C22.8 26 26 21 32 14z" fill="url(#mn-flame)" />
          <path d="M32 23c2.6 3.4 4 5.9 4 8.1a4 4 0 0 1-8 0c0-2.2 1.4-4.7 4-8.1z" fill="#fff6dd" opacity="0.9" />
          <path d="M8 40h48c0 7.6-10.7 13.6-24 13.6S8 47.6 8 40z" fill="url(#mn-bowl)" />
          <path d="M8 40h48a4.2 4.2 0 0 1-4.2 3.4H12.2A4.2 4.2 0 0 1 8 40z" fill="#f0a35a" opacity="0.55" />
        </svg>

        <h1 className="mobile-notice-title">Diwali Mela</h1>

        <p className="mobile-notice-lead">
          To explore the Diwali Mela, please open this on a desktop <span aria-hidden="true">🙂</span>
        </p>

        <p className="mobile-notice-why">
          You walk the fair with <strong>W A S D</strong> and look around with the mouse, so it
          needs a keyboard and a bigger screen.
        </p>

        <div className="mobile-notice-hint">
          On a computer already? Make the window a little wider and the mela will open.
        </div>
      </div>
    </div>
  );
}
