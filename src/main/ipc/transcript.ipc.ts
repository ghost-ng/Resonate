import { ipcMain, BrowserWindow } from 'electron';
import type { ServiceContainer } from '../index';
import type { SttEngineName } from '../../shared/types/stt.types';

export function registerTranscriptHandlers(services: ServiceContainer): void {
  const { transcripts, recordings, sttRouter } = services;

  ipcMain.handle('transcript:get', (_, args: { recordingId: number }) =>
    transcripts.findByRecording(args.recordingId) ?? null
  );

  ipcMain.handle('transcript:start', async (_, args: { recordingId: number; engine?: string }) => {
    const recording = recordings.findById(args.recordingId);
    if (!recording) {
      throw new Error(`Recording ${args.recordingId} not found`);
    }
    if (!recording.audio_file_path) {
      throw new Error(`Recording ${args.recordingId} has no audio file`);
    }

    // Update status to transcribing
    recordings.update(args.recordingId, { status: 'transcribing' });
    sendStatusEvent(args.recordingId, 'transcribing');

    try {
      // Run STT
      const segments = await sttRouter.transcribe(
        recording.audio_file_path,
        args.engine as SttEngineName | undefined
      );

      // Build full text from segments
      const fullText = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');

      // Save transcript and segments
      transcripts.create(
        args.recordingId,
        args.engine ?? 'cloud',
        fullText,
        segments.map((s) => ({
          speaker: s.speaker,
          text: s.text,
          start_time_ms: s.start_time_ms,
          end_time_ms: s.end_time_ms,
          confidence: s.confidence,
        }))
      );

      // Update status
      const autoSummarize = services.settings.get('auto_summarize') === 'true';
      const nextStatus = autoSummarize ? 'summarizing' : 'complete';
      recordings.update(args.recordingId, { status: nextStatus });
      sendStatusEvent(args.recordingId, nextStatus);
    } catch (err) {
      recordings.update(args.recordingId, { status: 'error' });
      sendStatusEvent(args.recordingId, 'error');
      throw err;
    }
  });
}

function sendStatusEvent(recordingId: number, status: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('recording:status-changed', { recordingId, status });
  }
}
