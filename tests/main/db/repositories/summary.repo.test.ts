import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../setup';
import { SummaryRepository } from '../../../../src/main/db/repositories/summary.repo';
import { ActionItemRepository } from '../../../../src/main/db/repositories/action-item.repo';
import { RecordingRepository } from '../../../../src/main/db/repositories/recording.repo';

describe('SummaryRepository', () => {
  let db: Database.Database;
  let repo: SummaryRepository;
  let actionRepo: ActionItemRepository;
  let recordingRepo: RecordingRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new SummaryRepository(db);
    actionRepo = new ActionItemRepository(db);
    recordingRepo = new RecordingRepository(db);
    recordingRepo.create({ title: 'Test Recording' });
  });

  it('should return undefined when no summary exists', () => {
    expect(repo.findByRecording(1)).toBeUndefined();
  });

  it('should create summary with action items', () => {
    const result = repo.create(1, {
      modelUsed: 'gpt-4',
      systemPromptUsed: 'Summarize this',
      content: 'Summary content',
      actionItems: [
        { text: 'Follow up with team', assignee: 'Alice' },
        { text: 'Send report', assignee: 'Bob', sort_order: 1 },
      ],
    });

    expect(result.id).toBe(1);
    expect(result.recording_id).toBe(1);
    expect(result.model_used).toBe('gpt-4');
    expect(result.content).toBe('Summary content');
    expect(result.action_items).toHaveLength(2);
    expect(result.action_items[0].text).toBe('Follow up with team');
    expect(result.action_items[0].assignee).toBe('Alice');
    expect(result.action_items[1].text).toBe('Send report');
  });

  it('should create summary without action items', () => {
    const result = repo.create(1, {
      content: 'Just a summary',
    });
    expect(result.action_items).toHaveLength(0);
  });

  it('should find summary by recording', () => {
    repo.create(1, { content: 'Test' });
    const found = repo.findByRecording(1);
    expect(found).toBeDefined();
    expect(found!.content).toBe('Test');
  });

  it('should return the latest summary for a recording', () => {
    repo.create(1, { content: 'First' });
    repo.create(1, { content: 'Second' });
    const found = repo.findByRecording(1);
    expect(found!.content).toBe('Second');
  });

  it('should cascade delete action items when summary deleted', () => {
    repo.create(1, {
      content: 'Test',
      actionItems: [{ text: 'Task 1' }],
    });
    db.prepare('DELETE FROM summaries WHERE id = 1').run();
    const items = db.prepare('SELECT * FROM action_items').all();
    expect(items).toHaveLength(0);
  });

  it('should cascade delete summaries when recording deleted', () => {
    repo.create(1, {
      content: 'Test',
      actionItems: [{ text: 'Task' }],
    });
    recordingRepo.delete(1);
    expect(repo.findByRecording(1)).toBeUndefined();
    const items = db.prepare('SELECT * FROM action_items').all();
    expect(items).toHaveLength(0);
  });

  it('should fail to create summary for non-existent recording', () => {
    expect(() => repo.create(999, { content: 'Test' })).toThrow();
  });
});

describe('ActionItemRepository', () => {
  let db: Database.Database;
  let summaryRepo: SummaryRepository;
  let actionRepo: ActionItemRepository;

  beforeEach(() => {
    db = createTestDb();
    summaryRepo = new SummaryRepository(db);
    actionRepo = new ActionItemRepository(db);
    db.prepare('INSERT INTO recordings (title) VALUES (?)').run('Rec');
    summaryRepo.create(1, {
      content: 'Summary',
      actionItems: [{ text: 'Task 1' }, { text: 'Task 2' }],
    });
  });

  it('should toggle action item completed', () => {
    const result = actionRepo.toggleCompleted(1, true);
    expect(result!.completed).toBe(1);

    const result2 = actionRepo.toggleCompleted(1, false);
    expect(result2!.completed).toBe(0);
  });

  it('should return undefined for non-existent action item', () => {
    const result = actionRepo.toggleCompleted(999, true);
    expect(result).toBeUndefined();
  });
});
