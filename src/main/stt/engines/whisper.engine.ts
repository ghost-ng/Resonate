import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { app } from 'electron';
import type { SttEngine, SttEngineConfig, TranscriptSegment } from '../../../shared/types/stt.types';

/**
 * Resolve whisper directory — check bundled location first, then userData (downloaded).
 */
const WHISPER_DIR = () => {
  // Bundled: packaged app puts extraResources next to asar
  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, 'whisper')
    : path.join(app.getAppPath(), 'resources', 'whisper');

  if (fs.existsSync(path.join(bundled, 'whisper-cli.exe')) ||
      fs.existsSync(path.join(bundled, 'Release', 'whisper-cli.exe'))) {
    return bundled;
  }

  // Fallback: downloaded to userData (legacy / auto-download path)
  return path.join(app.getPath('userData'), 'whisper');
};

const WHISPER_EXE = () => {
  const dir = WHISPER_DIR();
  // Support both flat layout (bundled) and Release/ subfolder (downloaded)
  const flat = path.join(dir, 'whisper-cli.exe');
  if (fs.existsSync(flat)) return flat;
  return path.join(dir, 'Release', 'whisper-cli.exe');
};

const DEFAULT_MODEL = () => path.join(WHISPER_DIR(), 'models', 'ggml-base.en.bin');

/** Reassemble split model parts if the full model doesn't exist yet. */
function ensureModel(modelPath: string): void {
  if (fs.existsSync(modelPath)) return;
  const dir = path.dirname(modelPath);
  const prefix = path.basename(modelPath) + '.part_';
  const parts = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.startsWith(prefix)).sort()
    : [];
  if (parts.length === 0) return;

  console.log(`[Whisper] Reassembling ${parts.length} model parts...`);
  const fd = fs.openSync(modelPath, 'w');
  for (const part of parts) {
    fs.writeSync(fd, fs.readFileSync(path.join(dir, part)));
  }
  fs.closeSync(fd);
  console.log(`[Whisper] Model reassembled: ${(fs.statSync(modelPath).size / 1048576).toFixed(1)} MB`);
}

export class WhisperEngine implements SttEngine {
  readonly name = 'whisper' as const;

  async transcribe(wavPath: string, config: SttEngineConfig): Promise<TranscriptSegment[]> {
    const exePath = WHISPER_EXE();
    const modelPath = config.modelPath || DEFAULT_MODEL();

    // Reassemble model from split parts if needed
    ensureModel(modelPath);

    if (!fs.existsSync(exePath)) {
      throw new Error(`whisper-cli.exe not found at ${exePath}. Place whisper-cli.exe in resources/whisper/.`);
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
        // '--tinydiarize',       // disabled: produces too many false speaker turns — needs tuning
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
          // Post-process segments — detect speaker turns and cycle through speakers.
          // Whisper outputs ">>" prefixes or [SPEAKER_TURN] tokens to indicate
          // a speaker change. We cycle through Speaker 1..N on each turn.
          //
          // Since whisper can't identify WHO is speaking (only WHEN turns happen),
          // we default to 2 speakers. The participant_count from the recording
          // is used as a hint if available, otherwise we estimate from turn frequency.
          const rawSegments = result.transcription || [];

          // Count turn markers to estimate speaker count
          let turnCount = 0;
          for (const seg of rawSegments) {
            const t = (seg.text || '').trim();
            if (t.includes('[SPEAKER_TURN]') || /^>>/.test(t) || seg.speaker_turn === true) {
              turnCount++;
            }
          }

          // Heuristic: if very few turns relative to segments, likely 1 speaker.
          // Otherwise default to 2. Users can adjust via speaker rename UI.
          const estimatedSpeakers = turnCount === 0 ? 1 : 2;

          let currentSpeaker = 1;
          const numSpeakers = estimatedSpeakers;
          const segments: TranscriptSegment[] = rawSegments.map((seg: any) => {
            let text = (seg.text || '').trim();

            // Detect speaker turn markers
            const hasTurn = text.includes('[SPEAKER_TURN]')
              || /^>>/.test(text)
              || seg.speaker_turn === true;

            if (hasTurn) {
              // Cycle to next speaker: 1→2→...→N→1
              currentSpeaker = (currentSpeaker % numSpeakers) + 1;
            }

            // Strip all turn markers from text
            text = text
              .replace(/\[SPEAKER_TURN\]/g, '')
              .replace(/^>>\s*/gm, '')
              .trim();

            return {
              speaker: `Speaker ${currentSpeaker}`,
              text,
              start_time_ms: seg.offsets?.from ?? 0,
              end_time_ms: seg.offsets?.to ?? 0,
              confidence: 0.9,
            };
          });
          console.log(`[Whisper] Got ${segments.length} segments, ${turnCount} turns, ${numSpeakers} estimated speaker(s)`);

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
