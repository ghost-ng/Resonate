import { useSettingsStore } from '../../stores/settings.store';

const STT_ENGINES = [
  { value: 'whisper', label: 'Whisper' },
  { value: 'vosk', label: 'Vosk' },
  { value: 'sherpa', label: 'Sherpa-ONNX' },
  { value: 'cloud', label: 'Cloud API' },
] as const;

export default function SttEngineConfig() {
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const engine = settings.stt_engine || 'whisper';

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">Speech-to-Text Engine</h3>

      <div className="flex flex-col gap-2">
        {STT_ENGINES.map((e) => (
          <label
            key={e.value}
            className="flex items-center gap-2 cursor-pointer rounded-card px-3 py-2 hover:bg-surface-2 transition-colors"
          >
            <input
              type="radio"
              name="stt_engine"
              value={e.value}
              checked={engine === e.value}
              onChange={() => setSetting('stt_engine', e.value)}
              className="accent-accent"
            />
            <span className="text-base text-text">{e.label}</span>
          </label>
        ))}
      </div>

      {engine === 'cloud' ? (
        <div className="flex flex-col gap-2 mt-1 pl-6">
          <label className="text-sm text-text-muted">Endpoint URL</label>
          <input
            type="text"
            placeholder="https://api.example.com/v1/stt"
            value={settings.stt_cloud_endpoint || ''}
            onChange={(e) => setSetting('stt_cloud_endpoint', e.target.value)}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
          />
          <label className="text-sm text-text-muted">Model</label>
          <input
            type="text"
            placeholder="whisper-1"
            value={settings.stt_cloud_model || ''}
            onChange={(e) => setSetting('stt_cloud_model', e.target.value)}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-1 pl-6">
          <label className="text-sm text-text-muted">Model Path</label>
          <input
            type="text"
            placeholder={`Path to ${engine} model file...`}
            value={settings[`stt_${engine}_model_path`] || ''}
            onChange={(e) => setSetting(`stt_${engine}_model_path`, e.target.value)}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}
