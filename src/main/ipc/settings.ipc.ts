import { ipcMain } from 'electron';
import type { SettingsRepository } from '../db/repositories/settings.repo';

export function registerSettingsHandlers(settings: SettingsRepository): void {
  ipcMain.handle('settings:get', (_, args: { key: string }) =>
    settings.get(args.key) ?? null
  );

  ipcMain.handle('settings:set', (_, args: { key: string; value: string }) => {
    settings.set(args.key, args.value);
  });

  ipcMain.handle('settings:getAll', () => {
    const rows = settings.getAll();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  });

  // Stub — will enumerate system audio devices later
  ipcMain.handle('audio:get-devices', () => {
    return { inputs: [], outputs: [] };
  });
}
