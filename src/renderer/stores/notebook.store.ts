import { create } from 'zustand';
import type { Notebook } from '../../shared/types/database.types';
import { ALL_RECORDINGS_ID } from '../lib/constants';

interface NotebookState {
  notebooks: Notebook[];
  selectedNotebookId: number;
  setSelectedNotebookId: (id: number) => void;
  fetchNotebooks: () => Promise<void>;
  createNotebook: (name: string, icon: string) => Promise<void>;
  updateNotebook: (id: number, updates: { name?: string; icon?: string; sort_order?: number }) => Promise<void>;
  deleteNotebook: (id: number) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  selectedNotebookId: ALL_RECORDINGS_ID,

  setSelectedNotebookId: (id) => set({ selectedNotebookId: id }),

  fetchNotebooks: async () => {
    try {
      const result = await window.electronAPI.invoke('notebook:list', undefined);
      if (result) {
        set({ notebooks: result });
      }
    } catch {
      // IPC not available
    }
  },

  createNotebook: async (name, icon) => {
    try {
      const nb = await window.electronAPI.invoke('notebook:create', { name, icon });
      set({ notebooks: [...get().notebooks, nb] });
    } catch {
      const id = Math.max(0, ...get().notebooks.map(n => n.id)) + 1;
      const nb: Notebook = { id, name, icon, sort_order: id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      set({ notebooks: [...get().notebooks, nb] });
    }
  },

  updateNotebook: async (id, updates) => {
    try {
      const nb = await window.electronAPI.invoke('notebook:update', { id, ...updates });
      set({ notebooks: get().notebooks.map(n => n.id === id ? nb : n) });
    } catch {
      set({
        notebooks: get().notebooks.map(n =>
          n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
        ),
      });
    }
  },

  deleteNotebook: async (id) => {
    try {
      await window.electronAPI.invoke('notebook:delete', { id });
    } catch {
      // Fallback: just remove locally
    }
    set({ notebooks: get().notebooks.filter(n => n.id !== id) });
    if (get().selectedNotebookId === id) {
      set({ selectedNotebookId: ALL_RECORDINGS_ID });
    }
  },
}));
