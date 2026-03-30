import path from 'node:path';
import fs from 'node:fs';
import { fork, type ChildProcess } from 'node:child_process';
import { app } from 'electron';
import type { AudioDeviceInfo } from '../../shared/types/ipc.types';

export interface AudioLevels {
  mic: number;
  system: number;
}

type AudioLevelsCallback = (levels: AudioLevels) => void;

export class AudioCaptureService {
  private recording = false;
  private startTime = 0;
  private audioFilePath = '';
  private levelCallbacks: AudioLevelsCallback[] = [];
  private worker: ChildProcess | null = null;
  private logDir: string;

  constructor(private storagePath?: string) {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
  }

  async startRecording(recordingId: number): Promise<void> {
    if (this.recording) {
      console.warn('[AudioCapture] Already recording — ignoring');
      return;
    }

    const dir = this.getStorageDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const timestamp = Date.now();
    this.audioFilePath = path.join(dir, `recording_${recordingId}_${timestamp}.wav`);
    this.startTime = Date.now();
    this.recording = true;

    const logFile = path.join(this.logDir, `audio-worker-${timestamp}.log`);
    const workerScript = this.findWorkerScript();

    if (!workerScript) {
      console.error('[AudioCapture] Worker script not found');
      this.recording = false;
      return;
    }

    console.log(`[AudioCapture] Spawning worker: ${workerScript}`);
    console.log(`[AudioCapture] Output: ${this.audioFilePath}`);
    console.log(`[AudioCapture] Log: ${logFile}`);

    this.worker = fork(workerScript, [
      JSON.stringify({ outputFile: this.audioFilePath, logFile })
    ], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      execArgv: ['--force-node-api-uncaught-exceptions-policy=true'],
    });

    this.worker.on('message', (msg: any) => {
      if (msg.type === 'ready') {
        console.log(`[AudioCapture] Worker ready (${msg.sampleRate}Hz)`);
        this.worker?.send('start');
      } else if (msg.type === 'started') {
        console.log('[AudioCapture] Recording started');
      } else if (msg.type === 'levels') {
        for (const cb of this.levelCallbacks) {
          try { cb({ mic: msg.mic, system: msg.system }); } catch { /* ignore */ }
        }
      } else if (msg.type === 'stopped') {
        console.log(`[AudioCapture] Worker stopped (mic=${msg.micEvents}, sys=${msg.sysEvents} events)`);
      } else if (msg.type === 'error') {
        console.error('[AudioCapture] Worker error:', msg.message);
      }
    });

    this.worker.stdout?.on('data', (d: Buffer) => {
      const s = d.toString().trim();
      if (s) console.log('[AudioWorker]', s);
    });
    this.worker.stderr?.on('data', (d: Buffer) => {
      const s = d.toString().trim();
      if (s) console.log('[AudioWorker]', s);
    });

    this.worker.on('error', (err) => console.error('[AudioCapture] Worker process error:', err));
    this.worker.on('exit', (code) => {
      console.log(`[AudioCapture] Worker exited (code=${code})`);
      this.worker = null;
    });
  }

  async stopRecording(): Promise<{ durationSeconds: number; audioFilePath: string }> {
    if (!this.recording) throw new Error('Not recording');

    // Tell worker to stop and write WAV
    if (this.worker) {
      this.worker.send('stop');
      // Wait for worker to finish writing
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[AudioCapture] Worker did not exit in time, killing');
          this.worker?.kill();
          resolve();
        }, 5000);

        if (this.worker) {
          this.worker.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      });
      this.worker = null;
    }

    this.recording = false;
    const durationSeconds = (Date.now() - this.startTime) / 1000;
    const fileSize = fs.existsSync(this.audioFilePath) ? fs.statSync(this.audioFilePath).size : 0;

    console.log(`[AudioCapture] Stopped (duration=${durationSeconds.toFixed(1)}s, size=${fileSize} bytes)`);

    return { durationSeconds, audioFilePath: this.audioFilePath };
  }

  async getDevices(): Promise<{ inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] }> {
    try {
      const { AudioRecorder } = require('native-recorder-nodejs');
      const all = AudioRecorder.getDevices();
      return {
        inputs: all.filter((d: any) => d.type === 'input').map((d: any) => ({ id: d.id, name: d.name, isDefault: d.isDefault })),
        outputs: all.filter((d: any) => d.type === 'output').map((d: any) => ({ id: d.id, name: d.name, isDefault: d.isDefault })),
      };
    } catch {
      return {
        inputs: [{ id: 'default-mic', name: 'Default Microphone', isDefault: true }],
        outputs: [{ id: 'default-speaker', name: 'Default Speaker', isDefault: true }],
      };
    }
  }

  isRecording(): boolean { return this.recording; }

  onAudioLevels(callback: AudioLevelsCallback): void {
    this.levelCallbacks.push(callback);
  }

  private getStorageDir(): string {
    return this.storagePath || path.join(app.getPath('userData'), 'recordings');
  }

  private findWorkerScript(): string | null {
    const candidates = [
      path.join(app.getAppPath(), 'src', 'main', 'services', 'audio-worker.js'),
      path.join(__dirname, 'audio-worker.js'),
      path.join(__dirname, '..', 'src', 'main', 'services', 'audio-worker.js'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        console.log(`[AudioCapture] Found worker at: ${p}`);
        return p;
      }
    }
    console.error('[AudioCapture] Worker not found. Searched:', candidates);
    return null;
  }
}
