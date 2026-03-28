export interface Notebook {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: number;
  notebook_id: number | null;
  title: string;
  source_app: string | null;
  audio_file_path: string | null;
  duration_seconds: number;
  participant_count: number;
  status: 'recording' | 'transcribing' | 'summarizing' | 'complete' | 'error';
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: number;
  recording_id: number;
  engine_used: string;
  full_text: string | null;
  created_at: string;
}

export interface TranscriptSegmentRow {
  id: number;
  transcript_id: number;
  speaker: string | null;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

export interface Summary {
  id: number;
  recording_id: number;
  model_used: string | null;
  system_prompt_used: string | null;
  content: string | null;
  created_at: string;
}

export interface ActionItem {
  id: number;
  summary_id: number;
  text: string;
  assignee: string | null;
  completed: number;
  sort_order: number;
}

export interface PromptProfile {
  id: number;
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
