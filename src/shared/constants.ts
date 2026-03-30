export const APP_NAME = 'Resonate';
export const APP_VERSION = '0.1.1';
export const DB_FILENAME = 'resonate.db';
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 2;
export const AUDIO_BIT_DEPTH = 16;
export const PROCESS_MONITOR_INTERVAL_MS = 5000;
export const STT_WORKER_TIMEOUT_MS = 300_000;
export const DEFAULT_SYSTEM_PROMPT = `You are a meeting notes assistant. Analyze ONLY the provided transcript — do NOT invent, assume, or hallucinate any information not present in the transcript. If the transcript is too short or unclear to summarize meaningfully, say so. Produce structured notes including: key decisions, discussion topics, action items with assignees, and a brief summary. Format in markdown.`;
export const DEFAULT_USER_PROMPT_TEMPLATE = `Here is the transcript from a {{duration}} minute {{source_app}} call with {{participant_count}} participants on {{date}}:\n\n{{transcript}}\n\nPlease generate structured meeting notes based ONLY on what is in the transcript above. Do not add any information that is not in the transcript.`;

export interface DefaultPromptProfileSeed {
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
}

export const ANTI_HALLUCINATION = 'IMPORTANT: Use ONLY information from the transcript. Do NOT invent, assume, or add any details not explicitly stated. If the transcript is too short or unclear, say so honestly. Return your response as plain markdown (NOT inside a code block). Use headings, bullet points, and bold text for structure.';

export const TASK_EXTRACTION_HINT = 'When extracting action items, capture both explicit AND implicit tasks: direct assignments, suggestions ("maybe we should..."), commitments ("I\'ll handle that"), requests ("can you..."), plans ("let\'s do X next week"), offers ("I can take care of that"), follow-ups ("we need to circle back on..."), and feedback that implies revision work. If someone agrees to do something or receives feedback they need to act on, that is a task. Format each action item as a markdown checkbox: "- [ ] Task description (Assignee)". Do NOT group them under sub-headings or participant labels.';

export const DEFAULT_PROMPT_PROFILES: DefaultPromptProfileSeed[] = [
  {
    name: 'Meeting Notes',
    system_prompt:
      `You are a meeting notes assistant. Analyze ONLY the provided transcript and produce structured notes. ${ANTI_HALLUCINATION} Include: brief summary, discussion topics, key decisions, and action items with assignees. ${TASK_EXTRACTION_HINT} In the Action Items section, be thorough — include every task, commitment, suggestion, and piece of feedback that someone needs to act on.`,
    user_prompt_template:
      'Here is the transcript from a {{duration}} {{source_app}} call with {{participant_count}} participants on {{date}}:\n\n{{transcript}}\n\nGenerate meeting notes based strictly on the transcript above. Be thorough with action items — include explicit tasks AND implicit ones (suggestions to act on, feedback requiring revisions, commitments made).',
    is_default: true,
  },
  {
    name: 'Action Items Only',
    system_prompt:
      `Extract action items from this transcript. ${ANTI_HALLUCINATION} ${TASK_EXTRACTION_HINT} If there are no action items, say "No action items found."`,
    user_prompt_template:
      'Transcript:\n\n{{transcript}}\n\nExtract every action item — explicit tasks, suggestions to act on, commitments, feedback requiring revision, and follow-ups. Format as a flat checklist using "- [ ]" syntax with the assignee in parentheses at the end of each item.',
    is_default: false,
  },
  {
    name: 'Executive Summary',
    system_prompt:
      `Write a brief summary of this conversation. ${ANTI_HALLUCINATION} Focus on what was actually discussed. Keep it under 200 words.`,
    user_prompt_template:
      'Transcript ({{duration}}, {{date}}):\n\n{{transcript}}\n\nSummarize only what was discussed in this transcript.',
    is_default: false,
  },
  {
    name: 'Detailed Minutes',
    system_prompt:
      `Create detailed meeting minutes based strictly on the transcript. ${ANTI_HALLUCINATION} Include: speakers mentioned, topics discussed, any decisions or action items. ${TASK_EXTRACTION_HINT} Use a formal tone. In the Action Items section, be thorough — include every task, commitment, suggestion, and piece of feedback that someone needs to act on.`,
    user_prompt_template:
      'Full transcript from {{source_app}} on {{date}} ({{duration}}, {{participant_count}} participants):\n\n{{transcript}}\n\nGenerate detailed minutes using only information from this transcript.',
    is_default: false,
  },
  {
    name: 'Custom',
    system_prompt: '',
    user_prompt_template: '{{transcript}}',
    is_default: false,
  },
];
