import './madeByCredit.css';

const INSTAGRAM_URL = 'https://www.instagram.com/coder_talk/';

interface MadeByCreditProps {
  /**
   * `gate` is the wide, centred line on the title screen; `hud` is the narrow stacked
   * version under the Mela Map while playing; `panel` sits inside a card in normal flow
   * rather than pinned to a corner. Same markup, different rhythm — the HUD column is
   * only 170px, so the follow link has to drop to its own row there.
   */
  placement: 'gate' | 'hud' | 'panel';
}

/** Inline so it inherits the glow and needs no image asset — the project ships no bitmaps. */
function InstagramGlyph() {
  return (
    <svg
      className="credit-ig-glyph"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MadeByCredit({ placement }: MadeByCreditProps) {
  return (
    <div className={`made-by made-by-${placement}`}>
      <span className="made-by-line">
        Made with <span className="made-by-heart" aria-hidden="true">❤️</span>
        <span className="made-by-sr">love</span> by <span className="made-by-name">Amit Karmakar</span>
      </span>
      <a
        className="made-by-follow"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow Amit Karmakar on Instagram"
      >
        <InstagramGlyph />
        <span>Follow</span>
      </a>
    </div>
  );
}
