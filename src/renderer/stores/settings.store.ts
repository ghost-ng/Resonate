import { create } from 'zustand';
import type { PromptProfile } from '../../shared/types/database.types';
import type { AudioDeviceInfo } from '../../shared/types/ipc.types';
import type { AiProviderType } from '../../shared/types/settings.types';

interface SettingsState {
  settings: Record<string, string>;
  promptProfiles: PromptProfile[];
  audioDevices: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] };
  availableModels: string[];
  modelsLoading: boolean;
  modelsError: string | null;
  fetchSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  fetchPromptProfiles: () => Promise<void>;
  fetchAudioDevices: () => Promise<void>;
  fetchModels: (endpoint: string, apiKey: string, type: AiProviderType) => Promise<void>;
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
  availableModels: [],
  modelsLoading: false,
  modelsError: null,

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

  fetchModels: async (endpoint: string, apiKey: string, type: AiProviderType) => {
    set({ modelsLoading: true, modelsError: null, availableModels: [] });
    try {
      const providerType = type === 'custom' ? 'openai' : type;
      const result = await window.electronAPI.invoke('ai:list-models', {
        endpoint,
        apiKey,
        type: providerType,
      });
      const response = result as { models: string[]; error?: string };
      if (response.error) {
        set({ modelsLoading: false, modelsError: response.error, availableModels: [] });
      } else {
        set({ modelsLoading: false, modelsError: null, availableModels: response.models });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ modelsLoading: false, modelsError: `Failed to fetch models: ${message}`, availableModels: [] });
    }
  },
}));
