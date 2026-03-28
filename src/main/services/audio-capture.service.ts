import path from 'node:path';
import fs from 'node:fs';
import { fork, type ChildProcess } from 'node:child_process';
import { app } from 'electron';
import { WavWriter } from './wav-writer.service';
import type { AudioDeviceInfo } from '../../shared/types/ipc.types';

export interface AudioLevels {
  mic: number;
  system: number;
}

type AudioLevelsCallback = (levels: AudioLevels) => void;

export class AudioCaptureService {
  private recording = false;
  private wavWriter: WavWriter | null = null;
  private startTime = 0;
  private audioFilePath = '';
  private levelCallbacks: AudioLevelsCallback[] = [];
  private worker: ChildProcess | null = null;

  private micBuffer: Float32Array = new Float32Array(0);
  private systemBuffer: Float32Array = new Float32Array(0);

  private lastMicLevel = 0;
  private lastSystemLevel = 0;

  private readonly targetSampleRate = 16000;
  private sourceSampleRate = 48000;

  constructor(private storagePath?: string) {}

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

    // Spawn child process for audio capture
    const workerPath = path.join(__dirname, '..', 'services', 'audio-worker.js');
    // In production, the worker file may be bundled differently
    const workerScript = this.findWorkerScript();

    try {
      this.worker = fork(workerScript, [JSON.stringify({})], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });

      this.worker.on('message', (msg: any) => {
        if (msg.type === 'ready') {
          console.log('[AudioCapture] Worker ready, devices:', msg.devices);
          if (msg.format) {
            this.sourceSampleRate = msg.format.sampleRate || 48000;
            console.log(`[AudioCapture] Source sample rate: ${this.sourceSampleRate}Hz`);
          }
          this.worker?.send('start');
        } else if (msg.type === 'started') {
          console.log('[AudioCapture] Worker started recording');
        } else if (msg.type === 'mic-data') {
          this.handleRawData(msg.data, 'mic');
        } else if (msg.type === 'sys-data') {
          this.handleRawData(msg.data, 'system');
        } else if (msg.type === 'stopped') {
          console.log('[AudioCapture] Worker stopped');
        } else if (msg.type === 'error') {
          console.error('[AudioCapture] Worker error:', msg.message);
        }
      });

      this.worker.on('error', (err) => {
        console.error('[AudioCapture] Worker process error:', err);
      });

      this.worker.on('exit', (code) => {
        console.log(`[AudioCapture] Worker exited with code ${code}`);
        this.worker = null;
      });

