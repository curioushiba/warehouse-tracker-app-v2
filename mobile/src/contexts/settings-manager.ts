export interface Settings {
  currency: string;
  darkMode: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'PHP',
  darkMode: 'system',
  notifications: true,
};

export const STORAGE_KEY = '@packtrack/settings';

export interface SettingsDeps {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export function createSettingsManager(deps: SettingsDeps) {
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let loading = true;

  function getSettings(): Settings {
    return settings;
  }

  function isLoading(): boolean {
    return loading;
  }

  async function loadSettings(): Promise<void> {
    try {
      const stored = await deps.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Use defaults on error
    } finally {
      loading = false;
    }
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    settings = { ...settings, [key]: value };
    void deps.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  return { getSettings, isLoading, loadSettings, updateSetting };
}
