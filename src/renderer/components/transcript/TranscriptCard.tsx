import { useState } from 'react';
import type { TranscriptWithSegments } from '../../../shared/types/ipc.types';
import TranscriptSegment from './TranscriptSegment';

interface Props {
  transcript: TranscriptWithSegments;
}

export default function TranscriptCard({ transcript }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-card text-left transition-colors hover:bg-surface-2/50"
      >
        <div className="flex items-center gap-2">
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
            className={`shrink-0 text-text-muted transition-transform ${collapsed ? '' : 'rotate-90'}`}
          >
            <path d="M3 1l4 4-4 4z" />
          </svg>
          <h3 className="text-md font-semibold text-text">Transcript</h3>
        </div>
        <span className="text-xs text-text-muted">
          {transcript.segments.length} segments · {transcript.engine_used}
        </span>
      </button>
      {!collapsed && (
        <div className="divide-y divide-border/50 border-t border-border/50 px-card pb-card">
          {transcript.segments.map((seg) => (
            <TranscriptSegment key={seg.id} segment={seg} />
          ))}
        </div>
      )}
    </div>
  );
}
