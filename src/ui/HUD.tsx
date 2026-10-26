import { useEffect, useState } from 'react';
import { initAudio, setGameAudioPaused, useAudioStore } from '../audio/audioManager';
import { useGame, msSinceModeTransition } from '../core/GameState';
import { BagPanel } from './BagPanel';
import { HelpOverlay } from './HelpOverlay';
import { HudBar, PhotoModeBar } from './HudBar';
import { InteractionPrompt } from './InteractionPrompt';
import { Minimap } from './Minimap';
import { PanelModal } from './PanelModal';
import { PauseMenu } from './PauseMenu';
import { usePhotoMode } from './photoMode';
import { RadioPlayer } from './RadioPlayer';
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
  const bagCount = useGame((s) => s.bagItems.reduce((sum, item) => sum + item.quantity, 0));
  const coins = useGame((s) => s.coins);

  const photoActive = usePhotoMode((s) => s.active);
  const setPhotoActive = usePhotoMode((s) => s.setActive);

  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const handleStartClick = () => {
    // The click itself is the user gesture browsers require before audio may play.
    initAudio();
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
      if (bagOpen) {
        setBagOpen(false);
        return;
      }

      const state = useGame.getState();
      if (state.activePanel) {
        state.closePanel();
      } else if (state.mode === 'paused') {
        // Resuming returns the mode to 'exploring', and PlayerController re-locks on that
        // transition. Asking here as well put two uncoordinated requests on one event,
        // which is what made leaving the film feel like the game had hung.
        state.setPaused(false);
      } else {
        state.setPaused(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoActive, helpOpen, settingsOpen, bagOpen, setPhotoActive]);

  // HUD-bar shortcuts: I (bag), M (mute), H (help), C (photo), O (settings). Each key is
  // only ever read here, so one press can only flip one of these — no double-toggle risk
  // with the Escape handler above, which owns a disjoint set of keys.
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // The bar itself is hidden before start and while paused — shortcuts follow suit.
      if (!started || useGame.getState().mode === 'paused') return;

      const key = event.key.toLowerCase();

      if (key === 'm') {
        event.preventDefault();
        toggleMute();
        return;
      }

      if (key === 'i') {
        event.preventDefault();
        if (bagOpen) {
          setBagOpen(false);
        } else if (!photoActive && useGame.getState().mode === 'exploring') {
          setBagOpen(true);
        }
        return;
      }

      if (key === 'h') {
        event.preventDefault();
        if (helpOpen) {
          setHelpOpen(false);
        } else if (!photoActive && useGame.getState().mode === 'exploring') {
          setHelpOpen(true);
        }
        return;
      }

      if (key === 'o') {
        event.preventDefault();
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (!photoActive && useGame.getState().mode === 'exploring') {
          setSettingsOpen(true);
        }
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        if (photoActive) {
          setPhotoActive(false);
        } else if (useGame.getState().mode === 'exploring') {
          setPhotoActive(true);
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [started, photoActive, helpOpen, settingsOpen, bagOpen, toggleMute, setPhotoActive]);

  // Any overlay that needs a usable cursor (a game panel, Help, Settings, Bag, or photo
  // mode's exit/save buttons) must release pointer lock while open and let the player
  // re-acquire it on close — otherwise the overlay is there but unclickable.
  useEffect(() => {
    if (!started) return;
    const overlayOpen = Boolean(activePanel) || helpOpen || settingsOpen || bagOpen || photoActive;
    if (overlayOpen) {
      document.exitPointerLock();
      return;
    }
    // Closing a game panel also flips the mode back to 'exploring', and PlayerController
    // already re-locks on that transition. Only re-lock for overlays that leave the mode
    // alone (help, settings, bag, photo) — otherwise two requests race on one event.
    if (useGame.getState().mode === 'exploring' && msSinceModeTransition() > 250) {
      try {
        document.querySelector('canvas')?.requestPointerLock();
      } catch {
        /* browser may reject, or re-lock is throttled right after an exit */
      }
    }
  }, [activePanel, started, helpOpen, settingsOpen, bagOpen, photoActive]);

  useEffect(() => {
    if (!started) return;
    setGameAudioPaused(mode === 'paused');
  }, [mode, started]);

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
          <div className="hud-status-item hud-coin-item">
            <span>Coins:</span>
            <svg className="hud-coin-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9.5" fill="#ffe28a" stroke="#a9740a" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6.8" fill="none" stroke="#a9740a" strokeWidth="1" opacity="0.6" />
              <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="#8a5e00">
                ₹
              </text>
            </svg>
            <span>{coins}</span>
          </div>
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
      {!photoActive && mode !== 'paused' && <RadioPlayer />}

      {!photoActive && mode !== 'paused' && (
        <HudBar
          onHelp={() => setHelpOpen(true)}
          onPhoto={() => setPhotoActive(true)}
          onSettings={() => setSettingsOpen(true)}
          onBag={() => setBagOpen(true)}
          bagCount={bagCount}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {photoActive && (
        <PhotoModeBar onExit={() => setPhotoActive(false)} onSave={handleSavePhoto} saveMessage={saveMessage} />
      )}

      {helpOpen && !photoActive && <HelpOverlay onClose={() => setHelpOpen(false)} />}

      {bagOpen && !photoActive && <BagPanel onClose={() => setBagOpen(false)} />}

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
