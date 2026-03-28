import { create } from 'zustand';
import type { Recording } from '../../shared/types/database.types';
import type { TranscriptWithSegments, SummaryWithActions } from '../../shared/types/ipc.types';

interface RecordingState {
  recordings: Recording[];
  openTabIds: number[];
  activeTabId: number | null;
  transcripts: Record<number, TranscriptWithSegments>;
  summaries: Record<number, SummaryWithActions>;
  fetchRecordings: (notebookId?: number, search?: string) => Promise<void>;
  openTab: (id: number) => void;
  closeTab: (id: number) => void;
  setActiveTab: (id: number) => void;
  fetchTranscript: (recordingId: number) => Promise<void>;
  fetchSummary: (recordingId: number) => Promise<void>;
  updateRecording: (id: number, updates: { title?: string; notebook_id?: number | null }) => Promise<void>;
  deleteRecording: (id: number) => Promise<void>;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  recordings: [],
  openTabIds: [],
  activeTabId: null,
  transcripts: {},
  summaries: {},

  fetchRecordings: async (notebookId, search) => {
    try {
      const result = await window.electronAPI.invoke('recording:list', { notebookId, search });
      if (result) {
        set({ recordings: result });
      }
    } catch {
      // IPC not available
    }
  },

  openTab: (id) => {
    const { openTabIds } = get();
    if (!openTabIds.includes(id)) {
      set({ openTabIds: [...openTabIds, id] });
    }
    set({ activeTabId: id });
  },

  closeTab: (id) => {
    const { openTabIds, activeTabId } = get();
    const newTabs = openTabIds.filter(t => t !== id);
    set({ openTabIds: newTabs });
    if (activeTabId === id) {
      set({ activeTabId: newTabs.length > 0 ? newTabs[newTabs.length - 1] : null });
    }
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  fetchTranscript: async (recordingId) => {
    try {
      const result = await window.electronAPI.invoke('transcript:get', { recordingId });
      if (result) {
        set({ transcripts: { ...get().transcripts, [recordingId]: result } });
      }
    } catch {
      // IPC not available
    }
  },

  fetchSummary: async (recordingId) => {
    try {
      const result = await window.electronAPI.invoke('summary:get', { recordingId });
      if (result) {
        set({ summaries: { ...get().summaries, [recordingId]: result } });
      }
    } catch {
      // IPC not available
    }
  },

  updateRecording: async (id, updates) => {
    try {
      const updated = await window.electronAPI.invoke('recording:update', { id, ...updates });
      if (updated) {
        set({ recordings: get().recordings.map(r => r.id === id ? updated : r) });
      }
    } catch {
      set({
        recordings: get().recordings.map(r =>
          r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
        ),
      });
    }
  },

  deleteRecording: async (id) => {
    try {
      await window.electronAPI.invoke('recording:delete', { id });
    } catch {
      // Fallback: just remove locally
    }
    const { openTabIds, activeTabId } = get();
    const newTabs = openTabIds.filter(t => t !== id);
    set({
      recordings: get().recordings.filter(r => r.id !== id),
      openTabIds: newTabs,
      activeTabId: activeTabId === id ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null) : activeTabId,
    });
  },
}));
