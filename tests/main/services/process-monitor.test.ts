import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessMonitorService, RunningProcess } from '../../../src/main/services/process-monitor.service';
import { SETTINGS_KEYS } from '../../../src/shared/types/settings.types';

function createMockSettingsRepo(overrides: Record<string, string> = {}) {
  return {
    get: vi.fn((key: string) => overrides[key]),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  } as any;
}

function makeProcessList(...names: string[]): RunningProcess[] {
  return names.map((name, i) => ({ name, pid: 1000 + i }));
}

describe('ProcessMonitorService', () => {
  let service: ProcessMonitorService;
  let settingsRepo: ReturnType<typeof createMockSettingsRepo>;
  let onAppDetected: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    settingsRepo = createMockSettingsRepo();
    onAppDetected = vi.fn();
    service = new ProcessMonitorService(settingsRepo, onAppDetected);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  describe('matchKnownApps', () => {
    it('should identify known apps from process list', () => {
      const processes = makeProcessList('Teams.exe', 'explorer.exe', 'Zoom.exe', 'node.exe');
      const detected = service.matchKnownApps(processes);

      expect(detected).toHaveLength(2);
      expect(detected).toContainEqual({ appName: 'Microsoft Teams', processName: 'Teams.exe' });
      expect(detected).toContainEqual({ appName: 'Zoom', processName: 'Zoom.exe' });
    });

    it('should match exe names case-insensitively', () => {
      const processes = makeProcessList('teams.exe', 'ZOOM.EXE', 'SLACK.EXE');
      const detected = service.matchKnownApps(processes);

      expect(detected).toHaveLength(3);
      expect(detected.map((d) => d.appName)).toContain('Microsoft Teams');
      expect(detected.map((d) => d.appName)).toContain('Zoom');
      expect(detected.map((d) => d.appName)).toContain('Slack');
    });

    it('should return empty array when no known apps are running', () => {
      const processes = makeProcessList('explorer.exe', 'chrome.exe', 'node.exe');
      const detected = service.matchKnownApps(processes);

      expect(detected).toHaveLength(0);
    });

    it('should filter out apps with behavior set to never', () => {
      const customApps = [
        { name: 'Microsoft Teams', exe: 'Teams.exe', behavior: 'prompt' as const },
        { name: 'Zoom', exe: 'Zoom.exe', behavior: 'never' as const },
        { name: 'Skype', exe: 'Skype.exe', behavior: 'always' as const },
      ];
      settingsRepo = createMockSettingsRepo({
        [SETTINGS_KEYS.AUTO_DETECT_APPS]: JSON.stringify(customApps),
      });
      service = new ProcessMonitorService(settingsRepo, onAppDetected);

      const processes = makeProcessList('Teams.exe', 'Zoom.exe', 'Skype.exe');
      const detected = service.matchKnownApps(processes);

      expect(detected).toHaveLength(2);
      expect(detected.map((d) => d.appName)).toContain('Microsoft Teams');
      expect(detected.map((d) => d.appName)).toContain('Skype');
      expect(detected.map((d) => d.appName)).not.toContain('Zoom');
    });

    it('should handle behavior mode "always" same as "prompt"', () => {
      const customApps = [
        { name: 'Discord', exe: 'Discord.exe', behavior: 'always' as const },
      ];
      settingsRepo = createMockSettingsRepo({
        [SETTINGS_KEYS.AUTO_DETECT_APPS]: JSON.stringify(customApps),
      });
      service = new ProcessMonitorService(settingsRepo, onAppDetected);

      const processes = makeProcessList('Discord.exe');
      const detected = service.matchKnownApps(processes);

      expect(detected).toHaveLength(1);
      expect(detected[0].appName).toBe('Discord');
    });
  });

  describe('parseTasklistOutput', () => {
    it('should parse CSV tasklist output', () => {
      const output = [
        '"Teams.exe","12345","Console","1","50,000 K"',
        '"explorer.exe","1234","Console","1","80,000 K"',
        '',
      ].join('\n');

      const processes = service.parseTasklistOutput(output);

      expect(processes).toHaveLength(2);
      expect(processes[0]).toEqual({ name: 'Teams.exe', pid: 12345 });
      expect(processes[1]).toEqual({ name: 'explorer.exe', pid: 1234 });
    });

    it('should handle empty output', () => {
      expect(service.parseTasklistOutput('')).toHaveLength(0);
    });
  });

  describe('polling and cooldown', () => {
    it('should call onAppDetected for newly detected apps', async () => {
      // Mock scanProcesses to return Teams
      vi.spyOn(service, 'scanProcesses').mockResolvedValue(
        makeProcessList('Teams.exe')
      );

      service.start();
      // The initial poll fires immediately
      await vi.advanceTimersByTimeAsync(0);

      expect(onAppDetected).toHaveBeenCalledWith('Microsoft Teams', 'Teams.exe');
      expect(onAppDetected).toHaveBeenCalledTimes(1);
    });

    it('should not re-trigger callback while app is still running', async () => {
      vi.spyOn(service, 'scanProcesses').mockResolvedValue(
        makeProcessList('Teams.exe')
      );

      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(onAppDetected).toHaveBeenCalledTimes(1);

      // Advance past one polling interval
      await vi.advanceTimersByTimeAsync(5000);
      expect(onAppDetected).toHaveBeenCalledTimes(1); // still 1, not re-triggered
    });

    it('should respect cooldown when app disappears and reappears', async () => {
      const scanMock = vi.spyOn(service, 'scanProcesses');

      // First poll: Teams detected
      scanMock.mockResolvedValueOnce(makeProcessList('Teams.exe'));
      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(onAppDetected).toHaveBeenCalledTimes(1);

      // Second poll: Teams gone
      scanMock.mockResolvedValueOnce(makeProcessList());
      await vi.advanceTimersByTimeAsync(5000);

      // Third poll: Teams back, but within cooldown (5 min default)
      scanMock.mockResolvedValueOnce(makeProcessList('Teams.exe'));
      await vi.advanceTimersByTimeAsync(5000);
      expect(onAppDetected).toHaveBeenCalledTimes(1); // still 1 due to cooldown
    });

    it('should allow re-detection after cooldown expires', async () => {
      settingsRepo = createMockSettingsRepo({
        [SETTINGS_KEYS.AUTO_DETECT_COOLDOWN_MS]: '10000', // 10 seconds cooldown
      });
      service = new ProcessMonitorService(settingsRepo, onAppDetected);

      const scanMock = vi.spyOn(service, 'scanProcesses');

      // First detection
      scanMock.mockResolvedValue(makeProcessList('Teams.exe'));
      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(onAppDetected).toHaveBeenCalledTimes(1);

      // App disappears
      scanMock.mockResolvedValue(makeProcessList());
      await vi.advanceTimersByTimeAsync(5000);

      // Advance past cooldown (10s total from detection)
      await vi.advanceTimersByTimeAsync(10000);

      // App reappears — should re-trigger
      scanMock.mockResolvedValue(makeProcessList('Teams.exe'));
      await vi.advanceTimersByTimeAsync(5000);
      expect(onAppDetected).toHaveBeenCalledTimes(2);
    });

    it('should not poll when auto-detect is disabled', async () => {
      settingsRepo = createMockSettingsRepo({
        [SETTINGS_KEYS.AUTO_DETECT_ENABLED]: 'false',
      });
      service = new ProcessMonitorService(settingsRepo, onAppDetected);

      const scanMock = vi.spyOn(service, 'scanProcesses').mockResolvedValue(
        makeProcessList('Teams.exe')
      );

      service.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(scanMock).not.toHaveBeenCalled();
      expect(onAppDetected).not.toHaveBeenCalled();
    });
  });

  describe('start/stop/isRunning', () => {
    it('should report running state correctly', () => {
      expect(service.isRunning()).toBe(false);
      service.start();
      expect(service.isRunning()).toBe(true);
      service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('should not create multiple intervals on double start', () => {
      vi.spyOn(service, 'scanProcesses').mockResolvedValue([]);

      service.start();
      service.start(); // second call should be no-op

      expect(service.isRunning()).toBe(true);
      service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('should clear state on stop', async () => {
      const scanMock = vi.spyOn(service, 'scanProcesses');
      scanMock.mockResolvedValue(makeProcessList('Teams.exe'));

      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(onAppDetected).toHaveBeenCalledTimes(1);

      service.stop();

      // Re-start — should detect again since state was cleared
      service.start();
      await vi.advanceTimersByTimeAsync(0);
      // Cooldown map was also cleared, so it should fire again
      expect(onAppDetected).toHaveBeenCalledTimes(2);
    });
  });
});
