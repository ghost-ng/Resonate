import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { PromptProfileRepository } from '../../../../src/main/db/repositories/prompt-profile.repo';

describe('PromptProfileRepository', () => {
  let db: Database.Database;
  let repo: PromptProfileRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new PromptProfileRepository(db);
  });

  it('should create a prompt profile', () => {
    const profile = repo.create({
      name: 'Meeting Notes',
      system_prompt: 'You are a meeting summarizer',
      user_prompt_template: 'Summarize: {{transcript}}',
    });

    expect(profile.id).toBe(1);
    expect(profile.name).toBe('Meeting Notes');
    expect(profile.is_default).toBe(0);
  });

  it('should create a default profile', () => {
    const profile = repo.create({
      name: 'Default',
      system_prompt: 'SP',
      user_prompt_template: 'TP',
      is_default: true,
    });
    expect(profile.is_default).toBe(1);
  });

  it('should clear other defaults when creating a new default', () => {
    repo.create({ name: 'A', system_prompt: 'S', user_prompt_template: 'T', is_default: true });
    repo.create({ name: 'B', system_prompt: 'S', user_prompt_template: 'T', is_default: true });

    const a = repo.findById(1);
    const b = repo.findById(2);
    expect(a!.is_default).toBe(0);
    expect(b!.is_default).toBe(1);
  });

  it('should find all profiles', () => {
    repo.create({ name: 'A', system_prompt: 'S', user_prompt_template: 'T' });
    repo.create({ name: 'B', system_prompt: 'S', user_prompt_template: 'T' });
    expect(repo.findAll()).toHaveLength(2);
  });

  it('should find by id', () => {
    repo.create({ name: 'Test', system_prompt: 'S', user_prompt_template: 'T' });
    expect(repo.findById(1)!.name).toBe('Test');
    expect(repo.findById(999)).toBeUndefined();
  });

  it('should find default profile', () => {
    repo.create({ name: 'A', system_prompt: 'S', user_prompt_template: 'T' });
    repo.create({ name: 'B', system_prompt: 'S', user_prompt_template: 'T', is_default: true });

    const def = repo.findDefault();
    expect(def).toBeDefined();
    expect(def!.name).toBe('B');
  });

  it('should return undefined when no default exists', () => {
    repo.create({ name: 'A', system_prompt: 'S', user_prompt_template: 'T' });
    expect(repo.findDefault()).toBeUndefined();
  });

  it('should update fields', () => {
    repo.create({ name: 'Old', system_prompt: 'S', user_prompt_template: 'T' });
    const updated = repo.update(1, { name: 'New', system_prompt: 'NewS' });
    expect(updated!.name).toBe('New');
    expect(updated!.system_prompt).toBe('NewS');
  });

  it('should return profile unchanged when updating with no fields', () => {
    repo.create({ name: 'Same', system_prompt: 'S', user_prompt_template: 'T' });
    const result = repo.update(1, {});
    expect(result!.name).toBe('Same');
  });

  it('should delete a profile', () => {
    repo.create({ name: 'ToDelete', system_prompt: 'S', user_prompt_template: 'T' });
    expect(repo.delete(1)).toBe(true);
    expect(repo.findById(1)).toBeUndefined();
  });

  it('should return false when deleting non-existent profile', () => {
    expect(repo.delete(999)).toBe(false);
  });

  it('should set default', () => {
    repo.create({ name: 'A', system_prompt: 'S', user_prompt_template: 'T', is_default: true });
    repo.create({ name: 'B', system_prompt: 'S', user_prompt_template: 'T' });

    repo.setDefault(2);

    expect(repo.findById(1)!.is_default).toBe(0);
    expect(repo.findById(2)!.is_default).toBe(1);
    expect(repo.findDefault()!.id).toBe(2);
  });
});
