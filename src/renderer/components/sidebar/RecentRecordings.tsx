import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useRecordingStore } from '../../stores/recording.store';
import { useNotebookStore } from '../../stores/notebook.store';
import { useContextMenu } from '../../hooks/useContextMenu';
import { formatRelativeDate, formatDurationShort } from '../../lib/formatters';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
import type { Recording } from '../../../shared/types/database.types';

function DraggableRecordingItem({
  rec,
  isActive,
  onClick,
  onContextMenu,
}: {
  rec: Recording;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `recording-${rec.id}`,
    data: { type: 'recording', recordingId: rec.id },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={style}
      className={`flex w-full flex-col gap-0.5 rounded-card px-3 py-1.5 text-left transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${
        isActive
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      <span className="truncate text-sm">{rec.title}</span>
      <span className="text-xs opacity-60">
        {formatRelativeDate(rec.created_at)} · {formatDurationShort(rec.duration_seconds)}
      </span>
    </button>
  );
}

export default function RecentRecordings() {
  const recordings = useRecordingStore((s) => s.recordings);
  const openTab = useRecordingStore((s) => s.openTab);
  const activeTabId = useRecordingStore((s) => s.activeTabId);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const ctxMenu = useContextMenu();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sortByDate = (list: Recording[]) =>
    [...list]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

  // When a specific notebook is selected, show only that notebook's recordings
  if (selectedNotebookId !== ALL_RECORDINGS_ID) {
    const filtered = recordings.filter((r) => r.notebook_id === selectedNotebookId);
    const recent = sortByDate(filtered);

    return (
      <div className="flex flex-col gap-0.5 px-2">
        <div className="px-1 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-text-muted/60">
          Recordings
        </div>
        {recent.map((rec) => (
          <DraggableRecordingItem
            key={rec.id}
            rec={rec}
            isActive={activeTabId === rec.id}
            onClick={() => openTab(rec.id)}
            onContextMenu={(e) => ctxMenu.show(e, { type: 'recording', id: rec.id })}
          />
        ))}
      </div>
    );
  }

  // "All Recordings" view: grouped by notebook + unassigned
  const unassigned = sortByDate(recordings.filter((r) => r.notebook_id === null));
  const grouped = notebooks
    .map((nb) => ({
      notebook: nb,
      recordings: sortByDate(recordings.filter((r) => r.notebook_id === nb.id)),
    }))
    .filter((g) => g.recordings.length > 0);

  return (
    <div className="flex flex-col gap-0.5 px-2" data-tutorial="recording-list">
      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <>
          <button
            onClick={() => toggleSection('unassigned')}
            className="flex w-full items-center gap-1 px-1 pb-1 pt-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted/60 hover:text-text-muted"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className={`shrink-0 transition-transform ${collapsedSections['unassigned'] ? '' : 'rotate-90'}`}
            >
              <path d="M3 1l4 4-4 4z" />
            </svg>
            Unassigned
          </button>
          {!collapsedSections['unassigned'] &&
            unassigned.map((rec) => (
              <DraggableRecordingItem
                key={rec.id}
                rec={rec}
                isActive={activeTabId === rec.id}
                onClick={() => openTab(rec.id)}
                onContextMenu={(e) => ctxMenu.show(e, { type: 'recording', id: rec.id })}
              />
            ))}
        </>
      )}

      {/* Per-notebook sections */}
      {grouped.map(({ notebook, recordings: nbRecordings }) => (
        <div key={notebook.id}>
          <button
            onClick={() => toggleSection(`nb-${notebook.id}`)}
            className="flex w-full items-center gap-1 px-1 pb-1 pt-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted/60 hover:text-text-muted"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className={`shrink-0 transition-transform ${collapsedSections[`nb-${notebook.id}`] ? '' : 'rotate-90'}`}
            >
              <path d="M3 1l4 4-4 4z" />
            </svg>
            <span className="mr-1">{notebook.icon}</span>
            {notebook.name}
          </button>
          {!collapsedSections[`nb-${notebook.id}`] &&
            nbRecordings.map((rec) => (
              <DraggableRecordingItem
                key={rec.id}
                rec={rec}
                isActive={activeTabId === rec.id}
                onClick={() => openTab(rec.id)}
                onContextMenu={(e) => ctxMenu.show(e, { type: 'recording', id: rec.id })}
              />
            ))}
        </div>
      ))}
    </div>
  );
}
