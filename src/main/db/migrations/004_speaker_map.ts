import type { Migration } from '../migration-runner';

export const migration004: Migration = {
  id: 4,
  name: '004_speaker_map',
  up(db) {
    db.exec(`
      ALTER TABLE transcripts ADD COLUMN speaker_map TEXT DEFAULT '{}';
    `);
  },
};
