import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ActionItem as ActionItemType } from '../../../../shared/types/database.types';
import HighlightText from '../../shared/HighlightText';
import { useCardSearch } from '../CardSearchContext';

interface Props {
  items: ActionItemType[];
}

export default function ActionItemsCardContent({ items: initialItems }: Props) {
  const [items, setItems] = useState<ActionItemType[]>(initialItems);
  const { query, activeMatchIndex, setTotalMatches } = useCardSearch();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Count matches
  useEffect(() => {
    if (!query) { setTotalMatches(0); return; }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    for (const item of items) {
      const matches = item.text.match(regex);
      if (matches) count += matches.length;
    }
    setTotalMatches(count);
  }, [query, items, setTotalMatches]);
  const [editText, setEditText] = useState('');
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignText, setAssignText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const assignInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (assigningId !== null) {
      assignInputRef.current?.focus();
      assignInputRef.current?.select();
    }
  }, [assigningId]);

  const handleToggle = useCallback(async (id: number, completed: boolean) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: completed ? 1 : 0 } : item
    ));
    try {
      await window.electronAPI.invoke('action-item:toggle', { id, completed });
    } catch {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, completed: completed ? 0 : 1 } : item
      ));
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  }, []);

  const startEdit = useCallback((item: ActionItemType) => {
    setEditText(item.text);
    setEditingId(item.id);
    setAssigningId(null);
    setContextMenu(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (editingId === null) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setItems(prev => prev.map(item =>
      item.id === editingId ? { ...item, text: trimmed } : item
    ));
    setEditingId(null);
    try {
      await window.electronAPI.invoke('action-item:update', { id: editingId, text: trimmed });
    } catch {
      setItems(initialItems);
    }
  }, [editingId, editText, initialItems]);

  const startAssign = useCallback((item: ActionItemType) => {
    setAssignText('');
    setAssigningId(item.id);
    setEditingId(null);
    setContextMenu(null);
  }, []);

  const addAssignee = useCallback(async () => {
    if (assigningId === null) return;
    const newName = assignText.trim();
    if (!newName) { setAssigningId(null); return; }
    const item = items.find(i => i.id === assigningId);
    const existing = item?.assignee ? item.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (existing.some(n => n.toLowerCase() === newName.toLowerCase())) {
      setAssignText('');
      return; // already assigned
    }
    const updated = [...existing, newName].join(', ');
    setItems(prev => prev.map(i => i.id === assigningId ? { ...i, assignee: updated } : i));
    setAssignText('');
    try {
      await window.electronAPI.invoke('action-item:update', { id: assigningId, assignee: updated });
    } catch { setItems(initialItems); }
  }, [assigningId, assignText, items, initialItems]);

  const removeAssignee = useCallback(async (itemId: number, nameToRemove: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item?.assignee) return;
    const remaining = item.assignee.split(',').map(s => s.trim()).filter(n => n !== nameToRemove);
    const updated = remaining.length > 0 ? remaining.join(', ') : null;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, assignee: updated } : i));
    try {
      await window.electronAPI.invoke('action-item:update', { id: itemId, assignee: updated });
    } catch { setItems(initialItems); }
  }, [items, initialItems]);

  if (items.length === 0) {
    return <p className="py-3 text-sm text-text-muted">No action items yet.</p>;
  }

  return (
    <div className="flex flex-col pt-2" data-tutorial="action-items">
      {items.map((item) => {
        const isCompleted = item.completed === 1;
        const isEditing = editingId === item.id;
        const isAssigning = assigningId === item.id;

        return (
          <div
            key={item.id}
            className="flex items-start gap-2 py-1"
            onContextMenu={(e) => handleContextMenu(e, item.id)}
          >
            <button
              onClick={() => handleToggle(item.id, !isCompleted)}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                isCompleted
                  ? 'border-success bg-success/20 text-success'
                  : 'border-border hover:border-accent'
              }`}
            >
              {isCompleted && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={saveEdit}
                  className="w-full rounded border border-accent bg-surface-2 px-2 py-0.5 text-sm text-text outline-none"
                />
              ) : (
                <>
                  <div className={`text-sm action-item-md ${isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                    {query ? (
                      <HighlightText text={item.text.replace(/\*\*/g, '').replace(/\*/g, '')} query={query} activeIndex={activeMatchIndex} />
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <span>{children}</span>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">{children}</code>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} className="text-accent underline" target="_blank" rel="noopener noreferrer">{children}</a>
                          ),
                        }}
                      >
                        {item.text}
                      </ReactMarkdown>
                    )}
                  </div>
                  {(() => {
                    const assignees = item.assignee ? item.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
                    return (
                      <>
                        {assignees.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {assignees.map((name) => (
                              <span key={name} className="inline-flex items-center gap-1 rounded-full bg-accent/15 pl-2 pr-1 py-0.5 text-xs text-accent">
                                {name}
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeAssignee(item.id, name); }}
                                  className="rounded-full p-0.5 hover:bg-accent/20 transition-colors"
                                  title={`Remove ${name}`}
                                >
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <path d="M1 1l6 6M7 1l-6 6" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {isAssigning && (
                          <input
                            ref={assignInputRef}
                            value={assignText}
                            onChange={(e) => setAssignText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); addAssignee(); }
                              if (e.key === 'Escape') setAssigningId(null);
                            }}
                            onBlur={() => { if (!assignText.trim()) setAssigningId(null); else addAssignee(); }}
                            placeholder="Add assignee name..."
                            className="mt-1 rounded border border-accent bg-surface-2 px-2 py-0.5 text-xs text-text outline-none w-48"
                          />
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-surface-2 py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text hover:bg-surface-3"
            onClick={() => {
              const item = items.find(i => i.id === contextMenu.id);
              if (item) startEdit(item);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text hover:bg-surface-3"
            onClick={() => {
              const item = items.find(i => i.id === contextMenu.id);
              if (item) startAssign(item);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Assign
          </button>
        </div>
      )}
    </div>
  );
}
