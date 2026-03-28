import { parentPort } from 'worker_threads';
import type { WorkerRequest, WorkerResponse } from '../../../shared/types/stt.types';

if (!parentPort) {
  throw new Error('vosk.worker must be run as a worker thread');
}

const port = parentPort;

port.on('message', async (msg: WorkerRequest) => {
  if (msg.type === 'dispose') {
    process.exit(0);
  }

  if (msg.type === 'transcribe') {
    try {
      // Dynamic import of vosk bindings
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vosk = require('vosk');
      const fs = require('fs');

      const modelPath = msg.config.modelPath ?? '';
      const model = new vosk.Model(modelPath);
      const rec = new vosk.Recognizer({ model, sampleRate: 16000 });
      rec.setWords(true);

      const buffer = fs.readFileSync(msg.wavPath);
      // Skip WAV header (44 bytes)
      const audioData = buffer.slice(44);
      rec.acceptWaveform(audioData);

      const finalResult = rec.finalResult();
      const words = finalResult.result ?? [];

      // Aggregate words into segments using the adapter logic
      const PAUSE_GAP_MS = 500;
      const segments: { speaker: string; text: string; start_time_ms: number; end_time_ms: number; confidence: number }[] = [];

      if (words.length > 0) {
        let currentWords = [words[0]];

        for (let i = 1; i < words.length; i++) {
          const prevEnd = currentWords[currentWords.length - 1].end * 1000;
          const nextStart = words[i].start * 1000;

          if (nextStart - prevEnd > PAUSE_GAP_MS) {
            segments.push(buildSegment(currentWords));
            currentWords = [words[i]];
          } else {
            currentWords.push(words[i]);
          }
        }
        segments.push(buildSegment(currentWords));
      }

      rec.free();
      model.free();

      const response: WorkerResponse = { type: 'result', id: msg.id, segments };
      port.postMessage(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const response: WorkerResponse = { type: 'error', id: msg.id, message };
      port.postMessage(response);
    }
  }
});

function buildSegment(words: { word: string; start: number; end: number; conf: number }[]) {
  const text = words.map((w) => w.word).join(' ');
  const avgConf = words.reduce((sum, w) => sum + w.conf, 0) / words.length;
  return {
    speaker: '',
    text,
    start_time_ms: Math.round(words[0].start * 1000),
    end_time_ms: Math.round(words[words.length - 1].end * 1000),
    confidence: avgConf,
  };
}
