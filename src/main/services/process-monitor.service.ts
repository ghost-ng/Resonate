import { exec } from 'child_process';
import { promisify } from 'util';
import { SettingsRepository } from '../db/repositories/settings.repo';
import { SETTINGS_KEYS, DEFAULT_AUTO_DETECT_APPS, AutoDetectApp } from '../../shared/types/settings.types';
import { PROCESS_MONITOR_INTERVAL_MS } from '../../shared/constants';

const execAsync = promisify(exec);

export interface RunningProcess {
  name: string;
  pid: number;
}

export interface DetectedApp {
  appName: string;
  processName: string;
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export class ProcessMonitorService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private previouslyDetected = new Set<string>();
  private cooldowns = new Map<string, number>(); // exe name (lowercase) -> timestamp when cooldown expires

  constructor(
    private settingsRepo: SettingsRepository,
    private onAppDetected: (appName: string, processName: string) => void
  ) {}

  start(): void {
    if (this.intervalId !== null) {
      return;
    }
    this.intervalId = setInterval(() => {
      this.poll().catch(() => {
        // Silently ignore polling errors
      });
    }, PROCESS_MONITOR_INTERVAL_MS);
    // Also run immediately on start
    this.poll().catch(() => {});
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.previouslyDetected.clear();
    this.cooldowns.clear();
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  private async poll(): Promise<void> {
    const enabled = this.settingsRepo.get(SETTINGS_KEYS.AUTO_DETECT_ENABLED);
    if (enabled === 'false') {
      return;
    }

    const processes = await this.scanProcesses();
    const detected = this.matchKnownApps(processes);
    const now = Date.now();
    const cooldownMs = this.getCooldownMs();

    const currentExes = new Set(detected.map((d) => d.processName.toLowerCase()));

    for (const app of detected) {
      const key = app.processName.toLowerCase();
      const wasDetected = this.previouslyDetected.has(key);

      if (!wasDetected) {
        // New detection — check cooldown
        const cooldownExpiry = this.cooldowns.get(key);
        if (cooldownExpiry !== undefined && now < cooldownExpiry) {
          continue; // Still in cooldown
        }
        this.cooldowns.set(key, now + cooldownMs);
        this.onAppDetected(app.appName, app.processName);
      }
    }

    this.previouslyDetected = currentExes;
  }

  async scanProcesses(): Promise<RunningProcess[]> {
    try {
      const { stdout } = await execAsync('tasklist /FO CSV /NH');
      return this.parseTasklistOutput(stdout);
    } catch {
      return [];
    }
  }

  parseTasklistOutput(stdout: string): RunningProcess[] {
    const processes: RunningProcess[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
      const match = trimmed.match(/^"([^"]+)","(\d+)"/);
      if (match) {
        processes.push({
          name: match[1],
          pid: parseInt(match[2], 10),
        });
      }
    }

    return processes;
  }

  matchKnownApps(processes: RunningProcess[]): DetectedApp[] {
    const apps = this.getAutoDetectApps();
    const processNamesLower = new Set(processes.map((p) => p.name.toLowerCase()));
    const detected: DetectedApp[] = [];

    for (const app of apps) {
      if (app.behavior === 'never') {
        continue;
      }
      if (processNamesLower.has(app.exe.toLowerCase())) {
        detected.push({
          appName: app.name,
          processName: app.exe,
        });
      }
    }

    return detected;
  }

  private getAutoDetectApps(): AutoDetectApp[] {
    const raw = this.settingsRepo.get(SETTINGS_KEYS.AUTO_DETECT_APPS);
    if (raw) {
      try {
        return JSON.parse(raw) as AutoDetectApp[];
      } catch {
        // Fall back to defaults on parse error
      }
    }
    return DEFAULT_AUTO_DETECT_APPS;
  }

  private getCooldownMs(): number {
    const raw = this.settingsRepo.get(SETTINGS_KEYS.AUTO_DETECT_COOLDOWN_MS);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return DEFAULT_COOLDOWN_MS;
  }
}
