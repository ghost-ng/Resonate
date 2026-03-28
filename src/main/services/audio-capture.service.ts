import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { WavWriter } from './wav-writer.service';
import type { AudioDeviceInfo } from '../../shared/types/ipc.types';

/** Audio level event payload for VU meters */
export interface AudioLevels {
  mic: number;    // 0..1 RMS
  system: number; // 0..1 RMS
}

type AudioLevelsCallback = (levels: AudioLevels) => void;

/**
 * Which backend is actually being used for audio capture.
 * Reported in logs so developers know what to expect.
 */
type CaptureBackend = 'native-recorder' | 'stub';

// ---------------------------------------------------------------------------
// Native recorder abstraction
// ---------------------------------------------------------------------------

interface CaptureStream {
  stop(): void;
  onData(cb: (data: Float32Array) => void): void;
}

// Real native-recorder-nodejs types
interface NativeAudioRecorder {
  start(config: { deviceType: 'input' | 'output'; deviceId: string }): Promise<void>;
  stop(): Promise<void>;
  on(event: 'data', cb: (data: Buffer) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  removeAllListeners(): void;
}

interface NativeRecorderModule {
  AudioRecorder: {
    new (): NativeAudioRecorder;
    getDevices(type?: 'input' | 'output'): Array<{ id: string; name: string; type: string; isDefault: boolean }>;
    getDeviceFormat(deviceId: string): { sampleRate: number; channels: number; bitDepth: number };
    checkPermission(): { mic: boolean; system: boolean };
  };
  SYSTEM_AUDIO_DEVICE_ID: string;
}

// ---------------------------------------------------------------------------
// Attempt to load native-recorder-nodejs
// ---------------------------------------------------------------------------

function tryLoadNativeRecorder(): NativeRecorderModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('native-recorder-nodejs');
    if (mod.AudioRecorder && typeof mod.AudioRecorder === 'function') {
      console.log('[AudioCapture] native-recorder-nodejs loaded successfully');
      return mod as NativeRecorderModule;
    }
  } catch {
    // expected on systems where the native addon cannot build
  }
  console.log(
    '[AudioCapture] native-recorder-nodejs not available — using stub backend'
  );
  return null;
}

/** Wraps a native AudioRecorder instance as a CaptureStream */
class NativeStream implements CaptureStream {
  private recorder: NativeAudioRecorder;
  private dataCb: ((data: Float32Array) => void) | null = null;

  constructor(
    private nativeMod: NativeRecorderModule,
    private deviceType: 'input' | 'output',
    private deviceId: string,
  ) {
    this.recorder = new nativeMod.AudioRecorder();
  }

  async start(): Promise<void> {
    this.recorder.on('data', (buffer: Buffer) => {
      if (this.dataCb) {
        // native-recorder-nodejs emits 16-bit PCM as Buffer
        // Convert to Float32Array for our pipeline
        const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }
        this.dataCb(float32);
      }
    });
    this.recorder.on('error', (err) => {
      console.error(`[AudioCapture] Stream error (${this.deviceType}):`, err);
    });
    await this.recorder.start({ deviceType: this.deviceType, deviceId: this.deviceId });
  }

  stop(): void {
    this.recorder.stop().catch((err) => {
      console.error('[AudioCapture] Error stopping stream:', err);
    });
    this.recorder.removeAllListeners();
  }

  onData(cb: (data: Float32Array) => void): void {
    this.dataCb = cb;
  }
}

// ---------------------------------------------------------------------------
// Stub backend — generates silence for dev / testing
// ---------------------------------------------------------------------------

class StubStream implements CaptureStream {
  private timer: ReturnType<typeof setInterval> | null = null;
  private dataCb: ((data: Float32Array) => void) | null = null;

  /** Emit ~50 ms chunks at the given sample rate */
  constructor(private sampleRate: number = 16000) {}

  start(): void {
    const samplesPerChunk = Math.floor(this.sampleRate * 0.05); // 50 ms
    this.timer = setInterval(() => {
      if (this.dataCb) {
        // Generate very quiet white noise so VU meters show *something*
        const buf = new Float32Array(samplesPerChunk);
        for (let i = 0; i < samplesPerChunk; i++) {
          buf[i] = (Math.random() - 0.5) * 0.01; // ~-40 dBFS
        }
        this.dataCb(buf);
      }
    }, 50);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onData(cb: (data: Float32Array) => void): void {
    this.dataCb = cb;
  }
}

// ---------------------------------------------------------------------------
// AudioCaptureService
// ---------------------------------------------------------------------------

export class AudioCaptureService {
  private recording = false;
  private wavWriter: WavWriter | null = null;
  private startTime = 0;
  private audioFilePath = '';
  private levelCallbacks: AudioLevelsCallback[] = [];
  private backend: CaptureBackend;
  private nativeRecorder: NativeRecorderModule | null;

