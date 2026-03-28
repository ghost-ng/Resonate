import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';

interface AppRule {
  id: string;
  name: string;
  exe: string;
  behavior: 'prompt' | 'always' | 'never';
}

export default function AutoDetectSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const enabled = settings.auto_detect_enabled === 'true';

  const [apps, setApps] = useState<AppRule[]>(() => {
    try {
      return JSON.parse(settings.auto_detect_apps || '[]');
    } catch {
      return [];
    }
  });

  const [newName, setNewName] = useState('');
  const [newExe, setNewExe] = useState('');

  const persistApps = (updated: AppRule[]) => {
    setApps(updated);
    setSetting('auto_detect_apps', JSON.stringify(updated));
  };

  const handleToggle = () => {
    setSetting('auto_detect_enabled', enabled ? 'false' : 'true');
  };

  const handleAddApp = () => {
    if (!newName.trim() || !newExe.trim()) return;
    const rule: AppRule = {
      id: Date.now().toString(),
      name: newName.trim(),
      exe: newExe.trim(),
      behavior: 'prompt',
    };
    persistApps([...apps, rule]);
    setNewName('');
    setNewExe('');
  };

  const handleBehaviorChange = (id: string, behavior: AppRule['behavior']) => {
    persistApps(apps.map((a) => (a.id === id ? { ...a, behavior } : a)));
  };

  const handleDelete = (id: string) => {
    persistApps(apps.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">Auto-Detection</h3>

      <label className="flex items-center gap-3 cursor-pointer">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-accent' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-base text-text">Enable auto-detection</span>
      </label>

      {enabled && (
        <>
          <div className="rounded-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-3 py-1.5 text-left font-medium text-text-muted">App Name</th>
                  <th className="px-3 py-1.5 text-left font-medium text-text-muted">Executable</th>
                  <th className="px-3 py-1.5 text-left font-medium text-text-muted">Behavior</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 text-text">{app.name}</td>
                    <td className="px-3 py-1.5 font-mono text-text-muted">{app.exe}</td>
                    <td className="px-3 py-1.5">
                      <select
                        value={app.behavior}
                        onChange={(e) =>
                          handleBehaviorChange(app.id, e.target.value as AppRule['behavior'])
                        }
                        className="rounded border border-border bg-surface px-2 py-0.5 text-sm text-text outline-none focus:border-accent"
                      >
                        <option value="prompt">Prompt</option>
                        <option value="always">Always</option>
                        <option value="never">Never</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-danger/60 hover:text-danger transition-colors"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-text-muted">
                      No apps configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">App Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Zoom"
                className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Executable</label>
              <input
                type="text"
                value={newExe}
                onChange={(e) => setNewExe(e.target.value)}
                placeholder="Zoom.exe"
                className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent w-48"
              />
            </div>
            <button
              onClick={handleAddApp}
              className="rounded-card bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Add App
            </button>
          </div>
        </>
      )}
    </div>
  );
}
