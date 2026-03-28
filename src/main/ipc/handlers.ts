import type { ServiceContainer } from '../index';

import { registerNotebookHandlers } from './notebook.ipc';
import { registerRecordingHandlers } from './recording.ipc';
import { registerTranscriptHandlers } from './transcript.ipc';
import { registerSummaryHandlers } from './summary.ipc';
import { registerPromptProfileHandlers } from './prompt-profile.ipc';
import { registerSettingsHandlers } from './settings.ipc';

export function registerAllHandlers(services: ServiceContainer): void {
  registerNotebookHandlers(services.notebooks);
  registerRecordingHandlers(services);
  registerTranscriptHandlers(services);
  registerSummaryHandlers(services);
  registerPromptProfileHandlers(services.promptProfiles);
  registerSettingsHandlers(services);
}
