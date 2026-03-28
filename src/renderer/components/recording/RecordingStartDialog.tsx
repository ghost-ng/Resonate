import { useEffect, useState } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { useSettingsStore } from '../../stores/settings.store';

export default function RecordingStartDialog() {
  const confirmStartRecording = useSessionStore((s) => s.confirmStartRecording);
  const audioDevices = useSettingsStore((s) => s.audioDevices);
  const fetchAudioDevices = useSettingsStore((s) => s.fetchAudioDevices);

  const [inputDeviceId, setInputDeviceId] = useState('');
  const [outputDeviceId, setOutputDeviceId] = useState('');

  useEffect(() => {
    fetchAudioDevices();
  }, [fetchAudioDevices]);

  // Pre-select defaults when devices load
  useEffect(() => {
    if (audioDevices.inputs.length > 0 && !inputDeviceId) {
      const defaultInput = audioDevices.inputs.find((d) => d.isDefault);
      setInputDeviceId(defaultInput?.id ?? audioDevices.inputs[0].id);
    }
    if (audioDevices.outputs.length > 0 && !outputDeviceId) {
      const defaultOutput = audioDevices.outputs.find((d) => d.isDefault);
      setOutputDeviceId(defaultOutput?.id ?? audioDevices.outputs[0].id);
    }
  }, [audioDevices, inputDeviceId, outputDeviceId]);

  const handleCancel = () => {
    useSessionStore.setState({ recordingPhase: 'idle' });
  };

  const handleStart = () => {
    if (inputDeviceId && outputDeviceId) {
      confirmStartRecording(inputDeviceId, outputDeviceId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[400px] rounded-card border border-border bg-surface p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-text mb-5">Start Recording</h2>

        {/* Input device (microphone) */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-text-muted mb-1.5 block">
            Microphone (Input)
          </span>
          <select
            value={inputDeviceId}
            onChange={(e) => setInputDeviceId(e.target.value)}
            className="w-full rounded-card border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
          >
            {audioDevices.inputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        </label>

        {/* Output device (system audio) */}
        <label className="block mb-6">
          <span className="text-sm font-medium text-text-muted mb-1.5 block">
            System Audio (Output)
          </span>
          <select
            value={outputDeviceId}
            onChange={(e) => setOutputDeviceId(e.target.value)}
            className="w-full rounded-card border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
          >
            {audioDevices.outputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-card px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!inputDeviceId || !outputDeviceId}
            className="rounded-card bg-recording px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-recording/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Recording
          </button>
        </div>
      </div>
    </div>
  );
}
