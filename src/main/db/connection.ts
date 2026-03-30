import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'resonate.db');
  db = createDatabase(dbPath);
  return db;
}

export function createDatabase(pathOrMemory: string | ':memory:'): Database.Database {
  const instance = new Database(pathOrMemory);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  return instance;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
