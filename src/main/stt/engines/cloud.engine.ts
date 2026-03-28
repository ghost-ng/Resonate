import * as fs from 'fs';
import * as path from 'path';
import type {
  SttEngine,
  SttEngineConfig,
  TranscriptSegment,
} from '../../../shared/types/stt.types';
import {
  normalizeCloudResponse,
  type CloudApiResponse,
} from '../adapters/cloud.adapter';

export class CloudEngine implements SttEngine {
  readonly name = 'cloud' as const;

  async transcribe(
    wavPath: string,
    config: SttEngineConfig
  ): Promise<TranscriptSegment[]> {
    if (!config.cloudEndpoint && !config.cloudApiKey) {
      throw new Error('Cloud STT not configured. Go to Settings → STT Engine and enter your API endpoint and key.');
    }

    const endpoint = (config.cloudEndpoint ?? 'https://api.openai.com').replace(
      /\/+$/,
      ''
    );
    const url = `${endpoint}/v1/audio/transcriptions`;
    const apiKey = config.cloudApiKey ?? '';
    const model = config.cloudModel ?? 'whisper-1';

    console.log(`[CloudSTT] Transcribing: ${wavPath} via ${url} (model: ${model})`);

    const fileBuffer = fs.readFileSync(wavPath);
    const fileName = path.basename(wavPath);

    // Build multipart form data
    const boundary =
      '----FormBoundary' + Math.random().toString(36).substring(2);
    const parts: Buffer[] = [];

    // File part
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: audio/wav\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));

    // Model part
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`
      )
    );

    // Response format part
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`
      )
    );

    // Language part (if set)
    if (config.language) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${config.language}\r\n`
        )
      );
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Cloud STT endpoint returned ${response.status}: ${text}`
      );
    }

    const json = (await response.json()) as CloudApiResponse;
    return normalizeCloudResponse(json);
  }

  async isAvailable(): Promise<boolean> {
    // Cloud engine is always available (requires network, but we don't pre-check)
    return true;
  }

  dispose(): void {
    // No resources to release
  }
}
