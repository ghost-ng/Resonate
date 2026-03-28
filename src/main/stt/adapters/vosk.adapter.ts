import type { TranscriptSegment } from '../../../shared/types/stt.types';

export interface VoskWord {
  word: string;
  start: number;
  end: number;
  conf: number;
}

const PAUSE_GAP_MS = 500;

/**
 * Aggregate vosk word-level results into segments.
 * A new segment is started when the gap between the end of the previous
 * word and the start of the next exceeds PAUSE_GAP_MS milliseconds.
 */
export function aggregateVoskWords(
  words: VoskWord[],
  speaker: string = ''
): TranscriptSegment[] {
  if (!words || words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let currentWords: VoskWord[] = [words[0]];

  for (let i = 1; i < words.length; i++) {
    const prevEnd = currentWords[currentWords.length - 1].end * 1000;
    const nextStart = words[i].start * 1000;

    if (nextStart - prevEnd > PAUSE_GAP_MS) {
      segments.push(buildSegment(currentWords, speaker));
      currentWords = [words[i]];
    } else {
      currentWords.push(words[i]);
    }
  }

  // Flush remaining words
  if (currentWords.length > 0) {
    segments.push(buildSegment(currentWords, speaker));
  }

  return segments;
}

function buildSegment(words: VoskWord[], speaker: string): TranscriptSegment {
  const text = words.map((w) => w.word).join(' ');
  const avgConf =
    words.reduce((sum, w) => sum + w.conf, 0) / words.length;

  return {
    speaker,
    text,
    start_time_ms: Math.round(words[0].start * 1000),
    end_time_ms: Math.round(words[words.length - 1].end * 1000),
    confidence: avgConf,
  };
}
