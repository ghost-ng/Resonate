import { Worker } from 'worker_threads';
import * as path from 'path';
import type {
  SttEngine,
  SttEngineConfig,
  TranscriptSegment,
  WorkerResponse,
} from '../../../shared/types/stt.types';
import { STT_WORKER_TIMEOUT_MS } from '../../../shared/constants';

export class VoskEngine implements SttEngine {
  readonly name = 'vosk' as const;
  private worker: Worker | null = null;

  async transcribe(
    wavPath: string,
    config: SttEngineConfig
  ): Promise<TranscriptSegment[]> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('vosk is not installed or not available');
    }

    return new Promise<TranscriptSegment[]>((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      const worker = this.getWorker();

      const timeout = setTimeout(() => {
        reject(new Error('Vosk worker timed out'));
        this.disposeWorker();
      }, STT_WORKER_TIMEOUT_MS);

      const handler = (msg: WorkerResponse) => {
        if ('id' in msg && msg.id !== id) return;

        clearTimeout(timeout);
        worker.off('message', handler);

        if (msg.type === 'result') {
          resolve(msg.segments);
        } else if (msg.type === 'error') {
          reject(new Error(msg.message));
        }
      };

      worker.on('message', handler);
      worker.postMessage({ type: 'transcribe', id, wavPath, config });
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      require.resolve('vosk');
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.disposeWorker();
  }

  private getWorker(): Worker {
    if (!this.worker) {
      const workerPath = path.join(__dirname, '..', 'workers', 'vosk.worker.js');
      this.worker = new Worker(workerPath);
      this.worker.on('error', () => {
        this.worker = null;
      });
      this.worker.on('exit', () => {
        this.worker = null;
      });
    }
    return this.worker;
  }

  private disposeWorker(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'dispose' });
      this.worker = null;
    }
  }
}
