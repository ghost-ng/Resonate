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
  AUTO_DETECT_ENABLED: 'auto_detect_enabled',
  AUTO_DETECT_APPS: 'auto_detect_apps',
  AUTO_DETECT_COOLDOWN_MS: 'auto_detect_cooldown_ms',
  AUTO_SUMMARIZE: 'auto_summarize',
  AUDIO_INPUT_DEVICE: 'audio_input_device',
  AUDIO_OUTPUT_DEVICE: 'audio_output_device',
  STORAGE_PATH: 'storage_path',
} as const;

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
