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
}

const MOCK_RECORDINGS: Recording[] = [
  {
    id: 1, notebook_id: 1, title: 'Q1 Planning Review', source_app: 'Microsoft Teams',
    audio_file_path: null, duration_seconds: 2340, participant_count: 5,
    status: 'complete', created_at: '2026-03-28T09:00:00Z', updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: 2, notebook_id: 2, title: 'Sprint 14 Kickoff', source_app: 'Zoom',
    audio_file_path: null, duration_seconds: 1800, participant_count: 8,
    status: 'complete', created_at: '2026-03-27T14:00:00Z', updated_at: '2026-03-27T15:00:00Z',
  },
  {
    id: 3, notebook_id: 3, title: 'Weekly 1:1 with Sarah', source_app: 'Microsoft Teams',
    audio_file_path: null, duration_seconds: 1500, participant_count: 2,
    status: 'complete', created_at: '2026-03-26T11:00:00Z', updated_at: '2026-03-26T12:00:00Z',
  },
];

const MOCK_TRANSCRIPT: TranscriptWithSegments = {
  id: 1, recording_id: 1, engine_used: 'whisper', full_text: null, created_at: '2026-03-28T10:00:00Z',
  segments: [
    { id: 1, transcript_id: 1, speaker: 'Alice Chen', text: 'Good morning everyone. Let\'s kick off the Q1 planning review. I\'d like to start with the engineering update.', start_time_ms: 0, end_time_ms: 8000, confidence: 0.95 },
    { id: 2, transcript_id: 1, speaker: 'Bob Martinez', text: 'Thanks Alice. We completed 87% of our sprint goals this quarter. The main blocker was the infrastructure migration which took longer than expected.', start_time_ms: 8500, end_time_ms: 18000, confidence: 0.92 },
    { id: 3, transcript_id: 1, speaker: 'Carol Johnson', text: 'On the product side, we shipped the new dashboard and the feedback has been really positive. NPS went up 12 points.', start_time_ms: 19000, end_time_ms: 28000, confidence: 0.94 },
    { id: 4, transcript_id: 1, speaker: 'Alice Chen', text: 'That\'s great to hear. For Q2, I think we should prioritize the API redesign. Bob, can you put together an estimate by Friday?', start_time_ms: 29000, end_time_ms: 38000, confidence: 0.96 },
    { id: 5, transcript_id: 1, speaker: 'Bob Martinez', text: 'Absolutely. I\'ll work with the team and have a detailed breakdown ready. We should also discuss the new hiring plan for the backend team.', start_time_ms: 39000, end_time_ms: 48000, confidence: 0.91 },
  ],
};

const MOCK_SUMMARY: SummaryWithActions = {
  id: 1, recording_id: 1, model_used: 'gpt-4o', system_prompt_used: null, created_at: '2026-03-28T10:05:00Z',
  content: `## Key Decisions

- **Q2 Priority**: API redesign will be the top engineering priority for Q2
- **Infrastructure migration** is now complete despite delays
- **Dashboard launch** was successful with +12 NPS improvement

## Discussion Topics

- Q1 sprint completion rate: 87% of goals achieved
- Product feedback on the new dashboard has been positive
- Need to expand backend team to support Q2 initiatives

## Summary

The team reviewed Q1 progress, noting strong product outcomes despite infrastructure delays. Q2 will focus on the API redesign with Bob leading the estimation effort. The team will also pursue new hires for the backend team.`,
  action_items: [
    { id: 1, summary_id: 1, text: 'Prepare API redesign estimate and detailed breakdown', assignee: 'Bob Martinez', completed: 0, sort_order: 0 },
    { id: 2, summary_id: 1, text: 'Draft Q2 hiring plan for backend team', assignee: 'Alice Chen', completed: 0, sort_order: 1 },
    { id: 3, summary_id: 1, text: 'Share dashboard NPS report with stakeholders', assignee: 'Carol Johnson', completed: 1, sort_order: 2 },
  ],
};

export const useRecordingStore = create<RecordingState>((set, get) => ({
  recordings: MOCK_RECORDINGS,
  openTabIds: [1, 2, 3],
  activeTabId: 1,
  transcripts: { 1: MOCK_TRANSCRIPT },
  summaries: { 1: MOCK_SUMMARY },

  fetchRecordings: async (notebookId, search) => {
    try {
      const result = await window.electronAPI.invoke('recording:list', { notebookId, search });
      if (result && result.length > 0) {
        set({ recordings: result });
        return;
      }
    } catch {
      // IPC not available
    }
    set({ recordings: MOCK_RECORDINGS });
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
        return;
      }
    } catch {
      // IPC not available
    }
    if (recordingId === 1) {
      set({ transcripts: { ...get().transcripts, 1: MOCK_TRANSCRIPT } });
    }
  },

  fetchSummary: async (recordingId) => {
    try {
      const result = await window.electronAPI.invoke('summary:get', { recordingId });
      if (result) {
        set({ summaries: { ...get().summaries, [recordingId]: result } });
        return;
      }
    } catch {
      // IPC not available
    }
    if (recordingId === 1) {
      set({ summaries: { ...get().summaries, 1: MOCK_SUMMARY } });
    }
  },
}));
