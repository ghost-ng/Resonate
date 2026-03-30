import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { formatTimestamp } from '../../lib/formatters';
import { useNotebookStore } from '../../stores/notebook.store';
import { useRecordingStore } from '../../stores/recording.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
import Dropdown from '../shared/Dropdown';
import type { DropdownItem } from '../shared/Dropdown';
import SplitButton from '../shared/SplitButton';
import type { SplitButtonItem } from '../shared/SplitButton';
import Modal from '../shared/Modal';

interface Props {
  audioPath: string;
  recordingId: number;
  durationSeconds?: number; // from DB — used as initial/fallback duration
  onStatusChange?: (message: string) => void;
}

export default function AudioPlayer({ audioPath, recordingId, durationSeconds, onStatusChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Initialize duration from DB if available
  const [duration, setDuration] = useState(durationSeconds ? durationSeconds * 1000 : 0);

  const audioSrc = `audio-file:///${audioPath.replace(/\\/g, '/')}`;

  // Try to get more accurate duration from the audio element
  const tryReadDuration = useCallback(() => {
    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  const setPlaybackTimeMs = useRecordingStore((s) => s.setPlaybackTimeMs);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const timeMs = audioRef.current.currentTime * 1000;
      setCurrentTime(timeMs);
      setPlaybackTimeMs(timeMs);
      if (audioRef.current.duration && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration * 1000);
      }
    }
  }, [setPlaybackTimeMs]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setPlaybackTimeMs(undefined);
    if (audioRef.current && audioRef.current.currentTime > 0) {
      setDuration(audioRef.current.currentTime * 1000);
    }
  }, [setPlaybackTimeMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', tryReadDuration);
    audio.addEventListener('durationchange', tryReadDuration);
    audio.addEventListener('canplaythrough', tryReadDuration);
    audio.addEventListener('ended', handleEnded);

    // Also try reading duration after a short delay (some browsers need time)
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
      audio.play().catch(() => {});
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

  // "Reassign" notebook dropdown
  const notebooks = useNotebookStore((s) => s.notebooks);
  const moveToNotebook = useRecordingStore((s) => s.moveToNotebook);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);

  const reassignItems = useMemo<DropdownItem[]>(() => {
    return notebooks.map((nb) => ({
      label: `${nb.icon} ${nb.name}`,
      action: () => {
        moveToNotebook(recordingId, nb.id);
        if (selectedNotebookId !== ALL_RECORDINGS_ID) {
          fetchRecordings(selectedNotebookId);
        }
      },
    }));
  }, [notebooks, recordingId, moveToNotebook, fetchRecordings, selectedNotebookId]);

  const [status, setStatus] = useState('');

  const handleTranscribe = async () => {
    setStatus('Transcribing...');
    try {
      await window.electronAPI.invoke('transcript:start', { recordingId });
      setStatus('Transcription complete');
      onStatusChange?.('transcribed');
    } catch (err: any) {
      const msg = err?.message || 'Transcription failed';
      setStatus(`Error: ${msg}`);
      console.error('Transcribe failed:', err);
    }
  };

  const addCard = useWorkspaceStore((s) => s.addCard);
  const findDuplicate = useWorkspaceStore((s) => s.findDuplicateCard);
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ profileId?: number; profileName?: string } | null>(null);

  const executeSendToAi = async (profileId?: number, profileName?: string) => {
    setStatus('Generating summary...');
    try {
      const name = profileName || 'Summary';
      await addCard(recordingId, 'summary', name, profileId);
      setStatus('Summary complete');
      onStatusChange?.('summarized');
      const ws = await import('../../stores/workspace.store');
      ws.useWorkspaceStore.getState().fetchCards(recordingId);
    } catch (err: any) {
      const msg = err?.message || 'Summary failed';
      setStatus(`Error: ${msg}`);
      console.error('Send to AI failed:', err);
    }
  };

  const handleSendToAi = async (profileId?: number, profileName?: string) => {
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
  const durationDisplay = duration > 0 ? formatTimestamp(duration) : '--:--';

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="mb-3">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
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
          <span className="font-mono text-sm text-text-muted">
            {formatTimestamp(currentTime)} / {durationDisplay}
          </span>
          <div className="flex-1" />
          <button
            onClick={handleTranscribe}
            className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3"
          >
            Transcribe
          </button>
          <SplitButton
            label="Send to AI"
            onPrimaryClick={() => defaultProfile && handleSendToAi(defaultProfile.id, defaultProfile.name)}
            items={aiProfileItems}
          />
          <Dropdown
            trigger={
              <button className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3">
                Reassign &#9662;
              </button>
            }
            items={reassignItems}
          />
        </div>
        <div
          onClick={handleSeek}
          className="h-1.5 w-full cursor-pointer rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status message / processing bar */}
      {status && (
        <div className="mt-2">
          {(status.includes('Transcribing') || status.includes('summary') || status.includes('Generating')) ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="animate-spin h-3 w-3 text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs font-medium text-accent">{status}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent animate-[indeterminate_1.5s_ease-in-out_infinite]"
                  style={{ width: '40%' }}
                />
              </div>
            </div>
          ) : (
            <p className={`text-xs ${status.startsWith('Error') ? 'text-danger' : 'text-text-muted'}`}>
              {status}
            </p>
          )}
        </div>
      )}
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
