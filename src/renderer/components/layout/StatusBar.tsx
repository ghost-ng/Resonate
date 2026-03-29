import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';

export default function StatusBar() {
  const settings = useSettingsStore((s) => s.settings);
  const [debugActive, setDebugActive] = useState(false);

  const toggleDebug = async () => {
    try {
      const result = await window.electronAPI.invoke('app:toggle-debug', undefined);
      setDebugActive(result);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-xs text-text-muted">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Connected
        </span>
        <span>STT: {settings.stt_engine ?? 'whisper'}</span>
        <span>AI: {settings.ai_model ?? 'gpt-4o'}</span>
      </div>
      <div className="flex items-center gap-3">
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
