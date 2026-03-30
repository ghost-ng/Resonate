import { useRef } from 'react';
import type { TranscriptSegmentRow, TranscriptHighlight } from '../../../shared/types/database.types';
import { formatTimestamp } from '../../lib/formatters';
import SpeakerLabel from './SpeakerLabel';
import HighlightText from '../shared/HighlightText';
import { useCardSearch } from '../workspace/CardSearchContext';

interface Props {
  segment: TranscriptSegmentRow;
  highlight?: TranscriptHighlight | null;
  isActive?: boolean;
  speakerDisplayName?: string;
  onRenameSpeaker?: (originalName: string, newName: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function TranscriptSegment({ segment, highlight, isActive, speakerDisplayName, onRenameSpeaker, onContextMenu }: Props) {
  const { query, activeMatchIndex } = useCardSearch();
  const ref = useRef<HTMLDivElement>(null);

  const isImportant = highlight?.highlight_type === 'important';
  const isTaskSource = highlight?.highlight_type === 'task_source';

  let highlightClass = '';
  if (isActive) {
    highlightClass = 'border-l-2 border-accent bg-accent/10';
  } else if (isTaskSource) {
    highlightClass = 'border-l-2 border-success bg-success/5';
  }

  return (
    <div
      ref={ref}
      data-start-ms={segment.start_time_ms}
      data-end-ms={segment.end_time_ms}
      className={`flex gap-3 py-2 transition-colors duration-200 ${highlightClass}`}
      onContextMenu={onContextMenu}
    >
      <div className="w-16 shrink-0 pt-0.5 text-right flex items-start justify-end gap-1">
        {isImportant && (
          <span className="text-yellow-400 text-xs" title="Important">★</span>
        )}
        <span className="font-mono text-xs text-text-muted/60">
          {formatTimestamp(segment.start_time_ms)}
        </span>
      </div>
      <div className="flex-1">
        <SpeakerLabel
          speaker={segment.speaker ?? 'Unknown'}
          displayName={speakerDisplayName}
          onRename={onRenameSpeaker}
        />
        <p className="mt-0.5 text-sm leading-relaxed text-text/90">
          {query ? <HighlightText text={segment.text} query={query} activeIndex={activeMatchIndex} /> : segment.text}
        </p>
      </div>
    </div>
  );
}
