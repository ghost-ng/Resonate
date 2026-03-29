import { app, BrowserWindow, protocol, net, ipcMain } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';

import { getDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migration-runner';
import { migration001 } from './db/migrations/001_initial_schema';
import { migration002 } from './db/migrations/002_workspace_cards';

import { NotebookRepository } from './db/repositories/notebook.repo';
import { RecordingRepository } from './db/repositories/recording.repo';
import { TranscriptRepository } from './db/repositories/transcript.repo';
import { SummaryRepository } from './db/repositories/summary.repo';
import { ActionItemRepository } from './db/repositories/action-item.repo';
import { PromptProfileRepository } from './db/repositories/prompt-profile.repo';
import { SettingsRepository } from './db/repositories/settings.repo';
import { WorkspaceCardRepository } from './db/repositories/workspace-card.repo';
import { CustomTaskRepository } from './db/repositories/custom-task.repo';
import { HighlightRepository } from './db/repositories/highlight.repo';

import { AudioCaptureService } from './services/audio-capture.service';
import { SttRouterService } from './services/stt-router.service';
import { AiSummaryService } from './services/ai-summary.service';
import { SafeStorageService } from './services/safe-storage.service';
import { ProcessMonitorService } from './services/process-monitor.service';
import { TrayService } from './services/tray.service';

import { registerAllHandlers } from './ipc/handlers';
import { DEFAULT_PROMPT_PROFILES } from '../shared/constants';

// Vite globals injected by @electron-forge/plugin-vite
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export interface ServiceContainer {
  // Repositories
  notebooks: NotebookRepository;
  recordings: RecordingRepository;
  transcripts: TranscriptRepository;
  summaries: SummaryRepository;
  actionItems: ActionItemRepository;
  promptProfiles: PromptProfileRepository;
  settings: SettingsRepository;
  workspaceCards: WorkspaceCardRepository;
  customTasks: CustomTaskRepository;
  highlights: HighlightRepository;
  // Services
  audioCapture: AudioCaptureService;
  sttRouter: SttRouterService;
  aiSummary: AiSummaryService;
  safeStorage: SafeStorageService;
  processMonitor: ProcessMonitorService;
  trayService: TrayService;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let debugModeEnabled = false;

function bootstrap(): ServiceContainer {
  const db = getDatabase();
  runMigrations(db, [migration001, migration002]);

  // Repositories
  const notebooks = new NotebookRepository(db);
  const recordings = new RecordingRepository(db);
  const transcripts = new TranscriptRepository(db);
  const summaries = new SummaryRepository(db);
  const actionItems = new ActionItemRepository(db);
  const promptProfiles = new PromptProfileRepository(db);
  const settings = new SettingsRepository(db);
  const workspaceCards = new WorkspaceCardRepository(db);
  const customTasks = new CustomTaskRepository(db);
  const highlights = new HighlightRepository(db);

  // Services
  const safeStorage = new SafeStorageService();
  const audioCaptureDir = path.join(app.getPath('userData'), 'recordings');
  const audioCapture = new AudioCaptureService(audioCaptureDir);
  const sttRouter = new SttRouterService(settings);
  const aiSummary = new AiSummaryService(settings, promptProfiles, safeStorage);
  const processMonitor = new ProcessMonitorService(settings, (appName, processName) => {
    mainWindow?.webContents.send('auto-detect:app-found', { appName, processName });
  });
  // Seed or update default prompt profiles
  const existingProfiles = promptProfiles.findAll();
  if (existingProfiles.length === 0) {
    for (const profile of DEFAULT_PROMPT_PROFILES) {
      promptProfiles.create({
        name: profile.name,
        system_prompt: profile.system_prompt,
        user_prompt_template: profile.user_prompt_template,
        is_default: profile.is_default,
      });
    }
  } else {
    // Update existing default profiles if they have old prompts (without anti-hallucination)
    const needsUpdate = existingProfiles.some(
      (p) => p.system_prompt && !p.system_prompt.includes('ONLY') && !p.system_prompt.includes('hallucinate')
    );
    if (needsUpdate) {
      // Delete old defaults and re-seed
      for (const p of existingProfiles) {
        const isDefault = DEFAULT_PROMPT_PROFILES.some((d) => d.name === p.name);
        if (isDefault) promptProfiles.delete(p.id);
      }
      for (const profile of DEFAULT_PROMPT_PROFILES) {
        promptProfiles.create({
          name: profile.name,
          system_prompt: profile.system_prompt,
          user_prompt_template: profile.user_prompt_template,
          is_default: profile.is_default,
        });
      }
      console.log('[Bootstrap] Updated prompt profiles with anti-hallucination prompts');
    }
  }

  // TrayService needs the window — will be set after window creation
  const trayService = null as unknown as TrayService;

  return {
    notebooks,
    recordings,
    transcripts,
    summaries,
    actionItems,
    promptProfiles,
    settings,
    workspaceCards,
    customTasks,
    highlights,
    audioCapture,
    sttRouter,
    aiSummary,
    safeStorage,
    processMonitor,
    trayService,
  };
}

const createWindow = (services: ServiceContainer) => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Block F12/Ctrl+Shift+I unless debug mode is enabled via IPC
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      if (!debugModeEnabled) event.preventDefault();
    }
  });

  // System tray
  const trayService = new TrayService(mainWindow);
  trayService.create();
  services.trayService = trayService;

  // Forward audio levels to the renderer
  services.audioCapture.onAudioLevels((levels) => {
    mainWindow?.webContents.send('recording:audio-levels', levels);
  });

  mainWindow.on('closed', () => {
    trayService.destroy();
    mainWindow = null;
  });

  return mainWindow;
};

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'audio-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
]);

app.on('ready', () => {
  // Register protocol handler to serve local audio files
  protocol.handle('audio-file', (request) => {
    const url = request.url;
    // audio-file:///C:/path/to/file.wav → C:/path/to/file.wav
    let filePath = decodeURIComponent(url.slice('audio-file:///'.length));
    // Handle Windows paths
    filePath = filePath.replace(/\//g, path.sep);
    console.log('[Protocol] Serving audio file:', filePath);
    return net.fetch(pathToFileURL(filePath).href);
  });

  // Debug mode toggle
  ipcMain.handle('app:toggle-debug', () => {
    debugModeEnabled = !debugModeEnabled;
    if (debugModeEnabled) {
      mainWindow?.webContents.openDevTools();
    } else {
      mainWindow?.webContents.closeDevTools();
    }
    return debugModeEnabled;
  });

  const services = bootstrap();
  registerAllHandlers(services);
  createWindow(services);

  // Start polling for meeting apps
  services.processMonitor.start();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Services are already bootstrapped; just need a reference.
    // In practice, activate only fires on macOS where the app is still running.
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
