import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { RecordingRepository } from '../../../../src/main/db/repositories/recording.repo';
import { NotebookRepository } from '../../../../src/main/db/repositories/notebook.repo';

describe('RecordingRepository', () => {
  let db: Database.Database;
  let repo: RecordingRepository;
  let notebookRepo: NotebookRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new RecordingRepository(db);
    notebookRepo = new NotebookRepository(db);
  });

  it('should create a recording with defaults', () => {
    const rec = repo.create({ title: 'Meeting' });
    expect(rec.id).toBe(1);
    expect(rec.title).toBe('Meeting');
    expect(rec.notebook_id).toBeNull();
    expect(rec.status).toBe('recording');
    expect(rec.duration_seconds).toBe(0);
  });

  it('should create a recording with notebook and source app', () => {
    notebookRepo.create('Work');
    const rec = repo.create({ title: 'Call', notebookId: 1, sourceApp: 'Zoom' });
    expect(rec.notebook_id).toBe(1);
    expect(rec.source_app).toBe('Zoom');
  });

  it('should find all recordings', () => {
    repo.create({ title: 'A' });
    repo.create({ title: 'B' });
    expect(repo.findAll()).toHaveLength(2);
  });

  it('should find recordings by notebook', () => {
    notebookRepo.create('NB1');
    notebookRepo.create('NB2');
    repo.create({ title: 'A', notebookId: 1 });
    repo.create({ title: 'B', notebookId: 2 });
    repo.create({ title: 'C', notebookId: 1 });

    const results = repo.findAll(1);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.notebook_id === 1)).toBe(true);
  });

  it('should find by id', () => {
    repo.create({ title: 'Test' });
    expect(repo.findById(1)!.title).toBe('Test');
    expect(repo.findById(999)).toBeUndefined();
  });

  it('should update fields', () => {
    repo.create({ title: 'Old' });
    const updated = repo.update(1, {
      title: 'New',
      status: 'complete',
      duration_seconds: 120,
      audio_file_path: '/path/to/audio.wav',
      participant_count: 3,
    });
    expect(updated!.title).toBe('New');
    expect(updated!.status).toBe('complete');
    expect(updated!.duration_seconds).toBe(120);
    expect(updated!.audio_file_path).toBe('/path/to/audio.wav');
    expect(updated!.participant_count).toBe(3);
  });

  it('should return recording unchanged when updating with no fields', () => {
    repo.create({ title: 'Same' });
    const result = repo.update(1, {});
    expect(result!.title).toBe('Same');
  });

  it('should delete a recording', () => {
    repo.create({ title: 'ToDelete' });
    expect(repo.delete(1)).toBe(true);
    expect(repo.findById(1)).toBeUndefined();
  });

  it('should return false for deleting non-existent recording', () => {
    expect(repo.delete(999)).toBe(false);
  });

  it('should search by title', () => {
    repo.create({ title: 'Monday standup' });
    repo.create({ title: 'Friday review' });
    repo.create({ title: 'Monday planning' });

    const results = repo.search('Monday');
    expect(results).toHaveLength(2);
  });

  it('should return empty array for no search matches', () => {
    repo.create({ title: 'Meeting' });
    expect(repo.search('xyz')).toHaveLength(0);
  });

  it('should reject invalid status via CHECK constraint', () => {
    repo.create({ title: 'Test' });
    expect(() => repo.update(1, { status: 'invalid' as any })).toThrow();
  });

  it('should cascade delete transcripts when recording deleted', () => {
    repo.create({ title: 'Rec' });
    db.prepare("INSERT INTO transcripts (recording_id, engine_used) VALUES (1, 'whisper')").run();
    repo.delete(1);
    const transcripts = db.prepare('SELECT * FROM transcripts WHERE recording_id = 1').all();
    expect(transcripts).toHaveLength(0);
  });
});
