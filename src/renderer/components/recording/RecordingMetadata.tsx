import type { Recording } from '../../../shared/types/database.types';
import { formatDate, formatDurationShort } from '../../lib/formatters';

interface Props {
  recording: Recording;
}

export default function RecordingMetadata({ recording }: Props) {
  const items = [
    { label: 'Source', value: recording.source_app ?? 'Unknown' },
    { label: 'Duration', value: formatDurationShort(recording.duration_seconds) },
    { label: 'Date', value: formatDate(recording.created_at) },
    { label: 'Participants', value: String(recording.participant_count) },
  ];

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="text-xs text-text-muted">{item.label}</span>
          <span className="text-text">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
