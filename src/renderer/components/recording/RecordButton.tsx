import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { formatDuration } from '../../lib/formatters';

export default function RecordButton() {
  const isRecording = useSessionStore((s) => s.isRecording);
  const durationMs = useSessionStore((s) => s.durationMs);
  const startRecording = useSessionStore((s) => s.startRecording);
  const stopRecording = useSessionStore((s) => s.stopRecording);
  const setDurationMs = useSessionStore((s) => s.setDurationMs);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, setDurationMs]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (isRecording) {
    return (
      <button
        onClick={handleClick}
        className="group relative flex items-center gap-3 rounded-full border-2 border-recording/60 bg-recording/10 px-5 py-2.5 transition-all hover:border-recording hover:bg-recording/20"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full border-2 border-recording/40 animate-recording-ring" />
        {/* Blinking dot */}
        <span className="h-3 w-3 rounded-full bg-recording animate-pulse-recording" />
        <span className="font-mono text-md font-medium text-recording">
          {formatDuration(durationMs)}
        </span>
        <span className="text-sm text-recording/80">Stop Recording</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-full bg-recording px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-recording/90 hover:shadow-[0_0_20px_rgba(255,59,59,0.3)]"
    >
      <span className="h-3 w-3 rounded-full bg-white/90" />
      Record
    </button>
  );
}
