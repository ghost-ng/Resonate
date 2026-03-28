# youRecord — Design Specification

## Overview

youRecord is a Windows Electron desktop app that captures audio from video/voice calls (Teams, Skype, Zoom, etc.), transcribes the conversation using configurable speech-to-text engines, and generates structured meeting notes and summaries via AI. It features a notebook-style UI with tabs for organizing recordings.

**Platform:** Windows only (WASAPI audio APIs)
**Runtime:** Electron (Node.js main process + React renderer)
**Target environment:** VDI (low local compute; cloud STT preferred but local lightweight engines available)

---

## Architecture

### Monolith — Single Electron App

```
┌─────────────────────────────────────────────┐
│  Renderer Process (React + TypeScript)      │
│  • Notebook/tab management                  │
│  • Transcript viewer                        │
│  • Settings panel                           │
│  • Recording controls                       │
├─────────────────────────────────────────────┤
│  Main Process (Node.js)                     │
│  • Audio capture manager (WASAPI via        │
│    native-recorder-nodejs)                  │
│  • Process monitor (auto-detect calls)      │
│  • STT engine router                        │
│  • AI summarization service                 │
│  • SQLite database (better-sqlite3)         │
├─────────────────────────────────────────────┤
│  Native Layer (C++ N-API addons)            │
│  • WASAPI audio capture                     │
│  • Per-app audio isolation (Win10 2004+)    │
└─────────────────────────────────────────────┘
```

**IPC:** Renderer ↔ Main via Electron IPC (contextBridge + preload script). All heavy work runs in main process or worker threads.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS |
| State management | Zustand |
| Database | better-sqlite3 |
| Audio capture | native-recorder-nodejs (WASAPI) |
| Build | electron-forge |
| Local STT | whisper.cpp, vosk, sherpa-onnx |
| Cloud STT/AI | Configurable OpenAI-compatible endpoints |

---

## Data Model (SQLite)

### notebooks
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | "Work Meetings", "Sprint Planning" |
| icon | TEXT | Emoji icon |
| sort_order | INTEGER | User-defined ordering |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### recordings
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| notebook_id | INTEGER FK | Nullable (unsorted recordings) |
| title | TEXT | "Design Review 3/27" |
| source_app | TEXT | "Microsoft Teams", "Zoom", etc. |
| audio_file_path | TEXT | Path to .wav on disk |
| duration_seconds | INTEGER | |
| participant_count | INTEGER | |
| status | TEXT | recording, transcribing, summarizing, complete, error |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### transcripts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| recording_id | INTEGER FK | |
| engine_used | TEXT | whisper, vosk, sherpa, cloud |
| full_text | TEXT | Complete transcript |
| created_at | DATETIME | |

### transcript_segments
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| transcript_id | INTEGER FK | |
| speaker | TEXT | Detected speaker label |
| text | TEXT | Segment text |
| start_time_ms | INTEGER | |
| end_time_ms | INTEGER | |
| confidence | REAL | 0.0–1.0 |

### summaries
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| recording_id | INTEGER FK | |
| model_used | TEXT | "gpt-4", etc. |
| system_prompt_used | TEXT | Snapshot of prompt at generation time |
| content | TEXT | Full markdown summary |
| created_at | DATETIME | |

### action_items
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| summary_id | INTEGER FK | |
| text | TEXT | Action item description |
| assignee | TEXT | Optional |
| completed | INTEGER | 0 or 1 |
| sort_order | INTEGER | |

### settings (key-value)
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | "stt_engine", "ai_endpoint", etc. |
| value | TEXT | JSON-encoded value |

Audio files stored on disk, database stores path only.

---

## Audio Capture Pipeline

### Recording Flow

1. User clicks Record (or accepts auto-detect prompt)
2. Audio Capture Manager starts two WASAPI streams:
   - **System audio loopback** — captures what you hear (other participants)
   - **Microphone input** — captures your voice
3. Both streams mixed and written to WAV file
4. Silent buffer trick applied to loopback stream (prevents WASAPI stalls during silence)
5. Recording saved to disk, recording row created in DB with status `recording`

### WASAPI Implementation Details (from OBS research)

- Use `AUDCLNT_SHAREMODE_SHARED` (don't block other apps)
- Use `AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK` for system audio
- Implement silent render buffer to prevent stream stalls
- Set MMCSS thread priority via `AvSetMmThreadCharacteristics("Audio")`
- Handle device disconnection with 3-second reconnect retry
- Per-app capture available on Windows 10 2004+ via `ActivateAudioInterfaceAsync`
- All audio in 32-bit IEEE float format

### Primary library: native-recorder-nodejs
- WASAPI bindings via C++ N-API
- Supports mic, system, and per-app capture
- Electron prebuilds available

---

## Speech-to-Text Pipeline

### STT Engine Router

After recording ends, the STT engine router processes the audio based on user settings:

| Engine | Type | Notes |
|--------|------|-------|
| whisper.cpp | Local | C++ port, runs in worker thread. Heavier but highest accuracy |
| vosk | Local | Lightweight, small models (~50MB). Good for VDI |
| sherpa-onnx | Local | Optimized for edge devices. Good accuracy/performance ratio |
| Cloud API | Remote | POST to configurable endpoint (OpenAI-compatible `/v1/audio/transcriptions`) |

All engines output a unified format:
```typescript
interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}
```

Local engines run in worker threads to avoid blocking the main process.

---

## AI Summarization

### Flow

1. Transcription completes (auto or manual trigger based on settings)
2. Build prompt from user's selected prompt profile
3. Inject transcript + metadata via template variables
4. POST to configured OpenAI-compatible endpoint (`/v1/chat/completions`)
5. Parse response → save summary + action items to DB

### Default Prompts

**System prompt:**
> You are a meeting notes assistant. Analyze the provided transcript and produce structured notes including: key decisions, discussion topics, action items with assignees, and a brief summary. Format in markdown.

**User prompt template:**
> Here is the transcript from a {{duration}} minute {{source_app}} call with {{participant_count}} participants:
>
> {{transcript}}
>
> Please generate structured meeting notes.

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{transcript}}` | Full transcript text |
| `{{duration}}` | Recording duration in minutes |
| `{{source_app}}` | Detected source application |
| `{{participant_count}}` | Number of speakers detected |
| `{{date}}` | Recording date |

### Prompt Profiles

Users can create multiple prompt profiles for different meeting types:
- "Standup Notes" — brief, action-focused
- "Design Review Notes" — detailed, decision-focused
- "1:1 Notes" — private, follow-up focused

Each profile has its own system prompt and user prompt template. Users can set a default profile or choose per-recording.

### AI Endpoint Settings

| Setting | Description |
|---------|-------------|
| API URL | e.g., `https://api.openai.com/v1` |
| API Key | Stored encrypted in settings |
| Model | e.g., `gpt-4`, `gpt-3.5-turbo` |
| Temperature | 0.0–2.0 (advanced) |
| Max tokens | (advanced) |

