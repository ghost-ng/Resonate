import { ipcMain } from 'electron';
import type { RecordingRepository } from '../db/repositories/recording.repo';

export function registerRecordingHandlers(recordings: RecordingRepository): void {
  ipcMain.handle('recording:list', (_, args?: { notebookId?: number; search?: string }) => {
    if (args?.search) {
      return recordings.search(args.search);
    }
    return recordings.findAll(args?.notebookId);
  });

  ipcMain.handle('recording:get', (_, args: { id: number }) =>
    recordings.findById(args.id) ?? null
  );

  ipcMain.handle('recording:create', (_, args: { title: string; notebookId?: number; sourceApp?: string }) =>
    recordings.create(args)
  );

  ipcMain.handle('recording:update', (_, args: { id: number; title?: string; notebook_id?: number | null; status?: string }) =>
    recordings.update(args.id, args)
  );

  ipcMain.handle('recording:delete', (_, args: { id: number }) => {
    recordings.delete(args.id);
  });

  // Stubs for capture — will be wired to native audio capture later
  ipcMain.handle('recording:start-capture', (_) => {
    console.log('[stub] recording:start-capture');
  });

  ipcMain.handle('recording:stop-capture', () => {
    console.log('[stub] recording:stop-capture');
    return { durationSeconds: 0, audioFilePath: '' };
  });
}
