import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { TranscriptWithSegments } from '../../../../shared/types/ipc.types';
import type { TranscriptHighlight, TranscriptSegmentRow } from '../../../../shared/types/database.types';
import { useWorkspaceStore } from '../../../stores/workspace.store';
import { useCardSearch } from '../CardSearchContext';
import { getSpeakerColorByName } from '../../../lib/colors';
import TranscriptSegment from '../../transcript/TranscriptSegment';

interface Props {
  transcript: TranscriptWithSegments | null;
  highlights: TranscriptHighlight[];
  recordingId: number;
  onAddTask: (text: string) => Promise<void>;
  playbackTimeMs?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  segment: TranscriptSegmentRow | null;
  selectedText: string;
}

export default function TranscriptCardContent({ transcript, highlights, recordingId, onAddTask, playbackTimeMs }: Props) {
  const addHighlight = useWorkspaceStore((s) => s.addHighlight);
  const { query, setTotalMatches } = useCardSearch();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActiveIdRef = useRef<number | null>(null);

  // Speaker map from transcript
  const speakerMap: Record<string, string> = useMemo(() => {
    if (!transcript?.speaker_map) return {};
    try { return JSON.parse(transcript.speaker_map); } catch { return {}; }
  }, [transcript?.speaker_map]);

  // Unique speakers
  const speakers = useMemo(() => {
    if (!transcript) return [];
    const seen = new Map<string, number>();
    for (const seg of transcript.segments) {
      const name = seg.speaker ?? 'Unknown';
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([original, count]) => ({
      original,
      display: speakerMap[original] || original,
      count,
    }));
  }, [transcript, speakerMap]);

  // Active segment for playback follow-along
  const activeSegmentId = useMemo(() => {
    if (playbackTimeMs === undefined || !transcript) return null;
    const timeMs = playbackTimeMs;
    for (const seg of transcript.segments) {
      if (seg.start_time_ms <= timeMs && timeMs < seg.end_time_ms) {
        return seg.id;
      }
    }
    return null;
  }, [playbackTimeMs, transcript]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentId === null || activeSegmentId === lastActiveIdRef.current) return;
    lastActiveIdRef.current = activeSegmentId;
    const el = containerRef.current?.querySelector(`[data-start-ms]`);
    // Find the active element by iterating
    const segments = containerRef.current?.querySelectorAll('[data-start-ms]');
    if (segments) {
      for (const seg of segments) {
        const startMs = parseInt(seg.getAttribute('data-start-ms') ?? '0', 10);
        const endMs = parseInt(seg.getAttribute('data-end-ms') ?? '0', 10);
        if (playbackTimeMs !== undefined && startMs <= playbackTimeMs && playbackTimeMs < endMs) {
          seg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }
      }
    }
  }, [activeSegmentId, playbackTimeMs]);

  // Count matches in transcript segments
  useEffect(() => {
    if (!query || !transcript) { setTotalMatches(0); return; }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    for (const seg of transcript.segments) {
      const matches = seg.text.match(regex);
      if (matches) count += matches.length;
    }
    setTotalMatches(count);
  }, [query, transcript, setTotalMatches]);

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
    await addHighlight(recordingId, menu.segment.id, 'task_source');
    closeMenu();
  }, [menu.segment, menu.selectedText, onAddTask, addHighlight, recordingId, closeMenu]);

  const removeHighlight = useWorkspaceStore((s) => s.removeHighlight);

  const handleToggleImportant = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!menu.segment) return;
    // Check if already marked important
    const existing = highlights.find(h => h.segment_id === menu.segment!.id && h.highlight_type === 'important');
    if (existing) {
      await removeHighlight(existing.id, recordingId);
    } else {
      await addHighlight(recordingId, menu.segment.id, 'important');
    }
    closeMenu();
  }, [menu.segment, recordingId, highlights, addHighlight, removeHighlight, closeMenu]);

  const handleRenameSpeaker = useCallback(async (originalName: string, newName: string) => {
    if (!transcript) return;
    try {
      await window.electronAPI.invoke('transcript:rename-speaker', {
        transcriptId: transcript.id,
        originalName,
        displayName: newName,
      });
      // Re-fetch transcript to get updated speaker_map
      const { useRecordingStore } = await import('../../../stores/recording.store');
      useRecordingStore.getState().fetchTranscript(recordingId);
    } catch (err) {
      console.error('Failed to rename speaker:', err);
    }
  }, [transcript, recordingId]);

  if (!transcript) {
    return <p className="py-3 text-sm text-text-muted">No transcript available.</p>;
  }

  const highlightMap = new Map<number, TranscriptHighlight>();
  for (const h of highlights) {
    highlightMap.set(h.segment_id, h);
  }

  const totalDurationMs = transcript.segments.length > 0
    ? transcript.segments[transcript.segments.length - 1].end_time_ms
    : 0;
  const durationMin = Math.round(totalDurationMs / 60000);

  return (
    <div className="relative select-text" ref={containerRef}>
      {/* Participant header */}
      {speakers.length > 0 && (
        <div className="border-b border-border/50 px-1 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Participants:</span>
            {speakers.map((s) => (
              <span
                key={s.original}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium"
                style={{ color: getSpeakerColorByName(s.original) }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getSpeakerColorByName(s.original) }} />
                {s.display}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-muted/60">
            <span>{speakers.length} speaker{speakers.length !== 1 ? 's' : ''} · {transcript.segments.length} segments · {durationMin > 0 ? `${durationMin}m` : '<1m'}</span>
            <button
              onClick={async () => {
                const input = prompt('How many speakers are in this conversation?', String(speakers.length));
                if (!input) return;
                const count = parseInt(input, 10);
                if (!count || count < 1 || count > 20) return;
                try {
                  await window.electronAPI.invoke('transcript:reassign-speakers', {
                    transcriptId: transcript.id,
                    speakerCount: count,
                  });
                  const { useRecordingStore } = await import('../../../stores/recording.store');
                  useRecordingStore.getState().fetchTranscript(recordingId);
                } catch (err) {
                  console.error('Failed to reassign speakers:', err);
                }
              }}
              className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
              title="Adjust number of speakers"
            >
              Adjust speakers
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {transcript.segments.map((seg) => (
          <TranscriptSegment
            key={seg.id}
            segment={seg}
            highlight={highlightMap.get(seg.id) ?? null}
            isActive={seg.id === activeSegmentId}
            speakerDisplayName={speakerMap[seg.speaker ?? 'Unknown']}
            onRenameSpeaker={handleRenameSpeaker}
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
            onMouseDown={handleToggleImportant}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
          >
            {menu.segment && highlights.some(h => h.segment_id === menu.segment!.id && h.highlight_type === 'important')
              ? <><span className="text-yellow-400">★</span> Unmark Important</>
              : <><span className="text-text-muted">☆</span> Mark as Important</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
