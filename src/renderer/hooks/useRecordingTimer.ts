import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/session.store';

/**
 * Ticks every 100ms while recording is active, updating durationMs in the session store.
 */
export function useRecordingTimer() {
  const isRecording = useSessionStore((s) => s.isRecording);
  const setDurationMs = useSessionStore((s) => s.setDurationMs);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording) return;

    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      setDurationMs(elapsed);
    };

    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isRecording, setDurationMs]);
}
