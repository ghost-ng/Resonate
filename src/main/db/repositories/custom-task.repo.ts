import Database from 'better-sqlite3';
import type { CustomTask } from '../../../shared/types/database.types';

export class CustomTaskRepository {
  constructor(private db: Database.Database) {}

  findByCard(cardId: number): CustomTask[] {
    return this.db
      .prepare('SELECT * FROM custom_tasks WHERE card_id = ? ORDER BY sort_order, id')
      .all(cardId) as CustomTask[];
  }

  findById(id: number): CustomTask | undefined {
    return this.db
      .prepare('SELECT * FROM custom_tasks WHERE id = ?')
      .get(id) as CustomTask | undefined;
  }

  create(fields: { card_id: number; text: string; source_segment_id?: number }): CustomTask {
    const result = this.db
      .prepare(
        'INSERT INTO custom_tasks (card_id, text, source_segment_id) VALUES (?, ?, ?)'
      )
      .run(fields.card_id, fields.text, fields.source_segment_id ?? null);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    fields: { text?: string; completed?: number; sort_order?: number; assignee?: string | null }
  ): CustomTask | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.text !== undefined) { sets.push('text = ?'); values.push(fields.text); }
    if (fields.completed !== undefined) { sets.push('completed = ?'); values.push(fields.completed); }
    if (fields.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(fields.sort_order); }
    if (fields.assignee !== undefined) { sets.push('assignee = ?'); values.push(fields.assignee); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    this.db.prepare(`UPDATE custom_tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM custom_tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
