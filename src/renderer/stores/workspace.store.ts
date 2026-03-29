import { create } from 'zustand';
import type { WorkspaceCard, CustomTask, TranscriptHighlight } from '../../shared/types/database.types';

interface WorkspaceState {
  cards: Record<number, WorkspaceCard[]>;
  tasks: Record<number, CustomTask[]>;
  highlights: Record<number, TranscriptHighlight[]>;

  fetchCards: (recordingId: number) => Promise<void>;
  updateCard: (cardId: number, updates: Partial<Pick<WorkspaceCard, 'grid_col' | 'grid_row' | 'grid_w' | 'grid_h' | 'collapsed' | 'sort_order'>>, recordingId: number) => Promise<void>;
  addCustomCard: (recordingId: number, title: string) => Promise<void>;
  renameCard: (cardId: number, title: string, recordingId: number) => Promise<void>;
  deleteCard: (cardId: number, recordingId: number) => Promise<void>;
  toggleCardCollapse: (cardId: number, collapsed: boolean, recordingId: number) => Promise<void>;

  fetchTasks: (cardId: number) => Promise<void>;
  addTask: (cardId: number, text: string, sourceSegmentId?: number) => Promise<void>;
  toggleTask: (taskId: number, completed: boolean, cardId: number) => Promise<void>;
  deleteTask: (taskId: number, cardId: number) => Promise<void>;

  fetchHighlights: (recordingId: number) => Promise<void>;
  addHighlight: (recordingId: number, segmentId: number, highlightType: string, note?: string) => Promise<void>;
  removeHighlight: (highlightId: number, recordingId: number) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  cards: {},
  tasks: {},
  highlights: {},

  fetchCards: async (recordingId) => {
    try {
      let result = await window.electronAPI.invoke('workspace-card:list', { recordingId });
      if (!result || result.length === 0) {
        result = await window.electronAPI.invoke('workspace-card:init-defaults', { recordingId });
      }
      set({ cards: { ...get().cards, [recordingId]: result ?? [] } });
    } catch (err) {
      console.error('[workspace] fetchCards failed:', err);
    }
  },

  updateCard: async (cardId, updates, recordingId) => {
    try {
      await window.electronAPI.invoke('workspace-card:update', { id: cardId, ...updates });
      // Update local state without re-fetching to avoid loops
      const current = get().cards[recordingId] ?? [];
      set({
        cards: {
          ...get().cards,
          [recordingId]: current.map((c) =>
            c.id === cardId ? { ...c, ...updates } : c
          ),
        },
      });
    } catch (err) {
      console.error('[workspace] updateCard failed:', err);
    }
  },

  addCustomCard: async (recordingId, title) => {
    try {
      const existing = get().cards[recordingId] ?? [];
      const maxRow = existing.reduce((max, c) => Math.max(max, c.grid_row + c.grid_h), 0);
      await window.electronAPI.invoke('workspace-card:create', {
        recording_id: recordingId,
        card_type: 'custom_task',
        title,
        grid_col: 0,
        grid_row: maxRow,
        grid_w: 1,
        grid_h: 1,
      });
      await get().fetchCards(recordingId);
    } catch (err) {
      console.error('[workspace] addCustomCard failed:', err);
    }
  },

  renameCard: async (cardId, title, recordingId) => {
    try {
      await window.electronAPI.invoke('workspace-card:update', { id: cardId, title });
      await get().fetchCards(recordingId);
    } catch (err) {
      console.error('[workspace] renameCard failed:', err);
    }
  },

  deleteCard: async (cardId, recordingId) => {
    try {
      await window.electronAPI.invoke('workspace-card:delete', { id: cardId });
      await get().fetchCards(recordingId);
    } catch (err) {
      console.error('[workspace] deleteCard failed:', err);
    }
  },

  toggleCardCollapse: async (cardId, collapsed, recordingId) => {
    const colVal = collapsed ? 1 : 0;
    // Update local state immediately for responsiveness
    const current = get().cards[recordingId] ?? [];
    set({
      cards: {
        ...get().cards,
        [recordingId]: current.map((c) =>
          c.id === cardId ? { ...c, collapsed: colVal } : c
        ),
      },
    });
    try {
      await window.electronAPI.invoke('workspace-card:update', { id: cardId, collapsed: colVal });
    } catch (err) {
      console.error('[workspace] toggleCardCollapse failed:', err);
    }
  },

  fetchTasks: async (cardId) => {
    try {
      const result = await window.electronAPI.invoke('custom-task:list', { cardId });
      set({ tasks: { ...get().tasks, [cardId]: result ?? [] } });
    } catch (err) {
      console.error('[workspace] fetchTasks failed:', err);
    }
  },

  addTask: async (cardId, text, sourceSegmentId) => {
    try {
      await window.electronAPI.invoke('custom-task:create', {
        card_id: cardId,
        text,
        source_segment_id: sourceSegmentId,
      });
      await get().fetchTasks(cardId);
    } catch (err) {
      console.error('[workspace] addTask failed:', err);
    }
  },

  toggleTask: async (taskId, completed, cardId) => {
    try {
      await window.electronAPI.invoke('custom-task:update', { id: taskId, completed: completed ? 1 : 0 });
      await get().fetchTasks(cardId);
    } catch (err) {
      console.error('[workspace] toggleTask failed:', err);
    }
  },

  deleteTask: async (taskId, cardId) => {
    try {
      await window.electronAPI.invoke('custom-task:delete', { id: taskId });
      await get().fetchTasks(cardId);
    } catch (err) {
      console.error('[workspace] deleteTask failed:', err);
    }
  },

  fetchHighlights: async (recordingId) => {
    try {
      const result = await window.electronAPI.invoke('highlight:list', { recordingId });
      set({ highlights: { ...get().highlights, [recordingId]: result ?? [] } });
    } catch (err) {
      console.error('[workspace] fetchHighlights failed:', err);
    }
  },

  addHighlight: async (recordingId, segmentId, highlightType, note) => {
    try {
      await window.electronAPI.invoke('highlight:create', {
        recording_id: recordingId,
        segment_id: segmentId,
        highlight_type: highlightType,
        note,
      });
      await get().fetchHighlights(recordingId);
    } catch (err) {
      console.error('[workspace] addHighlight failed:', err);
    }
  },

  removeHighlight: async (highlightId, recordingId) => {
    try {
      await window.electronAPI.invoke('highlight:delete', { id: highlightId });
      await get().fetchHighlights(recordingId);
    } catch (err) {
      console.error('[workspace] removeHighlight failed:', err);
    }
  },
}));
