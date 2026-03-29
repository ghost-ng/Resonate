import { useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { WorkspaceCard as WorkspaceCardType } from '../../../shared/types/database.types';
import { useWorkspaceStore } from '../../stores/workspace.store';

interface Props {
  card: WorkspaceCardType;
  children: React.ReactNode;
  recordingId: number;
  index: number;
  isDragOver: boolean;
  onDragStart: (index: number, el: HTMLDivElement) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onWidthToggle: () => void;
  style?: CSSProperties;
}

export default function WorkspaceCard({
  card, children, recordingId, index, isDragOver,
  onDragStart, onDragEnter, onDragEnd, onWidthToggle, style,
}: Props) {
  const toggleCardCollapse = useWorkspaceStore((s) => s.toggleCardCollapse);
  const renameCard = useWorkspaceStore((s) => s.renameCard);
  const deleteCard = useWorkspaceStore((s) => s.deleteCard);

  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [bodyHeight, setBodyHeight] = useState(400);

  const isCollapsed = card.collapsed === 1;
  const isCustom = card.card_type === 'custom_task';

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = bodyRef.current?.offsetHeight ?? bodyHeight;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startY;
      setBodyHeight(Math.max(100, startHeight + delta));
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  }, [bodyHeight]);

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
      ref={cardRef}
      className={`rounded-card border bg-surface transition-all duration-150 ${
        isDragOver
          ? 'border-accent/60 shadow-[0_0_12px_rgba(91,141,239,0.2)] scale-[1.01]'
          : 'border-border'
      }`}
      style={style}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(e) => e.preventDefault()}
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

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Width toggle */}
          <button
            onClick={onWidthToggle}
            className="p-1 text-text-muted/40 hover:text-text-muted transition-colors"
            title={card.grid_w >= 2 ? 'Half width' : 'Full width'}
            aria-label={card.grid_w >= 2 ? 'Half width' : 'Full width'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {card.grid_w >= 2 ? (
                <>
                  <path d="M11 4l-3 4 3 4" />
                  <path d="M5 4l3 4-3 4" />
                </>
              ) : (
                <>
                  <path d="M4 4l3 4-3 4" />
                  <path d="M12 4l-3 4 3 4" />
                </>
              )}
            </svg>
          </button>

          {/* Drag handle */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              if (cardRef.current) onDragStart(index, cardRef.current);
            }}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing p-1 text-text-muted/40 hover:text-text-muted transition-colors"
            title="Drag to reposition"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </div>

          {isCustom && (
            <button
              onClick={handleDelete}
              className="p-1 text-text-muted/40 hover:text-recording transition-colors"
              aria-label="Delete card"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="relative border-t border-border/50">
          <div
            ref={bodyRef}
            className="overflow-y-auto px-card pb-card"
            style={{ maxHeight: bodyHeight }}
          >
            {children}
          </div>
          {/* Vertical resize handle */}
          <div
            onPointerDown={handleResizePointerDown}
            className="flex h-[10px] cursor-row-resize items-center justify-center hover:bg-surface-2/60 transition-colors"
            title="Drag to resize height"
          >
            <svg width="24" height="4" viewBox="0 0 24 4" className="text-text-muted/30">
              <line x1="4" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="4" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
