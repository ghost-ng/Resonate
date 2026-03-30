import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';

interface AppRule {
  id: string;
  name: string;
  exe: string;
  behavior: 'prompt' | 'always' | 'never';
}

interface ProcessInfo {
  name: string;
  exe: string;
  path: string;
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
  const [addError, setAddError] = useState('');

  // Process picker state
  const [showProcesses, setShowProcesses] = useState(false);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [processFilter, setProcessFilter] = useState('');
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  const persistApps = (updated: AppRule[]) => {
    setApps(updated);
    setSetting('auto_detect_apps', JSON.stringify(updated));
  };

  const handleToggle = () => {
    setSetting('auto_detect_enabled', enabled ? 'false' : 'true');
  };

  const handleAddApp = () => {
    if (!newName.trim() || !newExe.trim()) {
      setAddError('Both app name and executable are required.');
      return;
    }
    setAddError('');
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

  const handleBrowseExe = async () => {
    try {
      const result = await window.electronAPI.invoke('app:browse-exe', undefined) as { path: string; name: string } | null;
      if (result) {
        setNewExe(result.name);
        if (!newName.trim()) {
          // Auto-fill name from the file name (without extension)
          const nameWithoutExt = result.name.replace(/\.[^.]+$/, '');
          setNewName(nameWithoutExt);
        }
        setAddError('');
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleShowProcesses = async () => {
    if (showProcesses) {
      setShowProcesses(false);
      return;
    }
    setLoadingProcesses(true);
    try {
      const result = await window.electronAPI.invoke('app:list-processes', undefined) as ProcessInfo[];
      setProcesses(result ?? []);
      setProcessFilter('');
      setShowProcesses(true);
    } catch {
      setProcesses([]);
    }
    setLoadingProcesses(false);
  };

  const handleSelectProcess = (proc: ProcessInfo) => {
    setNewExe(proc.exe);
    if (!newName.trim()) {
      setNewName(proc.name);
    }
    setShowProcesses(false);
    setAddError('');
  };

  const handleBehaviorChange = (id: string, behavior: AppRule['behavior']) => {
    persistApps(apps.map((a) => (a.id === id ? { ...a, behavior } : a)));
  };

  const handleDelete = (id: string) => {
    persistApps(apps.filter((a) => a.id !== id));
  };

  const filteredProcesses = processFilter
    ? processes.filter(
        (p) =>
          p.name.toLowerCase().includes(processFilter.toLowerCase()) ||
          p.exe.toLowerCase().includes(processFilter.toLowerCase())
      )
    : processes;

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

          <div className="flex items-end gap-2 flex-wrap">
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
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newExe}
                  onChange={(e) => setNewExe(e.target.value)}
                  placeholder="Zoom.exe"
                  className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent w-40"
                />
                <button
                  onClick={handleBrowseExe}
                  className="rounded-card border border-border bg-surface-2 px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
                  title="Browse for executable"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                </button>
                <button
                  onClick={handleShowProcesses}
                  disabled={loadingProcesses}
                  className="rounded-card border border-border bg-surface-2 px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-50"
                  title="Pick from running processes"
                >
                  {loadingProcesses ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={handleAddApp}
              className="rounded-card bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Add App
            </button>
          </div>
          {addError && <p className="text-xs text-danger">{addError}</p>}

          {/* Running processes picker */}
          {showProcesses && (
            <div className="rounded-card border border-border bg-surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={processFilter}
                  onChange={(e) => setProcessFilter(e.target.value)}
                  placeholder="Filter processes..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/50 outline-none"
                />
                <span className="text-xs text-text-muted">{filteredProcesses.length} processes</span>
                <button
                  onClick={() => setShowProcesses(false)}
                  className="text-text-muted hover:text-text transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredProcesses.map((proc, i) => (
                  <button
                    key={`${proc.exe}-${i}`}
                    onClick={() => handleSelectProcess(proc)}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="font-medium text-text">{proc.name}</span>
                    <span className="truncate font-mono text-xs text-text-muted">{proc.exe}</span>
                  </button>
                ))}
                {filteredProcesses.length === 0 && (
                  <p className="px-3 py-3 text-center text-sm text-text-muted">
                    {processes.length === 0 ? 'No processes found.' : 'No matches.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
