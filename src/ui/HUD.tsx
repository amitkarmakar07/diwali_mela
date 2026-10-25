import { useEffect } from 'react';
import { useGame } from '../core/GameState';
import { InteractionPrompt } from './InteractionPrompt';
import { Minimap } from './Minimap';
import { PanelModal } from './PanelModal';
import { PauseMenu } from './PauseMenu';
import './hud.css';

export function HUD() {
  const started = useGame((s) => s.started);
  const mode = useGame((s) => s.mode);
  const litDiyaCount = useGame((s) => s.litDiyaCount);
  const foundGoldenDiya = useGame((s) => s.foundGoldenDiya);
  const toast = useGame((s) => s.toast);
  const activePanel = useGame((s) => s.activePanel);

  const handleStartClick = () => {
    useGame.getState().start();
    try {
      document.querySelector('canvas')?.requestPointerLock();
    } catch (e) {
      // Browser may reject pointer lock request
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        const state = useGame.getState();

        if (state.activePanel) {
          state.closePanel();
        } else if (state.mode === 'paused') {
          state.setPaused(false);
          try {
            document.querySelector('canvas')?.requestPointerLock();
          } catch (e) {
            // Browser may reject pointer lock request
          }
        } else {
          state.setPaused(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // A panel needs a usable cursor, so release pointer lock while one is open and
  // re-acquire it on close.
  useEffect(() => {
    if (!started) return;
    if (activePanel) {
      document.exitPointerLock();
      return;
    }
    if (useGame.getState().mode === 'exploring') {
      try {
        document.querySelector('canvas')?.requestPointerLock();
      } catch {
        /* browser may reject */
      }
    }
  }, [activePanel, started]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      useGame.getState().clearToast();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!started) {
    return (
      <div className="hud-root">
        <div className="hud-start-gate">
          <h1 className="hud-start-title">Diwali Mela 3D</h1>
          <p className="hud-start-subtitle">
            Explore a festive Indian fairground, light diyas, ride attractions, and celebrate the
            Festival of Lights
          </p>
          <div className="hud-start-controls">
            <div style={{ marginBottom: '0.5rem' }}>Use WASD to move, mouse to look around</div>
            <div>Press E to interact with objects</div>
            <div>Press Esc to pause at any time</div>
          </div>
          <button className="hud-start-button" onClick={handleStartClick}>
            Enter the Mela
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hud-root">
      {mode === 'exploring' && <div className="hud-crosshair" />}

      <div className="hud-status">
        <div className="hud-status-item">Diyas lit: {litDiyaCount}</div>
        {foundGoldenDiya && <div className="hud-status-item hud-golden-badge">Golden Diya found!</div>}
      </div>

      <div className="hud-hint">Esc — Pause</div>

      {mode === 'riding' && (
        <div className="hud-riding-prompt">
          <div className="hud-prompt-pill">
            <div className="hud-key-badge">E</div>
            <span>Get off the ride</span>
          </div>
        </div>
      )}

      {toast && <div className="hud-toast">{toast}</div>}

      <InteractionPrompt />
      <PanelModal />
      <PauseMenu />
      <Minimap />
    </div>
  );
}
