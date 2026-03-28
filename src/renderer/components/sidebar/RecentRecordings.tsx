import { useRecordingStore } from '../../stores/recording.store';
import { useNotebookStore } from '../../stores/notebook.store';
import { useContextMenu } from '../../hooks/useContextMenu';
import { formatRelativeDate, formatDurationShort } from '../../lib/formatters';
import { ALL_RECORDINGS_ID } from '../../lib/constants';

export default function RecentRecordings() {
  const recordings = useRecordingStore((s) => s.recordings);
  const openTab = useRecordingStore((s) => s.openTab);
  const activeTabId = useRecordingStore((s) => s.activeTabId);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);
  const ctxMenu = useContextMenu();

  const filtered = selectedNotebookId === ALL_RECORDINGS_ID
    ? recordings
    : recordings.filter((r) => r.notebook_id === selectedNotebookId);

  const recent = [...filtered]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  const sectionLabel = selectedNotebookId === ALL_RECORDINGS_ID ? 'Recent' : 'Recordings';

  return (
    <div className="flex flex-col gap-0.5 px-2">
      <div className="px-1 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-text-muted/60">
        {sectionLabel}
      </div>
      {recent.map((rec) => (
        <button
          key={rec.id}
          onClick={() => openTab(rec.id)}
          onContextMenu={(e) => ctxMenu.show(e, { type: 'recording', id: rec.id })}
          className={`flex w-full flex-col gap-0.5 rounded-card px-3 py-1.5 text-left transition-colors ${
            activeTabId === rec.id
              ? 'bg-accent/15 text-accent'
              : 'text-text-muted hover:bg-surface-2 hover:text-text'
          }`}
        >
          <span className="truncate text-sm">{rec.title}</span>
          <span className="text-xs opacity-60">
            {formatRelativeDate(rec.created_at)} · {formatDurationShort(rec.duration_seconds)}
          </span>
        </button>
      ))}
    </div>
  );
}
