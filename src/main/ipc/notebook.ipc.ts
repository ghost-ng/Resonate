import { ipcMain } from 'electron';
import type { NotebookRepository } from '../db/repositories/notebook.repo';

export function registerNotebookHandlers(notebooks: NotebookRepository): void {
  ipcMain.handle('notebook:list', () => notebooks.findAll());

  ipcMain.handle('notebook:create', (_, args: { name: string; icon: string }) =>
    notebooks.create(args.name, args.icon)
  );

  ipcMain.handle('notebook:update', (_, args: { id: number; name?: string; icon?: string; sort_order?: number }) =>
    notebooks.update(args.id, args)
  );

  ipcMain.handle('notebook:delete', (_, args: { id: number }) => {
    notebooks.delete(args.id);
  });
}
