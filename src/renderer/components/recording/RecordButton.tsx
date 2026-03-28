import { useState } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { useRecordingStore } from '../../stores/recording.store';
import { formatDuration } from '../../lib/formatters';
import Modal from '../shared/Modal';

export default function RecordButton() {
  const isRecording = useSessionStore((s) => s.isRecording);
  const recordingPhase = useSessionStore((s) => s.recordingPhase);
  const durationMs = useSessionStore((s) => s.durationMs);
  const startRecording = useSessionStore((s) => s.startRecording);
  const stopRecording = useSessionStore((s) => s.stopRecording);
  const discardRecording = useSessionStore((s) => s.discardRecording);
  const lastRecordingId = useSessionStore((s) => s.lastRecordingId);
  const deleteRecording = useRecordingStore((s) => s.deleteRecording);

  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    // If there's a pending recording (post-recording phase), ask to discard first
    if (recordingPhase === 'post-recording') {
      setShowDiscardPrompt(true);
      return;
    }

    startRecording();
  };

  const handleDiscardAndRecord = () => {
    const id = lastRecordingId;
    discardRecording();
    if (id) deleteRecording(id);
    setShowDiscardPrompt(false);
    // Start new recording after a tick to let state settle
    setTimeout(() => startRecording(), 100);
  };

  if (isRecording) {
    return (
      <button
        onClick={handleClick}
        className="group relative flex items-center gap-3 rounded-full border-2 border-recording/60 bg-recording/10 px-5 py-2.5 transition-all hover:border-recording hover:bg-recording/20"
      >
        <span className="absolute inset-0 rounded-full border-2 border-recording/40 animate-recording-ring" />
        <span className="h-3 w-3 rounded-full bg-recording animate-pulse-recording" />
        <span className="font-mono text-md font-medium text-recording">
          {formatDuration(durationMs)}
        </span>
        <span className="text-sm text-recording/80">Stop Recording</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-recording px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-recording/90 hover:shadow-[0_0_20px_rgba(255,59,59,0.3)]"
      >
        <span className="h-3 w-3 rounded-full bg-white/90" />
        Record
      </button>

      <Modal
        isOpen={showDiscardPrompt}
        title="Unsaved Recording"
        onClose={() => setShowDiscardPrompt(false)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setShowDiscardPrompt(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleDiscardAndRecord}
            >
              Discard & Record
            </button>
          </>
        }
      >
        <p>You have an unsaved recording. Discard it and start a new one?</p>
      </Modal>
    </>
  );
}
