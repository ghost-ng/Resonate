import { ipcMain } from 'electron';
import type { SummaryRepository } from '../db/repositories/summary.repo';
import type { ActionItemRepository } from '../db/repositories/action-item.repo';

export function registerSummaryHandlers(
  summaries: SummaryRepository,
  actionItems: ActionItemRepository
): void {
  ipcMain.handle('summary:get', (_, args: { recordingId: number }) =>
    summaries.findByRecording(args.recordingId) ?? null
  );

  // Stub — will be wired to AI summarization later
  ipcMain.handle('summary:generate', (_, args: { recordingId: number; profileId?: number }) => {
    console.log('[stub] summary:generate', args);
  });

  ipcMain.handle('action-item:toggle', (_, args: { id: number; completed: boolean }) => {
    actionItems.toggleCompleted(args.id, args.completed);
  });
}
