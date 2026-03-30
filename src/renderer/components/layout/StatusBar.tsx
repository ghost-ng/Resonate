import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';
import { APP_VERSION } from '../../../shared/constants';

export default function StatusBar() {
  const settings = useSettingsStore((s) => s.settings);
  const [debugActive, setDebugActive] = useState(false);
  const [pinned, setPinned] = useState(false);

  const toggleDebug = async () => {
    try {
      const result = await window.electronAPI.invoke('app:toggle-debug', undefined);
      setDebugActive(result);
    } catch { /* ignore */ }
  };

  const togglePin = async () => {
    const next = !pinned;
    try {
      await window.electronAPI.invoke('app:set-always-on-top', { enabled: next });
      setPinned(next);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-xs text-text-muted">
      <div className="flex items-center gap-3">
        <span className="text-text-muted/40">v{APP_VERSION}</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Connected
        </span>
        <span>STT: {settings.stt_engine ?? 'whisper'}</span>
        <span>AI: {settings.ai_model ?? 'gpt-4o'}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePin}
          className={`rounded px-1.5 py-0.5 transition-colors ${pinned ? 'bg-accent/20 text-accent' : 'hover:bg-surface-2 hover:text-text'}`}
          title={pinned ? 'Unpin from top' : 'Pin window on top'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4v6l-2 4v2h10v-2l-2-4V4" />
            <line x1="12" y1="16" x2="12" y2="21" />
            <line x1="8" y1="4" x2="16" y2="4" />
          </svg>
        </button>
        <button
          onClick={toggleDebug}
          className={`rounded px-1.5 py-0.5 transition-colors ${debugActive ? 'bg-accent/20 text-accent' : 'hover:bg-surface-2 hover:text-text'}`}
          title={debugActive ? 'Debug mode ON — click to disable' : 'Enable debug mode'}
        >
          {debugActive ? '🐛 Debug ON' : '🐛'}
        </button>
      </div>
    </div>
  );
}
