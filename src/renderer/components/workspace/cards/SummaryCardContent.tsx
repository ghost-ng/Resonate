import { useState, useCallback, useEffect } from 'react';
import type { SummaryWithActions } from '../../../../shared/types/ipc.types';
import MarkdownRenderer from '../../summary/MarkdownRenderer';

interface Props {
  summary: SummaryWithActions | null;
  onAddTask: (text: string) => Promise<void>;
}

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export default function SummaryCardContent({ summary, onAddTask }: Props) {
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0, selectedText: '' });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const selected = window.getSelection()?.toString().trim() ?? '';
    if (!selected) return; // Only show custom menu when text is selected
    e.preventDefault();
    e.stopPropagation();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, selectedText: selected });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((m) => m.visible ? { visible: false, x: 0, y: 0, selectedText: '' } : m);
  }, []);

  // Close menu on any click or Escape
  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = () => closeMenu();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menu.visible, closeMenu]);

  const handleAddToTasks = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!menu.selectedText) return;
    await onAddTask(menu.selectedText);
    closeMenu();
  }, [menu.selectedText, onAddTask, closeMenu]);

  if (!summary?.content) {
    return <p className="py-3 text-sm text-text-muted">No summary available.</p>;
  }

  return (
    <div className="relative pt-2 select-text" onContextMenu={handleContextMenu}>
      <MarkdownRenderer content={summary.content} />

      {menu.visible && (
        <div
          className="fixed z-[100] rounded-card border border-border bg-surface shadow-xl py-1 min-w-[180px]"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onMouseDown={handleAddToTasks}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
          >
            <span className="text-accent">+</span> Add to Tasks
          </button>
        </div>
      )}
    </div>
  );
}
