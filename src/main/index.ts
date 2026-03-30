import { app, BrowserWindow, Menu, protocol, net, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';

import { getDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migration-runner';
import { migration001 } from './db/migrations/001_initial_schema';
import { migration002 } from './db/migrations/002_workspace_cards';
import { migration003 } from './db/migrations/003_card_reference_id';
import { migration004 } from './db/migrations/004_speaker_map';
import { migration005 } from './db/migrations/005_custom_task_assignee';

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
import { applyPkiEnvironment, invalidatePkiAgent } from './services/pki-fetch';

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
let miniWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let debugModeEnabled = false;

function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 360,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Load logo as base64 data URI
  let logoDataUri = '';
  const logoPath = path.join(app.getAppPath(), 'logo.png');
  if (fs.existsSync(logoPath)) {
    const logoData = fs.readFileSync(logoPath);
    logoDataUri = `data:image/png;base64,${logoData.toString('base64')}`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0B0F2A;
    color: #E4E6F0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    border-radius: 12px;
    border: 1px solid #2A2F5A;
    overflow: hidden;
    -webkit-app-region: drag;
  }
  .logo-img { width: 72px; height: 72px; margin-bottom: 16px; object-fit: contain; }
  .title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .tagline { font-size: 11px; color: #8B90A5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 28px; }
  .status { font-size: 11px; color: #8B90A5; margin-bottom: 8px; min-height: 16px; }
  .bar-bg { width: 220px; height: 4px; background: #1E234E; border-radius: 2px; overflow: hidden; }
  .bar-fill { height: 100%; background: #5B3DF5; border-radius: 2px; transition: width 0.3s ease; width: 0%; }
</style>
</head>
<body>
  ${logoDataUri ? `<img class="logo-img" src="${logoDataUri}" alt="Resonate" />` : ''}
  <div class="title">Resonate</div>
  <div class="tagline">Voice to Notes, Instantly</div>
  <div class="status" id="status">Starting...</div>
  <div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
  <script>
    window.setSplashProgress = (percent, label) => {
      document.getElementById('bar').style.width = percent + '%';
      document.getElementById('status').textContent = label;
    };
  </script>
</body>
</html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  splash.center();
  return splash;
}

function updateSplash(percent: number, label: string): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `window.setSplashProgress(${percent}, ${JSON.stringify(label)})`
    ).catch(() => {});
  }
}

function bootstrap(): ServiceContainer {
  const db = getDatabase();
  runMigrations(db, [migration001, migration002, migration003, migration004, migration005]);

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
    // Update existing default profiles if they have old prompts
    const needsUpdate = existingProfiles.some(
      (p) => {
        const isDefault = DEFAULT_PROMPT_PROFILES.some((d) => d.name === p.name);
        if (!isDefault) return false;
        // Check if prompt is outdated (missing key instructions)
        return (p.system_prompt && !p.system_prompt.includes('feedback requiring revision'));
      }
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

  // Apply PKI environment variables (custom CA, TLS settings) before any fetch calls
  applyPkiEnvironment(settings);

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
    show: false,
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
    backgroundColor: '#0B0F2A',
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
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('recording:audio-levels', levels);
    }
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

// Handle client certificate selection (mTLS)
app.on('select-client-certificate', (event, _webContents, _url, list, callback) => {
  if (list.length > 0) {
    event.preventDefault();
    callback(list[0]);
  }
});

// Handle certificate errors for custom / self-signed CAs
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // Only bypass when PKI is enabled and reject_unauthorized is explicitly 'false'
  // The settingsRepo is not available here yet, so we check the env var we set in bootstrap
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    event.preventDefault();
    callback(true);
  }
});

app.on('ready', () => {
  // Show splash screen immediately
  Menu.setApplicationMenu(null);
  splashWindow = createSplashWindow();
  updateSplash(5, 'Starting up...');

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

  // Pin window always-on-top
  ipcMain.handle('app:set-always-on-top', (_, args: { enabled: boolean }) => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    win?.setAlwaysOnTop(args.enabled, 'floating');
    return args.enabled;
  });

  // Pop out mini recording window
  ipcMain.handle('app:popout-recording', () => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.focus();
      return true;
    }

    miniWindow = new BrowserWindow({
      width: 380,
      height: 200,
      minWidth: 300,
      minHeight: 150,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: false,
      backgroundColor: '#0B0F2A',
      icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the same app but with a query param to signal mini mode
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      miniWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?mini=true`);
    } else {
      miniWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { query: { mini: 'true' } }
      );
    }

    miniWindow.on('closed', () => {
      miniWindow = null;
      // Notify main window that mini closed
      mainWindow?.webContents.send('mini-window:closed');
    });

    // Minimize main window
    mainWindow?.minimize();

    return true;
  });

  // Pop back in — close mini window and restore main
  ipcMain.handle('app:popin-recording', () => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.close();
      miniWindow = null;
    }
    mainWindow?.restore();
    mainWindow?.focus();
    return true;
  });

  updateSplash(10, 'Initializing database...');
  const services = bootstrap();

  updateSplash(40, 'Registering handlers...');
  registerAllHandlers(services);

  updateSplash(60, 'Creating window...');
  const win = createWindow(services);

  updateSplash(80, 'Loading interface...');

  // Close splash when main window is ready
  win.webContents.on('did-finish-load', () => {
    updateSplash(100, 'Ready');
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      win.show();
    }, 300);
  });

  // Start polling for meeting apps
  updateSplash(90, 'Starting services...');
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
