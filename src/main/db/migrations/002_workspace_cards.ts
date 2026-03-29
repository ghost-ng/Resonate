import type { Migration } from '../migration-runner';

export const migration002: Migration = {
  id: 2,
  name: '002_workspace_cards',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        card_type TEXT NOT NULL CHECK(card_type IN ('transcript','summary','action_items','custom_task')),
        title TEXT NOT NULL,
        grid_col INTEGER NOT NULL DEFAULT 0,
        grid_row INTEGER NOT NULL DEFAULT 0,
        grid_w INTEGER NOT NULL DEFAULT 1,
        grid_h INTEGER NOT NULL DEFAULT 1,
        collapsed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_workspace_cards_recording ON workspace_cards(recording_id);

      CREATE TABLE IF NOT EXISTS custom_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL REFERENCES workspace_cards(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        source_segment_id INTEGER REFERENCES transcript_segments(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_custom_tasks_card ON custom_tasks(card_id);

      CREATE TABLE IF NOT EXISTS transcript_highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        segment_id INTEGER NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
        highlight_type TEXT NOT NULL CHECK(highlight_type IN ('important','task_source','date_reminder')),
        color TEXT DEFAULT '#5b8def',
        note TEXT,
        reminder_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_highlights_recording ON transcript_highlights(recording_id);
    `);
  },
};
