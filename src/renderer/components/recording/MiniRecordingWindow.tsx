import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '../../lib/formatters';
import WaveformVisualizer from './WaveformVisualizer';

export default function MiniRecordingWindow() {
  const [pinned, setPinned] = useState(true);
  const [durationMs, setDurationMs] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Self-contained timer — doesn't depend on session store
  useEffect(() => {
    const interval = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handlePopin = async () => {
    try {
      await window.electronAPI.invoke('app:popin-recording', undefined);
    } catch { /* ignore */ }
  };

  const handleTogglePin = async () => {
    const next = !pinned;
    try {
      await window.electronAPI.invoke('app:set-always-on-top', { enabled: next });
      setPinned(next);
    } catch { /* ignore */ }
  };

  const handleStop = async () => {
    try {
      // Tell main window to stop recording via IPC
      await window.electronAPI.invoke('recording:stop-capture', undefined);
    } catch { /* ignore */ }
    handlePopin();
  };

  return (
    <div className="flex h-screen flex-col bg-bg select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-recording animate-pulse-recording" />
          <span className="font-mono text-sm font-medium text-recording">
            {formatDuration(durationMs)}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={handleTogglePin}
            className={`rounded p-1 transition-colors ${pinned ? 'text-accent' : 'text-text-muted hover:text-text'}`}
            title={pinned ? 'Unpin from top' : 'Pin to top'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4v6l-2 4v2h10v-2l-2-4V4" />
              <line x1="12" y1="16" x2="12" y2="21" />
              <line x1="8" y1="4" x2="16" y2="4" />
            </svg>
          </button>
          <button
            onClick={handlePopin}
            className="rounded p-1 text-text-muted transition-colors hover:text-text"
            title="Pop back into main window"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Waveform — always shown, this IS the recording window */}
      <div className="flex-1 px-2 py-1 min-h-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <WaveformVisualizer />
      </div>

      {/* Stop button */}
      <div className="flex justify-center px-3 py-2 border-t border-border" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleStop}
          className="flex items-center gap-2 rounded-full border-2 border-recording/60 bg-recording/10 px-4 py-1.5 text-sm text-recording transition-all hover:border-recording hover:bg-recording/20"
        >
          <span className="h-2.5 w-2.5 rounded-sm bg-recording" />
          Stop Recording
        </button>
      </div>
    </div>
  );
}
