import { create } from 'zustand';
import type { WorkspaceCard, CustomTask, TranscriptHighlight } from '../../shared/types/database.types';
import type { SummaryWithActions } from '../../shared/types/ipc.types';

interface WorkspaceState {
  cards: Record<number, WorkspaceCard[]>;
  tasks: Record<number, CustomTask[]>;
  highlights: Record<number, TranscriptHighlight[]>;
  cardSummaries: Record<number, SummaryWithActions>; // keyed by card.id

  fetchCards: (recordingId: number) => Promise<void>;
  updateCard: (cardId: number, updates: Partial<Pick<WorkspaceCard, 'grid_col' | 'grid_row' | 'grid_w' | 'grid_h' | 'collapsed' | 'sort_order'>>, recordingId: number) => Promise<void>;
  findDuplicateCard: (recordingId: number, cardType: string, title: string) => WorkspaceCard | undefined;
  addCard: (recordingId: number, cardType: string, title: string, profileId?: number) => Promise<void>;
  renameCard: (cardId: number, title: string, recordingId: number) => Promise<void>;
  deleteCard: (cardId: number, recordingId: number) => Promise<void>;
  toggleCardCollapse: (cardId: number, collapsed: boolean, recordingId: number) => Promise<void>;

  fetchCardSummary: (cardId: number, summaryId: number) => Promise<void>;

  fetchTasks: (cardId: number) => Promise<void>;
  addTask: (cardId: number, text: string, sourceSegmentId?: number) => Promise<void>;
  toggleTask: (taskId: number, completed: boolean, cardId: number) => Promise<void>;
  deleteTask: (taskId: number, cardId: number) => Promise<void>;

  fetchHighlights: (recordingId: number) => Promise<void>;
  addHighlight: (recordingId: number, segmentId: number, highlightType: string, note?: string) => Promise<void>;
  removeHighlight: (highlightId: number, recordingId: number) => Promise<void>;
}

/** After generating a summary, ensure an action_items card exists and is uncollapsed. */
async function ensureActionItemsCard(recordingId: number, get: () => WorkspaceState) {
  const cards = get().cards[recordingId] ?? [];
  const actionCard = cards.find((c) => c.card_type === 'action_items');

  if (actionCard) {
    // Uncollapse if hidden
    if (actionCard.collapsed === 1) {
      await window.electronAPI.invoke('workspace-card:update', { id: actionCard.id, collapsed: 0 });
      await get().fetchCards(recordingId);
    }
  } else {
    // Create a new action items card
    const maxSort = cards.reduce((max, c) => Math.max(max, c.sort_order), -1);
    await window.electronAPI.invoke('workspace-card:create', {
      recording_id: recordingId,
      card_type: 'action_items',
      title: 'Action Items',
      grid_col: 0,
      grid_row: 0,
      grid_w: 1,
      grid_h: 1,
      sort_order: maxSort + 1,
    });
    await get().fetchCards(recordingId);
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  cards: {},
  tasks: {},
  highlights: {},
  cardSummaries: {},

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

  findDuplicateCard: (recordingId, cardType, title) => {
    const existing = get().cards[recordingId] ?? [];
    if (cardType === 'summary') {
      return existing.find(c => c.card_type === 'summary' && c.title === title);
    }
    return existing.find(c => c.card_type === cardType);
  },

  addCard: async (recordingId, cardType, title, profileId) => {
    try {
      const existing = get().cards[recordingId] ?? [];
      const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order), -1);

      // For summary cards with a profile, trigger generation first
      let referenceId: number | undefined;
      if (cardType === 'summary' && profileId) {
        // Check if a card with the same profile title already exists (overwrite it)
        const matchingCard = existing.find(
          (c) => c.card_type === 'summary' && c.title === title
        );

        const result = await window.electronAPI.invoke('summary:generate', {
          recordingId,
          profileId,
        });
        if (result && typeof result === 'object' && 'summaryId' in result) {
          referenceId = (result as { summaryId: number }).summaryId;
        }

        if (!referenceId) {
          throw new Error('Summary generation produced no result');
        }

        // If a matching card exists, update its reference_id to the new summary
        if (matchingCard) {
          await window.electronAPI.invoke('workspace-card:update', {
            id: matchingCard.id,
            reference_id: referenceId,
          });
          const { [matchingCard.id]: _, ...restSummaries } = get().cardSummaries;
          set({ cardSummaries: restSummaries });
          await get().fetchCards(recordingId);
          await get().fetchCardSummary(matchingCard.id, referenceId);
          // Ensure action_items card exists and is visible
          await ensureActionItemsCard(recordingId, get);
          return;
        }
      }

      await window.electronAPI.invoke('workspace-card:create', {
        recording_id: recordingId,
        card_type: cardType,
        title,
        grid_col: 0,
        grid_row: 0,
        grid_w: 1,
        grid_h: 1,
        sort_order: maxSort + 1,
        reference_id: referenceId,
      });
      await get().fetchCards(recordingId);

      // After generating a summary, ensure action_items card exists and is visible
      if (cardType === 'summary' && referenceId) {
        await ensureActionItemsCard(recordingId, get);
      }
    } catch (err) {
      console.error('[workspace] addCard failed:', err);
      throw err; // Re-throw so callers can show the error
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

  fetchCardSummary: async (cardId, summaryId) => {
    try {
      const result = await window.electronAPI.invoke('summary:get-by-id', { id: summaryId });
      if (result) {
        set({ cardSummaries: { ...get().cardSummaries, [cardId]: result } });
      }
    } catch (err) {
      console.error('[workspace] fetchCardSummary failed:', err);
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
