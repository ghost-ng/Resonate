import { useState, useRef, useEffect } from 'react';
import { getSpeakerColorByName } from '../../lib/colors';

interface Props {
  speaker: string;
  displayName?: string;
  onRename?: (originalName: string, newName: string) => void;
}

export default function SpeakerLabel({ speaker, displayName, onRename }: Props) {
  const name = displayName || speaker;
  const color = getSpeakerColorByName(speaker);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    setEditing(false);
    if (trimmed && trimmed !== name && onRename) {
      onRename(speaker, trimmed);
    }
  };

  return (
    <>
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={handleSave}
          className="rounded border border-accent bg-surface-2 px-1.5 py-0.5 text-sm font-medium outline-none"
          style={{ color, width: `${Math.max(editValue.length, 8)}ch` }}
        />
      ) : (
        <span
          className="flex items-center gap-1.5 text-sm font-medium cursor-default"
          style={{ color }}
          onContextMenu={(e) => {
            if (onRename) {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {name}
        </span>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-surface-2 py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text hover:bg-surface-3"
            onClick={() => {
              setEditValue(name);
              setEditing(true);
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Rename Speaker
          </button>
        </div>
      )}
    </>
  );
}
