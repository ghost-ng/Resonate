export const SETTINGS_KEYS = {
  STT_ENGINE: 'stt_engine',
  WHISPER_MODEL_PATH: 'whisper_model_path',
  VOSK_MODEL_PATH: 'vosk_model_path',
  SHERPA_MODEL_PATH: 'sherpa_model_path',
  CLOUD_STT_ENDPOINT: 'cloud_stt_endpoint',
  CLOUD_STT_API_KEY: 'cloud_stt_api_key',
  CLOUD_STT_MODEL: 'cloud_stt_model',
  AI_ENDPOINT: 'ai_endpoint',
  AI_API_KEY: 'ai_api_key',
  AI_MODEL: 'ai_model',
  AI_TEMPERATURE: 'ai_temperature',
  AI_MAX_TOKENS: 'ai_max_tokens',
  AI_PROVIDER_TYPE: 'ai_provider_type',
  AI_PROVIDERS: 'ai_providers',
  AI_ACTIVE_PROVIDER_ID: 'ai_active_provider_id',
  AUTO_DETECT_ENABLED: 'auto_detect_enabled',
  AUTO_DETECT_APPS: 'auto_detect_apps',
  AUTO_DETECT_COOLDOWN_MS: 'auto_detect_cooldown_ms',
  AUTO_SUMMARIZE: 'auto_summarize',
  AUDIO_INPUT_DEVICE: 'audio_input_device',
  AUDIO_OUTPUT_DEVICE: 'audio_output_device',
  STORAGE_PATH: 'storage_path',
} as const;

export type AiProviderType = 'openai' | 'anthropic' | 'custom';

export interface AiProvider {
  id: string;
  name: string;
  type: AiProviderType;
  endpoint: string;
  apiKey: string;       // stored encrypted
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_AI_PROVIDERS: AiProvider[] = [
  {
    id: 'openai-default',
    name: 'OpenAI',
    type: 'openai',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
  },
  {
    id: 'anthropic-default',
    name: 'Anthropic',
    type: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 4096,
  },
  {
    id: 'custom-default',
    name: 'Custom OpenAI-compatible',
    type: 'custom',
    endpoint: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
  },
];

export interface AutoDetectApp {
  name: string;
  exe: string;
  behavior: 'prompt' | 'always' | 'never';
}

export const DEFAULT_AUTO_DETECT_APPS: AutoDetectApp[] = [
  { name: 'Microsoft Teams', exe: 'Teams.exe', behavior: 'prompt' },
  { name: 'Zoom', exe: 'Zoom.exe', behavior: 'prompt' },
  { name: 'Skype', exe: 'Skype.exe', behavior: 'prompt' },
  { name: 'Slack', exe: 'slack.exe', behavior: 'prompt' },
  { name: 'WebEx', exe: 'webexmeetingmanager.exe', behavior: 'prompt' },
  { name: 'Discord', exe: 'Discord.exe', behavior: 'prompt' },
];
