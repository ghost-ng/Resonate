import type { TranscriptSegmentRow, TranscriptHighlight } from '../../../shared/types/database.types';
import { formatTimestamp } from '../../lib/formatters';
import SpeakerLabel from './SpeakerLabel';

interface Props {
  segment: TranscriptSegmentRow;
  highlight?: TranscriptHighlight | null;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function TranscriptSegment({ segment, highlight, onContextMenu }: Props) {
  let highlightClass = '';
  if (highlight?.highlight_type === 'important') {
    highlightClass = 'border-l-2 border-accent bg-accent/5';
  } else if (highlight?.highlight_type === 'task_source') {
    highlightClass = 'border-l-2 border-success bg-success/5';
  }

  return (
    <div
      className={`flex gap-3 py-2 ${highlightClass}`}
      onContextMenu={onContextMenu}
    >
      <div className="w-16 shrink-0 pt-0.5 text-right">
        <span className="font-mono text-xs text-text-muted/60">
          {formatTimestamp(segment.start_time_ms)}
        </span>
      </div>
      <div className="flex-1">
        <SpeakerLabel speaker={segment.speaker ?? 'Unknown'} />
        <p className="mt-0.5 text-sm leading-relaxed text-text/90">{segment.text}</p>
      </div>
    </div>
  );
}
