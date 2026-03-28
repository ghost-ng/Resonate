import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  SttEngine,
  SttEngineName,
  SttEngineConfig,
  TranscriptSegment,
} from '../../../src/shared/types/stt.types';
import {
  normalizeCloudResponse,
  type CloudApiResponse,
} from '../../../src/main/stt/adapters/cloud.adapter';
import {
  aggregateVoskWords,
  type VoskWord,
} from '../../../src/main/stt/adapters/vosk.adapter';
import { normalizeWhisperOutput } from '../../../src/main/stt/adapters/whisper.adapter';
import { normalizeSherpaOutput } from '../../../src/main/stt/adapters/sherpa.adapter';

// ---------------------------------------------------------------------------
// Mock SettingsRepository
// ---------------------------------------------------------------------------
function createMockSettingsRepo(settings: Record<string, string> = {}) {
  return {
    get: vi.fn((key: string) => settings[key]),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  };
}

// ---------------------------------------------------------------------------
// Mock SttEngine
// ---------------------------------------------------------------------------
function createMockEngine(
  name: SttEngineName,
  segments: TranscriptSegment[],
  available = true
): SttEngine {
  return {
    name,
    transcribe: vi.fn(async () => segments),
    isAvailable: vi.fn(async () => available),
    dispose: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// SttRouterService — we test by injecting mock engines
// ---------------------------------------------------------------------------

// We import the class but replace the engines map after construction.
import { SttRouterService } from '../../../src/main/services/stt-router.service';

describe('SttRouterService', () => {
  let router: SttRouterService;
  let mockCloud: SttEngine;
  let mockWhisper: SttEngine;

  const leftSegments: TranscriptSegment[] = [
    { speaker: '', text: 'Hello from mic', start_time_ms: 0, end_time_ms: 2000, confidence: 0.9 },
    { speaker: '', text: 'More mic audio', start_time_ms: 5000, end_time_ms: 7000, confidence: 0.85 },
  ];

  const rightSegments: TranscriptSegment[] = [
    { speaker: '', text: 'Hello from system', start_time_ms: 1000, end_time_ms: 3000, confidence: 0.88 },
    { speaker: '', text: 'System goodbye', start_time_ms: 8000, end_time_ms: 10000, confidence: 0.92 },
  ];

  beforeEach(() => {
    mockCloud = createMockEngine('cloud', []);
    mockWhisper = createMockEngine('whisper', []);

    // Override transcribe to return different segments based on the path
    (mockCloud.transcribe as ReturnType<typeof vi.fn>).mockImplementation(
      async (wavPath: string) => {
        if (wavPath.endsWith('.left.wav')) return leftSegments;
        if (wavPath.endsWith('.right.wav')) return rightSegments;
        return [];
      }
    );

    (mockWhisper.transcribe as ReturnType<typeof vi.fn>).mockImplementation(
      async (wavPath: string) => {
        if (wavPath.endsWith('.left.wav'))
          return [{ speaker: '', text: 'Whisper left', start_time_ms: 0, end_time_ms: 1000, confidence: 0.9 }];
        if (wavPath.endsWith('.right.wav'))
          return [{ speaker: '', text: 'Whisper right', start_time_ms: 500, end_time_ms: 1500, confidence: 0.8 }];
        return [];
      }
    );

    const settingsRepo = createMockSettingsRepo({ stt_engine: 'cloud' });
    router = new SttRouterService(settingsRepo as never);

    // Inject mock engines
    const enginesMap = (router as unknown as { engines: Map<SttEngineName, SttEngine> }).engines;
    enginesMap.set('cloud', mockCloud);
    enginesMap.set('whisper', mockWhisper);
  });

  it('dispatches to the engine from settings', async () => {
    const result = await router.transcribe('/path/to/audio.wav');

    expect(mockCloud.transcribe).toHaveBeenCalledTimes(2);
    expect(mockWhisper.transcribe).not.toHaveBeenCalled();
    expect(result.length).toBe(4);
  });

  it('dispatches to the overridden engine', async () => {
    const result = await router.transcribe('/path/to/audio.wav', 'whisper');

    expect(mockWhisper.transcribe).toHaveBeenCalledTimes(2);
    expect(mockCloud.transcribe).not.toHaveBeenCalled();
    expect(result.length).toBe(2);
  });

  it('assigns "You" speaker to left channel and "Other" to right channel', async () => {
    const result = await router.transcribe('/path/to/audio.wav');

    const youSegments = result.filter((s) => s.speaker === 'You');
    const otherSegments = result.filter((s) => s.speaker === 'Other');

    expect(youSegments.length).toBe(2);
    expect(otherSegments.length).toBe(2);
    expect(youSegments[0].text).toBe('Hello from mic');
    expect(otherSegments[0].text).toBe('Hello from system');
  });

  it('merges segments sorted by start_time_ms', async () => {
    const result = await router.transcribe('/path/to/audio.wav');

    for (let i = 1; i < result.length; i++) {
      expect(result[i].start_time_ms).toBeGreaterThanOrEqual(
        result[i - 1].start_time_ms
      );
    }

    // Verify exact ordering: 0, 1000, 5000, 8000
    expect(result.map((s) => s.start_time_ms)).toEqual([0, 1000, 5000, 8000]);
  });

  it('throws for unknown engine', async () => {
    await expect(
      router.transcribe('/path/to/audio.wav', 'nonexistent' as SttEngineName)
    ).rejects.toThrow('Unknown STT engine: nonexistent');
  });

  it('getAvailableEngines reports availability', async () => {
    const engines = await router.getAvailableEngines();

    // cloud is available (mock), whisper is available (mock), vosk and sherpa
    // have real engines that call require.resolve so they'll be unavailable
    const cloudEntry = engines.find((e) => e.name === 'cloud');
    expect(cloudEntry).toBeDefined();
    expect(cloudEntry!.available).toBe(true);
  });

  it('dispose calls dispose on all engines', () => {
    router.dispose();
    expect(mockCloud.dispose).toHaveBeenCalled();
    expect(mockWhisper.dispose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cloud Adapter
// ---------------------------------------------------------------------------
describe('Cloud Adapter - normalizeCloudResponse', () => {
  it('converts seconds to milliseconds', () => {
    const response: CloudApiResponse = {
      segments: [
        { start: 0.0, end: 4.5, text: 'Hello world' },
      ],
    };

    const result = normalizeCloudResponse(response, 'You');

    expect(result).toHaveLength(1);
    expect(result[0].start_time_ms).toBe(0);
    expect(result[0].end_time_ms).toBe(4500);
    expect(result[0].speaker).toBe('You');
    expect(result[0].text).toBe('Hello world');
  });

  it('converts avg_logprob to confidence', () => {
    const response: CloudApiResponse = {
      segments: [
        { start: 0.0, end: 1.0, text: 'test', avg_logprob: -0.23 },
      ],
    };

    const result = normalizeCloudResponse(response);
    // Math.exp(-0.23) ≈ 0.7945
    expect(result[0].confidence).toBeCloseTo(0.7945, 3);
  });

  it('uses 0.5 confidence when avg_logprob is missing', () => {
    const response: CloudApiResponse = {
      segments: [{ start: 0.0, end: 1.0, text: 'test' }],
    };

    const result = normalizeCloudResponse(response);
    expect(result[0].confidence).toBe(0.5);
  });

  it('handles empty segments array', () => {
    const result = normalizeCloudResponse({ segments: [] });
    expect(result).toEqual([]);
  });

  it('handles missing segments property', () => {
    const result = normalizeCloudResponse({} as CloudApiResponse);
    expect(result).toEqual([]);
  });

  it('trims whitespace from text', () => {
    const response: CloudApiResponse = {
      segments: [{ start: 0.0, end: 1.0, text: '  hello  ' }],
    };

    const result = normalizeCloudResponse(response);
    expect(result[0].text).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// Vosk Adapter
// ---------------------------------------------------------------------------
describe('Vosk Adapter - aggregateVoskWords', () => {
  it('aggregates words into a single segment when no pauses', () => {
    const words: VoskWord[] = [
      { word: 'hello', start: 0.0, end: 0.3, conf: 0.9 },
      { word: 'world', start: 0.35, end: 0.7, conf: 0.85 },
      { word: 'test', start: 0.75, end: 1.0, conf: 0.8 },
    ];

    const result = aggregateVoskWords(words, 'You');

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('hello world test');
    expect(result[0].start_time_ms).toBe(0);
    expect(result[0].end_time_ms).toBe(1000);
    expect(result[0].speaker).toBe('You');
  });

  it('splits segments on 500ms+ gaps', () => {
    const words: VoskWord[] = [
      { word: 'hello', start: 0.0, end: 0.3, conf: 0.9 },
      { word: 'world', start: 0.35, end: 0.7, conf: 0.85 },
      // 800ms gap here (0.7 to 1.5)
      { word: 'new', start: 1.5, end: 1.8, conf: 0.8 },
      { word: 'segment', start: 1.85, end: 2.2, conf: 0.75 },
    ];

    const result = aggregateVoskWords(words);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('hello world');
    expect(result[0].start_time_ms).toBe(0);
    expect(result[0].end_time_ms).toBe(700);
    expect(result[1].text).toBe('new segment');
    expect(result[1].start_time_ms).toBe(1500);
    expect(result[1].end_time_ms).toBe(2200);
  });

  it('averages confidence across words in a segment', () => {
    const words: VoskWord[] = [
      { word: 'a', start: 0.0, end: 0.1, conf: 0.8 },
      { word: 'b', start: 0.15, end: 0.2, conf: 0.6 },
    ];

    const result = aggregateVoskWords(words);
    expect(result[0].confidence).toBeCloseTo(0.7, 5);
  });

  it('returns empty array for empty input', () => {
    expect(aggregateVoskWords([])).toEqual([]);
    expect(aggregateVoskWords(null as unknown as VoskWord[])).toEqual([]);
  });

  it('handles single word', () => {
    const words: VoskWord[] = [
      { word: 'solo', start: 1.0, end: 1.5, conf: 0.95 },
    ];

    const result = aggregateVoskWords(words);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('solo');
    expect(result[0].start_time_ms).toBe(1000);
    expect(result[0].end_time_ms).toBe(1500);
    expect(result[0].confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// Whisper Adapter
// ---------------------------------------------------------------------------
describe('Whisper Adapter - normalizeWhisperOutput', () => {
  it('converts seconds to milliseconds', () => {
    const result = normalizeWhisperOutput(
      [{ start: 1.5, end: 3.0, text: 'hello', confidence: 0.9 }],
      'You'
    );

    expect(result).toHaveLength(1);
    expect(result[0].start_time_ms).toBe(1500);
    expect(result[0].end_time_ms).toBe(3000);
    expect(result[0].confidence).toBe(0.9);
    expect(result[0].speaker).toBe('You');
  });

  it('defaults confidence to 0.5 when missing', () => {
    const result = normalizeWhisperOutput([{ start: 0, end: 1, text: 'hi' }]);
    expect(result[0].confidence).toBe(0.5);
  });

  it('returns empty for null input', () => {
    expect(normalizeWhisperOutput(null as unknown as [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Sherpa Adapter
// ---------------------------------------------------------------------------
describe('Sherpa Adapter - normalizeSherpaOutput', () => {
  it('converts seconds to milliseconds', () => {
    const result = normalizeSherpaOutput(
      [{ start: 2.0, end: 4.0, text: 'test', confidence: 0.85 }],
      'Other'
    );

    expect(result).toHaveLength(1);
    expect(result[0].start_time_ms).toBe(2000);
    expect(result[0].end_time_ms).toBe(4000);
    expect(result[0].speaker).toBe('Other');
  });

  it('returns empty for empty array', () => {
    expect(normalizeSherpaOutput([])).toEqual([]);
  });
});
