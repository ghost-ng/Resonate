import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { getDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migration-runner';
import { migration001 } from './db/migrations/001_initial_schema';

import { NotebookRepository } from './db/repositories/notebook.repo';
import { RecordingRepository } from './db/repositories/recording.repo';
import { TranscriptRepository } from './db/repositories/transcript.repo';
import { SummaryRepository } from './db/repositories/summary.repo';
import { ActionItemRepository } from './db/repositories/action-item.repo';
import { PromptProfileRepository } from './db/repositories/prompt-profile.repo';
import { SettingsRepository } from './db/repositories/settings.repo';

import { registerAllHandlers } from './ipc/handlers';
import { TrayService } from './services/tray.service';

// Vite globals injected by @electron-forge/plugin-vite
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export interface ServiceContainer {
  notebooks: NotebookRepository;
  recordings: RecordingRepository;
  transcripts: TranscriptRepository;
  summaries: SummaryRepository;
  actionItems: ActionItemRepository;
  promptProfiles: PromptProfileRepository;
  settings: SettingsRepository;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function bootstrap(): ServiceContainer {
  const db = getDatabase();
  runMigrations(db, [migration001]);

  return {
    notebooks: new NotebookRepository(db),
    recordings: new RecordingRepository(db),
    transcripts: new TranscriptRepository(db),
    summaries: new SummaryRepository(db),
    actionItems: new ActionItemRepository(db),
    promptProfiles: new PromptProfileRepository(db),
    settings: new SettingsRepository(db),
  };
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
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
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // System tray
  const trayService = new TrayService(mainWindow);
  trayService.create();

  mainWindow.on('closed', () => {
    trayService.destroy();
  });

  return { mainWindow, trayService };
};

app.on('ready', () => {
  const services = bootstrap();
  registerAllHandlers(services);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
