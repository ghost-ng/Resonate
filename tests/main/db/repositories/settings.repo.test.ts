import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { SettingsRepository } from '../../../../src/main/db/repositories/settings.repo';

describe('SettingsRepository', () => {
  let db: Database.Database;
  let repo: SettingsRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new SettingsRepository(db);
  });

  it('should return undefined for non-existent key', () => {
    expect(repo.get('missing')).toBeUndefined();
  });

  it('should set and get a value', () => {
    repo.set('theme', 'dark');
    expect(repo.get('theme')).toBe('dark');
  });

  it('should overwrite existing value', () => {
    repo.set('theme', 'dark');
    repo.set('theme', 'light');
    expect(repo.get('theme')).toBe('light');
  });

  it('should get all settings', () => {
    repo.set('theme', 'dark');
    repo.set('language', 'en');

    const all = repo.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].key).toBe('language');
    expect(all[1].key).toBe('theme');
  });

  it('should return empty array when no settings exist', () => {
    expect(repo.getAll()).toHaveLength(0);
  });

  it('should handle JSON values', () => {
    const config = JSON.stringify({ fontSize: 14, fontFamily: 'monospace' });
    repo.set('editor_config', config);
    const retrieved = repo.get('editor_config');
    expect(JSON.parse(retrieved!)).toEqual({ fontSize: 14, fontFamily: 'monospace' });
  });
});
