import { useState, useCallback } from 'react';
import type { TranscriptWithSegments } from '../../../../shared/types/ipc.types';
import type { TranscriptHighlight, TranscriptSegmentRow } from '../../../../shared/types/database.types';
import { useWorkspaceStore } from '../../../stores/workspace.store';
import TranscriptSegment from '../../transcript/TranscriptSegment';

interface Props {
  transcript: TranscriptWithSegments | null;
  highlights: TranscriptHighlight[];
  recordingId: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  segment: TranscriptSegmentRow | null;
}

export default function TranscriptCardContent({ transcript, highlights, recordingId }: Props) {
  const addHighlight = useWorkspaceStore((s) => s.addHighlight);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const cards = useWorkspaceStore((s) => s.cards[recordingId] ?? []);

  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    segment: null,
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, segment: TranscriptSegmentRow) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, segment });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false, segment: null }));
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!menu.segment) return;
    const customCards = cards.filter((c) => c.card_type === 'custom_task');
    let targetCardId: number;
    if (customCards.length > 0) {
      targetCardId = customCards[0].id;
    } else {
      // Create a custom card first
      await useWorkspaceStore.getState().addCustomCard(recordingId, 'Tasks');
      const updatedCards = useWorkspaceStore.getState().cards[recordingId] ?? [];
      const newCustom = updatedCards.find((c) => c.card_type === 'custom_task');
      if (!newCustom) { closeMenu(); return; }
      targetCardId = newCustom.id;
    }
    await addTask(targetCardId, menu.segment.text, menu.segment.id);
    // Also highlight the source segment
    await addHighlight(recordingId, menu.segment.id, 'task_source');
    closeMenu();
  }, [menu.segment, cards, recordingId, addTask, addHighlight, closeMenu]);

  const handleMarkImportant = useCallback(async () => {
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
    <div className="relative" onClick={menu.visible ? closeMenu : undefined}>
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
          className="fixed z-50 rounded-card border border-border bg-surface shadow-lg py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={handleCreateTask}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface-2 text-left"
          >
            Create Task
          </button>
          <button
            onClick={handleMarkImportant}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface-2 text-left"
          >
            Mark as Important
          </button>
        </div>
      )}
    </div>
  );
}
