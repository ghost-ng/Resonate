import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { TranscriptRepository } from '../../../../src/main/db/repositories/transcript.repo';
import { RecordingRepository } from '../../../../src/main/db/repositories/recording.repo';

describe('TranscriptRepository', () => {
  let db: Database.Database;
  let repo: TranscriptRepository;
  let recordingRepo: RecordingRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new TranscriptRepository(db);
    recordingRepo = new RecordingRepository(db);
    recordingRepo.create({ title: 'Test Recording' });
  });

  it('should return undefined when no transcript exists', () => {
    expect(repo.findByRecording(1)).toBeUndefined();
  });

  it('should create transcript with segments', () => {
    const result = repo.create(1, 'whisper', 'Hello world', [
      { speaker: 'Alice', text: 'Hello', start_time_ms: 0, end_time_ms: 1000, confidence: 0.95 },
      { speaker: 'Bob', text: 'World', start_time_ms: 1000, end_time_ms: 2000, confidence: 0.9 },
    ]);

    expect(result.id).toBe(1);
    expect(result.recording_id).toBe(1);
    expect(result.engine_used).toBe('whisper');
    expect(result.full_text).toBe('Hello world');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].speaker).toBe('Alice');
    expect(result.segments[0].confidence).toBe(0.95);
    expect(result.segments[1].speaker).toBe('Bob');
  });

  it('should create transcript with no segments', () => {
    const result = repo.create(1, 'whisper', 'Just text', []);
    expect(result.segments).toHaveLength(0);
    expect(result.full_text).toBe('Just text');
  });

  it('should create transcript with null full_text', () => {
    const result = repo.create(1, 'whisper', null, [
      { text: 'Hi', start_time_ms: 0, end_time_ms: 500 },
    ]);
    expect(result.full_text).toBeNull();
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].speaker).toBeNull();
    expect(result.segments[0].confidence).toBe(0);
  });

  it('should find transcript by recording', () => {
    repo.create(1, 'whisper', 'Hello', [
      { text: 'Hello', start_time_ms: 0, end_time_ms: 1000 },
    ]);

    const found = repo.findByRecording(1);
    expect(found).toBeDefined();
    expect(found!.engine_used).toBe('whisper');
    expect(found!.segments).toHaveLength(1);
  });

  it('should return the latest transcript for a recording', () => {
    repo.create(1, 'whisper-v1', 'First', []);
    repo.create(1, 'whisper-v2', 'Second', []);

    const found = repo.findByRecording(1);
    expect(found!.engine_used).toBe('whisper-v2');
  });

  it('should cascade delete segments when transcript deleted', () => {
    repo.create(1, 'whisper', 'Text', [
      { text: 'Seg', start_time_ms: 0, end_time_ms: 500 },
    ]);
    db.prepare('DELETE FROM transcripts WHERE id = 1').run();
    const segments = db.prepare('SELECT * FROM transcript_segments').all();
    expect(segments).toHaveLength(0);
  });

  it('should cascade delete transcript when recording deleted', () => {
    repo.create(1, 'whisper', 'Text', [
      { text: 'Seg', start_time_ms: 0, end_time_ms: 500 },
    ]);
    recordingRepo.delete(1);
    expect(repo.findByRecording(1)).toBeUndefined();
    const segments = db.prepare('SELECT * FROM transcript_segments').all();
    expect(segments).toHaveLength(0);
  });

  it('should fail to create transcript for non-existent recording', () => {
    expect(() => repo.create(999, 'whisper', 'Text', [])).toThrow();
  });
});
