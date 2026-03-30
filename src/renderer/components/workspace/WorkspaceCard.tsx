import { useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { WorkspaceCard as WorkspaceCardType } from '../../../shared/types/database.types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { CardSearchContext } from './CardSearchContext';

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
  onExport?: () => void;
  style?: CSSProperties;
}

export default function WorkspaceCard({
  card, children, recordingId, index, isDragOver,
  onDragStart, onDragEnter, onDragEnd, onWidthToggle, onExport, style,
}: Props) {
  const toggleCardCollapse = useWorkspaceStore((s) => s.toggleCardCollapse);
  const renameCard = useWorkspaceStore((s) => s.renameCard);
  const deleteCard = useWorkspaceStore((s) => s.deleteCard);

  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [bodyHeight, setBodyHeight] = useState(400);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    deleteCard(card.id, recordingId);
    setShowDeleteConfirm(false);
  }, [card.id, recordingId, deleteCard]);

  const openSearch = useCallback(() => {
    setShowSearch(true);
    setSearchQuery('');
    setActiveMatchIndex(0);
    setTotalMatches(0);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setActiveMatchIndex(0);
    setTotalMatches(0);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalMatches === 0) return;
      if (e.shiftKey) {
        setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
      } else {
        setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
      }
      // Scroll the active match into view
      setTimeout(() => {
        const active = bodyRef.current?.querySelector(`[data-match-index="${e.shiftKey ? ((activeMatchIndex - 1 + totalMatches) % totalMatches) : ((activeMatchIndex + 1) % totalMatches)}"]`);
        active?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 10);
    }
  }, [closeSearch, totalMatches, activeMatchIndex]);

  const handleSetTotalMatches = useCallback((count: number) => {
    setTotalMatches(count);
    if (count > 0 && activeMatchIndex >= count) {
      setActiveMatchIndex(0);
    }
  }, [activeMatchIndex]);

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
          {/* Search */}
          <button
            onClick={openSearch}
            className="p-1 text-text-muted/40 hover:text-text-muted transition-colors"
            title="Search in card (Ctrl+F)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="p-1 text-text-muted/40 hover:text-text-muted transition-colors"
              title="Export as file"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
              </svg>
            </button>
          )}

          {/* Width toggle */}
          <button
            onClick={onWidthToggle}
            className="p-1 text-text-muted/40 hover:text-text-muted transition-colors"
            title={card.grid_w >= 2 ? 'Shrink to half width' : 'Expand to full width'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {card.grid_w >= 2 ? (
                <>
                  <path d="M1 8h4M11 8h4" />
                  <path d="M3 5.5L5 8 3 10.5" />
                  <path d="M13 5.5L11 8 13 10.5" />
                </>
              ) : (
                <>
                  <path d="M5 8H1M15 8h-4" />
                  <path d="M3 5.5L1 8l2 2.5" />
                  <path d="M13 5.5l2 2.5-2 2.5" />
                </>
              )}
            </svg>
          </button>

          {/* Drag handle */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const ghost = cardRef.current.cloneNode(true) as HTMLElement;
                ghost.style.width = `${rect.width}px`;
                ghost.style.opacity = '0.7';
                ghost.style.position = 'absolute';
                ghost.style.top = '-9999px';
                ghost.style.left = '-9999px';
                ghost.style.border = '2px solid #5B3DF5';
                ghost.style.borderRadius = '6px';
                ghost.style.boxShadow = '0 8px 32px rgba(91,61,245,0.3)';
                ghost.style.pointerEvents = 'none';
                document.body.appendChild(ghost);
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
                requestAnimationFrame(() => {
                  setTimeout(() => document.body.removeChild(ghost), 0);
                });
                onDragStart(index, cardRef.current);
              }
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

          <button
            onClick={handleDelete}
            className="p-1 text-text-muted/40 hover:text-recording transition-colors"
            aria-label="Delete card"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-t border-border/50 bg-surface-2/50 px-card py-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveMatchIndex(0); }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/50 outline-none"
          />
          {searchQuery && (
            <span className="text-xs text-text-muted whitespace-nowrap">
              {totalMatches > 0 ? `${activeMatchIndex + 1} / ${totalMatches}` : 'No matches'}
            </span>
          )}
          <button onClick={closeSearch} className="text-text-muted hover:text-text transition-colors shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      )}

      {/* Body */}
      {!isCollapsed && (
        <div className="relative border-t border-border/50">
          <div
            ref={bodyRef}
            className="overflow-y-auto px-card pb-card"
            style={{ maxHeight: bodyHeight }}
          >
            <CardSearchContext.Provider value={{
              query: searchQuery,
              activeMatchIndex,
              totalMatches,
              setTotalMatches: handleSetTotalMatches,
            }}>
              {children}
            </CardSearchContext.Provider>
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

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="border-t border-border bg-danger/5 px-card py-2 flex items-center justify-between">
          <span className="text-xs text-danger">Delete this card?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-2 py-0.5 text-xs text-text-muted hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="rounded bg-danger px-2 py-0.5 text-xs text-white hover:opacity-90 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
