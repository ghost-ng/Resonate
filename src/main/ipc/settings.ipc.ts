import { ipcMain } from 'electron';
import type { ServiceContainer } from '../index';

export function registerSettingsHandlers(services: ServiceContainer): void {
  const { settings, audioCapture } = services;

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

  ipcMain.handle('audio:get-devices', async () => {
    return await audioCapture.getDevices();
  });
}
