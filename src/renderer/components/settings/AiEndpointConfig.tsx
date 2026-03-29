import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '../../stores/settings.store';
import { SETTINGS_KEYS, DEFAULT_AI_PROVIDERS, type AiProviderType } from '../../../shared/types/settings.types';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const PROVIDER_OPTIONS: { label: string; type: AiProviderType }[] = [
  { label: 'OpenAI', type: 'openai' },
  { label: 'Anthropic', type: 'anthropic' },
  { label: 'Custom', type: 'custom' },
];

export default function AiEndpointConfig() {
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const availableModels = useSettingsStore((s) => s.availableModels);
  const modelsLoading = useSettingsStore((s) => s.modelsLoading);
  const modelsError = useSettingsStore((s) => s.modelsError);
  const fetchModels = useSettingsStore((s) => s.fetchModels);

  const providerType = (settings[SETTINGS_KEYS.AI_PROVIDER_TYPE] ?? 'openai') as AiProviderType;
  const endpoint = settings[SETTINGS_KEYS.AI_ENDPOINT] ?? '';
  const apiKey = settings[SETTINGS_KEYS.AI_API_KEY] ?? '';
  const model = settings[SETTINGS_KEYS.AI_MODEL] ?? '';
  const temperature = parseFloat(settings[SETTINGS_KEYS.AI_TEMPERATURE] ?? '0.3');
  const maxTokens = settings[SETTINGS_KEYS.AI_MAX_TOKENS] ?? '4096';

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProviderChange = (type: AiProviderType) => {
    setSetting(SETTINGS_KEYS.AI_PROVIDER_TYPE, type);

    // Load defaults from the pre-built provider templates
    const template = DEFAULT_AI_PROVIDERS.find((p) => p.type === type);
    if (template) {
      setSetting(SETTINGS_KEYS.AI_ENDPOINT, template.endpoint);
      setSetting(SETTINGS_KEYS.AI_MODEL, template.model);
      // Don't overwrite API key — user may have already entered one
    }
  };

  const handleFetchModels = useCallback(() => {
    if (endpoint && apiKey) {
      fetchModels(endpoint, apiKey, providerType);
    }
  }, [endpoint, apiKey, providerType, fetchModels]);

  // Auto-fetch models when endpoint + apiKey are both filled (debounced 1s)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (endpoint && apiKey) {
      debounceRef.current = setTimeout(() => {
        fetchModels(endpoint, apiKey, providerType);
      }, 1000);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [endpoint, apiKey, providerType, fetchModels]);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const effectiveType: 'openai' | 'anthropic' = providerType === 'custom' ? 'openai' : providerType;
      const result = await window.electronAPI.invoke('ai:list-models', {
        endpoint,
        apiKey,
        type: effectiveType,
      });
      const response = result as { models: string[]; error?: string };
      if (response.error) {
        setTestStatus('error');
        setTestMessage(response.error);
      } else {
        setTestStatus('success');
        setTestMessage(`Connected -- ${response.models.length} models available`);
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Connection failed');
    }
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 5000);
  };

  const handleSaveProvider = () => {
    // All settings are already persisted via setSetting on each change.
    // This is a no-op confirmation button.
    setTestMessage('Provider settings saved.');
    setTimeout(() => setTestMessage(''), 2000);
  };

  const inputClass =
    'rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-muted/50 outline-none focus:border-accent';

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">AI Provider</h3>

      {/* Provider type selector */}
      <div className="flex gap-1">
        {PROVIDER_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleProviderChange(opt.type)}
            className={`rounded-card px-4 py-1.5 text-sm font-medium transition-colors ${
              providerType === opt.type
                ? 'bg-accent text-white'
                : 'border border-border bg-surface text-text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2">
        <label className="text-sm text-text-muted">API Endpoint</label>
        <input
          type="text"
          placeholder={
            providerType === 'anthropic'
              ? 'https://api.anthropic.com/v1'
              : 'https://api.openai.com/v1'
          }
          value={endpoint}
          onChange={(e) => setSetting(SETTINGS_KEYS.AI_ENDPOINT, e.target.value)}
          className={inputClass}
        />

        <label className="text-sm text-text-muted">API Key</label>
        <input
          type="password"
          placeholder={providerType === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
          value={apiKey}
          onChange={(e) => setSetting(SETTINGS_KEYS.AI_API_KEY, e.target.value)}
          className={inputClass}
        />

        <label className="text-sm text-text-muted">Model</label>
        <div className="flex items-center gap-2">
          {availableModels.length > 0 ? (
            <select
              value={model}
              onChange={(e) => setSetting(SETTINGS_KEYS.AI_MODEL, e.target.value)}
              className={`${inputClass} flex-1`}
            >
              <option value="">Select a model...</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder={providerType === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
              value={model}
              onChange={(e) => setSetting(SETTINGS_KEYS.AI_MODEL, e.target.value)}
              className={`${inputClass} flex-1`}
            />
          )}
          <button
            onClick={handleFetchModels}
            disabled={modelsLoading || !endpoint || !apiKey}
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
          >
            {modelsLoading ? 'Loading...' : 'Show Models'}
          </button>
        </div>

        {modelsError && (
          <>
            <div />
            <p className="text-sm text-danger">{modelsError}</p>
          </>
        )}

        <label className="text-sm text-text-muted">
          Temperature{' '}
          <span className="text-xs text-text-muted/60">({temperature.toFixed(1)})</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setSetting(SETTINGS_KEYS.AI_TEMPERATURE, e.target.value)}
          className="w-full accent-accent"
        />

        <label className="text-sm text-text-muted">Max Tokens</label>
        <input
          type="number"
          min="1"
          max="128000"
          value={maxTokens}
          onChange={(e) => setSetting(SETTINGS_KEYS.AI_MAX_TOKENS, e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={handleTestConnection}
          disabled={testStatus === 'testing' || !endpoint || !apiKey}
          className="rounded-card bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleSaveProvider}
          className="rounded-card border border-border px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          Save Provider
        </button>
      </div>

      {testMessage && (
        <div className="flex items-center gap-2 mt-1">
          {testStatus === 'success' && (
            <span className="text-sm text-success">{testMessage}</span>
          )}
          {testStatus === 'error' && (
            <span className="text-sm text-danger">{testMessage}</span>
          )}
          {testStatus === 'idle' && testMessage && (
            <span className="text-sm text-text-muted">{testMessage}</span>
          )}
        </div>
      )}
    </div>
  );
}
