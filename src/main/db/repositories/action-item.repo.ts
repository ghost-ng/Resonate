import Database from 'better-sqlite3';
import type { ActionItem } from '../../../shared/types/database.types';

export class ActionItemRepository {
  constructor(private db: Database.Database) {}

  toggleCompleted(id: number, completed: boolean): ActionItem | undefined {
    this.db
      .prepare('UPDATE action_items SET completed = ? WHERE id = ?')
      .run(completed ? 1 : 0, id);
    return this.db
      .prepare('SELECT * FROM action_items WHERE id = ?')
      .get(id) as ActionItem | undefined;
  }

  update(id: number, fields: { text?: string; assignee?: string | null }): ActionItem | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.text !== undefined) {
      sets.push('text = ?');
      values.push(fields.text);
    }
    if (fields.assignee !== undefined) {
      sets.push('assignee = ?');
      values.push(fields.assignee);
    }

    if (sets.length === 0) {
      return this.db.prepare('SELECT * FROM action_items WHERE id = ?').get(id) as ActionItem | undefined;
    }

    values.push(id);
    this.db.prepare(`UPDATE action_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.db.prepare('SELECT * FROM action_items WHERE id = ?').get(id) as ActionItem | undefined;
  }
}
