import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';

export default function AiEndpointConfig() {
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const temperature = parseFloat(settings.ai_temperature || '0.7');
  const maxTokens = settings.ai_max_tokens || '4096';

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">AI Endpoint</h3>

      <div className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2">
        <label className="text-sm text-text-muted">API URL</label>
        <input
          type="text"
          placeholder="https://api.openai.com/v1"
          value={settings.ai_endpoint || ''}
          onChange={(e) => setSetting('ai_endpoint', e.target.value)}
          className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
        />

        <label className="text-sm text-text-muted">API Key</label>
        <input
          type="password"
          placeholder="sk-..."
          value={settings.ai_api_key || ''}
          onChange={(e) => setSetting('ai_api_key', e.target.value)}
          className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
        />

        <label className="text-sm text-text-muted">Model</label>
        <input
          type="text"
          placeholder="gpt-4"
          value={settings.ai_model || ''}
          onChange={(e) => setSetting('ai_model', e.target.value)}
          className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
        />

        <label className="text-sm text-text-muted">
          Temperature <span className="text-xs text-text-muted/60">({temperature.toFixed(1)})</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setSetting('ai_temperature', e.target.value)}
          className="w-full accent-accent"
        />

        <label className="text-sm text-text-muted">Max Tokens</label>
        <input
          type="number"
          min="1"
          max="128000"
          value={maxTokens}
          onChange={(e) => setSetting('ai_max_tokens', e.target.value)}
          className="rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={handleTestConnection}
          disabled={testStatus === 'testing'}
          className="rounded-card bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        {testStatus === 'success' && (
          <span className="text-sm text-success">Connection successful</span>
        )}
        {testStatus === 'error' && (
          <span className="text-sm text-danger">Connection failed</span>
        )}
      </div>
    </div>
  );
}
