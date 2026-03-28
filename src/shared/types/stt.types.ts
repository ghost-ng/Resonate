export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

export type SttEngineName = 'whisper' | 'vosk' | 'sherpa' | 'cloud';

export interface SttEngineConfig {
  engine: SttEngineName;
  modelPath?: string;
  cloudEndpoint?: string;
  cloudApiKey?: string;
  cloudModel?: string;
  language?: string;
}

export interface SttEngine {
  name: SttEngineName;
  transcribe(wavPath: string, config: SttEngineConfig): Promise<TranscriptSegment[]>;
  isAvailable(): Promise<boolean>;
  dispose(): void;
}

export type WorkerRequest =
  | { type: 'transcribe'; id: string; wavPath: string; config: SttEngineConfig }
  | { type: 'dispose' };

export type WorkerResponse =
  | { type: 'result'; id: string; segments: TranscriptSegment[] }
  | { type: 'progress'; id: string; percent: number }
  | { type: 'error'; id: string; message: string };
