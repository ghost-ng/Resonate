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
}
