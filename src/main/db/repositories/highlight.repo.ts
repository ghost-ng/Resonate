import Database from 'better-sqlite3';
import type { TranscriptHighlight } from '../../../shared/types/database.types';

export class HighlightRepository {
  constructor(private db: Database.Database) {}

  findByRecording(recordingId: number): TranscriptHighlight[] {
    return this.db
      .prepare('SELECT * FROM transcript_highlights WHERE recording_id = ? ORDER BY created_at, id')
      .all(recordingId) as TranscriptHighlight[];
  }

  findById(id: number): TranscriptHighlight | undefined {
    return this.db
      .prepare('SELECT * FROM transcript_highlights WHERE id = ?')
      .get(id) as TranscriptHighlight | undefined;
  }

  create(fields: {
    recording_id: number;
    segment_id: number;
    highlight_type: string;
    color?: string;
    note?: string;
    reminder_date?: string;
  }): TranscriptHighlight {
    const result = this.db
      .prepare(
        'INSERT INTO transcript_highlights (recording_id, segment_id, highlight_type, color, note, reminder_date) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        fields.recording_id,
        fields.segment_id,
        fields.highlight_type,
        fields.color ?? '#5B3DF5',
        fields.note ?? null,
        fields.reminder_date ?? null
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    fields: { color?: string; note?: string; reminder_date?: string }
  ): TranscriptHighlight | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.color !== undefined) { sets.push('color = ?'); values.push(fields.color); }
    if (fields.note !== undefined) { sets.push('note = ?'); values.push(fields.note); }
    if (fields.reminder_date !== undefined) { sets.push('reminder_date = ?'); values.push(fields.reminder_date); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    this.db.prepare(`UPDATE transcript_highlights SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM transcript_highlights WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
