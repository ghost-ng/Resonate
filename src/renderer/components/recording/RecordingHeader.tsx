import type { Recording } from '../../../shared/types/database.types';
import { formatDate, formatDurationShort } from '../../lib/formatters';

interface Props {
  recording: Recording;
}

export default function RecordingHeader({ recording }: Props) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-semibold text-text">{recording.title}</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
          {recording.source_app && (
            <>
              <span>{recording.source_app}</span>
              <span className="opacity-40">·</span>
            </>
          )}
          <span>{formatDurationShort(recording.duration_seconds)}</span>
          <span className="opacity-40">·</span>
          <span>{formatDate(recording.created_at)}</span>
          {recording.participant_count > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span>{recording.participant_count} participants</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            recording.status === 'complete'
              ? 'bg-success/15 text-success'
              : recording.status === 'recording'
                ? 'bg-recording/15 text-recording'
                : recording.status === 'error'
                  ? 'bg-danger/15 text-danger'
                  : 'bg-accent/15 text-accent'
          }`}
        >
          {recording.status}
        </span>
      </div>
    </div>
  );
}
