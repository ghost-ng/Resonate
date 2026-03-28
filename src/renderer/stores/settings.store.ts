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

const DEFAULT_SETTINGS: Record<string, string> = {
  stt_engine: 'whisper',
  ai_model: 'gpt-4o',
  auto_detect_enabled: 'true',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  promptProfiles: [],
  audioDevices: { inputs: [], outputs: [] },

  fetchSettings: async () => {
    try {
      const result = await window.electronAPI.invoke('settings:getAll', undefined);
      if (result && Object.keys(result).length > 0) {
        set({ settings: result });
      }
    } catch {
      // fallback to defaults
    }
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
      if (result) {
        set({ promptProfiles: result });
      }
    } catch {
      // fallback
    }
  },

  fetchAudioDevices: async () => {
    try {
      const result = await window.electronAPI.invoke('audio:get-devices', undefined);
      if (result) {
        set({ audioDevices: result });
      }
    } catch {
      // fallback
    }
  },
}));
