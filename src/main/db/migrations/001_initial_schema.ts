import type { Migration } from '../migration-runner';

export const migration001: Migration = {
  id: 1,
  name: '001_initial_schema',
  up(db) {
    db.exec(`
      CREATE TABLE notebooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '📁',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notebook_id INTEGER REFERENCES notebooks(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        source_app TEXT,
        audio_file_path TEXT,
        duration_seconds INTEGER DEFAULT 0,
        participant_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'recording' CHECK(status IN ('recording','transcribing','summarizing','complete','error')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_recordings_notebook ON recordings(notebook_id);
      CREATE INDEX idx_recordings_status ON recordings(status);

      CREATE TABLE transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        engine_used TEXT NOT NULL,
        full_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_transcripts_recording ON transcripts(recording_id);

      CREATE TABLE transcript_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        speaker TEXT,
        text TEXT NOT NULL,
        start_time_ms INTEGER NOT NULL,
        end_time_ms INTEGER NOT NULL,
        confidence REAL DEFAULT 0.0
      );
      CREATE INDEX idx_segments_transcript ON transcript_segments(transcript_id);

      CREATE TABLE summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        model_used TEXT,
        system_prompt_used TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_summaries_recording ON summaries(recording_id);

      CREATE TABLE action_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary_id INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        assignee TEXT,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );
      CREATE INDEX idx_action_items_summary ON action_items(summary_id);

      CREATE TABLE prompt_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  },
};
