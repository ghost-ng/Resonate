import Database from 'better-sqlite3';
import type { PromptProfile } from '../../../shared/types/database.types';

export class PromptProfileRepository {
  constructor(private db: Database.Database) {}

  findAll(): PromptProfile[] {
    return this.db.prepare('SELECT * FROM prompt_profiles ORDER BY id').all() as PromptProfile[];
  }

  findById(id: number): PromptProfile | undefined {
    return this.db.prepare('SELECT * FROM prompt_profiles WHERE id = ?').get(id) as PromptProfile | undefined;
  }

  findDefault(): PromptProfile | undefined {
    return this.db.prepare('SELECT * FROM prompt_profiles WHERE is_default = 1 LIMIT 1').get() as PromptProfile | undefined;
  }

  create(fields: {
    name: string;
    system_prompt: string;
    user_prompt_template: string;
    is_default?: boolean;
  }): PromptProfile {
    if (fields.is_default) {
      this.db.prepare('UPDATE prompt_profiles SET is_default = 0').run();
    }

    const result = this.db
      .prepare(
        'INSERT INTO prompt_profiles (name, system_prompt, user_prompt_template, is_default) VALUES (?, ?, ?, ?)'
      )
      .run(fields.name, fields.system_prompt, fields.user_prompt_template, fields.is_default ? 1 : 0);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    fields: {
      name?: string;
      system_prompt?: string;
      user_prompt_template?: string;
      is_default?: boolean;
    }
  ): PromptProfile | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
    if (fields.system_prompt !== undefined) { sets.push('system_prompt = ?'); values.push(fields.system_prompt); }
    if (fields.user_prompt_template !== undefined) { sets.push('user_prompt_template = ?'); values.push(fields.user_prompt_template); }
    if (fields.is_default !== undefined) { sets.push('is_default = ?'); values.push(fields.is_default ? 1 : 0); }

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE prompt_profiles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM prompt_profiles WHERE id = ?').run(id);
    return result.changes > 0;
  }

  setDefault(id: number): PromptProfile | undefined {
    const run = this.db.transaction(() => {
      this.db.prepare('UPDATE prompt_profiles SET is_default = 0').run();
      this.db.prepare('UPDATE prompt_profiles SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    });
    run();
    return this.findById(id);
  }
}