  // Active streams (native or stub)
  private micStream: CaptureStream | null = null;
  private systemStream: CaptureStream | null = null;

  // Buffers for aligning mic and system chunks before writing
  private micBuffer: Float32Array = new Float32Array(0);
  private systemBuffer: Float32Array = new Float32Array(0);

  /** Target sample rate for the output WAV */
  private readonly targetSampleRate = 16000;

  /**
   * If the native recorder provides audio at a different rate we will
   * downsample. For the stub backend we already emit at targetSampleRate.
   */
  private sourceSampleRate = 16000;

  constructor(private storagePath?: string) {
    this.nativeRecorder = tryLoadNativeRecorder();
    this.backend = this.nativeRecorder ? 'native-recorder' : 'stub';
  }

  // ---- public API ----------------------------------------------------------

  async startRecording(recordingId: number): Promise<void> {
    if (this.recording) {
      console.warn('[AudioCapture] Already recording — ignoring duplicate start');
      return;
    }

    const dir = this.getStorageDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = Date.now();
    this.audioFilePath = path.join(dir, `recording_${recordingId}_${timestamp}.wav`);

    this.wavWriter = new WavWriter(this.audioFilePath, this.targetSampleRate, 2, 16);
    this.wavWriter.writeHeader();

    this.micBuffer = new Float32Array(0);
    this.systemBuffer = new Float32Array(0);
    this.startTime = Date.now();
    this.recording = true;

    if (this.backend === 'native-recorder' && this.nativeRecorder) {
      await this.startNativeCapture();
    } else {
      this.startStubCapture();
    }

    console.log(
      `[AudioCapture] Recording started (backend=${this.backend}, id=${recordingId}, file=${this.audioFilePath})`
    );
  }

  async stopRecording(): Promise<{ durationSeconds: number; audioFilePath: string }> {
    if (!this.recording) {
      throw new Error('Not recording');
    }

    // Stop streams
    this.micStream?.stop();
    this.systemStream?.stop();
    this.micStream = null;
    this.systemStream = null;

    // Flush any remaining aligned samples
    this.flushAlignedSamples();

    // Finalize WAV
    this.wavWriter?.finalize();
    this.wavWriter = null;

    this.recording = false;

    const durationSeconds = (Date.now() - this.startTime) / 1000;

    console.log(
      `[AudioCapture] Recording stopped (duration=${durationSeconds.toFixed(1)}s, file=${this.audioFilePath})`
    );

    return {
      durationSeconds,
      audioFilePath: this.audioFilePath,
    };
  }

  async getDevices(): Promise<{ inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] }> {
    if (this.nativeRecorder) {
      try {
        const inputDevices = this.nativeRecorder.AudioRecorder.getDevices('input');
        const outputDevices = this.nativeRecorder.AudioRecorder.getDevices('output');
        const inputs = inputDevices.map((d) => ({
          id: d.id,
          name: d.name,
          isDefault: d.isDefault,
        }));
        const outputs = outputDevices.map((d) => ({
          id: d.id,
          name: d.name,
          isDefault: d.isDefault,
        }));
        return { inputs, outputs };
      } catch (err) {
        console.error('[AudioCapture] Failed to enumerate native devices:', err);
      }
    }

    // Fallback: return a single default stub device
    return {
      inputs: [{ id: 'default-mic', name: 'Default Microphone', isDefault: true }],
      outputs: [{ id: 'default-speaker', name: 'Default Speaker', isDefault: true }],
    };
  }

  isRecording(): boolean {
    return this.recording;
  }

  onAudioLevels(callback: AudioLevelsCallback): void {
    this.levelCallbacks.push(callback);
  }

  // ---- private: native capture ---------------------------------------------

