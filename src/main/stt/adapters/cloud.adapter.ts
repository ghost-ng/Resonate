import type { TranscriptSegment } from '../../../shared/types/stt.types';

export interface CloudApiSegment {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

export interface CloudApiResponse {
  segments: CloudApiSegment[];
}

/**
 * Convert a log-probability value to a 0-1 confidence score.
 * avg_logprob is typically in the range [-1, 0]; we clamp and
 * apply Math.exp to get a probability-like value.
 */
function logprobToConfidence(avgLogprob: number | undefined): number {
  if (avgLogprob === undefined || avgLogprob === null) return 0.5;
  const clamped = Math.max(-1, Math.min(0, avgLogprob));
  return Math.exp(clamped);
}

export function normalizeCloudResponse(
  response: CloudApiResponse,
  speaker: string = ''
): TranscriptSegment[] {
  if (!response.segments || !Array.isArray(response.segments)) {
    return [];
  }

  return response.segments.map((seg) => ({
    speaker,
    text: seg.text.trim(),
    start_time_ms: Math.round(seg.start * 1000),
    end_time_ms: Math.round(seg.end * 1000),
    confidence: logprobToConfidence(seg.avg_logprob),
  }));
}
