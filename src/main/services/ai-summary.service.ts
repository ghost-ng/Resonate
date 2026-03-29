import type { SettingsRepository } from '../db/repositories/settings.repo';
import type { PromptProfileRepository } from '../db/repositories/prompt-profile.repo';
import type { SafeStorageService } from './safe-storage.service';
import { SETTINGS_KEYS, type AiProviderType } from '../../shared/types/settings.types';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
} from '../../shared/constants';

export interface SummaryMetadata {
  duration: string;
  source_app: string;
  participant_count: string;
  date: string;
}

export interface ActionItem {
  text: string;
  assignee: string | null;
}

export interface SummaryResult {
  content: string;
  actionItems: ActionItem[];
}

/**
 * Replace `{{var}}` placeholders in a template string.
 * Unknown placeholders are left as-is.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

/**
 * Extract action items from markdown content.
 *
 * Recognised patterns:
 * - Lines starting with `- [ ]` or `- [x]` (checkbox syntax)
 * - Lines under an "Action Items" heading
 *
 * Assignee is extracted from trailing `(Name)` or `@Name`.
 */
export function extractActionItems(markdown: string): ActionItem[] {
  const items: ActionItem[] = [];
  const lines = markdown.split('\n');

  let inActionItemsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect "Action Items" heading (any heading level)
    if (/^#{1,6}\s+action\s+items/i.test(trimmed)) {
      inActionItemsSection = true;
      continue;
    }

    // A new heading ends the action-items section
    if (inActionItemsSection && /^#{1,6}\s+/.test(trimmed) && !/action\s+items/i.test(trimmed)) {
      inActionItemsSection = false;
      continue;
    }

    // Checkbox items anywhere in the document
    const checkboxMatch = trimmed.match(/^-\s+\[[ xX]\]\s+(.+)$/);
    if (checkboxMatch) {
      items.push(parseActionText(checkboxMatch[1]));
      continue;
    }

    // Plain list items inside the Action Items section
    if (inActionItemsSection) {
      const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        items.push(parseActionText(listMatch[1]));
      }
    }
  }

  return items;
}

function parseActionText(raw: string): ActionItem {
  let text = raw.trim();
  let assignee: string | null = null;

  // Check for @Name pattern
  const atMatch = text.match(/@(\w+)/);
  if (atMatch) {
    assignee = atMatch[1];
    text = text.replace(/@\w+/, '').trim();
  }

  // Check for trailing (Name) pattern — takes precedence if both exist
  const parenMatch = text.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    assignee = parenMatch[1].trim();
    text = text.replace(/\([^)]+\)\s*$/, '').trim();
  }

  return { text, assignee };
}

export class AiSummaryService {
  constructor(
    private settingsRepo: SettingsRepository,
    private promptProfileRepo: PromptProfileRepository,
    private safeStorage: SafeStorageService
  ) {}

  async generateSummary(
    transcript: string,
    metadata: SummaryMetadata,
    profileId?: number
  ): Promise<SummaryResult> {
    // 1. Load prompt profile
    const profile = profileId
      ? this.promptProfileRepo.findById(profileId)
      : this.promptProfileRepo.findDefault();

    const systemPrompt = profile?.system_prompt ?? DEFAULT_SYSTEM_PROMPT;
    const userTemplate =
      profile?.user_prompt_template ?? DEFAULT_USER_PROMPT_TEMPLATE;

    // 2. Load AI endpoint settings
    const endpoint =
      this.settingsRepo.get(SETTINGS_KEYS.AI_ENDPOINT) ??
      'https://api.openai.com';
    const encryptedKey = this.settingsRepo.get(SETTINGS_KEYS.AI_API_KEY) ?? '';
    const model =
      this.settingsRepo.get(SETTINGS_KEYS.AI_MODEL) ?? 'gpt-4o';
    const temperature = parseFloat(
      this.settingsRepo.get(SETTINGS_KEYS.AI_TEMPERATURE) ?? '0.3'
    );
    const maxTokens = parseInt(
      this.settingsRepo.get(SETTINGS_KEYS.AI_MAX_TOKENS) ?? '2048',
      10
    );

    // 3. Get API key — try to decrypt, fall back to plain text
    let apiKey = '';
    if (encryptedKey) {
      try {
        apiKey = this.safeStorage.decrypt(encryptedKey);
      } catch {
        // Key was stored as plain text (not encrypted)
        apiKey = encryptedKey;
      }
    }

    // 3b. Determine provider type
    const providerType: AiProviderType =
      (this.settingsRepo.get(SETTINGS_KEYS.AI_PROVIDER_TYPE) as AiProviderType | undefined) ?? 'openai';

    // 4. Render user prompt template
    const userPrompt = renderTemplate(userTemplate, {
      transcript,
      ...metadata,
    });

    // 5. POST to AI provider
    const baseUrl = endpoint.replace(/\/+$/, '');

    console.log('[AiSummary] System prompt:', systemPrompt.substring(0, 100) + '...');
    console.log('[AiSummary] User prompt length:', userPrompt.length);
    console.log('[AiSummary] Transcript:', transcript.substring(0, 200));
    console.log('[AiSummary] Provider:', providerType, '| Model:', model, '| Endpoint:', baseUrl);
    let content: string;

    if (providerType === 'anthropic') {
      // Anthropic Messages API
      const url = `${baseUrl}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AI endpoint returned ${response.status}: ${body}`);
      }

      const json = (await response.json()) as {
        content: { type: string; text: string }[];
      };

      content = json.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n') ?? '';
    } else {
      // OpenAI-compatible (openai or custom)
      const url = `${baseUrl}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AI endpoint returned ${response.status}: ${body}`);
      }

      const json = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      content = json.choices?.[0]?.message?.content ?? '';
    }

    // 7. Extract action items
    const actionItems = extractActionItems(content);

    // 8. Return result
    return { content, actionItems };
  }
}
