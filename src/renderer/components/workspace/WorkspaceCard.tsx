import { useState, useCallback } from 'react';
import type { WorkspaceCard as WorkspaceCardType } from '../../../shared/types/database.types';
import { useWorkspaceStore } from '../../stores/workspace.store';

interface Props {
  card: WorkspaceCardType;
  children: React.ReactNode;
  recordingId: number;
}

export default function WorkspaceCard({ card, children, recordingId }: Props) {
  const toggleCardCollapse = useWorkspaceStore((s) => s.toggleCardCollapse);
  const renameCard = useWorkspaceStore((s) => s.renameCard);
  const deleteCard = useWorkspaceStore((s) => s.deleteCard);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);

  const isCollapsed = card.collapsed === 1;
  const isCustom = card.card_type === 'custom_task';

  const handleToggleCollapse = useCallback(() => {
    toggleCardCollapse(card.id, !isCollapsed, recordingId);
  }, [card.id, isCollapsed, recordingId, toggleCardCollapse]);

  const handleDoubleClick = useCallback(() => {
    if (isCustom) {
      setEditTitle(card.title);
      setEditing(true);
    }
  }, [isCustom, card.title]);

  const commitRename = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== card.title) {
      renameCard(card.id, trimmed, recordingId);
    }
    setEditing(false);
  }, [editTitle, card.title, card.id, recordingId, renameCard]);

  const handleDelete = useCallback(() => {
    deleteCard(card.id, recordingId);
  }, [card.id, recordingId, deleteCard]);

  return (
    <div
      className="rounded-card border border-border bg-surface"
      style={{
        gridColumn: `${card.grid_col + 1} / span ${card.grid_w}`,
        gridRow: `${card.grid_row + 1} / span ${card.grid_h}`,
      }}
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between p-card transition-colors hover:bg-surface-2/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleToggleCollapse}
            className="shrink-0 p-0.5"
            aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
              className={`text-text-muted transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            >
              <path d="M3 1l4 4-4 4z" />
            </svg>
          </button>

          {editing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="text-md font-semibold text-text bg-transparent border-b border-accent outline-none min-w-0 flex-1"
            />
          ) : (
            <h3
              className="text-md font-semibold text-text truncate"
              onDoubleClick={handleDoubleClick}
              title={isCustom ? 'Double-click to rename' : undefined}
            >
              {card.title}
            </h3>
          )}
        </div>

        {isCustom && (
          <button
            onClick={handleDelete}
            className="shrink-0 ml-2 p-1 text-text-muted/50 hover:text-recording transition-colors"
            aria-label="Delete card"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="max-h-[400px] overflow-y-auto border-t border-border/50 px-card pb-card">
          {children}
        </div>
      )}
    </div>
  );
}
