import { useUiStore } from '../../stores/ui.store';

export default function SearchBar() {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-2 rounded-card bg-surface-2 px-2.5 py-1.5">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-muted">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search recordings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-none bg-transparent text-sm text-text placeholder-text-muted outline-none"
        />
      </div>
    </div>
  );
}
