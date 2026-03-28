import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { app } from 'electron';
import type { SttEngine, SttEngineConfig, TranscriptSegment } from '../../../shared/types/stt.types';

const WHISPER_DIR = () => path.join(app.getPath('userData'), 'whisper');
const WHISPER_EXE = () => path.join(WHISPER_DIR(), 'Release', 'whisper-cli.exe');
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

    // whisper-cli outputs JSON to a file, not stdout
    const outputBase = wavPath.replace(/\.wav$/i, '');
    const jsonPath = outputBase + '.json';

    // Clean up any previous output
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-f', wavPath,
        '-l', config.language || 'en',
        '-t', '2',
        '-oj',                    // output JSON file
        '-of', outputBase,        // output file base name (adds .json)
        '-np',                    // no prints except results
      ];

      console.log(`[Whisper] Running: ${exePath} ${args.join(' ')}`);

      execFile(exePath, args, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[Whisper] Error:', err.message);
          if (stderr) console.error('[Whisper] stderr:', stderr);
          reject(new Error(`Whisper failed: ${err.message}`));
          return;
        }

        // Read the JSON output file
        if (!fs.existsSync(jsonPath)) {
          // Try stdout as fallback
          const text = stdout.trim();
          if (text) {
            console.log('[Whisper] No JSON file, using stdout');
            resolve([{ speaker: 'Speaker', text, start_time_ms: 0, end_time_ms: 0, confidence: 0.8 }]);
          } else {
            reject(new Error('Whisper produced no output'));
          }
          return;
        }

        try {
          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          const result = JSON.parse(jsonContent);
          const segments: TranscriptSegment[] = (result.transcription || []).map((seg: any) => ({
            speaker: 'Speaker',
            text: (seg.text || '').trim(),
            start_time_ms: seg.offsets?.from ?? 0,
            end_time_ms: seg.offsets?.to ?? 0,
            confidence: 0.9,
          }));
          console.log(`[Whisper] Got ${segments.length} segments`);

          // Clean up JSON file
          try { fs.unlinkSync(jsonPath); } catch { /* ignore */ }

          resolve(segments);
        } catch (parseErr) {
          reject(new Error(`Failed to parse Whisper output: ${parseErr}`));
        }
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    return fs.existsSync(WHISPER_EXE());
  }

  dispose(): void {}
}
