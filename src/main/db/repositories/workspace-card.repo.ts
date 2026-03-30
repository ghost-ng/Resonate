import Database from 'better-sqlite3';
import type { WorkspaceCard } from '../../../shared/types/database.types';

export class WorkspaceCardRepository {
  constructor(private db: Database.Database) {}

  findByRecording(recordingId: number): WorkspaceCard[] {
    return this.db
      .prepare('SELECT * FROM workspace_cards WHERE recording_id = ? ORDER BY sort_order, id')
      .all(recordingId) as WorkspaceCard[];
  }

  findById(id: number): WorkspaceCard | undefined {
    return this.db
      .prepare('SELECT * FROM workspace_cards WHERE id = ?')
      .get(id) as WorkspaceCard | undefined;
  }

  create(fields: {
    recording_id: number;
    card_type: string;
    title: string;
    grid_col?: number;
    grid_row?: number;
    grid_w?: number;
    grid_h?: number;
    reference_id?: number | null;
    sort_order?: number;
  }): WorkspaceCard {
    const result = this.db
      .prepare(
        `INSERT INTO workspace_cards (recording_id, card_type, title, grid_col, grid_row, grid_w, grid_h, reference_id, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        fields.recording_id,
        fields.card_type,
        fields.title,
        fields.grid_col ?? 0,
        fields.grid_row ?? 0,
        fields.grid_w ?? 1,
        fields.grid_h ?? 1,
        fields.reference_id ?? null,
        fields.sort_order ?? 0
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    fields: {
      title?: string;
      grid_col?: number;
      grid_row?: number;
      grid_w?: number;
      grid_h?: number;
      collapsed?: number;
      sort_order?: number;
      reference_id?: number | null;
    }
  ): WorkspaceCard | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }
    if (fields.grid_col !== undefined) { sets.push('grid_col = ?'); values.push(fields.grid_col); }
    if (fields.grid_row !== undefined) { sets.push('grid_row = ?'); values.push(fields.grid_row); }
    if (fields.grid_w !== undefined) { sets.push('grid_w = ?'); values.push(fields.grid_w); }
    if (fields.grid_h !== undefined) { sets.push('grid_h = ?'); values.push(fields.grid_h); }
    if (fields.collapsed !== undefined) { sets.push('collapsed = ?'); values.push(fields.collapsed); }
    if (fields.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(fields.sort_order); }
    if (fields.reference_id !== undefined) { sets.push('reference_id = ?'); values.push(fields.reference_id); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    this.db.prepare(`UPDATE workspace_cards SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM workspace_cards WHERE id = ?').run(id);
    return result.changes > 0;
  }

  initDefaults(recordingId: number, summaryTitle?: string): WorkspaceCard[] {
    const existing = this.findByRecording(recordingId);
    if (existing.length > 0) return existing;

    const defaults: { card_type: string; title: string; grid_col: number; grid_row: number; grid_w: number; grid_h: number }[] = [
      { card_type: 'transcript', title: 'Transcript', grid_col: 0, grid_row: 0, grid_w: 1, grid_h: 2 },
      { card_type: 'summary', title: summaryTitle ?? 'Summary', grid_col: 1, grid_row: 0, grid_w: 1, grid_h: 1 },
      { card_type: 'action_items', title: 'Action Items', grid_col: 1, grid_row: 1, grid_w: 1, grid_h: 1 },
    ];

    const insertMany = this.db.transaction(() => {
      for (const def of defaults) {
        this.create({ recording_id: recordingId, ...def });
      }
    });
    insertMany();

    return this.findByRecording(recordingId);
  }
}
