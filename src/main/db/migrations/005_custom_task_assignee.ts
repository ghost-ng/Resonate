import type { Migration } from '../migration-runner';

export const migration005: Migration = {
  id: 5,
  name: '005_custom_task_assignee',
  up(db) {
    db.exec(`
      ALTER TABLE custom_tasks ADD COLUMN assignee TEXT;
    `);
  },
};
