import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ActionItem as ActionItemType } from '../../../shared/types/database.types';

interface Props {
  item: ActionItemType;
  onToggle: (id: number, completed: boolean) => void;
  onUpdate: (id: number, text: string) => void;
  onAssign: (id: number, assignee: string | null) => void;
}

export default function ActionItem({ item, onToggle, onUpdate, onAssign }: Props) {
  const isCompleted = item.completed === 1;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [assigning, setAssigning] = useState(false);
  const [assignText, setAssignText] = useState(item.assignee ?? '');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assignRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (assigning) {
      assignRef.current?.focus();
      assignRef.current?.select();
    }
  }, [assigning]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const saveEdit = useCallback(() => {
    const trimmed = editText.trim();
    setEditing(false);
    if (trimmed && trimmed !== item.text) {
      onUpdate(item.id, trimmed);
    }
  }, [editText, item.id, item.text, onUpdate]);

  const addAssignee = useCallback(() => {
    const newName = assignText.trim();
    if (!newName) { setAssigning(false); return; }
    const existing = item.assignee ? item.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (existing.some(n => n.toLowerCase() === newName.toLowerCase())) {
      setAssignText('');
      return;
    }
    const updated = [...existing, newName].join(', ');
    setAssignText('');
    onAssign(item.id, updated);
  }, [assignText, item.id, item.assignee, onAssign]);

  const removeAssignee = useCallback((nameToRemove: string) => {
    if (!item.assignee) return;
    const remaining = item.assignee.split(',').map(s => s.trim()).filter(n => n !== nameToRemove);
    onAssign(item.id, remaining.length > 0 ? remaining.join(', ') : null);
  }, [item.id, item.assignee, onAssign]);

  return (
    <>
      <div
        className="flex items-start gap-2 py-1"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <button
          onClick={() => onToggle(item.id, !isCompleted)}
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
          {editing ? (
            <input
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={saveEdit}
              className="w-full rounded border border-accent bg-surface-2 px-2 py-0.5 text-sm text-text outline-none"
            />
          ) : (
            <>
              <div className={`text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
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
                              onClick={(e) => { e.stopPropagation(); removeAssignee(name); }}
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
                    {assigning && (
                      <input
                        ref={assignRef}
                        value={assignText}
                        onChange={(e) => setAssignText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addAssignee(); }
                          if (e.key === 'Escape') setAssigning(false);
                        }}
                        onBlur={() => { if (!assignText.trim()) setAssigning(false); else addAssignee(); }}
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

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-surface-2 py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text hover:bg-surface-3"
            onClick={() => {
              setEditText(item.text);
              setEditing(true);
              setContextMenu(null);
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
              setAssignText(item.assignee ?? '');
              setAssigning(true);
              setContextMenu(null);
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
    </>
  );
}
