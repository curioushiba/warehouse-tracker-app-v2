import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettingsManager, DEFAULT_SETTINGS, STORAGE_KEY, type SettingsDeps } from './settings-manager';

function createMockStorage(stored: Record<string, string> = {}): SettingsDeps {
  const store = { ...stored };
  return {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
  };
}

describe('settings-manager', () => {
  describe('default state', () => {
    it('should start with default settings', () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);

      expect(manager.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(manager.isLoading()).toBe(true);
    });

    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS.currency).toBe('PHP');
      expect(DEFAULT_SETTINGS.darkMode).toBe('system');
      expect(DEFAULT_SETTINGS.notifications).toBe(true);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from storage', async () => {
      const stored = { currency: 'USD', darkMode: 'dark', notifications: false };
      const deps = createMockStorage({
        [STORAGE_KEY]: JSON.stringify(stored),
      });
      const manager = createSettingsManager(deps);

      await manager.loadSettings();

      expect(manager.getSettings()).toEqual({
        currency: 'USD',
        darkMode: 'dark',
        notifications: false,
      });
      expect(manager.isLoading()).toBe(false);
    });

    it('should use defaults when nothing is stored', async () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);

      await manager.loadSettings();

      expect(manager.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(manager.isLoading()).toBe(false);
    });

    it('should merge partial stored settings with defaults', async () => {
      const deps = createMockStorage({
        [STORAGE_KEY]: JSON.stringify({ currency: 'EUR' }),
      });
      const manager = createSettingsManager(deps);

      await manager.loadSettings();

      expect(manager.getSettings()).toEqual({
        currency: 'EUR',
        darkMode: 'system',
        notifications: true,
      });
    });

    it('should use defaults when storage throws', async () => {
      const deps: SettingsDeps = {
        getItem: vi.fn().mockRejectedValue(new Error('Storage corrupted')),
        setItem: vi.fn(),
      };
      const manager = createSettingsManager(deps);

      await manager.loadSettings();

      expect(manager.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(manager.isLoading()).toBe(false);
    });

    it('should use defaults when stored JSON is invalid', async () => {
      const deps = createMockStorage({
        [STORAGE_KEY]: 'not valid json{{{',
      });
      const manager = createSettingsManager(deps);

      await manager.loadSettings();

      expect(manager.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(manager.isLoading()).toBe(false);
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);
      await manager.loadSettings();

      manager.updateSetting('currency', 'USD');

      expect(manager.getSettings().currency).toBe('USD');
      // Other settings should remain unchanged
      expect(manager.getSettings().darkMode).toBe('system');
      expect(manager.getSettings().notifications).toBe(true);
    });

    it('should persist updated settings to storage', async () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);
      await manager.loadSettings();

      manager.updateSetting('darkMode', 'dark');

      expect(deps.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ currency: 'PHP', darkMode: 'dark', notifications: true }),
      );
    });

    it('should update notifications setting', async () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);
      await manager.loadSettings();

      manager.updateSetting('notifications', false);

      expect(manager.getSettings().notifications).toBe(false);
    });

    it('should allow multiple sequential updates', async () => {
      const deps = createMockStorage();
      const manager = createSettingsManager(deps);
      await manager.loadSettings();

      manager.updateSetting('currency', 'EUR');
      manager.updateSetting('darkMode', 'light');
      manager.updateSetting('notifications', false);

      expect(manager.getSettings()).toEqual({
        currency: 'EUR',
        darkMode: 'light',
        notifications: false,
      });
    });
  });
});
