import type { Recording } from '../../../shared/types/database.types';

interface Props {
  recording: Recording;
}

export default function ProcessingBar({ recording }: Props) {
  const isProcessing = recording.status === 'transcribing' || recording.status === 'summarizing';
  if (!isProcessing) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <svg className="animate-spin h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs font-medium text-accent">
          {recording.status === 'transcribing' ? 'Transcribing audio...' : 'Generating AI summary...'}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent animate-[indeterminate_1.5s_ease-in-out_infinite]"
          style={{ width: '40%' }}
        />
      </div>
    </div>
  );
}
