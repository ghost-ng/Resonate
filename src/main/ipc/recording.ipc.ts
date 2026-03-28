import { ipcMain } from 'electron';
import type { ServiceContainer } from '../index';
import type { Recording } from '../../shared/types/database.types';

export function registerRecordingHandlers(services: ServiceContainer): void {
  const { recordings, audioCapture } = services;

  // Track which recording ID is currently being captured
  let activeRecordingId: number | null = null;

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

  ipcMain.handle('recording:update', (_, args: { id: number; title?: string; notebook_id?: number | null; status?: Recording['status'] }) =>
    recordings.update(args.id, args)
  );

  ipcMain.handle('recording:delete', (_, args: { id: number }) => {
    recordings.delete(args.id);
  });

  ipcMain.handle('recording:start-capture', async (_, args: { recordingId: number }) => {
    await audioCapture.startRecording(args.recordingId);
    activeRecordingId = args.recordingId;
    recordings.update(args.recordingId, { status: 'recording' });
  });

  ipcMain.handle('recording:stop-capture', async () => {
    const result = await audioCapture.stopRecording();

    // Update the DB record with the audio file path and duration
    if (activeRecordingId) {
      recordings.update(activeRecordingId, {
        audio_file_path: result.audioFilePath,
        duration_seconds: Math.round(result.durationSeconds),
        status: 'complete',
      });
    }

    const recordingId = activeRecordingId;
    activeRecordingId = null;

    return { ...result, recordingId };
  });
}
