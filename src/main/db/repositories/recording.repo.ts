import Database from 'better-sqlite3';
import type { Recording } from '../../../shared/types/database.types';

export class RecordingRepository {
  constructor(private db: Database.Database) {}

  findAll(notebookId?: number | null): Recording[] {
    if (notebookId !== undefined && notebookId !== null) {
      return this.db
        .prepare('SELECT * FROM recordings WHERE notebook_id = ? ORDER BY created_at DESC')
        .all(notebookId) as Recording[];
    }
    return this.db
      .prepare('SELECT * FROM recordings ORDER BY created_at DESC')
      .all() as Recording[];
  }

  findById(id: number): Recording | undefined {
    return this.db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as Recording | undefined;
  }

  create(fields: { title: string; notebookId?: number | null; sourceApp?: string | null }): Recording {
    const result = this.db
      .prepare('INSERT INTO recordings (title, notebook_id, source_app) VALUES (?, ?, ?)')
      .run(fields.title, fields.notebookId ?? null, fields.sourceApp ?? null);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    fields: {
      title?: string;
      notebook_id?: number | null;
      status?: Recording['status'];
      duration_seconds?: number;
      audio_file_path?: string | null;
      participant_count?: number;
    }
  ): Recording | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }
    if (fields.notebook_id !== undefined) { sets.push('notebook_id = ?'); values.push(fields.notebook_id); }
    if (fields.status !== undefined) { sets.push('status = ?'); values.push(fields.status); }
    if (fields.duration_seconds !== undefined) { sets.push('duration_seconds = ?'); values.push(fields.duration_seconds); }
    if (fields.audio_file_path !== undefined) { sets.push('audio_file_path = ?'); values.push(fields.audio_file_path); }
    if (fields.participant_count !== undefined) { sets.push('participant_count = ?'); values.push(fields.participant_count); }

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE recordings SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
    return result.changes > 0;
  }

  search(query: string): Recording[] {
    return this.db
      .prepare('SELECT * FROM recordings WHERE title LIKE ? ORDER BY created_at DESC')
      .all(`%${query}%`) as Recording[];
  }
}
