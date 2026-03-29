import { useDroppable } from '@dnd-kit/core';

interface NotebookItemProps {
  id?: number;
  icon: string;
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function NotebookItem({ id, icon, name, count, active, onClick, onContextMenu }: NotebookItemProps) {
  const droppableId = id != null ? `notebook-${id}` : undefined;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId ?? 'notebook-none',
    data: id != null ? { type: 'notebook', notebookId: id } : undefined,
    disabled: id == null,
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex w-full items-center gap-2 rounded-card px-3 py-1.5 text-left text-sm transition-colors ${
        isOver
          ? 'border border-accent/60 bg-accent/10 shadow-[0_0_6px_rgba(var(--accent-rgb,99,102,241),0.3)]'
          : 'border border-transparent'
      } ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {count > 0 && (
        <span className={`text-xs ${active ? 'text-accent/70' : 'text-text-muted/60'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
