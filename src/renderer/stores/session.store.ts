import { create } from 'zustand';

export type RecordingPhase = 'idle' | 'device-select' | 'recording' | 'post-recording';

interface SessionState {
  isRecording: boolean;
  recordingPhase: RecordingPhase;
  lastRecordingAudioPath: string | null;
  lastRecordingId: number | null;
  durationMs: number;
  audioLevels: { mic: number; system: number };
  detectedApp: string | null;
  showAutoDetectBanner: boolean;
  startRecording: () => void;
  confirmStartRecording: (inputDeviceId: string, outputDeviceId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  keepRecording: () => void;
  discardRecording: () => Promise<void>;
  setDurationMs: (ms: number) => void;
  setAudioLevels: (levels: { mic: number; system: number }) => void;
  setDetectedApp: (app: string | null) => void;
  dismissBanner: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isRecording: false,
  recordingPhase: 'idle',
  lastRecordingAudioPath: null,
  lastRecordingId: null,
  durationMs: 0,
  audioLevels: { mic: 0, system: 0 },
  detectedApp: null,
  showAutoDetectBanner: false,

  startRecording: () => set({ recordingPhase: 'device-select' }),

  confirmStartRecording: async (_inputDeviceId, _outputDeviceId) => {
    try {
      const recording = await window.electronAPI.invoke('recording:create', {
        title: `Recording ${new Date().toLocaleString()}`,
      });
      await window.electronAPI.invoke('recording:start-capture', { recordingId: recording.id });
      set({
        isRecording: true,
        recordingPhase: 'recording',
        lastRecordingId: recording.id,
        durationMs: 0,
      });
    } catch {
      // IPC not available — proceed with mock state for UI development
      set({
        isRecording: true,
        recordingPhase: 'recording',
        lastRecordingId: null,
        durationMs: 0,
      });
    }
  },

  stopRecording: async () => {
    try {
      const result = await window.electronAPI.invoke('recording:stop-capture', undefined);
      set({
        isRecording: false,
        recordingPhase: 'post-recording',
        lastRecordingAudioPath: result.audioFilePath,
      });
    } catch {
      // IPC not available — proceed with mock state
      set({
        isRecording: false,
        recordingPhase: 'post-recording',
        lastRecordingAudioPath: null,
      });
    }
  },

  keepRecording: () =>
    set({
      recordingPhase: 'idle',
      lastRecordingAudioPath: null,
      lastRecordingId: null,
    }),

  discardRecording: async () => {
    const { lastRecordingId } = get();
    if (lastRecordingId) {
      try {
        await window.electronAPI.invoke('recording:delete', { id: lastRecordingId });
      } catch {
        // IPC not available
      }
    }
    set({
      recordingPhase: 'idle',
      lastRecordingAudioPath: null,
      lastRecordingId: null,
    });
  },

  setDurationMs: (ms) => set({ durationMs: ms }),
  setAudioLevels: (levels) => set({ audioLevels: levels }),
  setDetectedApp: (app) => set({ detectedApp: app, showAutoDetectBanner: !!app }),
  dismissBanner: () => set({ showAutoDetectBanner: false }),
}));
