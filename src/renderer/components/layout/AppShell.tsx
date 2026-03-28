import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/ui.store';
import { useNotebookStore } from '../../stores/notebook.store';
import { useRecordingStore } from '../../stores/recording.store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useRecordingTimer } from '../../hooks/useRecordingTimer';
import { useContextMenu } from '../../hooks/useContextMenu';
import type { ContextMenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../shared/ContextMenu';
import Modal from '../shared/Modal';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import MainContent from './MainContent';
import StatusBar from './StatusBar';

export default function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const theme = useUiStore((s) => s.theme);
  const createNotebook = useNotebookStore((s) => s.createNotebook);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Recording timer
  useRecordingTimer();

  // Listen for Ctrl+N new notebook event
  useEffect(() => {
    const handler = () => {
      const name = prompt('Enter notebook name:');
      if (name) createNotebook(name, '📁');
    };
    window.addEventListener('yourecord:new-notebook', handler);
    return () => window.removeEventListener('yourecord:new-notebook', handler);
  }, [createNotebook]);

  // Context menu
  const ctxMenu = useContextMenu();
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const recordings = useRecordingStore((s) => s.recordings);

  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!ctxMenu.target) return [];
    const { type, id } = ctxMenu.target;

    if (type === 'notebook') {
      return [
        {
          label: 'Rename',
          action: () => {
            const newName = prompt('Enter new notebook name:');
            if (newName) updateNotebook(id, { name: newName });
          },
        },
        { label: '', action: () => {}, separator: true },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            setDeleteTarget({ type: 'notebook', id });
          },
        },
      ];
    }

    if (type === 'recording') {
      const recording = recordings.find((r) => r.id === id);
      return [
        {
          label: 'Rename',
          action: () => {
            const newTitle = prompt('Enter new recording title:', recording?.title);
            if (newTitle) {
              // Recording rename would go through IPC in a real implementation
              console.log('Rename recording', id, 'to', newTitle);
            }
          },
        },
        { label: '', action: () => {}, separator: true },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            setDeleteTarget({ type: 'recording', id });
          },
        },
      ];
    }

    return [];
  }, [ctxMenu.target, recordings, updateNotebook]);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  const deleteRecording = useRecordingStore((s) => s.deleteRecording);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'notebook') {
      deleteNotebook(deleteTarget.id);
    } else if (deleteTarget.type === 'recording') {
      deleteRecording(deleteTarget.id);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteNotebook, deleteRecording]);

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && <Sidebar />}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <MainContent />
        </div>
      </div>
      <StatusBar />

      {/* Context Menu */}
      <ContextMenu
        visible={ctxMenu.visible}
        x={ctxMenu.x}
        y={ctxMenu.y}
        items={contextMenuItems}
        onClose={ctxMenu.hide}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        title={`Delete ${deleteTarget?.type === 'notebook' ? 'Notebook' : 'Recording'}?`}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          This action cannot be undone. Are you sure you want to delete this{' '}
          {deleteTarget?.type}?
        </p>
      </Modal>
    </div>
  );
}
