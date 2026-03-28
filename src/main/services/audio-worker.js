// Audio capture worker — runs in a child process
// Records mic + system audio directly to a WAV file
// Communicates status with parent via process.send()

const fs = require('fs');
const path = require('path');
const { AudioRecorder } = require('native-recorder-nodejs');

const args = JSON.parse(process.argv[2] || '{}');
const outputFile = args.outputFile;
const logFile = args.logFile;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  if (logFile) {
    try { fs.appendFileSync(logFile, line); } catch { /* ignore */ }
  }
  process.stderr.write(line);
}

if (!outputFile) {
  log('ERROR: No outputFile specified');
  process.exit(1);
}

// Get devices
const devices = AudioRecorder.getDevices();
const inputDev = devices.find(d => d.type === 'input' && d.isDefault) || devices.find(d => d.type === 'input');
const outputDev = devices.find(d => d.type === 'output' && d.isDefault) || devices.find(d => d.type === 'output');

if (!inputDev) {
  log('ERROR: No input device found');
  process.exit(1);
}

log(`Input device: ${inputDev.name} (${inputDev.id})`);
log(`Output device: ${outputDev ? outputDev.name : 'none'} (${outputDev?.id})`);

// Get format info
let sampleRate = 48000;
let inputChannels = 2;
try {
  const fmt = AudioRecorder.getDeviceFormat(inputDev.id);
  sampleRate = fmt.sampleRate || 48000;
  inputChannels = fmt.channels || 2;
  log(`Input format: ${fmt.sampleRate}Hz, ${fmt.channels}ch, ${fmt.bitDepth}bit`);
} catch (e) {
  log(`getDeviceFormat failed: ${e.message}, defaulting to 48000Hz 2ch`);
}

// Target: 16kHz stereo 16-bit WAV
const targetRate = 16000;
const channels = 2;
const bitDepth = 16;

// WAV writer — use explicit position tracking to avoid fd offset issues
let writePos = 0;
let dataSize = 0;
const fd = fs.openSync(outputFile, 'w+'); // r/w mode

function writeAt(buf, pos) {
  fs.writeSync(fd, buf, 0, buf.length, pos);
}

function appendData(buf) {
  fs.writeSync(fd, buf, 0, buf.length, writePos);
  writePos += buf.length;
}

function writeWavHeader() {
  const byteRate = targetRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36, 4); // patched later
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(targetRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitDepth, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(0, 40); // patched later
  writeAt(buf, 0);
  writePos = 44; // data starts after header
  log(`WAV header written, writePos=${writePos}`);
}

function finalizeWav() {
  // Patch data chunk size at offset 40
  const dataSizeBuf = Buffer.alloc(4);
  dataSizeBuf.writeUInt32LE(dataSize, 0);
  writeAt(dataSizeBuf, 40);
  // Patch RIFF chunk size at offset 4
  const riffSizeBuf = Buffer.alloc(4);
  riffSizeBuf.writeUInt32LE(36 + dataSize, 0);
  writeAt(riffSizeBuf, 4);
  fs.closeSync(fd);
  const actualSize = fs.statSync(outputFile).size;
  log(`WAV finalized: expected=${44 + dataSize}, actual=${actualSize} bytes, dataSize=${dataSize}`);
}

function downsample(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const factor = Math.round(fromRate / toRate);
  const outputLen = Math.floor(input.length / factor);
  const output = new Float32Array(outputLen);
  for (let i = 0; i < outputLen; i++) {
    let sum = 0;
    const start = i * factor;
    for (let j = 0; j < factor; j++) sum += input[start + j];
    output[i] = sum / factor;
  }
  return output;
}

function bufferToFloat32Mono(buf, inputChannels) {
  const int16 = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  if (inputChannels <= 1) {
    // Already mono
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  }
  // Convert stereo to mono by averaging channels
  const monoLen = Math.floor(int16.length / inputChannels);
  const float32 = new Float32Array(monoLen);
  for (let i = 0; i < monoLen; i++) {
    let sum = 0;
    for (let ch = 0; ch < inputChannels; ch++) {
      sum += int16[i * inputChannels + ch] / 32768;
    }
    float32[i] = sum / inputChannels;
  }
  return float32;
}

