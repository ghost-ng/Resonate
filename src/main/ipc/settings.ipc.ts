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

  ipcMain.handle(
    'ai:list-models',
    async (
      _,
      args: { endpoint: string; apiKey: string; type: 'openai' | 'anthropic' }
    ): Promise<{ models: string[]; error?: string }> => {
      try {
        const baseUrl = args.endpoint.replace(/\/+$/, '');

        if (args.type === 'anthropic') {
          const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
              'x-api-key': args.apiKey,
              'anthropic-version': '2023-06-01',
            },
          });
          if (!response.ok) {
            const body = await response.text();
            if (response.status === 401) {
              return { models: [], error: 'Invalid API key' };
            }
            return { models: [], error: `Connection failed (${response.status}): ${body}` };
          }
          const json = (await response.json()) as { data?: { id: string }[] };
          const models = (json.data ?? []).map((m) => m.id).sort();
          if (models.length === 0) {
            return { models: [], error: 'No models found' };
          }
          return { models };
        } else {
          // OpenAI-compatible (including custom)
          const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${args.apiKey}`,
            },
          });
          if (!response.ok) {
            const body = await response.text();
            if (response.status === 401) {
              return { models: [], error: 'Invalid API key' };
            }
            return { models: [], error: `Connection failed (${response.status}): ${body}` };
          }
          const json = (await response.json()) as { data?: { id: string }[] };
          const models = (json.data ?? []).map((m) => m.id).sort();
          if (models.length === 0) {
            return { models: [], error: 'No models found' };
          }
          return { models };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { models: [], error: `Connection failed: ${message}` };
      }
    }
  );
}
