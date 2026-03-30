import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useWorkspaceStore } from '../../../stores/workspace.store';
import { useCardSearch } from '../CardSearchContext';
import HighlightText from '../../shared/HighlightText';
import type { CustomTask } from '../../../../shared/types/database.types';

const EMPTY_TASKS: CustomTask[] = [];

interface Props {
  cardId: number;
  recordingId: number;
}

export default function CustomTaskCardContent({ cardId, recordingId }: Props) {
  const allTasks = useWorkspaceStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks[cardId] ?? EMPTY_TASKS, [allTasks, cardId]);
  const fetchTasks = useWorkspaceStore((s) => s.fetchTasks);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const toggleTask = useWorkspaceStore((s) => s.toggleTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);
  const { query, activeMatchIndex, setTotalMatches } = useCardSearch();

  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignText, setAssignText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: number } | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const assignRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTasks(cardId); }, [cardId, fetchTasks]);

  // Search match counting
  useEffect(() => {
    if (!query) { setTotalMatches(0); return; }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    for (const t of tasks) {
      const matches = t.text.match(regex);
      if (matches) count += matches.length;
    }
    setTotalMatches(count);
  }, [query, tasks, setTotalMatches]);

  useEffect(() => { if (editingId !== null) { editRef.current?.focus(); editRef.current?.select(); } }, [editingId]);
  useEffect(() => { if (assigningId !== null) { assignRef.current?.focus(); assignRef.current?.select(); } }, [assigningId]);
  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [contextMenu]);

  const handleAdd = useCallback(() => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    addTask(cardId, trimmed);
    setNewText('');
  }, [newText, cardId, addTask]);

  const saveEdit = useCallback(async () => {
    if (editingId === null) return;
    const trimmed = editText.trim();
    setEditingId(null);
    if (!trimmed) return;
    try {
      await window.electronAPI.invoke('custom-task:update', { id: editingId, text: trimmed });
      fetchTasks(cardId);
    } catch { /* ignore */ }
  }, [editingId, editText, cardId, fetchTasks]);

  const addAssignee = useCallback(async () => {
    if (assigningId === null) return;
    const newName = assignText.trim();
    if (!newName) { setAssigningId(null); return; }
    const task = tasks.find(t => t.id === assigningId);
    const existing = task?.assignee ? task.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (existing.some(n => n.toLowerCase() === newName.toLowerCase())) { setAssignText(''); return; }
    const updated = [...existing, newName].join(', ');
    setAssignText('');
    try {
      await window.electronAPI.invoke('custom-task:update', { id: assigningId, assignee: updated });
      fetchTasks(cardId);
    } catch { /* ignore */ }
  }, [assigningId, assignText, tasks, cardId, fetchTasks]);

  const removeAssignee = useCallback(async (taskId: number, nameToRemove: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.assignee) return;
    const remaining = task.assignee.split(',').map(s => s.trim()).filter(n => n !== nameToRemove);
    const updated = remaining.length > 0 ? remaining.join(', ') : null;
    try {
      await window.electronAPI.invoke('custom-task:update', { id: taskId, assignee: updated });
      fetchTasks(cardId);
    } catch { /* ignore */ }
  }, [tasks, cardId, fetchTasks]);

  return (
    <div className="flex flex-col pt-2">
      {tasks.length === 0 && (
        <p className="pb-2 text-sm text-text-muted">No tasks yet. Add one below.</p>
      )}

      {tasks.map((task) => {
        const isCompleted = task.completed === 1;
        const isEditing = editingId === task.id;
        const isAssigning = assigningId === task.id;
        const assignees = task.assignee ? task.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];

        return (
          <div
            key={task.id}
            className="flex items-start gap-2 py-1"
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: task.id }); }}
          >
            <button
              onClick={() => toggleTask(task.id, !isCompleted, cardId)}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                isCompleted ? 'border-success bg-success/20 text-success' : 'border-border hover:border-accent'
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
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={saveEdit}
                  className="w-full rounded border border-accent bg-surface-2 px-2 py-0.5 text-sm text-text outline-none"
                />
              ) : (
                <div className={`text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                  {query ? (
                    <HighlightText text={task.text.replace(/\*\*/g, '').replace(/\*/g, '')} query={query} activeIndex={activeMatchIndex} />
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">{children}</code>,
                        a: ({ children, href }) => <a href={href} className="text-accent underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {task.text}
                    </ReactMarkdown>
                  )}
                </div>
              )}
              {/* Assignee badges */}
              {assignees.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {assignees.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-accent/15 pl-2 pr-1 py-0.5 text-xs text-accent">
                      {name}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeAssignee(task.id, name); }}
                        className="rounded-full p-0.5 hover:bg-accent/20 transition-colors"
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
                  ref={assignRef}
                  value={assignText}
                  onChange={(e) => setAssignText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAssignee(); } if (e.key === 'Escape') setAssigningId(null); }}
                  onBlur={() => { if (!assignText.trim()) setAssigningId(null); else addAssignee(); }}
                  placeholder="Add assignee name..."
                  className="mt-1 rounded border border-accent bg-surface-2 px-2 py-0.5 text-xs text-text outline-none w-48"
                />
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
              const task = tasks.find(t => t.id === contextMenu.id);
              if (task) { setEditText(task.text); setEditingId(task.id); setAssigningId(null); }
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
              setAssignText(''); setAssigningId(contextMenu.id); setEditingId(null);
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Assign
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger/70 hover:bg-surface-3 hover:text-danger"
            onClick={() => {
              deleteTask(contextMenu.id, cardId);
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Add task input */}
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Add a task..."
          className="flex-1 rounded-card border border-border bg-surface-2 px-2 py-1 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="rounded-card border border-border bg-surface-2 px-2.5 py-1 text-sm text-text-muted transition-colors hover:bg-surface-3 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
