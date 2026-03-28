import type { SettingsRepository } from '../db/repositories/settings.repo';
import type {
  SttEngine,
  SttEngineName,
  SttEngineConfig,
  TranscriptSegment,
} from '../../shared/types/stt.types';
import { SETTINGS_KEYS } from '../../shared/types/settings.types';
import { CloudEngine } from '../stt/engines/cloud.engine';
import { WhisperEngine } from '../stt/engines/whisper.engine';
import { VoskEngine } from '../stt/engines/vosk.engine';
import { SherpaEngine } from '../stt/engines/sherpa.engine';

export class SttRouterService {
  private engines: Map<SttEngineName, SttEngine>;

  constructor(private settingsRepo: SettingsRepository) {
    this.engines = new Map<SttEngineName, SttEngine>([
      ['cloud', new CloudEngine()],
      ['whisper', new WhisperEngine()],
      ['vosk', new VoskEngine()],
      ['sherpa', new SherpaEngine()],
    ]);
  }

  /**
   * Transcribe a stereo WAV file.
   *
   * The WAV is expected to be stereo: left channel = mic ("You"),
   * right channel = system audio ("Other").
   *
   * The router runs STT on each channel separately (by splitting the
   * interleaved stereo into two mono WAV files), then merges results
   * sorted by start_time_ms.
   */
  async transcribe(
    wavPath: string,
    engineOverride?: SttEngineName
  ): Promise<TranscriptSegment[]> {
    const engineName =
      engineOverride ??
      ((this.settingsRepo.get(SETTINGS_KEYS.STT_ENGINE) as SttEngineName) ??
        'cloud');

    const engine = this.engines.get(engineName);
    if (!engine) {
      throw new Error(`Unknown STT engine: ${engineName}`);
    }

    const config = this.buildConfig(engineName);

    // Run STT on the left channel (mic = "You") and right channel (system = "Other")
    const [leftSegments, rightSegments] = await Promise.all([
      engine.transcribe(wavPath + '.left.wav', config),
      engine.transcribe(wavPath + '.right.wav', config),
    ]);

    // Assign speakers
    const youSegments = leftSegments.map((seg) => ({
      ...seg,
      speaker: 'You',
    }));
    const otherSegments = rightSegments.map((seg) => ({
      ...seg,
      speaker: 'Other',
    }));

    // Merge and sort by start time
    const merged = [...youSegments, ...otherSegments].sort(
      (a, b) => a.start_time_ms - b.start_time_ms
    );

    return merged;
  }

  async getAvailableEngines(): Promise<
    { name: SttEngineName; available: boolean }[]
  > {
    const results: { name: SttEngineName; available: boolean }[] = [];

    for (const [name, engine] of this.engines) {
      const available = await engine.isAvailable();
      results.push({ name, available });
    }

    return results;
  }

  /**
   * Dispose all engines and release resources.
   */
  dispose(): void {
    for (const engine of this.engines.values()) {
      engine.dispose();
    }
  }

  private buildConfig(engineName: SttEngineName): SttEngineConfig {
    return {
      engine: engineName,
      modelPath: this.getModelPath(engineName),
      cloudEndpoint: this.settingsRepo.get(SETTINGS_KEYS.CLOUD_STT_ENDPOINT),
      cloudApiKey: this.settingsRepo.get(SETTINGS_KEYS.CLOUD_STT_API_KEY),
      cloudModel: this.settingsRepo.get(SETTINGS_KEYS.CLOUD_STT_MODEL),
    };
  }

  private getModelPath(engineName: SttEngineName): string | undefined {
    switch (engineName) {
      case 'whisper':
        return this.settingsRepo.get(SETTINGS_KEYS.WHISPER_MODEL_PATH);
      case 'vosk':
        return this.settingsRepo.get(SETTINGS_KEYS.VOSK_MODEL_PATH);
      case 'sherpa':
        return this.settingsRepo.get(SETTINGS_KEYS.SHERPA_MODEL_PATH);
      default:
        return undefined;
    }
  }
}
