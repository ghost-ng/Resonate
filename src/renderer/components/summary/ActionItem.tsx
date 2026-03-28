import type { ActionItem as ActionItemType } from '../../../shared/types/database.types';

interface Props {
  item: ActionItemType;
  onToggle: (id: number, completed: boolean) => void;
}

export default function ActionItem({ item, onToggle }: Props) {
  const isCompleted = item.completed === 1;

  return (
    <div className="flex items-start gap-2 py-1">
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
}
