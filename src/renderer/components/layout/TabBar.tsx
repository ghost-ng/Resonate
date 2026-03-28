import { useRecordingStore } from '../../stores/recording.store';

export default function TabBar() {
  const openTabIds = useRecordingStore((s) => s.openTabIds);
  const activeTabId = useRecordingStore((s) => s.activeTabId);
  const setActiveTab = useRecordingStore((s) => s.setActiveTab);
  const closeTab = useRecordingStore((s) => s.closeTab);
  const recordings = useRecordingStore((s) => s.recordings);

  if (openTabIds.length === 0) return null;

  return (
    <div className="flex h-8 items-end gap-px border-b border-border bg-bg px-1">
      {openTabIds.map((id) => {
        const rec = recordings.find((r) => r.id === id);
        const isActive = id === activeTabId;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`group flex h-[30px] max-w-[180px] items-center gap-1.5 rounded-t-md px-3 text-sm transition-colors ${
              isActive
                ? 'bg-surface-2 text-text'
                : 'bg-transparent text-text-muted hover:bg-surface/60 hover:text-text'
            }`}
          >
            <span className="truncate">{rec?.title ?? `Recording ${id}`}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              className={`ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-xs transition-colors ${
                isActive
                  ? 'text-text-muted hover:bg-surface-3 hover:text-text'
                  : 'text-transparent group-hover:text-text-muted group-hover:hover:text-text'
              }`}
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
