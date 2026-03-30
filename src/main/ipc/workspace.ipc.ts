import { ipcMain } from 'electron';
import type { WorkspaceCardRepository } from '../db/repositories/workspace-card.repo';
import type { CustomTaskRepository } from '../db/repositories/custom-task.repo';
import type { HighlightRepository } from '../db/repositories/highlight.repo';
import type { PromptProfileRepository } from '../db/repositories/prompt-profile.repo';

export function registerWorkspaceHandlers(
  workspaceCards: WorkspaceCardRepository,
  customTasks: CustomTaskRepository,
  highlights: HighlightRepository,
  promptProfiles: PromptProfileRepository
): void {
  // Workspace cards
  ipcMain.handle('workspace-card:list', (_, args: { recordingId: number }) =>
    workspaceCards.findByRecording(args.recordingId)
  );

  ipcMain.handle('workspace-card:get', (_, args: { id: number }) =>
    workspaceCards.findById(args.id) ?? null
  );

  ipcMain.handle(
    'workspace-card:create',
    (_, args: { recording_id: number; card_type: string; title: string; grid_col?: number; grid_row?: number; grid_w?: number; grid_h?: number; reference_id?: number; sort_order?: number }) =>
      workspaceCards.create(args)
  );

  ipcMain.handle(
    'workspace-card:update',
    (_, args: { id: number; title?: string; grid_col?: number; grid_row?: number; grid_w?: number; grid_h?: number; collapsed?: number; sort_order?: number; reference_id?: number | null }) =>
      workspaceCards.update(args.id, args)
  );

  ipcMain.handle('workspace-card:delete', (_, args: { id: number }) => {
    workspaceCards.delete(args.id);
  });

  ipcMain.handle('workspace-card:init-defaults', (_, args: { recordingId: number }) => {
    const defaultProfile = promptProfiles.findDefault();
    const summaryTitle = defaultProfile ? defaultProfile.name : 'Summary';
    return workspaceCards.initDefaults(args.recordingId, summaryTitle);
  });

  // Custom tasks
  ipcMain.handle('custom-task:list', (_, args: { cardId: number }) =>
    customTasks.findByCard(args.cardId)
  );

  ipcMain.handle(
    'custom-task:create',
    (_, args: { card_id: number; text: string; source_segment_id?: number }) =>
      customTasks.create(args)
  );

  ipcMain.handle(
    'custom-task:update',
    (_, args: { id: number; text?: string; completed?: number; sort_order?: number; assignee?: string | null }) =>
      customTasks.update(args.id, args)
  );

  ipcMain.handle('custom-task:delete', (_, args: { id: number }) => {
    customTasks.delete(args.id);
  });

  // Highlights
  ipcMain.handle('highlight:list', (_, args: { recordingId: number }) =>
    highlights.findByRecording(args.recordingId)
  );

  ipcMain.handle(
    'highlight:create',
    (_, args: { recording_id: number; segment_id: number; highlight_type: string; color?: string; note?: string; reminder_date?: string }) =>
      highlights.create(args)
  );

  ipcMain.handle(
    'highlight:update',
    (_, args: { id: number; color?: string; note?: string; reminder_date?: string }) =>
      highlights.update(args.id, args)
  );

  ipcMain.handle('highlight:delete', (_, args: { id: number }) => {
    highlights.delete(args.id);
  });
}
