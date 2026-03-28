import { create } from 'zustand';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: { type: string; id: number } | null;
}

interface UiState {
  sidebarCollapsed: boolean;
  settingsPanelOpen: boolean;
  searchQuery: string;
  contextMenu: ContextMenuState;
  toggleSidebar: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  openContextMenu: (x: number, y: number, target: { type: string; id: number }) => void;
  closeContextMenu: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  settingsPanelOpen: false,
  searchQuery: '',
  contextMenu: { visible: false, x: 0, y: 0, target: null },

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openContextMenu: (x, y, target) => set({ contextMenu: { visible: true, x, y, target } }),
  closeContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, target: null } }),
}));
