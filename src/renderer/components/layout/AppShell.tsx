import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
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

  // Store selectors
  const ctxMenu = useContextMenu();
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const updateRecording = useRecordingStore((s) => s.updateRecording);
  const moveToNotebook = useRecordingStore((s) => s.moveToNotebook);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const recordings = useRecordingStore((s) => s.recordings);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);
  const deleteRecording = useRecordingStore((s) => s.deleteRecording);
  const openTab = useRecordingStore((s) => s.openTab);

  // DnD sensors & state
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggedRecordingId, setDraggedRecordingId] = useState<number | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'recording') {
      setDraggedRecordingId(data.recordingId as number);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedRecordingId(null);
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current;
      const overData = over.data.current;
      if (activeData?.type === 'recording' && overData?.type === 'notebook') {
        const recordingId = activeData.recordingId as number;
        const notebookId = overData.notebookId as number;
        moveToNotebook(recordingId, notebookId);
        if (selectedNotebookId !== ALL_RECORDINGS_ID) {
          fetchRecordings(selectedNotebookId);
        }
      }
    },
    [moveToNotebook, fetchRecordings, selectedNotebookId]
  );

  const draggedRecording = draggedRecordingId != null
    ? recordings.find((r) => r.id === draggedRecordingId)
    : null;

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<{ type: 'notebook' | 'recording'; id: number; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // New notebook modal state
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  // Listen for Ctrl+N new notebook event
  useEffect(() => {
    const handler = () => {
      setNewNotebookName('');
      setShowNewNotebook(true);
    };
    window.addEventListener('yourecord:new-notebook', handler);
    return () => window.removeEventListener('yourecord:new-notebook', handler);
  }, []);

  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!ctxMenu.target) return [];
    const { type, id } = ctxMenu.target;

    if (type === 'all-recordings') {
      return [
        {
          label: 'Delete All Recordings',
          danger: true,
          action: () => {
            setDeleteTarget({ type: 'all-recordings', id: 0 });
          },
        },
      ];
    }

    if (type === 'notebook') {
      const nb = useNotebookStore.getState().notebooks.find((n) => n.id === id);
      return [
        {
          label: 'Rename',
          action: () => {
            setRenameValue(nb?.name ?? '');
            setRenameTarget({ type: 'notebook', id, currentName: nb?.name ?? '' });
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
      const moveItems: ContextMenuItem[] = notebooks
        .filter((nb) => nb.id !== recording?.notebook_id)
        .map((nb) => ({
          label: `Move to: ${nb.name}`,
          action: () => {
            moveToNotebook(id, nb.id);
            // Re-fetch recordings for the current view after move
            if (selectedNotebookId !== ALL_RECORDINGS_ID) {
              fetchRecordings(selectedNotebookId);
            }
          },
        }));

      return [
        {
          label: 'Open in Tab',
          action: () => openTab(id),
        },
        { label: '', action: () => {}, separator: true },
        {
          label: 'Rename',
          action: () => {
            setRenameValue(recording?.title ?? '');
            setRenameTarget({ type: 'recording', id, currentName: recording?.title ?? '' });
          },
        },
        ...(moveItems.length > 0
          ? [{ label: '', action: () => {}, separator: true } as ContextMenuItem, ...moveItems]
          : []),
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
  }, [ctxMenu.target, recordings, notebooks, selectedNotebookId, moveToNotebook, fetchRecordings, openTab]);

  const [renameError, setRenameError] = useState('');

  const handleConfirmRename = useCallback(() => {
    if (!renameTarget || !renameValue.trim()) return;
    if (renameTarget.type === 'notebook') {
      const existing = useNotebookStore.getState().notebooks;
      if (existing.some((nb) => nb.id !== renameTarget.id && nb.name.toLowerCase() === renameValue.trim().toLowerCase())) {
        setRenameError('A notebook with this name already exists');
        return;
      }
      setRenameError('');
      updateNotebook(renameTarget.id, { name: renameValue.trim() });
    } else if (renameTarget.type === 'recording') {
      updateRecording(renameTarget.id, { title: renameValue.trim() });
    }
    setRenameTarget(null);
  }, [renameTarget, renameValue, updateNotebook, updateRecording]);

  const [notebookError, setNotebookError] = useState('');

  const handleCreateNotebook = useCallback(() => {
    const name = newNotebookName.trim();
    if (!name) return;
    const existing = useNotebookStore.getState().notebooks;
    if (existing.some((nb) => nb.name.toLowerCase() === name.toLowerCase())) {
      setNotebookError('A notebook with this name already exists');
      return;
    }
    setNotebookError('');
    createNotebook(name, '📁');
    setShowNewNotebook(false);
  }, [newNotebookName, createNotebook]);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'notebook') {
      deleteNotebook(deleteTarget.id);
    } else if (deleteTarget.type === 'recording') {
      deleteRecording(deleteTarget.id);
    } else if (deleteTarget.type === 'all-recordings') {
      // Delete all recordings
      const allRecs = useRecordingStore.getState().recordings;
      for (const rec of allRecs) {
        await deleteRecording(rec.id);
      }
      fetchRecordings();
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteNotebook, deleteRecording, fetchRecordings]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
        title={deleteTarget?.type === 'all-recordings' ? 'Delete All Recordings?' : `Delete ${deleteTarget?.type === 'notebook' ? 'Notebook' : 'Recording'}?`}
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
          {deleteTarget?.type === 'all-recordings'
            ? 'This will delete ALL recordings, transcripts, and audio files. This cannot be undone.'
            : `This action cannot be undone. Are you sure you want to delete this ${deleteTarget?.type}?`}
        </p>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={renameTarget !== null}
        title={`Rename ${renameTarget?.type === 'notebook' ? 'Notebook' : 'Recording'}`}
        onClose={() => setRenameTarget(null)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleConfirmRename}
            >
              Rename
            </button>
          </>
        }
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
          autoFocus
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="Enter new name..."
        />
        {renameError && <p className="mt-2 text-xs text-danger">{renameError}</p>}
      </Modal>

      {/* New Notebook Modal */}
      <Modal
        isOpen={showNewNotebook}
        title="New Notebook"
        onClose={() => setShowNewNotebook(false)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setShowNewNotebook(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleCreateNotebook}
            >
              Create
            </button>
          </>
        }
      >
        <input
          type="text"
          value={newNotebookName}
          onChange={(e) => setNewNotebookName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
          autoFocus
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="Notebook name..."
        />
        {notebookError && <p className="mt-2 text-xs text-danger">{notebookError}</p>}
      </Modal>

      {/* Drag overlay for recording items */}
      <DragOverlay dropAnimation={null}>
        {draggedRecording ? (
          <div className="rounded-card bg-surface px-3 py-1.5 text-sm text-accent opacity-80 shadow-lg border border-accent/30">
            {draggedRecording.title}
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