function writeInterleavedSamples(left, right) {
  const len = Math.min(left.length, right.length);
  if (len === 0) return;
  const buf = Buffer.alloc(len * 4); // 2 channels * 2 bytes
  for (let i = 0; i < len; i++) {
    const lVal = Math.max(-1, Math.min(1, left[i]));
    const rVal = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(lVal < 0 ? lVal * 32768 : lVal * 32767, i * 4);
    buf.writeInt16LE(rVal < 0 ? rVal * 32768 : rVal * 32767, i * 4 + 2);
  }
  appendData(buf);
  dataSize += buf.length;
}

// Buffers for aligning mic and system audio
let micBuf = new Float32Array(0);
let sysBuf = new Float32Array(0);

function concatF32(a, b) {
  if (a.length === 0) return b;
  const out = new Float32Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}

function flush() {
  const len = Math.min(micBuf.length, sysBuf.length);
  if (len === 0) return;
  writeInterleavedSamples(micBuf.subarray(0, len), sysBuf.subarray(0, len));
  micBuf = micBuf.subarray(len);
  sysBuf = sysBuf.subarray(len);
}

// Compute RMS for level reporting
function rms(samples) {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

// Setup recorders
writeWavHeader();

const micRecorder = new AudioRecorder();
const sysRecorder = outputDev ? new AudioRecorder() : null;

let micDataCount = 0;
let sysDataCount = 0;
let lastLevelTime = 0;

micRecorder.on('data', (buf) => {
  micDataCount++;
  const float32 = bufferToFloat32Mono(buf, inputChannels);
  const downsampled = downsample(float32, sampleRate, targetRate);
  micBuf = concatF32(micBuf, downsampled);

  // Send levels at ~20Hz
  const now = Date.now();
  if (now - lastLevelTime > 50) {
    lastLevelTime = now;
    try {
      process.send({
        type: 'levels',
        mic: rms(downsampled),
        system: sysDataCount > 0 ? rms(sysBuf.subarray(Math.max(0, sysBuf.length - 320))) : 0,
      });
    } catch { /* ignore */ }
  }

  flush();
});

micRecorder.on('error', (err) => log(`Mic error: ${err.message}`));

if (sysRecorder) {
  sysRecorder.on('data', (buf) => {
    sysDataCount++;
    const float32 = bufferToFloat32Mono(buf, inputChannels);
    const downsampled = downsample(float32, sampleRate, targetRate);
    sysBuf = concatF32(sysBuf, downsampled);
    flush();
  });
  sysRecorder.on('error', (err) => log(`System error: ${err.message}`));
}

async function startCapture() {
  log('Starting capture...');
  const promises = [
    micRecorder.start({ deviceType: 'input', deviceId: inputDev.id })
  ];
  if (sysRecorder && outputDev) {
    promises.push(sysRecorder.start({ deviceType: 'output', deviceId: outputDev.id }));
  }
  await Promise.all(promises);
  log('Capture started');
  process.send({ type: 'started' });
}

async function stopCapture() {
  log(`Stopping... mic events: ${micDataCount}, sys events: ${sysDataCount}`);
  try { await micRecorder.stop(); } catch (e) { log(`Mic stop error: ${e.message}`); }
  try { if (sysRecorder) await sysRecorder.stop(); } catch (e) { log(`Sys stop error: ${e.message}`); }

  // Flush any remaining
  if (sysBuf.length === 0 && micBuf.length > 0) {
    // No system audio — write mic as mono (both channels same)
    writeInterleavedSamples(micBuf, micBuf);
    micBuf = new Float32Array(0);
  } else {
    flush();
  }

  finalizeWav();
  process.send({ type: 'stopped', micEvents: micDataCount, sysEvents: sysDataCount });
  setTimeout(() => process.exit(0), 100);
}

process.on('message', async (msg) => {
  if (msg === 'start') {
    try { await startCapture(); } catch (e) {
      log(`Start failed: ${e.message}`);
      process.send({ type: 'error', message: e.message });
    }
  } else if (msg === 'stop') {
    await stopCapture();
  }
});

// Send ready with device info
process.send({
  type: 'ready',
  sampleRate,
});

log('Worker initialized, waiting for start command');
