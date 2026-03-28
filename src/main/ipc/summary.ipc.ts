import { ipcMain, BrowserWindow } from 'electron';
import type { ServiceContainer } from '../index';

export function registerSummaryHandlers(services: ServiceContainer): void {
  const { summaries, actionItems, recordings, transcripts, aiSummary } = services;

  ipcMain.handle('summary:get', (_, args: { recordingId: number }) =>
    summaries.findByRecording(args.recordingId) ?? null
  );

  ipcMain.handle('summary:generate', async (_, args: { recordingId: number; profileId?: number }) => {
    const recording = recordings.findById(args.recordingId);
    if (!recording) {
      throw new Error(`Recording ${args.recordingId} not found`);
    }

    const transcript = transcripts.findByRecording(args.recordingId);
    if (!transcript) {
      throw new Error(`No transcript found for recording ${args.recordingId}`);
    }

    // Update status to summarizing
    recordings.update(args.recordingId, { status: 'summarizing' });
    sendStatusEvent(args.recordingId, 'summarizing');

    try {
      // Build transcript text from segments
      const transcriptText = transcript.segments
        .map((s) => `${s.speaker ?? 'Unknown'}: ${s.text}`)
        .join('\n');

      // Build metadata
      const durationMin = Math.round(recording.duration_seconds / 60);
      const metadata = {
        duration: `${durationMin} minutes`,
        source_app: recording.source_app ?? 'Unknown',
        participant_count: String(recording.participant_count),
        date: recording.created_at,
      };

      // Call AI summary service
      const result = await aiSummary.generateSummary(
        transcriptText,
        metadata,
        args.profileId
      );

      // Save summary and action items
      summaries.create(args.recordingId, {
        modelUsed: services.settings.get('ai_model') ?? null,
        systemPromptUsed: null,
        content: result.content,
        actionItems: result.actionItems.map((item, i) => ({
          text: item.text,
          assignee: item.assignee,
          sort_order: i,
        })),
      });

      // Update recording status to complete
      recordings.update(args.recordingId, { status: 'complete' });
      sendStatusEvent(args.recordingId, 'complete');
    } catch (err) {
      recordings.update(args.recordingId, { status: 'error' });
      sendStatusEvent(args.recordingId, 'error');
      throw err;
    }
  });

  ipcMain.handle('action-item:toggle', (_, args: { id: number; completed: boolean }) => {
    actionItems.toggleCompleted(args.id, args.completed);
  });
}

function sendStatusEvent(recordingId: number, status: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('recording:status-changed', { recordingId, status });
  }
}
