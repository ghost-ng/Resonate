import { useCallback } from 'react';
import type { ActionItem as ActionItemType } from '../../../../shared/types/database.types';

interface Props {
  items: ActionItemType[];
}

export default function ActionItemsCardContent({ items }: Props) {
  const handleToggle = useCallback((id: number, completed: boolean) => {
    try {
      window.electronAPI.invoke('action-item:toggle', { id, completed });
    } catch {
      // Mock mode
    }
  }, []);

  if (items.length === 0) {
    return <p className="py-3 text-sm text-text-muted">No action items yet.</p>;
  }

  return (
    <div className="flex flex-col pt-2">
      {items.map((item) => {
        const isCompleted = item.completed === 1;
        return (
          <div key={item.id} className="flex items-start gap-2 py-1">
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
            <div className="flex-1">
              <span className={`text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                {item.text}
              </span>
              {item.assignee && (
                <span className="ml-2 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  {item.assignee}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
