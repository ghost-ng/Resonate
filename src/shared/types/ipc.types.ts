import type { Notebook, Recording, Transcript, TranscriptSegmentRow, Summary, ActionItem, PromptProfile, WorkspaceCard, CustomTask, TranscriptHighlight } from './database.types';

export interface TranscriptWithSegments extends Transcript {
  segments: TranscriptSegmentRow[];
}

export interface SummaryWithActions extends Summary {
  action_items: ActionItem[];
}

export interface IpcChannelMap {
  'notebook:list': { args: void; result: Notebook[] };
  'notebook:create': { args: { name: string; icon: string }; result: Notebook };
  'notebook:update': { args: { id: number; name?: string; icon?: string; sort_order?: number }; result: Notebook };
  'notebook:delete': { args: { id: number }; result: void };

  'recording:list': { args: { notebookId?: number; search?: string }; result: Recording[] };
  'recording:get': { args: { id: number }; result: Recording | null };
  'recording:create': { args: { title: string; notebookId?: number; sourceApp?: string }; result: Recording };
  'recording:update': { args: { id: number; title?: string; notebook_id?: number | null; status?: string }; result: Recording };
  'recording:delete': { args: { id: number }; result: void };

  'recording:start-capture': { args: { recordingId: number }; result: void };
  'recording:stop-capture': { args: void; result: { durationSeconds: number; audioFilePath: string } };

  'transcript:get': { args: { recordingId: number }; result: TranscriptWithSegments | null };
  'transcript:start': { args: { recordingId: number; engine?: string }; result: void };
  'transcript:rename-speaker': { args: { transcriptId: number; originalName: string; displayName: string }; result: TranscriptWithSegments | null };
  'transcript:reassign-speakers': { args: { transcriptId: number; speakerCount: number }; result: TranscriptWithSegments | null };

  'summary:get': { args: { recordingId: number }; result: SummaryWithActions | null };
  'summary:get-by-id': { args: { id: number }; result: SummaryWithActions | null };
  'summary:generate': { args: { recordingId: number; profileId?: number }; result: { summaryId: number } | void };

  'action-item:toggle': { args: { id: number; completed: boolean }; result: ActionItem | undefined };
  'action-item:update': { args: { id: number; text?: string; assignee?: string | null }; result: ActionItem | undefined };

  'prompt-profile:list': { args: void; result: PromptProfile[] };
  'prompt-profile:create': { args: { name: string; system_prompt: string; user_prompt_template: string; is_default?: number }; result: PromptProfile };
  'prompt-profile:update': { args: { id: number; name?: string; system_prompt?: string; user_prompt_template?: string; is_default?: number }; result: PromptProfile };
  'prompt-profile:set-default': { args: { id: number }; result: PromptProfile | undefined };
  'prompt-profile:delete': { args: { id: number }; result: void };

  'settings:get': { args: { key: string }; result: string | null };
  'settings:set': { args: { key: string; value: string }; result: void };
  'settings:getAll': { args: void; result: Record<string, string> };

  'audio:get-devices': { args: void; result: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] } };

  'app:reset-settings': { args: void; result: void };
  'app:erase-all-data': { args: void; result: void };
  'app:get-storage-info': { args: void; result: { dbSizeBytes: number; audioSizeBytes: number; recordingCount: number; audioFileCount: number } };
  'app:toggle-debug': { args: void; result: boolean };

  'ai:list-models': {
    args: { endpoint: string; apiKey: string; type: 'openai' | 'anthropic' };
    result: { models: string[]; error?: string };
  };

  'workspace-card:list': { args: { recordingId: number }; result: WorkspaceCard[] };
  'workspace-card:get': { args: { id: number }; result: WorkspaceCard | null };
  'workspace-card:create': { args: { recording_id: number; card_type: string; title: string; grid_col?: number; grid_row?: number; grid_w?: number; grid_h?: number; reference_id?: number; sort_order?: number }; result: WorkspaceCard };
  'workspace-card:update': { args: { id: number; title?: string; grid_col?: number; grid_row?: number; grid_w?: number; grid_h?: number; collapsed?: number; sort_order?: number; reference_id?: number | null }; result: WorkspaceCard };
  'workspace-card:delete': { args: { id: number }; result: void };
  'workspace-card:init-defaults': { args: { recordingId: number }; result: WorkspaceCard[] };

  'custom-task:list': { args: { cardId: number }; result: CustomTask[] };
  'custom-task:create': { args: { card_id: number; text: string; source_segment_id?: number }; result: CustomTask };
  'custom-task:update': { args: { id: number; text?: string; completed?: number; sort_order?: number; assignee?: string | null }; result: CustomTask };
  'custom-task:delete': { args: { id: number }; result: void };

  'highlight:list': { args: { recordingId: number }; result: TranscriptHighlight[] };
  'highlight:create': { args: { recording_id: number; segment_id: number; highlight_type: string; color?: string; note?: string; reminder_date?: string }; result: TranscriptHighlight };
  'highlight:update': { args: { id: number; color?: string; note?: string; reminder_date?: string }; result: TranscriptHighlight };
  'highlight:delete': { args: { id: number }; result: void };

  'app:set-always-on-top': { args: { enabled: boolean }; result: boolean };
  'app:popout-recording': { args: void; result: boolean };
  'app:popin-recording': { args: void; result: boolean };
  'app:browse-exe': { args: void; result: { path: string; name: string } | null };
  'app:list-processes': { args: void; result: { name: string; exe: string; path: string }[] };

  'tutorial:seed-data': { args: void; result: { notebookId: number; alreadyExists: boolean } };
}

export interface IpcEventMap {
  'recording:status-changed': { recordingId: number; status: string };
  'recording:audio-levels': { mic: number; system: number };
  'transcript:progress': { recordingId: number; percent: number };
  'auto-detect:app-found': { appName: string; processName: string };
  'mini-window:closed': void;
}

export interface AudioDeviceInfo {
  id: string;
  name: string;
  isDefault: boolean;
}

export type IpcChannel = keyof IpcChannelMap;
export type IpcEvent = keyof IpcEventMap;
