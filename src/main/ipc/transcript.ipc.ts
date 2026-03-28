import { ipcMain } from 'electron';
import type { TranscriptRepository } from '../db/repositories/transcript.repo';

export function registerTranscriptHandlers(transcripts: TranscriptRepository): void {
  ipcMain.handle('transcript:get', (_, args: { recordingId: number }) =>
    transcripts.findByRecording(args.recordingId) ?? null
  );

  // Stub — will be wired to STT engine later
  ipcMain.handle('transcript:start', (_, args: { recordingId: number; engine?: string }) => {
    console.log('[stub] transcript:start', args);
  });
}
