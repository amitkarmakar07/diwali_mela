import { useEffect, useState } from 'react';
import { useGame } from '../core/GameState';
import { HelpOverlay } from './HelpOverlay';
import { HudBar, PhotoModeBar } from './HudBar';
import { InteractionPrompt } from './InteractionPrompt';
import { Minimap } from './Minimap';
import { PanelModal } from './PanelModal';
import { PauseMenu } from './PauseMenu';
import { usePhotoMode } from './photoMode';
import { SettingsPanel } from './SettingsPanel';
import { StartGate } from './StartGate';
import './hud.css';

export function HUD() {
  const started = useGame((s) => s.started);
  const mode = useGame((s) => s.mode);
  const litDiyaCount = useGame((s) => s.litDiyaCount);
  const foundGoldenDiya = useGame((s) => s.foundGoldenDiya);
  const toast = useGame((s) => s.toast);
  const activePanel = useGame((s) => s.activePanel);

  const photoActive = usePhotoMode((s) => s.active);
  const setPhotoActive = usePhotoMode((s) => s.setActive);

  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleStartClick = () => {
    useGame.getState().start();
    try {
      document.querySelector('canvas')?.requestPointerLock();
    } catch (e) {
      // Browser may reject pointer lock request
    }
  };

  const handleSavePhoto = () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('no canvas element');
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `diwali-mela-${Date.now()}.png`;
      link.click();
      setSaveMessage('Saved!');
    } catch (e) {
      setSaveMessage('Could not save — try a screenshot instead');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();

      if (photoActive) {
        setPhotoActive(false);
        return;
      }
      if (helpOpen) {
        setHelpOpen(false);
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoActive, helpOpen, settingsOpen, setPhotoActive]);

  // Any overlay that needs a usable cursor (a game panel, Help, Settings, or photo mode's
  // exit/save buttons) must release pointer lock while open and let the player re-acquire
  // it on close — otherwise the overlay is there but unclickable.
  useEffect(() => {
    if (!started) return;
    const overlayOpen = Boolean(activePanel) || helpOpen || settingsOpen || photoActive;
    if (overlayOpen) {
      document.exitPointerLock();
      return;
    }
    if (useGame.getState().mode === 'exploring') {
      try {
        document.querySelector('canvas')?.requestPointerLock();
      } catch {
        /* browser may reject, or re-lock is throttled right after an exit */
      }
    }
  }, [activePanel, started, helpOpen, settingsOpen, photoActive]);

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
        <StartGate onEnter={handleStartClick} />
      </div>
    );
  }

  return (
    <div className="hud-root">
      {!photoActive && mode === 'exploring' && <div className="hud-crosshair" />}

      {!photoActive && (
        <div className="hud-status">
          <div className="hud-status-item">Diyas lit: {litDiyaCount}</div>
          {foundGoldenDiya && <div className="hud-status-item hud-golden-badge">Golden Diya found!</div>}
        </div>
      )}

      {!photoActive && <div className="hud-hint">Esc — Pause</div>}

      {!photoActive && mode === 'riding' && (
        <div className="hud-riding-prompt">
          <div className="hud-prompt-pill">
            <div className="hud-key-badge">E</div>
            <span>Get off the ride</span>
          </div>
        </div>
      )}

      {!photoActive && toast && <div className="hud-toast">{toast}</div>}

      {!photoActive && <InteractionPrompt />}
      <PanelModal />
      <PauseMenu />
      {!photoActive && <Minimap enabled={minimapEnabled} />}

      {!photoActive && mode !== 'paused' && (
        <HudBar
          onHelp={() => setHelpOpen(true)}
          onPhoto={() => setPhotoActive(true)}
          onSettings={() => setSettingsOpen(true)}
        />
      )}

      {photoActive && (
        <PhotoModeBar onExit={() => setPhotoActive(false)} onSave={handleSavePhoto} saveMessage={saveMessage} />
      )}

      {helpOpen && !photoActive && <HelpOverlay onClose={() => setHelpOpen(false)} />}

      {settingsOpen && !photoActive && (
        <SettingsPanel
          minimapEnabled={minimapEnabled}
          onToggleMinimap={setMinimapEnabled}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
