import { useRecordingStore } from '../../stores/recording.store';
import { useSessionStore } from '../../stores/session.store';
import RecordingHeader from './RecordingHeader';
import RecordButton from './RecordButton';
import RecordingMetadata from './RecordingMetadata';
import AutoDetectBanner from './AutoDetectBanner';
import RecordingStartDialog from './RecordingStartDialog';
import WaveformVisualizer from './WaveformVisualizer';
import PostRecordingControls from './PostRecordingControls';
import TranscriptCard from '../transcript/TranscriptCard';
import SummaryCard from '../summary/SummaryCard';

export default function RecordingView() {
  const activeTabId = useRecordingStore((s) => s.activeTabId);
  const recordings = useRecordingStore((s) => s.recordings);
  const transcripts = useRecordingStore((s) => s.transcripts);
  const summaries = useRecordingStore((s) => s.summaries);
  const recordingPhase = useSessionStore((s) => s.recordingPhase);

  const startRecording = useSessionStore((s) => s.startRecording);

  if (!activeTabId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">Select a recording or start a new one</p>
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-full bg-recording px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-recording/90 hover:shadow-[0_0_20px_rgba(255,59,59,0.3)]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            Start Recording
          </button>
          <p className="text-xs text-text-muted/60">or press Ctrl+R</p>
        </div>

        {recordingPhase === 'device-select' && <RecordingStartDialog />}
      </div>
    );
  }

  const recording = recordings.find((r) => r.id === activeTabId);
  if (!recording) return null;

  const transcript = transcripts[activeTabId];
  const summary = summaries[activeTabId];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <AutoDetectBanner />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between">
          <RecordingHeader recording={recording} />
        </div>

        <div className="flex items-center gap-4">
          <RecordButton />
          <RecordingMetadata recording={recording} />
        </div>

        {recordingPhase === 'recording' && <WaveformVisualizer />}
        {recordingPhase === 'post-recording' && <PostRecordingControls />}

        {transcript && <TranscriptCard transcript={transcript} />}
        {summary && <SummaryCard summary={summary} />}
      </div>

      {recordingPhase === 'device-select' && <RecordingStartDialog />}
    </div>
  );
}
