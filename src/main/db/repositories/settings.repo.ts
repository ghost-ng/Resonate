import Database from 'better-sqlite3';
import type { Setting } from '../../../shared/types/database.types';

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  get(key: string): string | undefined {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value;
  }

  set(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
      .run(key, value, value);
  }

  getAll(): Setting[] {
    return this.db.prepare('SELECT * FROM settings ORDER BY key').all() as Setting[];
  }
}
