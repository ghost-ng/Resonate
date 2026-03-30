import { useState, useEffect, useCallback } from 'react';
import type { ActionItem as ActionItemType } from '../../../shared/types/database.types';
import ActionItem from './ActionItem';

interface Props {
  items: ActionItemType[];
}

export default function ActionItemList({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleToggle = useCallback((id: number, completed: boolean) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: completed ? 1 : 0 } : item
    ));
    try {
      window.electronAPI.invoke('action-item:toggle', { id, completed });
    } catch {
      // Revert on failure
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, completed: completed ? 0 : 1 } : item
      ));
    }
  }, []);

  const handleUpdate = useCallback((id: number, text: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, text } : item
    ));
    try {
      window.electronAPI.invoke('action-item:update', { id, text });
    } catch {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleAssign = useCallback((id: number, assignee: string | null) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, assignee } : item
    ));
    try {
      window.electronAPI.invoke('action-item:update', { id, assignee });
    } catch {
      setItems(initialItems);
    }
  }, [initialItems]);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <h4 className="mb-2 text-sm font-medium text-text-muted">Action Items</h4>
      <div className="flex flex-col">
        {items.map((item) => (
          <ActionItem key={item.id} item={item} onToggle={handleToggle} onUpdate={handleUpdate} onAssign={handleAssign} />
        ))}
      </div>
    </div>
  );
}
