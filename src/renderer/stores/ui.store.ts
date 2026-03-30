import { create } from 'zustand';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: { type: string; id: number } | null;
}

type Theme = 'dark' | 'light';

interface UiState {
  sidebarCollapsed: boolean;
  settingsPanelOpen: boolean;
  searchQuery: string;
  contextMenu: ContextMenuState;
  theme: Theme;
  toggleSidebar: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  openContextMenu: (x: number, y: number, target: { type: string; id: number }) => void;
  closeContextMenu: () => void;
  toggleTheme: () => void;
}

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem('resonate-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage not available
  }
  return 'dark';
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  settingsPanelOpen: false,
  searchQuery: '',
  contextMenu: { visible: false, x: 0, y: 0, target: null },
  theme: loadTheme(),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openContextMenu: (x, y, target) => set({ contextMenu: { visible: true, x, y, target } }),
  closeContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, target: null } }),
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('resonate-theme', next);
      } catch {
        // localStorage not available
      }
      return { theme: next };
    }),
}));
