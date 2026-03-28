import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { NotebookRepository } from '../../../../src/main/db/repositories/notebook.repo';

describe('NotebookRepository', () => {
  let db: Database.Database;
  let repo: NotebookRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new NotebookRepository(db);
  });

  it('should create and retrieve a notebook', () => {
    const nb = repo.create('Work', '💼');
    expect(nb.id).toBe(1);
    expect(nb.name).toBe('Work');
    expect(nb.icon).toBe('💼');
    expect(nb.sort_order).toBe(0);
    expect(nb.created_at).toBeTruthy();
  });

  it('should create with default icon', () => {
    const nb = repo.create('Default');
    expect(nb.icon).toBe('📁');
  });

  it('should find all notebooks ordered by sort_order', () => {
    repo.create('B');
    repo.create('A');
    repo.update(2, { sort_order: -1 });

    const all = repo.findAll();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('A');
    expect(all[1].name).toBe('B');
  });

  it('should find by id', () => {
    repo.create('Test');
    const found = repo.findById(1);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test');
  });

  it('should return undefined for non-existent id', () => {
    expect(repo.findById(999)).toBeUndefined();
  });

  it('should update fields', () => {
    repo.create('Old');
    const updated = repo.update(1, { name: 'New', icon: '🎯', sort_order: 5 });
    expect(updated!.name).toBe('New');
    expect(updated!.icon).toBe('🎯');
    expect(updated!.sort_order).toBe(5);
  });

  it('should return notebook unchanged when updating with no fields', () => {
    repo.create('Same');
    const result = repo.update(1, {});
    expect(result!.name).toBe('Same');
  });

  it('should delete a notebook', () => {
    repo.create('ToDelete');
    expect(repo.delete(1)).toBe(true);
    expect(repo.findById(1)).toBeUndefined();
  });

  it('should return false when deleting non-existent notebook', () => {
    expect(repo.delete(999)).toBe(false);
  });

  it('should set recordings notebook_id to null on notebook delete', () => {
    repo.create('NB');
    db.prepare('INSERT INTO recordings (title, notebook_id) VALUES (?, ?)').run('Rec', 1);
    repo.delete(1);
    const rec = db.prepare('SELECT * FROM recordings WHERE id = 1').get() as any;
    expect(rec.notebook_id).toBeNull();
  });
});
