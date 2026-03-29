import { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/ui.store';
import { useSettingsStore } from '../../stores/settings.store';
import SttEngineConfig from './SttEngineConfig';
import AiEndpointConfig from './AiEndpointConfig';
import PromptProfileEditor from './PromptProfileEditor';
import AutoDetectSettings from './AutoDetectSettings';
import AudioDeviceSettings from './AudioDeviceSettings';
import StorageManagement from './StorageManagement';

export default function SettingsPanel() {
  const close = useUiStore((s) => s.setSettingsPanelOpen);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const fetchPromptProfiles = useSettingsStore((s) => s.fetchPromptProfiles);
  const fetchAudioDevices = useSettingsStore((s) => s.fetchAudioDevices);

  useEffect(() => {
    fetchSettings();
    fetchPromptProfiles();
    fetchAudioDevices();
  }, [fetchSettings, fetchPromptProfiles, fetchAudioDevices]);

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-xl font-semibold text-text">Settings</h2>
        <button
          onClick={() => close(false)}
          className="flex items-center justify-center rounded-card p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          title="Close settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col divide-y divide-border">
          <section className="px-5 py-4">
            <SttEngineConfig />
          </section>
          <section className="px-5 py-4">
            <AiEndpointConfig />
          </section>
          <section className="px-5 py-4">
            <PromptProfileEditor />
          </section>
          <section className="px-5 py-4">
            <AutoDetectSettings />
          </section>
          <section className="px-5 py-4">
            <AudioDeviceSettings />
          </section>
          <section className="px-5 py-4">
            <StorageManagement />
          </section>
        </div>
      </div>
    </div>
  );
}
