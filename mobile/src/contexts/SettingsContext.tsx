import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { getSettings, setSettings as saveToStorage, type ThemeMode } from '@/lib/storage/storage'

// --- Types ---

export interface AppSettings {
  // Alert Settings
  enableLowStockAlerts: boolean
  enableCriticalAlerts: boolean
  autoReorderPoint: number

  // Display Settings - three-state dark mode for mobile
  darkMode: ThemeMode

  // Currency Settings
  currency: string // Empty string means no currency (plain numbers)
}

export interface SettingsState {
  settings: AppSettings
}

export interface SettingsManager {
  loadFromStorage: () => Promise<AppSettings>
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

// --- Defaults ---

export const DEFAULT_SETTINGS: AppSettings = {
  enableLowStockAlerts: true,
  enableCriticalAlerts: true,
  autoReorderPoint: 15,
  darkMode: 'system',
  currency: '',
}

// --- Pure logic (testable) ---

/**
 * Creates a state manager for app settings.
 * Exported for direct testing without React rendering.
 *
 * @param setState - Callback to update the state
 * @param getState - Callback to get current state (for merging)
 */
export function createSettingsManager(
  setState: (state: Partial<SettingsState>) => void,
  getState: () => SettingsState
): SettingsManager {
  async function loadFromStorage(): Promise<AppSettings> {
    const stored = await getSettings<Partial<AppSettings>>()
    return { ...DEFAULT_SETTINGS, ...stored }
  }

  function updateSettings(updates: Partial<AppSettings>) {
    const current = getState().settings
    const newSettings = { ...current, ...updates }
    setState({ settings: newSettings })
    void saveToStorage(newSettings)
  }

  function resetSettings() {
    setState({ settings: { ...DEFAULT_SETTINGS } })
    void saveToStorage({ ...DEFAULT_SETTINGS })
  }

  return {
    loadFromStorage,
    updateSettings,
    resetSettings,
  }
}

// --- React context ---

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS })

  const stateRef = useRef<SettingsState>({ settings })
  stateRef.current = { settings }

  const managerRef = useRef<SettingsManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createSettingsManager(
      (partial) => {
        if (partial.settings) {
          setSettings(partial.settings)
        }
      },
      () => stateRef.current
    )
  }

  // Load settings from storage on mount
  useEffect(() => {
    managerRef.current!.loadFromStorage().then((loaded) => {
      setSettings(loaded)
    })
  }, [])

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    managerRef.current?.updateSettings(updates)
  }, [])

  const resetSettings = useCallback(() => {
    managerRef.current?.resetSettings()
  }, [])

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    updateSettings,
    resetSettings,
  }), [settings, updateSettings, resetSettings])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
