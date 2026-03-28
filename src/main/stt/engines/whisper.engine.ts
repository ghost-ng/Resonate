import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { app } from 'electron';
import type { SttEngine, SttEngineConfig, TranscriptSegment } from '../../../shared/types/stt.types';

const WHISPER_DIR = () => path.join(app.getPath('userData'), 'whisper');
const WHISPER_EXE = () => path.join(WHISPER_DIR(), 'main.exe');
const DEFAULT_MODEL = () => path.join(WHISPER_DIR(), 'models', 'ggml-base.en.bin');

export class WhisperEngine implements SttEngine {
  readonly name = 'whisper' as const;

  async transcribe(wavPath: string, config: SttEngineConfig): Promise<TranscriptSegment[]> {
    const exePath = WHISPER_EXE();
    const modelPath = config.modelPath || DEFAULT_MODEL();

    if (!fs.existsSync(exePath)) {
      throw new Error(`whisper.cpp not found. Please download it via Settings → STT Engine → Download Whisper.`);
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Whisper model not found at ${modelPath}. Please download via Settings.`);
    }

    console.log(`[Whisper] Transcribing: ${wavPath}`);
    console.log(`[Whisper] Model: ${modelPath}`);

    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-f', wavPath,
        '-l', config.language || 'en',
        '-t', '2',
        '-oj',
        '--no-prints',
      ];

      execFile(exePath, args, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[Whisper] Error:', err.message);
          if (stderr) console.error('[Whisper] stderr:', stderr);
          reject(new Error(`Whisper failed: ${err.message}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          const segments: TranscriptSegment[] = (result.transcription || []).map((seg: any) => ({
            speaker: 'Speaker',
            text: (seg.text || '').trim(),
            start_time_ms: seg.offsets?.from ?? 0,
            end_time_ms: seg.offsets?.to ?? 0,
            confidence: 0.9,
          }));
          console.log(`[Whisper] Got ${segments.length} segments`);
          resolve(segments);
        } catch {
          // Fallback: return raw text as single segment
          const text = stdout.trim();
          if (text) {
            resolve([{ speaker: 'Speaker', text, start_time_ms: 0, end_time_ms: 0, confidence: 0.8 }]);
          } else {
            reject(new Error('Whisper returned empty output'));
          }
        }
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    return fs.existsSync(WHISPER_EXE());
  }

  dispose(): void {}
}
