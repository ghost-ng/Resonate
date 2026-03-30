import type { Migration } from '../migration-runner';

export const migration003: Migration = {
  id: 3,
  name: '003_card_reference_id',
  up(db) {
    db.exec(`
      ALTER TABLE workspace_cards ADD COLUMN reference_id INTEGER;
    `);
  },
};
