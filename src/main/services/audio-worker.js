// Audio capture worker — runs in a child process to avoid Electron event loop issues
// Communicates with parent via process.send()
const { AudioRecorder } = require('native-recorder-nodejs');

const devices = AudioRecorder.getDevices();
const args = JSON.parse(process.argv[2] || '{}');
const inputDeviceId = args.inputDeviceId || devices.find(d => d.type === 'input' && d.isDefault)?.id;
const outputDeviceId = args.outputDeviceId || devices.find(d => d.type === 'output' && d.isDefault)?.id;

if (!inputDeviceId) {
  process.send({ type: 'error', message: 'No input device found' });
  process.exit(1);
}

const micRecorder = new AudioRecorder();
const sysRecorder = outputDeviceId ? new AudioRecorder() : null;

let running = false;

micRecorder.on('data', (buf) => {
  if (running && process.send) {
    process.send({ type: 'mic-data', data: Array.from(new Uint8Array(buf)) });
  }
});

micRecorder.on('error', (err) => {
  if (process.send) process.send({ type: 'error', message: 'mic: ' + err.message });
});

if (sysRecorder) {
  sysRecorder.on('data', (buf) => {
    if (running && process.send) {
      process.send({ type: 'sys-data', data: Array.from(new Uint8Array(buf)) });
    }
  });
  sysRecorder.on('error', (err) => {
    if (process.send) process.send({ type: 'error', message: 'sys: ' + err.message });
  });
}

async function start() {
  running = true;
  const promises = [
    micRecorder.start({ deviceType: 'input', deviceId: inputDeviceId })
  ];
  if (sysRecorder && outputDeviceId) {
    promises.push(sysRecorder.start({ deviceType: 'output', deviceId: outputDeviceId }));
  }
  await Promise.all(promises);
  process.send({ type: 'started' });
}

process.on('message', async (msg) => {
  if (msg === 'start') {
    try {
      await start();
    } catch (err) {
      process.send({ type: 'error', message: err.message });
    }
  } else if (msg === 'stop') {
    running = false;
    try {
      await micRecorder.stop();
      if (sysRecorder) await sysRecorder.stop();
    } catch (e) { /* ignore */ }
    process.send({ type: 'stopped' });
    setTimeout(() => process.exit(0), 100);
  }
});

// Send device info and ready signal
process.send({
  type: 'ready',
  devices: { inputDeviceId, outputDeviceId },
  format: inputDeviceId ? AudioRecorder.getDeviceFormat(inputDeviceId) : null,
});
