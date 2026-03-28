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

  if (!activeTabId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-text-muted/40 mb-2">📝</div>
          <p className="text-sm text-text-muted">Select or start a recording</p>
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
