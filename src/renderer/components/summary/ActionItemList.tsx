import type { ActionItem as ActionItemType } from '../../../shared/types/database.types';
import ActionItem from './ActionItem';

interface Props {
  items: ActionItemType[];
}

export default function ActionItemList({ items }: Props) {
  const handleToggle = (id: number, completed: boolean) => {
    try {
      window.electronAPI.invoke('action-item:toggle', { id, completed });
    } catch {
      // Mock mode — just visual
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <h4 className="mb-2 text-sm font-medium text-text-muted">Action Items</h4>
      <div className="flex flex-col">
        {items.map((item) => (
          <ActionItem key={item.id} item={item} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}