      // Pipe worker stdout/stderr for debugging
      this.worker.stdout?.on('data', (d: Buffer) => console.log('[AudioWorker]', d.toString().trim()));
      this.worker.stderr?.on('data', (d: Buffer) => console.error('[AudioWorker ERR]', d.toString().trim()));

    } catch (err) {
      console.error('[AudioCapture] Failed to spawn worker:', err);
      // Fall back to stub
      this.startStubCapture();
    }

    console.log(`[AudioCapture] Recording started (id=${recordingId}, file=${this.audioFilePath})`);
  }

  async stopRecording(): Promise<{ durationSeconds: number; audioFilePath: string }> {
    if (!this.recording) {
      throw new Error('Not recording');
    }

    // Stop worker
    if (this.worker) {
      this.worker.send('stop');
      // Give it a moment to flush
      await new Promise(resolve => setTimeout(resolve, 200));
      if (this.worker) {
        this.worker.kill();
        this.worker = null;
      }
    }

    // Stop stub if running
    if (this.stubTimer) {
      clearInterval(this.stubTimer);
      this.stubTimer = null;
    }

    // Flush remaining samples
    this.flushAlignedSamples();

    // Finalize WAV
    this.wavWriter?.finalize();
    this.wavWriter = null;
    this.recording = false;

    const durationSeconds = (Date.now() - this.startTime) / 1000;
    const fileSize = fs.existsSync(this.audioFilePath) ? fs.statSync(this.audioFilePath).size : 0;

    console.log(`[AudioCapture] Recording stopped (duration=${durationSeconds.toFixed(1)}s, file=${this.audioFilePath}, size=${fileSize} bytes)`);

    return { durationSeconds, audioFilePath: this.audioFilePath };
  }

  async getDevices(): Promise<{ inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] }> {
    try {
      const { AudioRecorder } = require('native-recorder-nodejs');
      const inputDevices = AudioRecorder.getDevices('input');
      const outputDevices = AudioRecorder.getDevices('output');
      return {
        inputs: inputDevices.map((d: any) => ({ id: d.id, name: d.name, isDefault: d.isDefault })),
        outputs: outputDevices.map((d: any) => ({ id: d.id, name: d.name, isDefault: d.isDefault })),
      };
    } catch {
      return {
        inputs: [{ id: 'default-mic', name: 'Default Microphone', isDefault: true }],
        outputs: [{ id: 'default-speaker', name: 'Default Speaker', isDefault: true }],
      };
    }
  }

  isRecording(): boolean {
    return this.recording;
  }

  onAudioLevels(callback: AudioLevelsCallback): void {
    this.levelCallbacks.push(callback);
  }

  // ---- private ----

  private handleRawData(rawArray: number[], channel: 'mic' | 'system'): void {
    // Convert from serialized Uint8Array back to Buffer, then to Float32
    const buf = Buffer.from(rawArray);
    const int16 = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    // Downsample if needed
    const data = this.sourceSampleRate !== this.targetSampleRate
      ? WavWriter.downsample(float32, this.sourceSampleRate, this.targetSampleRate)
      : float32;

    if (channel === 'mic') {
      this.micBuffer = this.concatFloat32(this.micBuffer, data);
    } else {
      this.systemBuffer = this.concatFloat32(this.systemBuffer, data);
    }

    this.emitLevels(data, channel);
    this.flushAlignedSamples();
  }

  private flushAlignedSamples(): void {
    const alignedLength = Math.min(this.micBuffer.length, this.systemBuffer.length);
    if (alignedLength === 0 || !this.wavWriter) return;

    const left = this.micBuffer.subarray(0, alignedLength);
    const right = this.systemBuffer.subarray(0, alignedLength);
    this.wavWriter.writeSamples(left, right);

    this.micBuffer = this.micBuffer.subarray(alignedLength);
    this.systemBuffer = this.systemBuffer.subarray(alignedLength);
  }

  private emitLevels(samples: Float32Array, channel: 'mic' | 'system'): void {
    if (this.levelCallbacks.length === 0) return;
    const rms = this.computeRms(samples);
    const levels: AudioLevels = channel === 'mic'
      ? { mic: rms, system: this.lastSystemLevel }
      : { mic: this.lastMicLevel, system: rms };
    if (channel === 'mic') this.lastMicLevel = rms;
    else this.lastSystemLevel = rms;
    for (const cb of this.levelCallbacks) {
      try { cb(levels); } catch { /* ignore */ }
    }
  }

  private computeRms(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
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

  private findWorkerScript(): string {
    // In development, the worker is at src/main/services/audio-worker.js
    // In production (packaged), it would be in resources
    const candidates = [
      path.join(__dirname, 'audio-worker.js'),
      path.join(__dirname, '..', 'services', 'audio-worker.js'),
      path.join(app.getAppPath(), 'src', 'main', 'services', 'audio-worker.js'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    console.warn('[AudioCapture] Worker script not found, falling back to stub');
    return '';
  }

  // ---- stub fallback ----

  private stubTimer: ReturnType<typeof setInterval> | null = null;

  private startStubCapture(): void {
    this.sourceSampleRate = this.targetSampleRate;
    const samplesPerChunk = Math.floor(this.targetSampleRate * 0.05);

    this.stubTimer = setInterval(() => {
      const micData = new Float32Array(samplesPerChunk);
      const sysData = new Float32Array(samplesPerChunk);
      for (let i = 0; i < samplesPerChunk; i++) {
        micData[i] = (Math.random() - 0.5) * 0.01;
        sysData[i] = (Math.random() - 0.5) * 0.01;
      }
      this.micBuffer = this.concatFloat32(this.micBuffer, micData);
      this.systemBuffer = this.concatFloat32(this.systemBuffer, sysData);
      this.emitLevels(micData, 'mic');
      this.emitLevels(sysData, 'system');
      this.flushAlignedSamples();
    }, 50);
  }
}
