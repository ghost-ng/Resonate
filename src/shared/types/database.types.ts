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

export interface WorkspaceCard {
  id: number;
  recording_id: number;
  card_type: 'transcript' | 'summary' | 'action_items' | 'custom_task';
  title: string;
  grid_col: number;
  grid_row: number;
  grid_w: number;
  grid_h: number;
  collapsed: number;
  sort_order: number;
  created_at: string;
}

export interface CustomTask {
  id: number;
  card_id: number;
  text: string;
  completed: number;
  source_segment_id: number | null;
  sort_order: number;
  created_at: string;
}

export interface TranscriptHighlight {
  id: number;
  recording_id: number;
  segment_id: number;
  highlight_type: 'important' | 'task_source' | 'date_reminder';
  color: string;
  note: string | null;
  reminder_date: string | null;
  created_at: string;
}
