import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { getSettings, setSettings as saveToMMKV } from '@/lib/storage/mmkv'

// --- Types ---

export interface AppSettings {
  // Alert Settings
  enableLowStockAlerts: boolean
  enableCriticalAlerts: boolean
  autoReorderPoint: number

  // Display Settings - three-state dark mode for mobile
  darkMode: 'light' | 'dark' | 'system'

  // Currency Settings
  currency: string // Empty string means no currency (plain numbers)
}

export interface SettingsState {
  settings: AppSettings
}

export interface SettingsManager {
  loadFromStorage: () => AppSettings
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
  function loadFromStorage(): AppSettings {
    const stored = getSettings<Partial<AppSettings>>()
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...stored }
    }
    return { ...DEFAULT_SETTINGS }
  }

  function updateSettings(updates: Partial<AppSettings>) {
    const current = getState().settings
    const newSettings = { ...current, ...updates }
    setState({ settings: newSettings })
    saveToMMKV(newSettings)
  }

  function resetSettings() {
    setState({ settings: { ...DEFAULT_SETTINGS } })
    saveToMMKV({ ...DEFAULT_SETTINGS })
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

  const stateRef = React.useRef<SettingsState>({ settings })
  stateRef.current = { settings }

  const managerRef = React.useRef<SettingsManager | null>(null)
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

  // Load settings from MMKV on mount
  useEffect(() => {
    const loaded = managerRef.current!.loadFromStorage()
    setSettings(loaded)
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
