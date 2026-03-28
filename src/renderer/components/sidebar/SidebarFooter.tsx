import { useNotebookStore } from '../../stores/notebook.store';
import { useUiStore } from '../../stores/ui.store';

export default function SidebarFooter() {
  const createNotebook = useNotebookStore((s) => s.createNotebook);
  const setSettingsPanelOpen = useUiStore((s) => s.setSettingsPanelOpen);

  const handleNewNotebook = () => {
    const emojis = ['📁', '📓', '📝', '📋', '🗂️'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    createNotebook('New Notebook', emoji);
  };

  return (
    <div className="flex items-center gap-1 border-t border-border px-3 py-2">
      <button
        onClick={handleNewNotebook}
        className="flex flex-1 items-center gap-1.5 rounded-card px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Notebook
      </button>
      <button
        onClick={() => setSettingsPanelOpen(true)}
        className="flex items-center justify-center rounded-card p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
