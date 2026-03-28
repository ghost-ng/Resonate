# youRecord Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Electron desktop app that captures call audio, transcribes it via configurable STT engines, and generates AI-powered meeting notes in a notebook-style UI.

**Architecture:** Electron monolith with React renderer, Node.js main process handling WASAPI audio capture via native-recorder-nodejs, better-sqlite3 for storage, and configurable OpenAI-compatible endpoints for STT and summarization. IPC via contextBridge with typed channels.

**Tech Stack:** Electron + electron-forge (Vite), React 18, TypeScript, TailwindCSS, Zustand, better-sqlite3, native-recorder-nodejs, smart-whisper, vosk, sherpa-onnx, Vitest

**Spec:** `docs/superpowers/specs/2026-03-28-yourecord-design.md`

---

## File Structure

```
src/
├── main/                              # Electron main process
│   ├── index.ts                       # App entry, BrowserWindow, lifecycle
│   ├── ipc/
│   │   ├── handlers.ts                # Central IPC handler registration
│   │   ├── notebook.ipc.ts            # Notebook CRUD handlers
│   │   ├── recording.ipc.ts           # Recording lifecycle handlers
│   │   ├── transcript.ipc.ts          # Transcript + segment handlers
│   │   ├── summary.ipc.ts             # Summary + action item handlers
│   │   ├── prompt-profile.ipc.ts      # Prompt profile CRUD handlers
│   │   └── settings.ipc.ts            # Settings get/set handlers
│   ├── services/
│   │   ├── audio-capture.service.ts   # WASAPI recording via native-recorder-nodejs
│   │   ├── wav-writer.service.ts      # Stereo WAV interleaving + format conversion
│   │   ├── process-monitor.service.ts # Auto-detect running call apps
│   │   ├── stt-router.service.ts      # STT engine routing + dispatch
│   │   ├── ai-summary.service.ts      # OpenAI-compatible summarization
│   │   ├── safe-storage.service.ts    # Electron safeStorage for API keys
│   │   └── tray.service.ts            # System tray icon + menu
│   ├── stt/
│   │   ├── engines/
│   │   │   ├── whisper.engine.ts      # whisper.cpp adapter
│   │   │   ├── vosk.engine.ts         # vosk adapter
│   │   │   ├── sherpa.engine.ts       # sherpa-onnx adapter
│   │   │   └── cloud.engine.ts        # HTTP POST to OpenAI-compatible endpoint
│   │   ├── adapters/
│   │   │   ├── whisper.adapter.ts     # Normalize whisper output
│   │   │   ├── vosk.adapter.ts        # Aggregate vosk words into segments
│   │   │   ├── sherpa.adapter.ts      # Normalize sherpa output
│   │   │   └── cloud.adapter.ts       # Normalize cloud API response
│   │   └── workers/
│   │       ├── whisper.worker.ts      # Worker thread for whisper
│   │       ├── vosk.worker.ts         # Worker thread for vosk
│   │       └── sherpa.worker.ts       # Worker thread for sherpa
│   └── db/
│       ├── connection.ts              # Singleton DB connection (WAL mode)
│       ├── migrations/
│       │   └── 001_initial_schema.ts  # All tables
│       ├── migration-runner.ts        # Sequential migration runner
│       └── repositories/
│           ├── notebook.repo.ts
│           ├── recording.repo.ts
│           ├── transcript.repo.ts
│           ├── summary.repo.ts
│           ├── action-item.repo.ts
│           ├── prompt-profile.repo.ts
│           └── settings.repo.ts
│
├── preload/
│   ├── index.ts                       # contextBridge.exposeInMainWorld
│   └── preload.d.ts                   # Window type augmentation
│
├── renderer/
│   ├── main.tsx                       # ReactDOM.createRoot entry
│   ├── App.tsx                        # Root component, DnD context
│   ├── index.css                      # Tailwind directives + CSS variables
│   ├── stores/
│   │   ├── notebook.store.ts
│   │   ├── recording.store.ts
│   │   ├── session.store.ts           # Real-time recording state
│   │   ├── settings.store.ts
│   │   └── ui.store.ts
│   ├── hooks/
│   │   ├── useIpc.ts                  # Typed wrapper for window.electronAPI
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useDragAndDrop.ts
│   │   ├── useContextMenu.ts
│   │   └── useRecordingTimer.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── MainContent.tsx
│   │   ├── sidebar/
│   │   │   ├── AppLogo.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── NotebookList.tsx
│   │   │   ├── NotebookItem.tsx
│   │   │   ├── RecentRecordings.tsx
│   │   │   └── SidebarFooter.tsx
│   │   ├── recording/
│   │   │   ├── RecordingView.tsx
│   │   │   ├── RecordingHeader.tsx
│   │   │   ├── RecordButton.tsx
│   │   │   ├── AutoDetectBanner.tsx
│   │   │   └── RecordingMetadata.tsx
│   │   ├── transcript/
│   │   │   ├── TranscriptCard.tsx
│   │   │   ├── TranscriptSegment.tsx
│   │   │   └── SpeakerLabel.tsx
│   │   ├── summary/
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── ActionItemList.tsx
│   │   │   ├── ActionItem.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── SttEngineConfig.tsx
│   │   │   ├── AiEndpointConfig.tsx
│   │   │   ├── PromptProfileEditor.tsx
│   │   │   ├── AutoDetectSettings.tsx
│   │   │   └── AudioDeviceSettings.tsx
│   │   └── shared/
│   │       ├── ContextMenu.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── Checkbox.tsx
│   └── lib/
│       ├── colors.ts                  # Speaker color palette
│       ├── formatters.ts              # Duration, timestamp formatting
│       └── constants.ts
│
└── shared/                            # Shared between main + renderer
    ├── types/
    │   ├── database.types.ts          # Row types matching DB schema
    │   ├── ipc.types.ts               # IPC channel + payload types
    │   ├── stt.types.ts               # TranscriptSegment, engine types
    │   └── settings.types.ts          # Settings keys + value types
    └── constants.ts
```

