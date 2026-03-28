import type { TranscriptSegment } from '../../../shared/types/stt.types';

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

/**
 * Normalize whisper.cpp output into TranscriptSegment[].
 * whisper.cpp reports times in seconds (float).
 */
export function normalizeWhisperOutput(
  segments: WhisperSegment[],
  speaker: string = ''
): TranscriptSegment[] {
  if (!segments || !Array.isArray(segments)) {
    return [];
  }

  return segments.map((seg) => ({
    speaker,
    text: seg.text.trim(),
    start_time_ms: Math.round(seg.start * 1000),
    end_time_ms: Math.round(seg.end * 1000),
    confidence: seg.confidence ?? 0.5,
  }));
}
