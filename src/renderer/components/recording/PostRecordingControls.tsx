import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { useRecordingStore } from '../../stores/recording.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { formatTimestamp } from '../../lib/formatters';
import Dropdown from '../shared/Dropdown';
import type { DropdownItem } from '../shared/Dropdown';
import SplitButton from '../shared/SplitButton';
import type { SplitButtonItem } from '../shared/SplitButton';
import Modal from '../shared/Modal';

export default function PostRecordingControls() {
  const audioPath = useSessionStore((s) => s.lastRecordingAudioPath);
  const recordingId = useSessionStore((s) => s.lastRecordingId);
  const keepRecordingSession = useSessionStore((s) => s.keepRecording);
  const discardRecordingSession = useSessionStore((s) => s.discardRecording);
  const openTab = useRecordingStore((s) => s.openTab);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const deleteRecording = useRecordingStore((s) => s.deleteRecording);

  const handleKeep = useCallback(() => {
    const id = recordingId;
    keepRecordingSession();
    if (id) {
      fetchRecordings();
      openTab(id);
    }
  }, [recordingId, keepRecordingSession, fetchRecordings, openTab]);

  // Use the recording timer duration as initial fallback
  const sessionDurationMs = useSessionStore((s) => s.durationMs);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(sessionDurationMs || 0);

  const tryReadDuration = useCallback(() => {
    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
      if (audioRef.current.duration && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration * 1000);
      }
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current && audioRef.current.currentTime > 0) {
      setDuration(audioRef.current.currentTime * 1000);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', tryReadDuration);
    audio.addEventListener('durationchange', tryReadDuration);
    audio.addEventListener('canplaythrough', tryReadDuration);
    audio.addEventListener('ended', handleEnded);
    const timer = setTimeout(tryReadDuration, 500);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', tryReadDuration);
      audio.removeEventListener('durationchange', tryReadDuration);
      audio.removeEventListener('canplaythrough', tryReadDuration);
      audio.removeEventListener('ended', handleEnded);
      clearTimeout(timer);
    };
  }, [handleTimeUpdate, tryReadDuration, handleEnded]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = (fraction * duration) / 1000;
  };

  const fetchTranscript = useRecordingStore((s) => s.fetchTranscript);
  const fetchSummary = useRecordingStore((s) => s.fetchSummary);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState('');

  const handleTranscribe = async () => {
    if (!recordingId) return;
    setTranscribeStatus('Transcribing...');
    try {
      await window.electronAPI.invoke('transcript:start', { recordingId });
      setTranscribeStatus('Done!');
      fetchTranscript(recordingId);
    } catch (err: any) {
      setTranscribeStatus(`Error: ${err?.message || 'Failed'}`);
    }
  };

  const addCard = useWorkspaceStore((s) => s.addCard);
  const findDuplicate = useWorkspaceStore((s) => s.findDuplicateCard);
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ profileId?: number; profileName?: string } | null>(null);

  const executeSendToAi = async (profileId?: number, profileName?: string) => {
    if (!recordingId) return;
    setTranscribeStatus('Generating summary...');
    try {
      const name = profileName || 'Summary';
      await addCard(recordingId, 'summary', name, profileId);
      setTranscribeStatus('Summary complete!');
      fetchSummary(recordingId);
    } catch (err: any) {
      setTranscribeStatus(`Error: ${err?.message || 'Failed'}`);
    }
  };

  const handleSendToAi = async (profileId?: number, profileName?: string) => {
    if (!recordingId) return;
    const name = profileName || 'Summary';
    const dup = findDuplicate(recordingId, 'summary', name);
    if (dup) {
      setOverwriteConfirm({ profileId, profileName });
    } else {
      executeSendToAi(profileId, profileName);
    }
  };

  const promptProfiles = useSettingsStore((s) => s.promptProfiles);

  const defaultProfile = useMemo(() =>
    promptProfiles.find((p) => p.is_default === 1) ?? promptProfiles[0],
    [promptProfiles]
  );

  const aiProfileItems = useMemo<SplitButtonItem[]>(() => {
    return promptProfiles.map((p) => ({
      label: `${p.is_default ? '● ' : ''}${p.name}`,
      action: () => handleSendToAi(p.id, p.name),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptProfiles, recordingId]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-card border border-border bg-surface p-4" data-tutorial="post-controls">
      {/* Audio element — use custom audio-file:// protocol for Electron */}
      {audioPath && (
        <audio
          ref={audioRef}
          src={`audio-file:///${audioPath.replace(/\\/g, '/')}`}
          preload="metadata"
        />
      )}

      {/* Player controls */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            disabled={!audioPath}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <rect x="0" y="0" width="4" height="14" rx="1" />
                <rect x="8" y="0" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <path d="M0 0l12 7-12 7z" />
              </svg>
            )}
          </button>

          {/* Time display */}
          <span className="font-mono text-sm text-text-muted min-w-[90px]">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          onClick={handleSeek}
          className="group h-2 w-full cursor-pointer rounded-full bg-surface-3 transition-colors hover:bg-surface-3/80"
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleKeep}
          className="rounded-card px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: '#2DD4A8' }}
        >
          Keep
        </button>
        <button
          onClick={() => setShowDiscardConfirm(true)}
          className="rounded-card px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: '#FF5A5F' }}
        >
          Discard
        </button>
        <div className="flex-1" />
        <button
          onClick={handleTranscribe}
          disabled={!recordingId}
          className="rounded-card border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Transcribe
        </button>
        <SplitButton
          label="Send to AI"
          onPrimaryClick={() => defaultProfile && handleSendToAi(defaultProfile.id, defaultProfile.name)}
          items={aiProfileItems}
          disabled={!recordingId}
        />
      </div>

      {/* Status message */}
      {transcribeStatus && (
        <p className={`mt-2 text-xs ${transcribeStatus.startsWith('Error') ? 'text-danger' : 'text-text-muted'}`}>
          {transcribeStatus}
        </p>
      )}

      {/* Discard Confirmation Modal */}
      <Modal
        isOpen={showDiscardConfirm}
        title="Discard Recording?"
        onClose={() => setShowDiscardConfirm(false)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setShowDiscardConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={() => {
                const id = recordingId;
                discardRecordingSession();
                if (id) deleteRecording(id);
                setShowDiscardConfirm(false);
              }}
            >
              Discard
            </button>
          </>
        }
      >
        <p>This recording and its audio will be permanently deleted. This cannot be undone.</p>
      </Modal>

      {/* Overwrite confirmation modal */}
      <Modal
        isOpen={overwriteConfirm !== null}
        title="Overwrite Existing Card?"
        onClose={() => setOverwriteConfirm(null)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setOverwriteConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={() => {
                if (overwriteConfirm) executeSendToAi(overwriteConfirm.profileId, overwriteConfirm.profileName);
                setOverwriteConfirm(null);
              }}
            >
              Overwrite
            </button>
          </>
        }
      >
        <p className="text-sm">
          A <strong>{overwriteConfirm?.profileName || 'Summary'}</strong> card already exists. This will regenerate and overwrite its content, including any action items.
        </p>
      </Modal>
    </div>
  );
}
