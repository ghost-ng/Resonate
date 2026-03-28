import { useRef, useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { useRecordingStore } from '../../stores/recording.store';
import { formatTimestamp } from '../../lib/formatters';

export default function PostRecordingControls() {
  const audioPath = useSessionStore((s) => s.lastRecordingAudioPath);
  const recordingId = useSessionStore((s) => s.lastRecordingId);
  const keepRecordingSession = useSessionStore((s) => s.keepRecording);
  const discardRecording = useSessionStore((s) => s.discardRecording);
  const openTab = useRecordingStore((s) => s.openTab);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);

  const handleKeep = useCallback(() => {
    const id = recordingId;
    keepRecordingSession();
    if (id) {
      fetchRecordings();
      openTab(id);
    }
  }, [recordingId, keepRecordingSession, fetchRecordings, openTab]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

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

  const handleTranscribe = async () => {
    if (!recordingId) return;
    try {
      await window.electronAPI.invoke('transcript:start', { recordingId });
    } catch {
      // IPC not available
    }
  };

  const handleSendToAi = async () => {
    if (!recordingId) return;
    try {
      await window.electronAPI.invoke('summary:generate', { recordingId });
    } catch {
      // IPC not available
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
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
          style={{ backgroundColor: '#00c853' }}
        >
          Keep
        </button>
        <button
          onClick={discardRecording}
          className="rounded-card px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: '#ff5252' }}
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
        <button
          onClick={handleSendToAi}
          disabled={!recordingId}
          className="rounded-card border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send to AI
        </button>
      </div>
    </div>
  );
}
