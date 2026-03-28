import type { TranscriptWithSegments } from '../../../shared/types/ipc.types';
import TranscriptSegment from './TranscriptSegment';

interface Props {
  transcript: TranscriptWithSegments;
}

export default function TranscriptCard({ transcript }: Props) {
  return (
    <div className="rounded-card border border-border bg-surface p-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-md font-semibold text-text">Transcript</h3>
        <span className="text-xs text-text-muted">
          {transcript.segments.length} segments · {transcript.engine_used}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {transcript.segments.map((seg) => (
          <TranscriptSegment key={seg.id} segment={seg} />
        ))}
      </div>
    </div>
  );
}
