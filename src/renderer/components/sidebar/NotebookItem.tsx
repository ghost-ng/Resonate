interface NotebookItemProps {
  icon: string;
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function NotebookItem({ icon, name, count, active, onClick, onContextMenu }: NotebookItemProps) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex w-full items-center gap-2 rounded-card px-3 py-1.5 text-left text-sm transition-colors ${
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
