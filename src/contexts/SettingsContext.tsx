"use client";

import * as React from "react";
import {
  AppSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsHydrated(true);

    // Apply dark mode class on initial load
    if (loaded.darkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Update dark mode class whenever setting changes
  React.useEffect(() => {
    if (!isHydrated) return;

    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode, isHydrated]);

  const updateSettings = React.useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const resetSettings = React.useCallback(() => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
