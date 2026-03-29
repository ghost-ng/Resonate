import { useEffect, useCallback } from 'react';
import { useRecordingStore } from '../../stores/recording.store';
import { useNotebookStore } from '../../stores/notebook.store';
import { useSessionStore } from '../../stores/session.store';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
import RecordingHeader from './RecordingHeader';
import RecordButton from './RecordButton';
import RecordingMetadata from './RecordingMetadata';
import AudioPlayer from './AudioPlayer';
import AutoDetectBanner from './AutoDetectBanner';
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
  const fetchTranscript = useRecordingStore((s) => s.fetchTranscript);
  const fetchSummary = useRecordingStore((s) => s.fetchSummary);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const startRecording = useSessionStore((s) => s.startRecording);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);
  const notebooks = useNotebookStore((s) => s.notebooks);

  // Fetch transcript/summary when a tab is opened
  useEffect(() => {
    if (activeTabId && !transcripts[activeTabId]) {
      fetchTranscript(activeTabId);
    }
    if (activeTabId && !summaries[activeTabId]) {
      fetchSummary(activeTabId);
    }
  }, [activeTabId, transcripts, summaries, fetchTranscript, fetchSummary]);

  // Listen for recording status changes from main process
  useEffect(() => {
    const cleanup = window.electronAPI.on('recording:status-changed', (data) => {
      const { recordingId, status } = data;
      console.log(`[RecordingView] Status changed: recording=${recordingId} status=${status}`);
      if (status === 'complete' || status === 'summarizing') {
        fetchTranscript(recordingId);
        fetchRecordings();
      }
      if (status === 'complete') {
        fetchSummary(recordingId);
      }
    });
    return cleanup;
  }, [fetchTranscript, fetchSummary, fetchRecordings]);

  // Callback for AudioPlayer when transcription/summarization completes
  const handleStatusChange = useCallback((newStatus: string) => {
    if (activeTabId) {
      if (newStatus === 'transcribed') fetchTranscript(activeTabId);
      if (newStatus === 'summarized') fetchSummary(activeTabId);
      fetchRecordings();
    }
  }, [activeTabId, fetchTranscript, fetchSummary, fetchRecordings]);

  const selectedNotebook = selectedNotebookId !== ALL_RECORDINGS_ID
    ? notebooks.find((n) => n.id === selectedNotebookId)
    : null;

  // Empty state — no tab selected
  if (!activeTabId && recordingPhase === 'idle') {
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
          {selectedNotebook && (
            <p className="text-md font-medium text-text">
              {selectedNotebook.icon} {selectedNotebook.name}
            </p>
          )}
          <p className="text-sm text-text-muted">
            {selectedNotebook
              ? `Start a recording in this notebook`
              : 'Select a recording or start a new one'}
          </p>
          <button
            onClick={() => startRecording(selectedNotebook?.id)}
            className="flex items-center gap-2 rounded-full bg-recording px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-recording/90 hover:shadow-[0_0_20px_rgba(255,59,59,0.3)]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            Start Recording
          </button>
          <p className="text-xs text-text-muted/60">or press Ctrl+R</p>
        </div>
      </div>
    );
  }

  const lastRecordingId = useSessionStore((s) => s.lastRecordingId);

  // Recording in progress (no tab yet — recording was started from empty state)
  if (!activeTabId && recordingPhase !== 'idle') {
    const postTranscript = lastRecordingId ? transcripts[lastRecordingId] : null;
    const postSummary = lastRecordingId ? summaries[lastRecordingId] : null;

    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <RecordButton />
          </div>
          {recordingPhase === 'recording' && <WaveformVisualizer />}
          {recordingPhase === 'post-recording' && <PostRecordingControls />}
          {postTranscript && <TranscriptCard transcript={postTranscript} />}
          {postSummary && <SummaryCard summary={postSummary} />}
        </div>
      </div>
    );
  }

  const recording = recordings.find((r) => r.id === activeTabId);
  if (!recording) return null;

  const transcript = transcripts[activeTabId!];
  const summary = summaries[activeTabId!];

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

        {/* Audio player for saved recordings with audio files */}
        {recordingPhase === 'idle' && recording.audio_file_path && (
          <AudioPlayer audioPath={recording.audio_file_path} recordingId={recording.id} onStatusChange={handleStatusChange} />
        )}

        {transcript && <TranscriptCard transcript={transcript} />}
        {summary && <SummaryCard summary={summary} />}
      </div>
    </div>
  );
}
