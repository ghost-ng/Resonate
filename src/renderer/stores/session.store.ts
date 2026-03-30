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
  startRecording: (notebookId?: number) => Promise<void>;
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

  startRecording: async (notebookId?: number) => {
    if (get().isRecording) return;

    try {
      const recording = await window.electronAPI.invoke('recording:create', {
        title: `Recording ${new Date().toLocaleString()}`,
        notebookId,
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
      // Update recording status to 'complete' (audio captured, ready for transcription)
      const recId = get().lastRecordingId;
      if (recId) {
        await window.electronAPI.invoke('recording:update', { id: recId, status: 'complete' });
      }
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
