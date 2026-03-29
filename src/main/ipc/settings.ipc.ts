import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { ServiceContainer } from '../index';
import { getDatabase } from '../db/connection';
import { DEFAULT_PROMPT_PROFILES } from '../../shared/constants';
import { invalidatePkiAgent } from '../services/pki-fetch';

export function registerSettingsHandlers(services: ServiceContainer): void {
  const { settings, audioCapture } = services;

  ipcMain.handle('settings:get', (_, args: { key: string }) =>
    settings.get(args.key) ?? null
  );

  ipcMain.handle('settings:set', (_, args: { key: string; value: string }) => {
    settings.set(args.key, args.value);
    // Invalidate cached PKI agent when any PKI setting changes
    if (args.key.startsWith('pki_')) {
      invalidatePkiAgent();
    }
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

  // Reset settings to defaults (keeps recordings and notebooks)
  ipcMain.handle('app:reset-settings', () => {
    // Clear all settings
    getDatabase().prepare('DELETE FROM settings').run();

    // Reset prompt profiles to defaults
    getDatabase().prepare('DELETE FROM prompt_profiles').run();
    for (const profile of DEFAULT_PROMPT_PROFILES) {
      services.promptProfiles.create({
        name: profile.name,
        system_prompt: profile.system_prompt,
        user_prompt_template: profile.user_prompt_template,
        is_default: profile.is_default,
      });
    }

    console.log('[Settings] Reset to defaults');
  });

  // Erase ALL data (recordings, notebooks, transcripts, summaries, audio files)
  ipcMain.handle('app:erase-all-data', () => {
    // Delete all DB data
    getDatabase().prepare('DELETE FROM action_items').run();
    getDatabase().prepare('DELETE FROM summaries').run();
    getDatabase().prepare('DELETE FROM transcript_segments').run();
    getDatabase().prepare('DELETE FROM transcripts').run();
    getDatabase().prepare('DELETE FROM recordings').run();
    getDatabase().prepare('DELETE FROM notebooks').run();
    getDatabase().prepare('DELETE FROM settings').run();
    getDatabase().prepare('DELETE FROM prompt_profiles').run();

    // Re-seed prompt profiles
    for (const profile of DEFAULT_PROMPT_PROFILES) {
      services.promptProfiles.create({
        name: profile.name,
        system_prompt: profile.system_prompt,
        user_prompt_template: profile.user_prompt_template,
        is_default: profile.is_default,
      });
    }

    // Delete audio files
    const recordingsDir = path.join(app.getPath('userData'), 'recordings');
    if (fs.existsSync(recordingsDir)) {
      for (const file of fs.readdirSync(recordingsDir)) {
        try { fs.unlinkSync(path.join(recordingsDir, file)); } catch { /* ignore */ }
      }
    }

    console.log('[Settings] All data erased');
  });

  // Get storage info
  ipcMain.handle('app:get-storage-info', () => {
    const recordingCount = (getDatabase().prepare('SELECT count(*) as c FROM recordings').get() as any).c;

    const recordingsDir = path.join(app.getPath('userData'), 'recordings');
    let audioFileCount = 0;
    let audioSizeBytes = 0;
    if (fs.existsSync(recordingsDir)) {
      for (const file of fs.readdirSync(recordingsDir)) {
        const stat = fs.statSync(path.join(recordingsDir, file));
        audioFileCount++;
        audioSizeBytes += stat.size;
      }
    }

    const dbPath = path.join(app.getPath('userData'), 'yourecord.db');
    const dbSizeBytes = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    return { dbSizeBytes, audioSizeBytes, recordingCount, audioFileCount };
  });
}
