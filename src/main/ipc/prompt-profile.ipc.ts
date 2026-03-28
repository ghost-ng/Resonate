import { ipcMain } from 'electron';
import type { PromptProfileRepository } from '../db/repositories/prompt-profile.repo';

export function registerPromptProfileHandlers(profiles: PromptProfileRepository): void {
  ipcMain.handle('prompt-profile:list', () => profiles.findAll());

  ipcMain.handle('prompt-profile:create', (_, args: {
    name: string;
    system_prompt: string;
    user_prompt_template: string;
    is_default?: number;
  }) =>
    profiles.create({
      name: args.name,
      system_prompt: args.system_prompt,
      user_prompt_template: args.user_prompt_template,
      is_default: args.is_default === 1,
    })
  );

  ipcMain.handle('prompt-profile:update', (_, args: {
    id: number;
    name?: string;
    system_prompt?: string;
    user_prompt_template?: string;
    is_default?: number;
  }) =>
    profiles.update(args.id, {
      name: args.name,
      system_prompt: args.system_prompt,
      user_prompt_template: args.user_prompt_template,
      is_default: args.is_default !== undefined ? args.is_default === 1 : undefined,
    })
  );

  ipcMain.handle('prompt-profile:delete', (_, args: { id: number }) => {
    profiles.delete(args.id);
  });
}
