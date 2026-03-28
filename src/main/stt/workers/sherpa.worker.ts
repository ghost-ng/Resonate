import { parentPort } from 'worker_threads';
import type { WorkerRequest, WorkerResponse } from '../../../shared/types/stt.types';

if (!parentPort) {
  throw new Error('sherpa.worker must be run as a worker thread');
}

const port = parentPort;

port.on('message', async (msg: WorkerRequest) => {
  if (msg.type === 'dispose') {
    process.exit(0);
  }

  if (msg.type === 'transcribe') {
    try {
      // Dynamic import of sherpa-onnx bindings
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sherpa = require('sherpa-onnx');

      const modelPath = msg.config.modelPath ?? '';

      const result = await sherpa.transcribe(msg.wavPath, {
        modelPath,
      });

      const response: WorkerResponse = {
        type: 'result',
        id: msg.id,
        segments: (result.segments ?? []).map((seg: { start: number; end: number; text: string; confidence?: number }) => ({
          speaker: '',
          text: seg.text.trim(),
          start_time_ms: Math.round(seg.start * 1000),
          end_time_ms: Math.round(seg.end * 1000),
          confidence: seg.confidence ?? 0.5,
        })),
      };
      port.postMessage(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const response: WorkerResponse = { type: 'error', id: msg.id, message };
      port.postMessage(response);
    }
  }
});