---

## Auto-Detection System

### Process Monitor

Runs every 5 seconds in the main process:

1. Scan running Windows processes for known call apps:
   - `Teams.exe`, `Skype.exe`, `Zoom.exe`, `webexmeetingmanager.exe`, `slack.exe`, etc.
   - User-configurable app whitelist in settings
2. If a known app is found running:
   - Check WASAPI audio activity from that process (per-app loopback on Win10 2004+)
   - Fallback: check if system audio output is active
3. If audio activity detected:
   - Show auto-detect banner in the UI
   - "Microsoft Teams call detected — Start Recording?"
   - User can accept, dismiss, or configure "always record" for that app

### Settings

- Toggle auto-detect on/off
- App whitelist (add/remove apps to monitor)
- Per-app auto-record preference (always prompt, always record, never record)
- Cooldown between prompts (avoid nagging for the same app)

---

## UI Design

### Visual Style (Compact preset)

| Property | Value |
|----------|-------|
| Theme | Dark |
| Background lightness | 9% (HSL 228, 20%, 9%) |
| Accent color | `#5b8def` |
| Sidebar width | 220px |
| Base font size | 12px |
| Line height | 1.5 |
| Card border radius | 6px |
| Card spacing | 10px |
| Font family | System font stack (Segoe UI on Windows) |
| Monospace | Cascadia Code / JetBrains Mono |

### Component Layout

```
┌───────────┬──────────────────────────────────┐
│           │ [Tab1] [Tab2] [Tab3] [+]         │
│  Sidebar  ├──────────────────────────────────┤
│  220px    │                                  │
│           │  [Auto-detect banner]             │
│  Search   │                                  │
│  ───────  │  Recording Title        [Record] │
│  Notebooks│  metadata line                   │
│  • All    │                                  │
│  • Work   │  ┌─ Transcript Card ───────────┐ │
│  • Sprint │  │ Speaker | Timestamp | Text   │ │
│  • 1:1s   │  └─────────────────────────────┘ │
│  ───────  │                                  │
│  Recent   │  ┌─ AI Summary Card ───────────┐ │
│  • Entry  │  │ Key Decisions               │ │
│  • Entry  │  │ Action Items [✓]            │ │
│  ───────  │  └─────────────────────────────┘ │
│ [+NB][⚙] │                                  │
├───────────┴──────────────────────────────────┤
│ Status: Ready | STT: Whisper | AI: GPT-4     │
└──────────────────────────────────────────────┘
```

### Sidebar Components
- App logo + title
- Search bar (filters by title, transcript text, date)
- Notebook list (collapsible, emoji icons, count badges)
- Recent recordings section
- Footer: "+ Notebook" and "Settings" buttons

### Main Content Components
- Tab bar (browser-style, one per open recording)
- Recording header: title, metadata, record button
- Auto-detect banner (slides in contextually)
- Transcript card: speaker labels, timestamps, expandable segments
- AI Summary card: key decisions, discussion points, action items (checkable)
- Status bar: connection status, STT engine, AI model, storage stats

### Settings Panel
- STT engine selection + per-engine configuration
- AI endpoint config (URL, key, model)
- Prompt profiles editor (create/edit/delete profiles)
- Auto-detect settings (toggle, app whitelist, per-app behavior)
- Auto-summarize toggle
- Audio device selection (input/output)
- Storage path configuration

### Key Interactions
- Drag-and-drop recordings between notebooks
- Right-click context menus on recordings and notebooks
- Keyboard shortcuts: Ctrl+R (record), Ctrl+N (new notebook), Ctrl+F (search)
- System tray icon when minimized (shows recording indicator)
- Notification tray alerts for auto-detect prompts

---

## Verification Plan

### Manual Testing
1. Record a test call and verify both mic + system audio are captured
2. Transcribe using each STT engine and verify output format
3. Generate summary and verify action items are extracted
4. Create notebooks, drag recordings between them
5. Test auto-detect with Teams/Zoom running
6. Verify settings persist across app restart

### Automated Testing
- Unit tests for STT engine router, prompt template rendering, database operations
- Integration tests for IPC communication between renderer and main process
- E2E tests for core flows (record → transcribe → summarize)
