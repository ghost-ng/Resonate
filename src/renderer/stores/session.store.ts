import { create } from 'zustand';

interface SessionState {
  isRecording: boolean;
  durationMs: number;
  audioLevels: { mic: number; system: number };
  detectedApp: string | null;
  showAutoDetectBanner: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  setDurationMs: (ms: number) => void;
  setAudioLevels: (levels: { mic: number; system: number }) => void;
  setDetectedApp: (app: string | null) => void;
  dismissBanner: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isRecording: false,
  durationMs: 0,
  audioLevels: { mic: 0, system: 0 },
  detectedApp: null,
  showAutoDetectBanner: false,

  startRecording: () => set({ isRecording: true, durationMs: 0 }),
  stopRecording: () => set({ isRecording: false }),
  setDurationMs: (ms) => set({ durationMs: ms }),
  setAudioLevels: (levels) => set({ audioLevels: levels }),
  setDetectedApp: (app) => set({ detectedApp: app, showAutoDetectBanner: !!app }),
  dismissBanner: () => set({ showAutoDetectBanner: false }),
}));
