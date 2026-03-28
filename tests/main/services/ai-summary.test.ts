import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  extractActionItems,
} from '../../../src/main/services/ai-summary.service';

describe('renderTemplate', () => {
  it('replaces all variables', () => {
    const template = 'Hello {{name}}, welcome to {{place}}!';
    const result = renderTemplate(template, { name: 'Alice', place: 'Wonderland' });
    expect(result).toBe('Hello Alice, welcome to Wonderland!');
  });

  it('replaces duplicate variables', () => {
    const template = '{{x}} and {{x}} again';
    const result = renderTemplate(template, { x: 'hi' });
    expect(result).toBe('hi and hi again');
  });

  it('leaves missing variables as-is', () => {
    const template = 'Hello {{name}}, your id is {{id}}';
    const result = renderTemplate(template, { name: 'Bob' });
    expect(result).toBe('Hello Bob, your id is {{id}}');
  });

  it('returns template unchanged when no variables provided', () => {
    const template = 'No variables here';
    const result = renderTemplate(template, {});
    expect(result).toBe('No variables here');
  });

  it('returns template unchanged when it has no placeholders', () => {
    const template = 'Just plain text';
    const result = renderTemplate(template, { unused: 'value' });
    expect(result).toBe('Just plain text');
  });

  it('handles the standard meeting template variables', () => {
    const template =
      'A {{duration}} min call on {{source_app}} with {{participant_count}} people on {{date}}:\n{{transcript}}';
    const result = renderTemplate(template, {
      duration: '30',
      source_app: 'Zoom',
      participant_count: '4',
      date: '2026-03-28',
      transcript: 'Alice: Hello\nBob: Hi',
    });
    expect(result).toBe(
      'A 30 min call on Zoom with 4 people on 2026-03-28:\nAlice: Hello\nBob: Hi'
    );
  });
});

describe('extractActionItems', () => {
  it('extracts checkbox items', () => {
    const md = `
# Notes
- [ ] Send report
- [x] Review PR
- Regular bullet
    `;
    const items = extractActionItems(md);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ text: 'Send report', assignee: null });
    expect(items[1]).toEqual({ text: 'Review PR', assignee: null });
  });

  it('extracts assignee from parenthetical', () => {
    const md = '- [ ] Send report (Sarah)';
    const items = extractActionItems(md);
    expect(items).toEqual([{ text: 'Send report', assignee: 'Sarah' }]);
  });

  it('extracts assignee from @mention', () => {
    const md = '- [ ] Review PR @Bob';
    const items = extractActionItems(md);
    expect(items).toEqual([{ text: 'Review PR', assignee: 'Bob' }]);
  });

  it('prefers parenthetical assignee over @mention', () => {
    const md = '- [ ] Task @Bob (Alice)';
    const items = extractActionItems(md);
    expect(items).toEqual([{ text: 'Task', assignee: 'Alice' }]);
  });

  it('extracts plain list items under Action Items heading', () => {
    const md = `
## Action Items
- Send the report to finance
- Update the dashboard

## Other Section
- This should not be extracted
    `;
    const items = extractActionItems(md);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ text: 'Send the report to finance', assignee: null });
    expect(items[1]).toEqual({ text: 'Update the dashboard', assignee: null });
  });

  it('extracts checkbox items outside action items section', () => {
    const md = `
## Summary
Some summary text.

- [ ] Follow up on design review (Mike)

## Action Items
- Prepare slides @Jane
    `;
    const items = extractActionItems(md);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ text: 'Follow up on design review', assignee: 'Mike' });
    expect(items[1]).toEqual({ text: 'Prepare slides', assignee: 'Jane' });
  });

  it('returns empty array for empty string', () => {
    expect(extractActionItems('')).toEqual([]);
  });

  it('returns empty array when no action items found', () => {
    const md = `
# Meeting Notes
- Discussed quarterly goals
- Reviewed budget
    `;
    expect(extractActionItems(md)).toEqual([]);
  });
});
