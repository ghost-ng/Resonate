import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';
import type { PromptProfile } from '../../../shared/types/database.types';

const VARIABLES = [
  '{{transcript}}',
  '{{duration}}',
  '{{source_app}}',
  '{{participant_count}}',
  '{{date}}',
];

interface EditState {
  id: number | null; // null = new profile
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: number;
}

export default function PromptProfileEditor() {
  const profiles = useSettingsStore((s) => s.promptProfiles);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [activeTextarea, setActiveTextarea] = useState<'system' | 'user' | null>(null);

  const handleEdit = (p: PromptProfile) => {
    setEditing({
      id: p.id,
      name: p.name,
      system_prompt: p.system_prompt,
      user_prompt_template: p.user_prompt_template,
      is_default: p.is_default,
    });
  };

  const handleAdd = () => {
    setEditing({
      id: null,
      name: '',
      system_prompt: '',
      user_prompt_template: '',
      is_default: 0,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    // In a real implementation this would call an IPC method to persist.
    // For now we update the store optimistically via a setting key.
    setSetting(
      `prompt_profile_draft_${editing.id ?? 'new'}`,
      JSON.stringify(editing),
    );
    setEditing(null);
  };

  const handleDelete = (id: number) => {
    setSetting(`prompt_profile_delete_${id}`, 'true');
  };

  const insertVariable = (variable: string) => {
    if (!editing || !activeTextarea) return;
    const field = activeTextarea === 'system' ? 'system_prompt' : 'user_prompt_template';
    setEditing({ ...editing, [field]: editing[field] + variable });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Prompt Profiles</h3>
        {!editing && (
          <button
            onClick={handleAdd}
            className="rounded-card bg-accent px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            + Add Profile
          </button>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-1">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-card border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-base text-text">{p.name}</span>
                {p.is_default === 1 && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(p)}
                  className="rounded px-2 py-1 text-sm text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded px-2 py-1 text-sm text-danger/70 hover:bg-surface-2 hover:text-danger transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-sm text-text-muted">No prompt profiles yet.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Profile Name</label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="My Profile"
              className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">System Prompt</label>
            <textarea
              value={editing.system_prompt}
              onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
              onFocus={() => setActiveTextarea('system')}
              rows={4}
              className="rounded-card border border-border bg-surface-2 px-3 py-2 font-mono text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent resize-y"
              placeholder="You are a helpful assistant..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">User Prompt Template</label>
            <textarea
              value={editing.user_prompt_template}
              onChange={(e) => setEditing({ ...editing, user_prompt_template: e.target.value })}
              onFocus={() => setActiveTextarea('user')}
              rows={4}
              className="rounded-card border border-border bg-surface-2 px-3 py-2 font-mono text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent resize-y"
              placeholder="Summarize the following transcript: {{transcript}}"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-text-muted mr-1 self-center">Insert:</span>
            {VARIABLES.map((v) => (
              <button
                key={v}
                onClick={() => insertVariable(v)}
                className="rounded bg-surface-2 border border-border px-2 py-0.5 font-mono text-xs text-text-muted hover:text-text hover:border-accent transition-colors"
              >
                {v}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editing.is_default === 1}
              onChange={(e) =>
                setEditing({ ...editing, is_default: e.target.checked ? 1 : 0 })
              }
              className="accent-accent"
            />
            <span className="text-sm text-text-muted">Set as default profile</span>
          </label>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleSave}
              className="rounded-card bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-card border border-border px-4 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
