import { useEffect, useState } from 'react';
import { useNotebookStore } from '../../stores/notebook.store';
import { useRecordingStore } from '../../stores/recording.store';
import { useSettingsStore } from '../../stores/settings.store';

interface StorageInfo {
  dbSizeBytes: number;
  audioSizeBytes: number;
  recordingCount: number;
  audioFileCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function StorageManagement() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);
  const [status, setStatus] = useState('');

  const fetchStorageInfo = async () => {
    try {
      const info = await window.electronAPI.invoke('app:get-storage-info', undefined);
      setStorageInfo(info);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const handleResetSettings = async () => {
    try {
      await window.electronAPI.invoke('app:reset-settings', undefined);
      setStatus('Settings reset to defaults. Restart the app for changes to take effect.');
      setShowResetConfirm(false);
      // Refresh stores
      useSettingsStore.getState().fetchSettings();
      useSettingsStore.getState().fetchPromptProfiles();
    } catch (err: any) {
      setStatus(`Error: ${err?.message || 'Reset failed'}`);
    }
  };

  const handleEraseAll = async () => {
    try {
      await window.electronAPI.invoke('app:erase-all-data', undefined);
      setStatus('All data erased. Restart the app.');
      setShowEraseConfirm(false);
      // Refresh all stores
      useNotebookStore.getState().fetchNotebooks();
      useRecordingStore.getState().fetchRecordings();
      useSettingsStore.getState().fetchSettings();
      useSettingsStore.getState().fetchPromptProfiles();
      fetchStorageInfo();
    } catch (err: any) {
      setStatus(`Error: ${err?.message || 'Erase failed'}`);
    }
  };

  return (
    <div>
      <h3 className="mb-3 text-md font-semibold text-text">Storage & Data</h3>

      {/* Storage info */}
      {storageInfo && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-card bg-surface-2 p-3">
            <div className="text-xs text-text-muted">Recordings</div>
            <div className="text-lg font-semibold text-text">{storageInfo.recordingCount}</div>
          </div>
          <div className="rounded-card bg-surface-2 p-3">
            <div className="text-xs text-text-muted">Audio Files</div>
            <div className="text-lg font-semibold text-text">{storageInfo.audioFileCount}</div>
          </div>
          <div className="rounded-card bg-surface-2 p-3">
            <div className="text-xs text-text-muted">Audio Size</div>
            <div className="text-lg font-semibold text-text">{formatBytes(storageInfo.audioSizeBytes)}</div>
          </div>
          <div className="rounded-card bg-surface-2 p-3">
            <div className="text-xs text-text-muted">Database Size</div>
            <div className="text-lg font-semibold text-text">{formatBytes(storageInfo.dbSizeBytes)}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Reset Settings */}
        <div className="flex items-center justify-between rounded-card border border-border p-3">
          <div>
            <div className="text-sm font-medium text-text">Reset Settings</div>
            <div className="text-xs text-text-muted">Reset all settings and prompt profiles to defaults. Keeps recordings and notebooks.</div>
          </div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="shrink-0 rounded-card border border-border bg-surface-2 px-4 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3"
            >
              Reset
            </button>
          ) : (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-card px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSettings}
                className="rounded-card bg-accent px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Confirm Reset
              </button>
            </div>
          )}
        </div>

        {/* Erase All Data */}
        <div className="flex items-center justify-between rounded-card border border-danger/30 p-3">
          <div>
            <div className="text-sm font-medium text-danger">Erase All Data</div>
            <div className="text-xs text-text-muted">Delete all recordings, notebooks, transcripts, summaries, audio files, and settings. This cannot be undone.</div>
          </div>
          {!showEraseConfirm ? (
            <button
              onClick={() => setShowEraseConfirm(true)}
              className="shrink-0 rounded-card border border-danger/50 px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Erase
            </button>
          ) : (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setShowEraseConfirm(false)}
                className="rounded-card px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={handleEraseAll}
                className="rounded-card bg-danger px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Yes, Erase Everything
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {status && (
        <p className={`mt-3 text-xs ${status.startsWith('Error') ? 'text-danger' : 'text-text-muted'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
