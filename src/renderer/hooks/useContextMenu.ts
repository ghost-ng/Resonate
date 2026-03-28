import { useCallback } from 'react';
import { useUiStore } from '../stores/ui.store';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  separator?: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

/**
 * Hook for opening context menus with custom items.
 * Stores position/target in UiStore; item definitions are passed at trigger time.
 */
export function useContextMenu() {
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const contextMenu = useUiStore((s) => s.contextMenu);

  const show = useCallback(
    (e: React.MouseEvent, target: { type: string; id: number }) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(e.clientX, e.clientY, target);
    },
    [openContextMenu]
  );

  const hide = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  return {
    visible: contextMenu.visible,
    x: contextMenu.x,
    y: contextMenu.y,
    target: contextMenu.target,
    show,
    hide,
  };
}
