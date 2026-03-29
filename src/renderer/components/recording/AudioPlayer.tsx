import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { formatTimestamp } from '../../lib/formatters';
import { useNotebookStore } from '../../stores/notebook.store';
import { useRecordingStore } from '../../stores/recording.store';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
import Dropdown from '../shared/Dropdown';
import type { DropdownItem } from '../shared/Dropdown';

interface Props {
  audioPath: string;
  recordingId: number;
  onStatusChange?: (message: string) => void;
}

export default function AudioPlayer({ audioPath, recordingId, onStatusChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioSrc = `audio-file:///${audioPath.replace(/\\/g, '/')}`;

  const tryReadDuration = useCallback(() => {
    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
      if (duration === 0) tryReadDuration();
    }
  }, [duration, tryReadDuration]);

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
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', tryReadDuration);
      audio.removeEventListener('durationchange', tryReadDuration);
      audio.removeEventListener('ended', handleEnded);
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

  // "Send to" notebook dropdown
  const notebooks = useNotebookStore((s) => s.notebooks);
  const moveToNotebook = useRecordingStore((s) => s.moveToNotebook);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const selectedNotebookId = useNotebookStore((s) => s.selectedNotebookId);

  const sendToItems = useMemo<DropdownItem[]>(() => {
    const items: DropdownItem[] = notebooks.map((nb) => ({
      label: `${nb.icon} ${nb.name}`,
      action: () => {
        moveToNotebook(recordingId, nb.id);
        if (selectedNotebookId !== ALL_RECORDINGS_ID) {
          fetchRecordings(selectedNotebookId);
        }
      },
    }));
    if (items.length > 0) {
      items.push({ label: '', action: () => {}, separator: true });
    }
    items.push({
      label: 'Copy (same as move)',
      action: () => {
        if (notebooks.length > 0) {
          moveToNotebook(recordingId, notebooks[0].id);
        }
      },
    });
    return items;
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

  const handleSendToAi = async () => {
    setStatus('Generating summary...');
    try {
      await window.electronAPI.invoke('summary:generate', { recordingId });
      setStatus('Summary complete');
      onStatusChange?.('summarized');
    } catch (err: any) {
      const msg = err?.message || 'Summary failed';
      setStatus(`Error: ${msg}`);
      console.error('Send to AI failed:', err);
    }
  };

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
          <button
            onClick={handleSendToAi}
            className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3"
          >
            Send to AI
          </button>
          <Dropdown
            trigger={
              <button className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3">
                Send to &#9662;
              </button>
            }
            items={sendToItems}
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

      {/* Status message */}
      {status && (
        <p className={`mt-2 text-xs ${status.startsWith('Error') ? 'text-danger' : 'text-text-muted'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