Additional root files:
```
package.json
tsconfig.json
forge.config.ts
vite.main.config.ts
vite.preload.config.ts
vite.renderer.config.ts
tailwind.config.ts
vitest.config.ts
index.html
.gitignore
```

Test files:
```
tests/
├── setup.ts                           # Vitest global setup (in-memory SQLite)
├── main/
│   └── db/repositories/
│       ├── notebook.repo.test.ts
│       ├── recording.repo.test.ts
│       ├── transcript.repo.test.ts
│       ├── summary.repo.test.ts
│       ├── prompt-profile.repo.test.ts
│       └── settings.repo.test.ts
├── main/services/
│   ├── stt-router.test.ts
│   ├── ai-summary.test.ts
│   └── process-monitor.test.ts
└── renderer/
    └── stores/
        ├── notebook.store.test.ts
        └── recording.store.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `forge.config.ts`, `vite.*.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`

- [ ] **Step 1: Scaffold Electron project into temp directory**

```bash
cd C:/Users/miguel/OneDrive/Documents
npx create-electron-app youRecord-scaffold --template=vite-typescript
```

- [ ] **Step 2: Copy scaffold files into existing youRecord directory**

```bash
# Copy all files except .git from scaffold into youRecord
cp -r youRecord-scaffold/* youRecord/
cp youRecord-scaffold/.gitignore youRecord/
rm -rf youRecord-scaffold
```

- [ ] **Step 3: Install core dependencies**

```bash
cd C:/Users/miguel/OneDrive/Documents/youRecord
npm install react react-dom zustand better-sqlite3 @dnd-kit/core @dnd-kit/sortable react-markdown
npm install -D @types/react @types/react-dom @types/better-sqlite3 tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Configure Vite for native modules**

In `vite.main.config.ts`, add:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'native-recorder-nodejs', 'smart-whisper', 'vosk', 'sherpa-onnx', 'electron'],
    },
  },
});
```

- [ ] **Step 5: Create TailwindCSS config**

Create `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts,html}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'hsl(228, 20%, 9%)' },
        surface: { DEFAULT: 'hsl(228, 18%, 14%)', 2: 'hsl(228, 16%, 18%)', 3: 'hsl(228, 14%, 22%)' },
        border: { DEFAULT: 'hsl(228, 12%, 26%)' },
        text: { DEFAULT: '#e4e6ef', muted: '#8b90a5' },
        accent: { DEFAULT: '#5b8def', hover: '#6e9cf2', glow: 'rgba(91, 141, 239, 0.15)' },
        success: '#00c853',
        danger: '#ff5252',
        recording: '#ff3b3b',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        base: ['12px', { lineHeight: '1.5' }],
        xs: ['10px', { lineHeight: '1.4' }],
        sm: ['11px', { lineHeight: '1.5' }],
        md: ['13px', { lineHeight: '1.5' }],
        lg: ['14px', { lineHeight: '1.5' }],
        xl: ['16px', { lineHeight: '1.4' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
      },
      width: { sidebar: '220px' },
      borderRadius: { card: '6px' },
      spacing: { card: '10px' },
      animation: {
        'pulse-recording': 'pulse 1.5s ease-in-out infinite',
        'recording-ring': 'recording-ring 1.5s ease-out infinite',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        'recording-ring': { '0%': { transform: 'scale(1)', opacity: '0.6' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        'slide-down': { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Create CSS entry with Tailwind directives**

Create `src/renderer/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }
body { @apply bg-bg text-text font-sans text-base; overflow: hidden; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { @apply bg-surface-3 rounded-full; }
```

- [ ] **Step 7: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
```

- [ ] **Step 8: Create .gitignore**

Append to `.gitignore`:
```
node_modules/
out/
.vite/
dist/
*.db
*.wav
```

- [ ] **Step 9: Verify scaffold runs**

```bash
npm start
```
Expected: Electron window opens with default boilerplate.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + React + TailwindCSS project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/shared/types/database.types.ts`, `src/shared/types/ipc.types.ts`, `src/shared/types/stt.types.ts`, `src/shared/types/settings.types.ts`, `src/shared/constants.ts`

- [ ] **Step 1: Create database row types**

Create `src/shared/types/database.types.ts`:
```typescript
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
  completed: number; // 0 or 1
  sort_order: number;
}

export interface PromptProfile {
  id: number;
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
```

- [ ] **Step 2: Create STT types**

Create `src/shared/types/stt.types.ts`:
```typescript
export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

export type SttEngineName = 'whisper' | 'vosk' | 'sherpa' | 'cloud';

export interface SttEngineConfig {
  engine: SttEngineName;
  modelPath?: string;
  cloudEndpoint?: string;
  cloudApiKey?: string;
  cloudModel?: string;
  language?: string;
}

export interface SttEngine {
  name: SttEngineName;
  transcribe(wavPath: string, config: SttEngineConfig): Promise<TranscriptSegment[]>;
  isAvailable(): Promise<boolean>;
  dispose(): void;
}

// Worker thread message protocol
export type WorkerRequest =
  | { type: 'transcribe'; id: string; wavPath: string; config: SttEngineConfig }
  | { type: 'dispose' };

export type WorkerResponse =
  | { type: 'result'; id: string; segments: TranscriptSegment[] }
  | { type: 'progress'; id: string; percent: number }
  | { type: 'error'; id: string; message: string };
```

- [ ] **Step 3: Create IPC channel types**

Create `src/shared/types/ipc.types.ts`:
```typescript
import type { Notebook, Recording, Transcript, TranscriptSegmentRow, Summary, ActionItem, PromptProfile } from './database.types';

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

  'summary:get': { args: { recordingId: number }; result: SummaryWithActions | null };
  'summary:generate': { args: { recordingId: number; profileId?: number }; result: void };

  'action-item:toggle': { args: { id: number; completed: boolean }; result: void };

  'prompt-profile:list': { args: void; result: PromptProfile[] };
  'prompt-profile:create': { args: { name: string; system_prompt: string; user_prompt_template: string; is_default?: number }; result: PromptProfile };
  'prompt-profile:update': { args: { id: number; name?: string; system_prompt?: string; user_prompt_template?: string; is_default?: number }; result: PromptProfile };
  'prompt-profile:delete': { args: { id: number }; result: void };

  'settings:get': { args: { key: string }; result: string | null };
  'settings:set': { args: { key: string; value: string }; result: void };
  'settings:getAll': { args: void; result: Record<string, string> };

  'audio:get-devices': { args: void; result: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] } };
}

export interface IpcEventMap {
  'recording:status-changed': { recordingId: number; status: string };
  'recording:audio-levels': { mic: number; system: number };
  'transcript:progress': { recordingId: number; percent: number };
  'auto-detect:app-found': { appName: string; processName: string };
}

export interface AudioDeviceInfo {
  id: string;
  name: string;
  isDefault: boolean;
}

export type IpcChannel = keyof IpcChannelMap;
export type IpcEvent = keyof IpcEventMap;
```

- [ ] **Step 4: Create settings types**

Create `src/shared/types/settings.types.ts`:
```typescript
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
```

- [ ] **Step 5: Create shared constants**

Create `src/shared/constants.ts`:
```typescript
export const APP_NAME = 'youRecord';
export const DB_FILENAME = 'yourecord.db';
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 2; // stereo: mic left, system right
export const AUDIO_BIT_DEPTH = 16;
export const PROCESS_MONITOR_INTERVAL_MS = 5000;
export const STT_WORKER_TIMEOUT_MS = 300_000; // 5 minutes
export const DEFAULT_SYSTEM_PROMPT = `You are a meeting notes assistant. Analyze the provided transcript and produce structured notes including: key decisions, discussion topics, action items with assignees, and a brief summary. Format in markdown.`;
export const DEFAULT_USER_PROMPT_TEMPLATE = `Here is the transcript from a {{duration}} minute {{source_app}} call with {{participant_count}} participants:\n\n{{transcript}}\n\nPlease generate structured meeting notes.`;
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared type definitions for DB, IPC, STT, and settings"
```

---

## Task 3: Database Layer

**Files:**
- Create: `src/main/db/connection.ts`, `src/main/db/migration-runner.ts`, `src/main/db/migrations/001_initial_schema.ts`
- Create: All repository files in `src/main/db/repositories/`
- Test: `tests/main/db/repositories/*.test.ts`, `tests/setup.ts`

- [ ] **Step 1: Write test setup with in-memory SQLite**

Create `tests/setup.ts`:
```typescript
import Database from 'better-sqlite3';
import { initialSchema } from '../src/main/db/migrations/001_initial_schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initialSchema(db);
  return db;
}
```

- [ ] **Step 2: Write failing tests for NotebookRepository**

Create `tests/main/db/repositories/notebook.repo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../../../setup';
import { NotebookRepository } from '../../../../src/main/db/repositories/notebook.repo';
import Database from 'better-sqlite3';

describe('NotebookRepository', () => {
  let db: Database.Database;
  let repo: NotebookRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new NotebookRepository(db);
  });

  it('creates and retrieves a notebook', () => {
    const nb = repo.create('Work Meetings', '💼');
    expect(nb.name).toBe('Work Meetings');
    expect(nb.icon).toBe('💼');
    expect(nb.id).toBeGreaterThan(0);
  });

  it('lists all notebooks ordered by sort_order', () => {
    repo.create('B', '📁');
    repo.create('A', '📁');
    const all = repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('updates a notebook', () => {
    const nb = repo.create('Old Name', '📁');
    const updated = repo.update(nb.id, { name: 'New Name', icon: '🚀' });
    expect(updated.name).toBe('New Name');
    expect(updated.icon).toBe('🚀');
  });

  it('deletes a notebook', () => {
    const nb = repo.create('To Delete', '📁');
    repo.delete(nb.id);
    expect(repo.findAll()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/main/db/repositories/notebook.repo.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement DB connection**

Create `src/main/db/connection.ts`:
```typescript
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { DB_FILENAME } from '../../shared/constants';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), DB_FILENAME);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

- [ ] **Step 5: Implement initial migration**

Create `src/main/db/migrations/001_initial_schema.ts`:
```typescript
import type Database from 'better-sqlite3';

export function initialSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notebooks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      icon        TEXT DEFAULT '📁',
      sort_order  INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      notebook_id       INTEGER REFERENCES notebooks(id) ON DELETE SET NULL,
      title             TEXT NOT NULL,
      source_app        TEXT,
      audio_file_path   TEXT,
      duration_seconds  INTEGER DEFAULT 0,
      participant_count INTEGER DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'recording'
                        CHECK(status IN ('recording','transcribing','summarizing','complete','error')),
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_recordings_notebook ON recordings(notebook_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

    CREATE TABLE IF NOT EXISTS transcripts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id  INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      engine_used   TEXT NOT NULL,
      full_text     TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_transcripts_recording ON transcripts(recording_id);

    CREATE TABLE IF NOT EXISTS transcript_segments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      transcript_id  INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
      speaker        TEXT,
      text           TEXT NOT NULL,
      start_time_ms  INTEGER NOT NULL,
      end_time_ms    INTEGER NOT NULL,
      confidence     REAL DEFAULT 0.0
    );
    CREATE INDEX IF NOT EXISTS idx_segments_transcript ON transcript_segments(transcript_id);

    CREATE TABLE IF NOT EXISTS summaries (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id        INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      model_used          TEXT,
      system_prompt_used  TEXT,
      content             TEXT,
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_summaries_recording ON summaries(recording_id);

    CREATE TABLE IF NOT EXISTS action_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_id  INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      assignee    TEXT,
      completed   INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_action_items_summary ON action_items(summary_id);

    CREATE TABLE IF NOT EXISTS prompt_profiles (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT NOT NULL,
      system_prompt         TEXT NOT NULL,
      user_prompt_template  TEXT NOT NULL,
      is_default            INTEGER DEFAULT 0,
      created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key    TEXT PRIMARY KEY,
      value  TEXT
    );
  `);
}
```

- [ ] **Step 6: Implement migration runner**

Create `src/main/db/migration-runner.ts`:
```typescript
import type Database from 'better-sqlite3';
import { initialSchema } from './migrations/001_initial_schema';

interface Migration {
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { name: '001_initial_schema', up: initialSchema },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map(r => r.name)
  );

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      const run = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
      });
      run();
    }
  }
}
```

- [ ] **Step 7: Implement NotebookRepository**

Create `src/main/db/repositories/notebook.repo.ts`:
```typescript
import type Database from 'better-sqlite3';
import type { Notebook } from '../../../shared/types/database.types';

export class NotebookRepository {
  constructor(private db: Database.Database) {}

  findAll(): Notebook[] {
    return this.db.prepare('SELECT * FROM notebooks ORDER BY sort_order, id').all() as Notebook[];
  }

  findById(id: number): Notebook | undefined {
    return this.db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook | undefined;
  }

  create(name: string, icon: string): Notebook {
    const info = this.db.prepare('INSERT INTO notebooks (name, icon) VALUES (?, ?)').run(name, icon);
    return this.findById(info.lastInsertRowid as number)!;
  }

  update(id: number, data: { name?: string; icon?: string; sort_order?: number }): Notebook {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    this.db.prepare(`UPDATE notebooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
  }
}
```

- [ ] **Step 8: Run notebook repo tests**

```bash
npx vitest run tests/main/db/repositories/notebook.repo.test.ts
```
Expected: All 4 tests PASS.

- [ ] **Step 9: Implement remaining repositories**

Create each repository following the same pattern as NotebookRepository:
- `src/main/db/repositories/recording.repo.ts` — CRUD + findByNotebook + updateStatus + search
- `src/main/db/repositories/transcript.repo.ts` — create + findByRecording (with segments JOIN)
- `src/main/db/repositories/summary.repo.ts` — create + findByRecording (with action_items JOIN)
- `src/main/db/repositories/action-item.repo.ts` — toggleCompleted
- `src/main/db/repositories/prompt-profile.repo.ts` — CRUD + findDefault + setDefault
- `src/main/db/repositories/settings.repo.ts` — get + set + getAll

- [ ] **Step 10: Write and run tests for remaining repositories**

Write tests for recording, transcript, summary, prompt-profile, and settings repos.

```bash
npx vitest run tests/main/db/repositories/
```
Expected: All tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/main/db/ tests/
git commit -m "feat: add SQLite database layer with migrations and repositories"
```

---

## Task 4: IPC Layer + Preload

**Files:**
- Create: `src/preload/index.ts`, `src/preload/preload.d.ts`
- Create: `src/main/ipc/handlers.ts`, `src/main/ipc/notebook.ipc.ts`, `src/main/ipc/recording.ipc.ts`, `src/main/ipc/settings.ipc.ts`, `src/main/ipc/prompt-profile.ipc.ts`, `src/main/ipc/transcript.ipc.ts`, `src/main/ipc/summary.ipc.ts`

- [ ] **Step 1: Create preload script**

Create `src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannelMap, IpcEventMap } from '../shared/types/ipc.types';

const electronAPI = {
  invoke: <C extends keyof IpcChannelMap>(
    channel: C,
    args: IpcChannelMap[C]['args']
  ): Promise<IpcChannelMap[C]['result']> => {
    return ipcRenderer.invoke(channel, args);
  },
  on: <E extends keyof IpcEventMap>(
    event: E,
    callback: (data: IpcEventMap[E]) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IpcEventMap[E]) => callback(data);
    ipcRenderer.on(event, handler);
    return () => ipcRenderer.removeListener(event, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

- [ ] **Step 2: Create Window type augmentation**

Create `src/preload/preload.d.ts`:
```typescript
import type { IpcChannelMap, IpcEventMap } from '../shared/types/ipc.types';

interface ElectronAPI {
  invoke: <C extends keyof IpcChannelMap>(channel: C, args: IpcChannelMap[C]['args']) => Promise<IpcChannelMap[C]['result']>;
  on: <E extends keyof IpcEventMap>(event: E, callback: (data: IpcEventMap[E]) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 3: Implement IPC handlers**

Create `src/main/ipc/notebook.ipc.ts`:
```typescript
import { ipcMain } from 'electron';
import type { NotebookRepository } from '../db/repositories/notebook.repo';

export function registerNotebookHandlers(notebooks: NotebookRepository): void {
  ipcMain.handle('notebook:list', () => notebooks.findAll());
  ipcMain.handle('notebook:create', (_, args: { name: string; icon: string }) => notebooks.create(args.name, args.icon));
  ipcMain.handle('notebook:update', (_, args) => notebooks.update(args.id, args));
  ipcMain.handle('notebook:delete', (_, args: { id: number }) => notebooks.delete(args.id));
}
```

Create similar handlers for recording, transcript, summary, prompt-profile, and settings.

Create `src/main/ipc/handlers.ts`:
```typescript
import { registerNotebookHandlers } from './notebook.ipc';
import { registerRecordingHandlers } from './recording.ipc';
import { registerTranscriptHandlers } from './transcript.ipc';
import { registerSummaryHandlers } from './summary.ipc';
import { registerPromptProfileHandlers } from './prompt-profile.ipc';
import { registerSettingsHandlers } from './settings.ipc';
import type { ServiceContainer } from '../index';

export function registerAllIpcHandlers(services: ServiceContainer): void {
  registerNotebookHandlers(services.notebooks);
  registerRecordingHandlers(services.recordings);
  registerTranscriptHandlers(services.transcripts, services.sttRouter);
  registerSummaryHandlers(services.summaries, services.actionItems, services.aiSummary);
  registerPromptProfileHandlers(services.promptProfiles);
  registerSettingsHandlers(services.settings, services.safeStorage);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/preload/ src/main/ipc/
git commit -m "feat: add IPC layer with typed preload bridge and handlers"
```

---

## Task 5: Main Process Entry

**Files:**
- Create: `src/main/index.ts`
- Modify: Existing scaffold entry point

- [ ] **Step 1: Implement main process with service container**

Create `src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migration-runner';
import { NotebookRepository } from './db/repositories/notebook.repo';
import { RecordingRepository } from './db/repositories/recording.repo';
import { TranscriptRepository } from './db/repositories/transcript.repo';
import { SummaryRepository } from './db/repositories/summary.repo';
import { ActionItemRepository } from './db/repositories/action-item.repo';
import { PromptProfileRepository } from './db/repositories/prompt-profile.repo';
import { SettingsRepository } from './db/repositories/settings.repo';
import { registerAllIpcHandlers } from './ipc/handlers';

export interface ServiceContainer {
  notebooks: NotebookRepository;
  recordings: RecordingRepository;
  transcripts: TranscriptRepository;
  summaries: SummaryRepository;
  actionItems: ActionItemRepository;
  promptProfiles: PromptProfileRepository;
  settings: SettingsRepository;
  // Audio, STT, AI services added in later tasks
  sttRouter: any;
  aiSummary: any;
  safeStorage: any;
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // custom titlebar
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(() => {
  // Initialize database
  const db = getDatabase();
  runMigrations(db);

  // Create service container
  const services: ServiceContainer = {
    notebooks: new NotebookRepository(db),
    recordings: new RecordingRepository(db),
    transcripts: new TranscriptRepository(db),
    summaries: new SummaryRepository(db),
    actionItems: new ActionItemRepository(db),
    promptProfiles: new PromptProfileRepository(db),
    settings: new SettingsRepository(db),
    sttRouter: null,  // initialized in Task 8
    aiSummary: null,   // initialized in Task 9
    safeStorage: null,  // initialized in Task 9
  };

  // Register IPC handlers
  registerAllIpcHandlers(services);

  // Create window
  createWindow();
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

// Vite HMR declarations
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
```

- [ ] **Step 2: Verify app starts with database initialization**

```bash
npm start
```
Expected: App opens, SQLite DB created in userData directory.

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add main process entry with DB init and service container"
```

---

## Task 6: React UI Shell + Layout Components

**Files:**
- Create: `src/renderer/main.tsx`, `src/renderer/App.tsx`, all layout and sidebar components
- Create: Zustand stores

- [ ] **Step 1: Create React entry point**

Create `src/renderer/main.tsx`:
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
```

Update `index.html` to include `<div id="root"></div>` and link to the renderer entry.

- [ ] **Step 2: Create Zustand stores**

Create all 5 stores in `src/renderer/stores/`:
- `notebook.store.ts` — notebooks[], selectedNotebookId, CRUD actions via IPC
- `recording.store.ts` — recordings[], openTabIds[], activeTabId, tab management + CRUD
- `session.store.ts` — isRecording, durationMs, audioLevels, auto-detect banner state
- `settings.store.ts` — settings cache, prompt profiles, audio devices
- `ui.store.ts` — sidebarCollapsed, settingsPanelOpen, contextMenu, searchQuery

Each store's async actions call `window.electronAPI.invoke(...)`.

- [ ] **Step 3: Build AppShell layout**

Create `src/renderer/components/layout/AppShell.tsx`:
```tsx
// Flex container: sidebar (220px fixed) + main content (flex-1)
// Wraps everything in DndContext for drag-and-drop
```

- [ ] **Step 4: Build Sidebar with all sub-components**

Create sidebar components:
- `Sidebar.tsx` — 220px fixed width, flex column, bg-surface
- `AppLogo.tsx` — icon + "youRecord" text
- `SearchBar.tsx` — search input bound to uiStore.searchQuery
- `NotebookList.tsx` — renders NotebookItem for each notebook
- `NotebookItem.tsx` — emoji, name, count badge, click to select, drop target
- `RecentRecordings.tsx` — last 5 recordings, draggable items
- `SidebarFooter.tsx` — + Notebook and Settings buttons

- [ ] **Step 5: Build TabBar**

Create `src/renderer/components/layout/TabBar.tsx`:
- Browser-style tabs from recordingStore.openTabIds
- Active tab highlighted with accent border
- Close button per tab
- "+" button to create new recording
- Drag-to-reorder via @dnd-kit/sortable

- [ ] **Step 6: Build StatusBar**

Create `src/renderer/components/layout/StatusBar.tsx`:
- Shows: connection status dot, STT engine name, AI model, storage stats
- Reads from settingsStore

- [ ] **Step 7: Build MainContent + RecordingView**

Create `src/renderer/components/layout/MainContent.tsx` — routes between:
- Settings panel (if open)
- RecordingView (if activeTabId)
- Empty state (no tabs open)

Create recording view components:
- `RecordingView.tsx` — container loading transcript + summary for active recording
- `RecordingHeader.tsx` — editable title, metadata
- `RecordButton.tsx` — idle (red circle) / recording (pulsing with timer) states
- `AutoDetectBanner.tsx` — slide-down banner with app name + Start/Dismiss buttons
- `RecordingMetadata.tsx` — source app, duration, participants, date

- [ ] **Step 8: Verify the UI renders**

```bash
npm start
```
Expected: Dark-themed app with sidebar, tabs, and content area visible.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/
git commit -m "feat: add React UI shell with sidebar, tabs, and layout components"
```

---

## Task 7: Transcript + Summary UI Components

**Files:**
- Create: Transcript and summary component files

- [ ] **Step 1: Build TranscriptCard**

Create transcript components:
- `TranscriptCard.tsx` — card container, header with "Transcript" label
- `TranscriptSegment.tsx` — speaker label, timestamp badge, text content
- `SpeakerLabel.tsx` — colored dot + speaker name (colors from lib/colors.ts)

Create `src/renderer/lib/colors.ts`:
```typescript
export const SPEAKER_COLORS = [
  '#5b8def', '#a78bfa', '#f472b6', '#fb923c',
  '#4ade80', '#38bdf8', '#facc15', '#f87171',
];
export function getSpeakerColor(index: number): string {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}
```

- [ ] **Step 2: Build SummaryCard + ActionItems**

Create summary components:
- `SummaryCard.tsx` — renders markdown content + action items section
- `MarkdownRenderer.tsx` — wraps react-markdown with themed styles
- `ActionItemList.tsx` — list of checkable action items
- `ActionItem.tsx` — checkbox, text, assignee badge

- [ ] **Step 3: Create formatters**

Create `src/renderer/lib/formatters.ts`:
```typescript
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/transcript/ src/renderer/components/summary/ src/renderer/lib/
git commit -m "feat: add transcript and summary UI components"
```

---

## Task 8: Audio Capture Service

**Files:**
- Create: `src/main/services/audio-capture.service.ts`, `src/main/services/wav-writer.service.ts`

- [ ] **Step 1: Install native-recorder-nodejs**

```bash
npm install native-recorder-nodejs
npx electron-rebuild
```

- [ ] **Step 2: Implement WavWriter**

Create `src/main/services/wav-writer.service.ts`:
- Accepts Float32 buffers from mic and system streams
- Downsamples 48kHz → 16kHz (decimate by 3)
- Converts Float32 → Int16
- Interleaves mic (left) and system (right) into stereo WAV
- Writes 44-byte WAV header, patches size on close

- [ ] **Step 3: Implement AudioCaptureService**

Create `src/main/services/audio-capture.service.ts`:
- Wraps native-recorder-nodejs
- `startRecording(recordingId)` — starts mic + system loopback WASAPI streams
- `stopRecording()` — stops streams, finalizes WAV, returns path + duration
- `getDevices()` — enumerates WASAPI audio devices
- Emits audio level events to renderer via BrowserWindow.webContents.send

- [ ] **Step 4: Wire into IPC**

Update `src/main/ipc/recording.ipc.ts` to handle `recording:start-capture` and `recording:stop-capture` using AudioCaptureService.

- [ ] **Step 5: Test recording manually**

Start app, click Record, play audio, stop. Verify WAV file is created and plays back correctly.

- [ ] **Step 6: Commit**

```bash
git add src/main/services/audio-capture.service.ts src/main/services/wav-writer.service.ts
git commit -m "feat: add WASAPI audio capture with stereo WAV writer"
```

---

## Task 9: STT Engine Router + Cloud Engine

**Files:**
- Create: `src/main/stt/engines/cloud.engine.ts`, `src/main/stt/adapters/cloud.adapter.ts`, `src/main/services/stt-router.service.ts`

- [ ] **Step 1: Write failing test for STT router**

Create `tests/main/services/stt-router.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
// Test that router dispatches to correct engine and normalizes output
```

- [ ] **Step 2: Implement cloud STT engine**

Create `src/main/stt/engines/cloud.engine.ts`:
- POST multipart/form-data to user's configured endpoint
- Request `response_format=verbose_json` for segment timestamps
- Normalize via cloud adapter

Create `src/main/stt/adapters/cloud.adapter.ts`:
- Map cloud response segments to TranscriptSegment[]
- Convert seconds to ms, normalize confidence from avg_logprob

- [ ] **Step 3: Implement STT router**

Create `src/main/services/stt-router.service.ts`:
- Registry of SttEngine implementations
- `transcribe(wavPath, config)` — dispatches to selected engine
- Speaker attribution: run STT on left channel (mic="You"), right channel (system="Other"), merge by timestamp

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/main/services/stt-router.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main/stt/ src/main/services/stt-router.service.ts tests/main/services/
git commit -m "feat: add STT engine router with cloud engine implementation"
```

---

## Task 10: Local STT Engines (Whisper, Vosk, Sherpa)

**Files:**
- Create: Worker files, engine adapters, and engine implementations for all 3 local engines

- [ ] **Step 1: Install local STT packages**

```bash
npm install smart-whisper vosk sherpa-onnx
npx electron-rebuild
```

- [ ] **Step 2: Implement whisper engine + worker**

Create `src/main/stt/workers/whisper.worker.ts`:
- Loads smart-whisper model on first message
- Processes WAV file, posts TranscriptSegment[] back

Create `src/main/stt/engines/whisper.engine.ts`:
- Spawns/reuses worker thread
- Sends transcribe request, resolves promise on response
- 5-minute timeout

Create `src/main/stt/adapters/whisper.adapter.ts`:
- Map whisper segments (start/end in seconds) to ms

- [ ] **Step 3: Implement vosk engine + worker**

Create `src/main/stt/workers/vosk.worker.ts`:
- Loads vosk model
- Feeds audio chunks to recognizer
- Aggregates word-level output into sentence segments (500ms pause = new segment)

Create `src/main/stt/engines/vosk.engine.ts` and `src/main/stt/adapters/vosk.adapter.ts`.

- [ ] **Step 4: Implement sherpa engine + worker**

Create `src/main/stt/workers/sherpa.worker.ts`, `src/main/stt/engines/sherpa.engine.ts`, `src/main/stt/adapters/sherpa.adapter.ts`.

- [ ] **Step 5: Register all engines in STT router**

Update `src/main/services/stt-router.service.ts` to register whisper, vosk, sherpa, and cloud engines.

- [ ] **Step 6: Test each engine with a sample WAV**

Record a short test clip, run transcription through each engine. Verify output format.

- [ ] **Step 7: Commit**

```bash
git add src/main/stt/
git commit -m "feat: add local STT engines (whisper, vosk, sherpa-onnx) with worker threads"
```

---

## Task 11: AI Summarization Service

**Files:**
- Create: `src/main/services/ai-summary.service.ts`, `src/main/services/safe-storage.service.ts`

- [ ] **Step 1: Write failing test for prompt template rendering**

Create `tests/main/services/ai-summary.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../../src/main/services/ai-summary.service';

describe('renderTemplate', () => {
  it('replaces all template variables', () => {
    const template = 'Call: {{duration}} min on {{source_app}} with {{participant_count}} people\n{{transcript}}';
    const result = renderTemplate(template, {
      duration: '45', source_app: 'Teams', participant_count: '3', transcript: 'Hello world', date: '2026-03-28',
    });
    expect(result).toBe('Call: 45 min on Teams with 3 people\nHello world');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/services/ai-summary.test.ts
```

- [ ] **Step 3: Implement AI summary service**

Create `src/main/services/ai-summary.service.ts`:
- `renderTemplate(template, vars)` — replaces `{{var}}` placeholders
- `generateSummary(recordingId, profileId?)` — loads transcript, builds prompt, POSTs to configured endpoint
- Uses `/v1/chat/completions` with configurable model, temperature, max_tokens
- Parses response content as markdown
- Extracts action items from markdown (lines starting with `- [ ]` or numbered items under "Action Items" heading)
- Saves summary + action items to DB

- [ ] **Step 4: Implement safe storage service**

Create `src/main/services/safe-storage.service.ts`:
```typescript
import { safeStorage } from 'electron';

export class SafeStorageService {
  encrypt(plaintext: string): string {
    const buffer = safeStorage.encryptString(plaintext);
    return buffer.toString('base64');
  }

  decrypt(encrypted: string): string {
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/main/services/ai-summary.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/services/ai-summary.service.ts src/main/services/safe-storage.service.ts tests/main/services/ai-summary.test.ts
git commit -m "feat: add AI summarization service with template rendering and safe storage"
```

---

## Task 12: Process Monitor (Auto-Detect)

**Files:**
- Create: `src/main/services/process-monitor.service.ts`

- [ ] **Step 1: Implement process monitor**

Create `src/main/services/process-monitor.service.ts`:
- Uses `child_process.exec('tasklist /FO CSV /NH')` to list running processes
- Matches against configured app whitelist
- Checks audio activity (system audio output level > threshold)
- Sends `auto-detect:app-found` event to renderer
- Cooldown tracking per-app (don't re-prompt within configurable period)
- Start/stop polling (5-second interval)

- [ ] **Step 2: Wire into main process**

Update `src/main/index.ts` to start process monitor after window creation.

- [ ] **Step 3: Test with Teams/Zoom running**

Start app with Teams open, verify auto-detect banner appears.

- [ ] **Step 4: Commit**

```bash
git add src/main/services/process-monitor.service.ts
git commit -m "feat: add process monitor for auto-detecting call apps"
```

---

## Task 13: Settings Panel UI

**Files:**
- Create: All settings components

- [ ] **Step 1: Build SettingsPanel container**

Create `src/renderer/components/settings/SettingsPanel.tsx`:
- Full-width panel replacing main content when open
- Sectioned layout with headers
- Close button to return to recording view

- [ ] **Step 2: Build STT engine settings**

Create `src/renderer/components/settings/SttEngineConfig.tsx`:
- Radio group: whisper / vosk / sherpa / cloud
- Per-engine fields (model path file picker for local, endpoint URL for cloud)

- [ ] **Step 3: Build AI endpoint settings**

Create `src/renderer/components/settings/AiEndpointConfig.tsx`:
- URL input, masked API key input, model text input
- Temperature slider (0.0–2.0), max tokens input
- Test connection button

- [ ] **Step 4: Build prompt profile editor**

Create `src/renderer/components/settings/PromptProfileEditor.tsx`:
- List of profiles with add/edit/delete
- System prompt textarea, user prompt template textarea
- Variable insertion buttons ({{transcript}}, {{duration}}, etc.)
- Set default toggle

- [ ] **Step 5: Build auto-detect settings**

Create `src/renderer/components/settings/AutoDetectSettings.tsx`:
- Master toggle on/off
- App whitelist table: name, exe, behavior dropdown (prompt/always/never)
- Add/remove app buttons

- [ ] **Step 6: Build audio device settings**

Create `src/renderer/components/settings/AudioDeviceSettings.tsx`:
- Input device dropdown (populated from audio:get-devices IPC)
- Output device dropdown

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/settings/
git commit -m "feat: add settings panel with STT, AI, prompt, auto-detect, and audio config"
```

---

## Task 14: Interactions + Polish

**Files:**
- Create: Hook files, shared components

- [ ] **Step 1: Implement keyboard shortcuts**

Create `src/renderer/hooks/useKeyboardShortcuts.ts`:
- Ctrl+R → toggle recording
- Ctrl+N → new notebook dialog
- Ctrl+F → focus search
- Ctrl+W → close active tab
- Ctrl+Tab → next tab

- [ ] **Step 2: Implement drag-and-drop**

Create `src/renderer/hooks/useDragAndDrop.ts`:
- Recording items draggable to notebook drop targets
- Tab reorder via @dnd-kit/sortable

- [ ] **Step 3: Implement context menus**

Create `src/renderer/hooks/useContextMenu.ts` and `src/renderer/components/shared/ContextMenu.tsx`:
- Right-click on notebook: rename, delete, change icon
- Right-click on recording: rename, move to notebook, delete, re-transcribe, re-summarize

- [ ] **Step 4: Implement system tray**

Create `src/main/services/tray.service.ts`:
- System tray icon when app is minimized
- Recording indicator (red dot overlay when recording)
- Tray menu: Show/Hide, Start/Stop Recording, Quit

- [ ] **Step 5: Commit**

```bash
git add src/renderer/hooks/ src/renderer/components/shared/ src/main/services/tray.service.ts
git commit -m "feat: add keyboard shortcuts, drag-and-drop, context menus, and system tray"
```

---

## Task 15: End-to-End Integration + Verification

- [ ] **Step 1: Wire all services into main process**

Update `src/main/index.ts` to initialize AudioCaptureService, SttRouterService, AiSummaryService, SafeStorageService, ProcessMonitorService, and TrayService in the service container.

- [ ] **Step 2: Full flow test — Record → Transcribe → Summarize**

1. Start app
2. Click Record, play some audio from YouTube or a test call
3. Stop recording
4. Verify WAV file created and status changes to "transcribing"
5. Verify transcript appears with speaker labels
6. Click "Generate Summary" or verify auto-summarize triggers
7. Verify summary with action items appears

- [ ] **Step 3: Test notebook organization**

1. Create 3 notebooks
2. Record 2 items
3. Drag recordings into notebooks
4. Verify counts update
5. Delete a notebook — recordings should become unsorted

- [ ] **Step 4: Test settings persistence**

1. Change STT engine, AI endpoint, create prompt profiles
2. Restart app
3. Verify all settings persisted

- [ ] **Step 5: Test auto-detect**

1. Open Teams/Zoom
2. Verify detection banner appears
3. Click "Start Recording" from banner
4. Verify recording starts

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete youRecord v1 with full recording, transcription, and summarization pipeline"
```

---

## Verification Summary

| Flow | How to Test |
|------|-------------|
| Audio capture | Record → verify stereo WAV with both channels in Audacity |
| Cloud STT | Configure OpenAI endpoint → transcribe → verify segments |
| Local STT | Select Whisper/Vosk/Sherpa → transcribe → verify segments |
| AI summary | Generate summary → verify markdown + action items extracted |
| Notebooks | Create, rename, delete, drag recordings between |
| Auto-detect | Open Teams → verify banner → click Start Recording |
| Settings | Change all settings → restart → verify persisted |
| Keyboard shortcuts | Ctrl+R, Ctrl+N, Ctrl+F, Ctrl+W, Ctrl+Tab |
| System tray | Minimize → verify tray icon → recording indicator |
