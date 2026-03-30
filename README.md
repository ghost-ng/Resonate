<p align="center">
  <img src="logo.png" alt="Resonate" width="120" />
</p>

<h1 align="center">Resonate</h1>

<p align="center">
  <strong>Voice to Notes, Instantly</strong>
</p>

<p align="center">
  Record conversations, meetings, and ideas.<br/>
  Resonate transcribes your audio into clear, structured notes and key insights.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%2064--bit-blue" alt="Windows x64" />
  <img src="https://img.shields.io/badge/electron-41-purple" alt="Electron 41" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

---

## Features

- **Record** - Capture microphone and system audio simultaneously
- **Transcribe** - Local speech-to-text via bundled Whisper (offline, private)
- **Summarize** - AI-powered meeting notes, action items, and summaries via configurable LLM endpoints (OpenAI, Anthropic, or custom)
- **Organize** - Notebooks, drag-and-drop, tabs, and workspace cards
- **Action Items** - Auto-extracted tasks with assignees, checkboxes, and markdown
- **Speaker Detection** - Automatic speaker turn detection with renameable labels
- **Export** - Download transcripts, summaries, and action items as Markdown
- **Mini Window** - Pop-out recording widget with always-on-top pin
- **Dark & Light Themes** - Brand-consistent UI with Resonate color palette
- **Tutorial** - Built-in interactive walkthrough with example data

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Git](https://git-scm.com/)

### Install & Run

```bash
git clone https://github.com/ghost-ng/Resonate.git
cd Resonate
npm install
npm start
```

> **Note:** This repo uses [Git LFS](https://git-lfs.com/) for the Whisper model file (~142 MB). Install Git LFS before cloning: `git lfs install`

Whisper binaries and the `base.en` model are bundled in the repo under `resources/whisper/` — no downloads needed. Works fully offline.

### AI Configuration

Configure your AI endpoint in **Settings > AI Endpoint**:

| Provider | Endpoint | Notes |
|----------|----------|-------|
| OpenAI | `https://api.openai.com` | Requires API key |
| Anthropic | `https://api.anthropic.com` | Requires API key |
| Local (Ollama, LM Studio) | `http://localhost:11434/v1` | No key needed |

## Building

### Development

```bash
npm start          # Start in dev mode with hot reload
npm run lint       # Run ESLint
npm test           # Run tests
```

### Package for Windows x64

```bash
# Package (creates portable app in out/)
npm run package -- --arch=x64 --platform=win32

# Build installer (creates Squirrel installer)
npm run make -- --arch=x64 --platform=win32
```

The packaged app will be in `out/Resonate-win32-x64/`.

### Native Dependencies

This project uses `better-sqlite3` and `native-recorder-nodejs` which require native compilation. If you encounter build issues:

```bash
# Rebuild native modules for Electron
npx electron-rebuild
```

### Packaging Checklist

All external dependencies are bundled in the repo:

1. Whisper binaries and model are in `resources/whisper/` (tracked via Git LFS)
2. `resources/whisper/` is bundled into the app via `extraResource` in forge config
3. Native modules (`better-sqlite3`, `native-recorder-nodejs`) are rebuilt for Electron
4. Run `npm run make` to create the installer — works fully offline

## Project Structure

```
src/
  main/              # Electron main process
    db/              # SQLite database, migrations, repositories
    ipc/             # IPC handlers
    services/        # Audio capture, STT, AI summary, process monitor
    stt/             # Speech-to-text engines (Whisper)
  preload/           # Electron preload script
  renderer/          # React UI
    components/      # UI components
    stores/          # Zustand state stores
    hooks/           # React hooks
    lib/             # Utilities and formatters
  shared/            # Types and constants shared between processes
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 41 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand |
| Database | SQLite (better-sqlite3) |
| STT | whisper.cpp (local) |
| AI | OpenAI / Anthropic API (configurable) |
| Build | Electron Forge, Vite |
| Audio | native-recorder-nodejs |

## License

MIT
