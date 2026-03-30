import { useCallback } from 'react';
import type { Recording } from '../../../shared/types/database.types';
import { useRecordingStore } from '../../stores/recording.store';
import { formatDate, formatDurationShort } from '../../lib/formatters';

const STATUSES: Recording['status'][] = ['recording', 'transcribing', 'summarizing', 'complete', 'error'];

interface Props {
  recording: Recording;
}

export default function RecordingHeader({ recording }: Props) {
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);

  const statusLabel = recording.status === 'transcribing'
    ? 'Transcribing...'
    : recording.status === 'summarizing'
      ? 'Summarizing...'
      : recording.status;

  const handleCycleStatus = useCallback(async () => {
    const currentIdx = STATUSES.indexOf(recording.status);
    const nextStatus = STATUSES[(currentIdx + 1) % STATUSES.length];
    try {
      await window.electronAPI.invoke('recording:update', { id: recording.id, status: nextStatus });
      await fetchRecordings();
    } catch { /* ignore */ }
  }, [recording.id, recording.status, fetchRecordings]);

  return (
    <div className="flex-1">
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
          <button
            onClick={handleCycleStatus}
            title="Click to change status"
            className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${
              recording.status === 'complete'
                ? 'bg-success/15 text-success'
                : recording.status === 'recording'
                  ? 'bg-recording/15 text-recording'
                  : recording.status === 'error'
                    ? 'bg-danger/15 text-danger'
                    : 'bg-accent/15 text-accent'
            }`}
          >
            {statusLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
