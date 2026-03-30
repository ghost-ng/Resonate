import Database from 'better-sqlite3';
import type { Transcript, TranscriptSegmentRow } from '../../../shared/types/database.types';

export interface TranscriptWithSegments extends Transcript {
  segments: TranscriptSegmentRow[];
}

export interface SegmentInput {
  speaker?: string | null;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence?: number;
}

export class TranscriptRepository {
  constructor(private db: Database.Database) {}

  findByRecording(recordingId: number): TranscriptWithSegments | undefined {
    const transcript = this.db
      .prepare('SELECT * FROM transcripts WHERE recording_id = ? ORDER BY id DESC LIMIT 1')
      .get(recordingId) as Transcript | undefined;

    if (!transcript) return undefined;

    const segments = this.db
      .prepare('SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY start_time_ms')
      .all(transcript.id) as TranscriptSegmentRow[];

    return { ...transcript, segments };
  }

  create(
    recordingId: number,
    engineUsed: string,
    fullText: string | null,
    segments: SegmentInput[]
  ): TranscriptWithSegments {
    const insertTranscript = this.db.prepare(
      'INSERT INTO transcripts (recording_id, engine_used, full_text) VALUES (?, ?, ?)'
    );
    const insertSegment = this.db.prepare(
      'INSERT INTO transcript_segments (transcript_id, speaker, text, start_time_ms, end_time_ms, confidence) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const run = this.db.transaction(() => {
      const result = insertTranscript.run(recordingId, engineUsed, fullText);
      const transcriptId = Number(result.lastInsertRowid);

      for (const seg of segments) {
        insertSegment.run(
          transcriptId,
          seg.speaker ?? null,
          seg.text,
          seg.start_time_ms,
          seg.end_time_ms,
          seg.confidence ?? 0.0
        );
      }

      return transcriptId;
    });

    const transcriptId = run();
    const transcript = this.db
      .prepare('SELECT * FROM transcripts WHERE id = ?')
      .get(transcriptId) as Transcript;
    const savedSegments = this.db
      .prepare('SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY start_time_ms')
      .all(transcriptId) as TranscriptSegmentRow[];

    return { ...transcript, segments: savedSegments };
  }

  renameSpeaker(transcriptId: number, originalName: string, displayName: string): TranscriptWithSegments | undefined {
    const transcript = this.db
      .prepare('SELECT * FROM transcripts WHERE id = ?')
      .get(transcriptId) as Transcript | undefined;
    if (!transcript) return undefined;

    const map: Record<string, string> = JSON.parse(transcript.speaker_map || '{}');
    if (displayName.trim()) {
      map[originalName] = displayName.trim();
    } else {
      delete map[originalName];
    }

    this.db
      .prepare('UPDATE transcripts SET speaker_map = ? WHERE id = ?')
      .run(JSON.stringify(map), transcriptId);

    return this.findByRecording(transcript.recording_id);
  }

  reassignSpeakers(transcriptId: number, speakerCount: number): TranscriptWithSegments | undefined {
    const transcript = this.db
      .prepare('SELECT * FROM transcripts WHERE id = ?')
      .get(transcriptId) as Transcript | undefined;
    if (!transcript) return undefined;

    const segments = this.db
      .prepare('SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY start_time_ms')
      .all(transcriptId) as TranscriptSegmentRow[];

    if (segments.length === 0) return this.findByRecording(transcript.recording_id);

    const numSpeakers = Math.max(1, speakerCount);

    // Detect turn boundaries using multiple signals:
    // 1. Existing speaker label changes (from prior transcription)
    // 2. Timing gaps > 300ms between segments
    // 3. If neither works, distribute evenly
    let currentSpeaker = 1;
    let turnCount = 0;

    // First pass: count turns using existing label changes
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].speaker !== segments[i - 1].speaker) turnCount++;
    }

    // If no label-based turns detected, fall back to timing gaps
    const useLabelTurns = turnCount > 0;
    const GAP_THRESHOLD_MS = 300;

    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        let isTurn = false;
        if (useLabelTurns) {
          isTurn = segments[i].speaker !== segments[i - 1].speaker;
        } else {
          const gap = segments[i].start_time_ms - segments[i - 1].end_time_ms;
          isTurn = gap >= GAP_THRESHOLD_MS;
        }
        if (isTurn) {
          currentSpeaker = (currentSpeaker % numSpeakers) + 1;
        }
      }

      this.db
        .prepare('UPDATE transcript_segments SET speaker = ? WHERE id = ?')
        .run(`Speaker ${currentSpeaker}`, segments[i].id);
    }

    // Clear speaker_map since labels changed
    this.db
      .prepare('UPDATE transcripts SET speaker_map = ? WHERE id = ?')
      .run('{}', transcriptId);

    return this.findByRecording(transcript.recording_id);
  }
}
