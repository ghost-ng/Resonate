import { useEffect, useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../../stores/workspace.store';

interface Props {
  cardId: number;
  recordingId: number;
}

export default function CustomTaskCardContent({ cardId, recordingId }: Props) {
  const tasks = useWorkspaceStore((s) => s.tasks[cardId] ?? []);
  const fetchTasks = useWorkspaceStore((s) => s.fetchTasks);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const toggleTask = useWorkspaceStore((s) => s.toggleTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);

  const [newText, setNewText] = useState('');

  useEffect(() => {
    fetchTasks(cardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const handleAdd = useCallback(() => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    addTask(cardId, trimmed);
    setNewText('');
  }, [newText, cardId, addTask]);

  return (
    <div className="flex flex-col pt-2">
      {tasks.length === 0 && (
        <p className="pb-2 text-sm text-text-muted">No tasks yet. Add one below.</p>
      )}

      {tasks.map((task) => {
        const isCompleted = task.completed === 1;
        return (
          <div key={task.id} className="flex items-center gap-2 py-1">
            <button
              onClick={() => toggleTask(task.id, !isCompleted, cardId)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
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
            <span className={`flex-1 text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id, cardId)}
              className="shrink-0 p-0.5 text-text-muted/40 hover:text-recording transition-colors"
              aria-label="Delete task"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        );
      })}

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
