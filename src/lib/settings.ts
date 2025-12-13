export interface AppSettings {
  // Alert Settings
  enableLowStockAlerts: boolean;
  enableCriticalAlerts: boolean;
  autoReorderPoint: number;

  // Display Settings
  darkMode: boolean;
}

export const defaultSettings: AppSettings = {
  // Alert Settings
  enableLowStockAlerts: true,
  enableCriticalAlerts: true,
  autoReorderPoint: 15,

  // Display Settings
  darkMode: false,
};

// Load settings from localStorage
export const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") return defaultSettings;

  const stored = localStorage.getItem("app-settings");
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

// Save settings to localStorage
export const saveSettings = (settings: AppSettings): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("app-settings", JSON.stringify(settings));
};
