import { create } from 'zustand';
import type { PromptProfile } from '../../shared/types/database.types';
import type { AudioDeviceInfo } from '../../shared/types/ipc.types';

interface SettingsState {
  settings: Record<string, string>;
  promptProfiles: PromptProfile[];
  audioDevices: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] };
  fetchSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  fetchPromptProfiles: () => Promise<void>;
  fetchAudioDevices: () => Promise<void>;
}

const MOCK_SETTINGS: Record<string, string> = {
  stt_engine: 'whisper',
  ai_model: 'gpt-4o',
  ai_endpoint: 'https://api.openai.com/v1',
  storage_path: 'C:\\Users\\miguel\\AppData\\Local\\youRecord',
  auto_detect_enabled: 'true',
};

const MOCK_PROFILES: PromptProfile[] = [
  {
    id: 1, name: 'Default Meeting Notes', is_default: 1,
    system_prompt: 'You are a meeting notes assistant.',
    user_prompt_template: 'Summarize the following transcript:\n\n{{transcript}}',
    created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
  },
];

const MOCK_DEVICES: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] } = {
  inputs: [
    { id: 'default', name: 'Default Microphone', isDefault: true },
    { id: 'usb-mic', name: 'Blue Yeti USB', isDefault: false },
  ],
  outputs: [
    { id: 'default', name: 'Default Speakers', isDefault: true },
    { id: 'headphones', name: 'WH-1000XM5', isDefault: false },
  ],
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: MOCK_SETTINGS,
  promptProfiles: MOCK_PROFILES,
  audioDevices: MOCK_DEVICES,

  fetchSettings: async () => {
    try {
      const result = await window.electronAPI.invoke('settings:getAll', undefined);
      if (result && Object.keys(result).length > 0) {
        set({ settings: result });
        return;
      }
    } catch {
      // fallback
    }
    set({ settings: MOCK_SETTINGS });
  },

  setSetting: async (key, value) => {
    try {
      await window.electronAPI.invoke('settings:set', { key, value });
    } catch {
      // fallback
    }
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },

  fetchPromptProfiles: async () => {
    try {
      const result = await window.electronAPI.invoke('prompt-profile:list', undefined);
      if (result && result.length > 0) {
        set({ promptProfiles: result });
        return;
      }
    } catch {
      // fallback
    }
    set({ promptProfiles: MOCK_PROFILES });
  },

  fetchAudioDevices: async () => {
    try {
      const result = await window.electronAPI.invoke('audio:get-devices', undefined);
      if (result) {
        set({ audioDevices: result });
        return;
      }
    } catch {
      // fallback
    }
    set({ audioDevices: MOCK_DEVICES });
  },
}));
