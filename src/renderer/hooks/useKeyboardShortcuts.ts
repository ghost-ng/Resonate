import { useEffect } from 'react';
import { useSessionStore } from '../stores/session.store';
import { useRecordingStore } from '../stores/recording.store';
import { useUiStore } from '../stores/ui.store';

/**
 * Global keyboard shortcuts for the application.
 * Should be called once in AppShell.
 */
export function useKeyboardShortcuts() {
  const startRecording = useSessionStore((s) => s.startRecording);
  const stopRecording = useSessionStore((s) => s.stopRecording);
  const isRecording = useSessionStore((s) => s.isRecording);

  const closeTab = useRecordingStore((s) => s.closeTab);
  const activeTabId = useRecordingStore((s) => s.activeTabId);
  const openTabIds = useRecordingStore((s) => s.openTabIds);
  const setActiveTab = useRecordingStore((s) => s.setActiveTab);

  const setSettingsPanelOpen = useUiStore((s) => s.setSettingsPanelOpen);
  const settingsPanelOpen = useUiStore((s) => s.settingsPanelOpen);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const contextMenuVisible = useUiStore((s) => s.contextMenu.visible);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      // Escape — close settings panel or context menu
      if (e.key === 'Escape') {
        if (contextMenuVisible) {
          closeContextMenu();
          e.preventDefault();
          return;
        }
        if (settingsPanelOpen) {
          setSettingsPanelOpen(false);
          e.preventDefault();
          return;
        }
      }

      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        // Ctrl+R — Toggle recording
        case 'r': {
          e.preventDefault();
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
          break;
        }

        // Ctrl+N — Open new notebook dialog (dispatched as custom event)
        case 'n': {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('resonate:new-notebook'));
          break;
        }

        // Ctrl+F — Focus search bar
        case 'f': {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-search-input]'
          );
          searchInput?.focus();
          break;
        }

        // Ctrl+W — Close active tab
        case 'w': {
          e.preventDefault();
          if (activeTabId !== null) {
            closeTab(activeTabId);
          }
          break;
        }

        // Ctrl+Tab — Switch to next tab
        case 'tab': {
          e.preventDefault();
          if (openTabIds.length > 1 && activeTabId !== null) {
            const currentIndex = openTabIds.indexOf(activeTabId);
            const nextIndex = (currentIndex + 1) % openTabIds.length;
            setActiveTab(openTabIds[nextIndex]);
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isRecording,
    startRecording,
    stopRecording,
    activeTabId,
    openTabIds,
    closeTab,
    setActiveTab,
    settingsPanelOpen,
    setSettingsPanelOpen,
    contextMenuVisible,
    closeContextMenu,
  ]);
}
