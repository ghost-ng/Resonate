import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TranscriptWithSegments } from '../../../../shared/types/ipc.types';
import type { TranscriptHighlight, TranscriptSegmentRow } from '../../../../shared/types/database.types';
import { useWorkspaceStore } from '../../../stores/workspace.store';
import TranscriptSegment from '../../transcript/TranscriptSegment';

interface Props {
  transcript: TranscriptWithSegments | null;
  highlights: TranscriptHighlight[];
  recordingId: number;
  onAddTask: (text: string) => Promise<void>;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  segment: TranscriptSegmentRow | null;
  selectedText: string;
}

export default function TranscriptCardContent({ transcript, highlights, recordingId, onAddTask }: Props) {
  const addHighlight = useWorkspaceStore((s) => s.addHighlight);

  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, segment: null, selectedText: '',
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, segment: TranscriptSegmentRow) => {
    e.preventDefault();
    e.stopPropagation();
    const selected = window.getSelection()?.toString().trim() ?? '';
    setMenu({ visible: true, x: e.clientX, y: e.clientY, segment, selectedText: selected });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((m) => m.visible ? { visible: false, x: 0, y: 0, segment: null, selectedText: '' } : m);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = () => closeMenu();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menu.visible, closeMenu]);

  const handleCreateTask = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!menu.segment) return;
    const taskText = menu.selectedText || menu.segment.text;
    await onAddTask(taskText);
    // Highlight the source segment
    await addHighlight(recordingId, menu.segment.id, 'task_source');
    closeMenu();
  }, [menu.segment, menu.selectedText, onAddTask, addHighlight, recordingId, closeMenu]);

  const handleMarkImportant = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!menu.segment) return;
    await addHighlight(recordingId, menu.segment.id, 'important');
    closeMenu();
  }, [menu.segment, recordingId, addHighlight, closeMenu]);

  if (!transcript) {
    return <p className="py-3 text-sm text-text-muted">No transcript available.</p>;
  }

  const highlightMap = new Map<number, TranscriptHighlight>();
  for (const h of highlights) {
    highlightMap.set(h.segment_id, h);
  }

  return (
    <div className="relative select-text">
      <div className="divide-y divide-border/50">
        {transcript.segments.map((seg) => (
          <TranscriptSegment
            key={seg.id}
            segment={seg}
            highlight={highlightMap.get(seg.id) ?? null}
            onContextMenu={(e) => handleContextMenu(e, seg)}
          />
        ))}
      </div>

      {menu.visible && (
        <div
          className="fixed z-[100] rounded-card border border-border bg-surface shadow-xl py-1 min-w-[180px]"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onMouseDown={handleCreateTask}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
          >
            <span className="text-accent">+</span>
            {menu.selectedText ? 'Add Selection to Tasks' : 'Create Task'}
          </button>
          <button
            onMouseDown={handleMarkImportant}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
          >
            <span className="text-yellow-400">★</span> Mark as Important
          </button>
        </div>
      )}
    </div>
  );
}
