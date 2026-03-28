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
}
