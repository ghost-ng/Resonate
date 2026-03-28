import Database from 'better-sqlite3';
import type { Summary, ActionItem } from '../../../shared/types/database.types';

export interface SummaryWithActionItems extends Summary {
  action_items: ActionItem[];
}

export interface ActionItemInput {
  text: string;
  assignee?: string | null;
  sort_order?: number;
}

export class SummaryRepository {
  constructor(private db: Database.Database) {}

  findByRecording(recordingId: number): SummaryWithActionItems | undefined {
    const summary = this.db
      .prepare('SELECT * FROM summaries WHERE recording_id = ? ORDER BY id DESC LIMIT 1')
      .get(recordingId) as Summary | undefined;

    if (!summary) return undefined;

    const actionItems = this.db
      .prepare('SELECT * FROM action_items WHERE summary_id = ? ORDER BY sort_order, id')
      .all(summary.id) as ActionItem[];

    return { ...summary, action_items: actionItems };
  }

  create(
    recordingId: number,
    fields: {
      modelUsed?: string | null;
      systemPromptUsed?: string | null;
      content?: string | null;
      actionItems?: ActionItemInput[];
    }
  ): SummaryWithActionItems {
    const insertSummary = this.db.prepare(
      'INSERT INTO summaries (recording_id, model_used, system_prompt_used, content) VALUES (?, ?, ?, ?)'
    );
    const insertAction = this.db.prepare(
      'INSERT INTO action_items (summary_id, text, assignee, sort_order) VALUES (?, ?, ?, ?)'
    );

    const run = this.db.transaction(() => {
      const result = insertSummary.run(
        recordingId,
        fields.modelUsed ?? null,
        fields.systemPromptUsed ?? null,
        fields.content ?? null
      );
      const summaryId = Number(result.lastInsertRowid);

      if (fields.actionItems) {
        for (let i = 0; i < fields.actionItems.length; i++) {
          const item = fields.actionItems[i];
          insertAction.run(
            summaryId,
            item.text,
            item.assignee ?? null,
            item.sort_order ?? i
          );
        }
      }

      return summaryId;
    });

    const summaryId = run();
    const summary = this.db
      .prepare('SELECT * FROM summaries WHERE id = ?')
      .get(summaryId) as Summary;
    const actionItems = this.db
      .prepare('SELECT * FROM action_items WHERE summary_id = ? ORDER BY sort_order, id')
      .all(summaryId) as ActionItem[];

    return { ...summary, action_items: actionItems };
  }
}
