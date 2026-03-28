import { useSettingsStore } from '../../stores/settings.store';

export default function StatusBar() {
  const settings = useSettingsStore((s) => s.settings);

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-xs text-text-muted">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Connected
        </span>
        <span>STT: {settings.stt_engine ?? 'whisper'}</span>
        <span>AI: {settings.ai_model ?? 'gpt-4o'}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{settings.storage_path ?? '~/.yourecord'}</span>
      </div>
    </div>
  );
}
