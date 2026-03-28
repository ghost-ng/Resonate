import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migration-runner';
import { migration001 } from '../src/main/db/migrations/001_initial_schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db, [migration001]);
  return db;
}
