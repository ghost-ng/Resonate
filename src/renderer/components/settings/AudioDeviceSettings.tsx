import { useSettingsStore } from '../../stores/settings.store';

export default function AudioDeviceSettings() {
  const { inputs, outputs } = useSettingsStore((s) => s.audioDevices);
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const hasDevices = inputs.length > 0 || outputs.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">Audio Devices</h3>

      {!hasDevices ? (
        <p className="text-sm text-text-muted">
          Devices will be populated when audio capture is initialized.
        </p>
      ) : (
        <div className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2">
          <label className="text-sm text-text-muted">Input Device</label>
          <select
            value={settings.audio_input_device || 'default'}
            onChange={(e) => setSetting('audio_input_device', e.target.value)}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text outline-none focus:border-accent"
          >
            {inputs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>

          <label className="text-sm text-text-muted">Output Device</label>
          <select
            value={settings.audio_output_device || 'default'}
            onChange={(e) => setSetting('audio_output_device', e.target.value)}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text outline-none focus:border-accent"
          >
            {outputs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
