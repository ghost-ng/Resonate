export const APP_NAME = 'youRecord';
export const DB_FILENAME = 'yourecord.db';
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 2;
export const AUDIO_BIT_DEPTH = 16;
export const PROCESS_MONITOR_INTERVAL_MS = 5000;
export const STT_WORKER_TIMEOUT_MS = 300_000;
export const DEFAULT_SYSTEM_PROMPT = `You are a meeting notes assistant. Analyze the provided transcript and produce structured notes including: key decisions, discussion topics, action items with assignees, and a brief summary. Format in markdown.`;
export const DEFAULT_USER_PROMPT_TEMPLATE = `Here is the transcript from a {{duration}} minute {{source_app}} call with {{participant_count}} participants on {{date}}:\n\n{{transcript}}\n\nPlease generate structured meeting notes.`;

export interface DefaultPromptProfileSeed {
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
}

export const DEFAULT_PROMPT_PROFILES: DefaultPromptProfileSeed[] = [
  {
    name: 'Meeting Notes',
    system_prompt:
      'You are a meeting notes assistant. Analyze the provided transcript and produce structured notes including: key decisions, discussion topics, action items with assignees, and a brief summary. Format in markdown.',
    user_prompt_template:
      'Here is the transcript from a {{duration}} minute {{source_app}} call with {{participant_count}} participants on {{date}}:\n\n{{transcript}}\n\nPlease generate structured meeting notes.',
    is_default: true,
  },
  {
    name: 'Action Items Only',
    system_prompt:
      'Extract only the action items from this meeting transcript. List each action item with the responsible person if mentioned. Be concise.',
    user_prompt_template:
      'Transcript:\n\n{{transcript}}\n\nList all action items.',
    is_default: false,
  },
  {
    name: 'Executive Summary',
    system_prompt:
      'Write a brief executive summary of this meeting. Focus on decisions made, key outcomes, and next steps. Keep it under 200 words.',
    user_prompt_template:
      'Meeting transcript ({{duration}} min, {{date}}):\n\n{{transcript}}\n\nProvide an executive summary.',
    is_default: false,
  },
  {
    name: 'Detailed Minutes',
    system_prompt:
      'Create detailed meeting minutes including: attendees, agenda items discussed, decisions, action items, follow-ups, and timeline. Use a formal tone.',
    user_prompt_template:
      'Full transcript from {{source_app}} meeting on {{date}} ({{duration}} minutes, {{participant_count}} participants):\n\n{{transcript}}\n\nGenerate detailed meeting minutes.',
    is_default: false,
  },
  {
    name: 'Custom',
    system_prompt: '',
    user_prompt_template: '{{transcript}}',
    is_default: false,
  },
];