  private async startNativeCapture(): Promise<void> {
    if (!this.nativeRecorder) return;

    // Get default devices
    const inputDevices = this.nativeRecorder.AudioRecorder.getDevices('input');
    const outputDevices = this.nativeRecorder.AudioRecorder.getDevices('output');
    const defaultInput = inputDevices.find((d) => d.isDefault) ?? inputDevices[0];
    const defaultOutput = outputDevices.find((d) => d.isDefault) ?? outputDevices[0];

    if (!defaultInput || !defaultOutput) {
      console.error('[AudioCapture] No audio devices found, falling back to stub');
      this.startStubCapture();
      return;
    }

    // Check device sample rate for downsampling
    try {
      const format = this.nativeRecorder.AudioRecorder.getDeviceFormat(defaultOutput.id);
      this.sourceSampleRate = format.sampleRate || 48000;
    } catch {
      this.sourceSampleRate = 48000;
    }

    // Create streams
    const micNative = new NativeStream(this.nativeRecorder, 'input', defaultInput.id);
    const sysNative = new NativeStream(this.nativeRecorder, 'output', defaultOutput.id);

    micNative.onData((data) => this.handleMicData(data));
    sysNative.onData((data) => this.handleSystemData(data));

    try {
      await Promise.all([micNative.start(), sysNative.start()]);
      this.micStream = micNative;
      this.systemStream = sysNative;
    } catch (err) {
      console.error('[AudioCapture] Failed to start native streams:', err);
      micNative.stop();
      sysNative.stop();
      console.log('[AudioCapture] Falling back to stub');
      this.backend = 'stub';
      this.startStubCapture();
    }
  }

  // ---- private: stub capture -----------------------------------------------

  private startStubCapture(): void {
    this.sourceSampleRate = this.targetSampleRate; // stub already at target rate

    const mic = new StubStream(this.targetSampleRate);
    const sys = new StubStream(this.targetSampleRate);

    mic.onData((data) => this.handleMicData(data));
    sys.onData((data) => this.handleSystemData(data));

    mic.start();
    sys.start();

    this.micStream = mic;
    this.systemStream = sys;
  }

  // ---- private: data handling ----------------------------------------------

  private handleMicData(raw: Float32Array): void {
    const data =
      this.sourceSampleRate !== this.targetSampleRate
        ? WavWriter.downsample(raw, this.sourceSampleRate, this.targetSampleRate)
        : raw;

    this.micBuffer = this.concatFloat32(this.micBuffer, data);
    this.emitLevels(data, 'mic');
    this.flushAlignedSamples();
  }

  private handleSystemData(raw: Float32Array): void {
    const data =
      this.sourceSampleRate !== this.targetSampleRate
        ? WavWriter.downsample(raw, this.sourceSampleRate, this.targetSampleRate)
        : raw;

    this.systemBuffer = this.concatFloat32(this.systemBuffer, data);
    this.emitLevels(data, 'system');
    this.flushAlignedSamples();
  }

  /**
   * Write as many aligned stereo frames as we can — the minimum of the
   * two buffer lengths — then keep the remainders for the next call.
   */
  private flushAlignedSamples(): void {
    const alignedLength = Math.min(this.micBuffer.length, this.systemBuffer.length);
    if (alignedLength === 0 || !this.wavWriter) return;

    const left = this.micBuffer.subarray(0, alignedLength);
    const right = this.systemBuffer.subarray(0, alignedLength);

    this.wavWriter.writeSamples(left, right);

    this.micBuffer = this.micBuffer.subarray(alignedLength);
    this.systemBuffer = this.systemBuffer.subarray(alignedLength);
  }

  // ---- private: helpers ----------------------------------------------------

  private emitLevels(samples: Float32Array, channel: 'mic' | 'system'): void {
    if (this.levelCallbacks.length === 0) return;

    const rms = this.computeRms(samples);
    // We emit the latest known level for each channel. The other channel
    // keeps its last-emitted value (this is fine for a VU meter).
    const levels: AudioLevels =
      channel === 'mic'
        ? { mic: rms, system: this.lastSystemLevel }
        : { mic: this.lastMicLevel, system: rms };

    if (channel === 'mic') this.lastMicLevel = rms;
    else this.lastSystemLevel = rms;

    for (const cb of this.levelCallbacks) {
      try {
        cb(levels);
      } catch {
        // don't let a bad callback break recording
      }
    }
  }

  private lastMicLevel = 0;
  private lastSystemLevel = 0;

  private computeRms(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private concatFloat32(a: Float32Array, b: Float32Array): Float32Array {
    if (a.length === 0) return b;
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  private getStorageDir(): string {
    if (this.storagePath) return this.storagePath;
    return path.join(app.getPath('userData'), 'recordings');
  }
}
