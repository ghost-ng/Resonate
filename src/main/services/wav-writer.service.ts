import fs from 'node:fs';

/**
 * Writes stereo WAV files in 16-bit PCM format.
 *
 * Usage:
 *   const writer = new WavWriter(filePath, 16000, 2, 16);
 *   writer.writeHeader();
 *   writer.writeSamples(leftChannel, rightChannel);
 *   // ... more samples ...
 *   writer.finalize();  // patches header with final data size
 */
export class WavWriter {
  private fd: number | null = null;
  private dataSize = 0;
  private headerWritten = false;

  constructor(
    private filePath: string,
    private sampleRate: number = 16000,
    private channels: number = 2,
    private bitDepth: number = 16
  ) {}

  /**
   * Open the file and write the initial 44-byte WAV header.
   * The data-size fields are set to 0 and patched later by finalize().
   */
  writeHeader(): void {
    this.fd = fs.openSync(this.filePath, 'w');
    const header = this.buildHeader(0);
    const written = fs.writeSync(this.fd, header, 0, header.length, 0);
    if (written !== 44) {
      throw new Error(`WAV header write failed: wrote ${written}/44 bytes`);
    }
    this.headerWritten = true;
    this.dataSize = 0;
  }

  /**
   * Interleave left and right Float32Arrays and write as 16-bit PCM samples.
   * Both arrays must have the same length.
   */
  writeSamples(left: Float32Array, right: Float32Array): void {
    if (!this.fd || !this.headerWritten) {
      throw new Error('Must call writeHeader() before writeSamples()');
    }
    if (left.length !== right.length) {
      throw new Error(
        `Channel length mismatch: left=${left.length}, right=${right.length}`
      );
    }

    const frameCount = left.length;
    // Each frame = 2 channels * 2 bytes per sample = 4 bytes
    const buf = Buffer.alloc(frameCount * this.channels * (this.bitDepth / 8));

    const leftInt16 = WavWriter.convertFloat32ToInt16(left);
    const rightInt16 = WavWriter.convertFloat32ToInt16(right);

    for (let i = 0; i < frameCount; i++) {
      const offset = i * 4;
      buf.writeInt16LE(leftInt16[i], offset);
      buf.writeInt16LE(rightInt16[i], offset + 2);
    }

    fs.writeSync(this.fd, buf, 0, buf.length);
    this.dataSize += buf.length;
  }

  /**
   * Seek back to the header and patch the RIFF chunk size and data sub-chunk
   * size, then close the file descriptor.
   */
  finalize(): void {
    if (!this.fd) return;

    // Patch data sub-chunk size at byte 40
    const dataSizeBuf = Buffer.alloc(4);
    dataSizeBuf.writeUInt32LE(this.dataSize, 0);
    fs.writeSync(this.fd, dataSizeBuf, 0, 4, 40);

    // Patch RIFF chunk size at byte 4 (= 36 + dataSize)
    const riffSizeBuf = Buffer.alloc(4);
    riffSizeBuf.writeUInt32LE(36 + this.dataSize, 0);
    fs.writeSync(this.fd, riffSizeBuf, 0, 4, 4);

    fs.closeSync(this.fd);
    this.fd = null;
    this.headerWritten = false;
  }

  /**
   * Convert a Float32Array (values in -1..1) to Int16Array (values in -32768..32767).
   */
  static convertFloat32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }
    return int16;
  }

  /**
   * Downsample audio from a higher sample rate to the target rate by integer
   * decimation. For example, 48 kHz -> 16 kHz uses a decimation factor of 3.
   * Applies a simple averaging low-pass filter before decimation.
   */
  static downsample(
    input: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate === toRate) return input;
    if (fromRate % toRate !== 0) {
      throw new Error(
        `Non-integer decimation factor: ${fromRate}/${toRate}. Only integer ratios supported.`
      );
    }
    const factor = fromRate / toRate;
    const outputLength = Math.floor(input.length / factor);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      let sum = 0;
      const start = i * factor;
      for (let j = 0; j < factor; j++) {
        sum += input[start + j];
      }
      output[i] = sum / factor;
    }
    return output;
  }

  // ---- private ----

  private buildHeader(dataSize: number): Buffer {
    const byteRate = this.sampleRate * this.channels * (this.bitDepth / 8);
    const blockAlign = this.channels * (this.bitDepth / 8);

    const buf = Buffer.alloc(44);
    let offset = 0;

    // RIFF header
    buf.write('RIFF', offset); offset += 4;
    buf.writeUInt32LE(36 + dataSize, offset); offset += 4; // chunk size
    buf.write('WAVE', offset); offset += 4;

    // fmt sub-chunk
    buf.write('fmt ', offset); offset += 4;
    buf.writeUInt32LE(16, offset); offset += 4;            // sub-chunk size (PCM)
    buf.writeUInt16LE(1, offset); offset += 2;             // audio format (1 = PCM)
    buf.writeUInt16LE(this.channels, offset); offset += 2;
    buf.writeUInt32LE(this.sampleRate, offset); offset += 4;
    buf.writeUInt32LE(byteRate, offset); offset += 4;
    buf.writeUInt16LE(blockAlign, offset); offset += 2;
    buf.writeUInt16LE(this.bitDepth, offset); offset += 2;

    // data sub-chunk
    buf.write('data', offset); offset += 4;
    buf.writeUInt32LE(dataSize, offset);

    return buf;
  }
}
