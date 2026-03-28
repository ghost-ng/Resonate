import Database from 'better-sqlite3';
import type { Notebook } from '../../../shared/types/database.types';

export class NotebookRepository {
  constructor(private db: Database.Database) {}

  findAll(): Notebook[] {
    return this.db.prepare('SELECT * FROM notebooks ORDER BY sort_order, id').all() as Notebook[];
  }

  findById(id: number): Notebook | undefined {
    return this.db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook | undefined;
  }

  create(name: string, icon = '📁'): Notebook {
    const result = this.db
      .prepare('INSERT INTO notebooks (name, icon) VALUES (?, ?)')
      .run(name, icon);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, fields: { name?: string; icon?: string; sort_order?: number }): Notebook | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
    if (fields.icon !== undefined) { sets.push('icon = ?'); values.push(fields.icon); }
    if (fields.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(fields.sort_order); }

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE notebooks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
