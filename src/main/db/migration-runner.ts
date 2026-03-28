import Database from 'better-sqlite3';

export interface Migration {
  id: number;
  name: string;
  up(db: Database.Database): void;
}

export function runMigrations(db: Database.Database, migrations: Migration[]): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    db.prepare('SELECT id FROM _migrations').all().map((row: any) => row.id)
  );

  const sorted = [...migrations].sort((a, b) => a.id - b.id);

  for (const migration of sorted) {
    if (applied.has(migration.id)) continue;

    const runInTransaction = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(
        migration.id,
        migration.name
      );
    });

    runInTransaction();
  }
}
