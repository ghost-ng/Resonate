import { create } from 'zustand';

export type RecordingPhase = 'idle' | 'recording' | 'post-recording';

interface SessionState {
  isRecording: boolean;
  recordingPhase: RecordingPhase;
  lastRecordingAudioPath: string | null;
  lastRecordingId: number | null;
  durationMs: number;
  audioLevels: { mic: number; system: number };
  detectedApp: string | null;
  showAutoDetectBanner: boolean;
  startRecording: () => Promise<void>;
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

  startRecording: async () => {
    // Prevent double-start
    if (get().isRecording) return;

    try {
      // Create DB record
      const recording = await window.electronAPI.invoke('recording:create', {
        title: `Recording ${new Date().toLocaleString()}`,
      });
      // Start audio capture (uses default devices)
      await window.electronAPI.invoke('recording:start-capture', { recordingId: recording.id });
      set({
        isRecording: true,
        recordingPhase: 'recording',
        lastRecordingId: recording.id,
        durationMs: 0,
      });
    } catch (err) {
      console.error('[Session] Failed to start recording:', err);
    }
  },

  stopRecording: async () => {
    if (!get().isRecording) return;

    try {
      const result = await window.electronAPI.invoke('recording:stop-capture', undefined);
      set({
        isRecording: false,
        recordingPhase: 'post-recording',
        lastRecordingAudioPath: result.audioFilePath,
      });
    } catch (err) {
      console.error('[Session] Failed to stop recording:', err);
      set({
        isRecording: false,
        recordingPhase: 'idle',
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
