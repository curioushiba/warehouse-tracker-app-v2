import { describe, it, expect, beforeEach } from 'vitest'
import { clearAll, setSettings as saveToMMKV } from '@/lib/storage/mmkv'
import {
  createSettingsManager,
  DEFAULT_SETTINGS,
  type AppSettings,
  type SettingsState,
  type SettingsManager,
} from './SettingsContext'

/**
 * SettingsContext is a React context provider wrapping settings management.
 * We test the pure state management logic via createSettingsManager().
 */
describe('createSettingsManager', () => {
  let state: SettingsState
  let setState: (partial: Partial<SettingsState>) => void
  let manager: SettingsManager

  beforeEach(() => {
    clearAll()
    state = { settings: { ...DEFAULT_SETTINGS } }
    setState = (partial) => {
      state = { ...state, ...partial }
    }
    manager = createSettingsManager(setState, () => state)
  })

  describe('DEFAULT_SETTINGS', () => {
    it('has enableLowStockAlerts=true', () => {
      expect(DEFAULT_SETTINGS.enableLowStockAlerts).toBe(true)
    })

    it('has enableCriticalAlerts=true', () => {
      expect(DEFAULT_SETTINGS.enableCriticalAlerts).toBe(true)
    })

    it('has autoReorderPoint=15', () => {
      expect(DEFAULT_SETTINGS.autoReorderPoint).toBe(15)
    })

    it('has darkMode="system" (three-state)', () => {
      expect(DEFAULT_SETTINGS.darkMode).toBe('system')
    })

    it('has currency="" (no currency)', () => {
      expect(DEFAULT_SETTINGS.currency).toBe('')
    })
  })

  describe('loadFromStorage', () => {
    it('returns DEFAULT_SETTINGS when MMKV is empty', () => {
      const loaded = manager.loadFromStorage()
      expect(loaded).toEqual(DEFAULT_SETTINGS)
    })

    it('restores saved settings from MMKV', () => {
      const custom: AppSettings = {
        ...DEFAULT_SETTINGS,
        currency: 'PHP',
        darkMode: 'dark',
      }
      manager.updateSettings({ currency: 'PHP', darkMode: 'dark' })

      // Create fresh manager to verify restoration
      const state2: SettingsState = { settings: { ...DEFAULT_SETTINGS } }
      const setState2 = (partial: Partial<SettingsState>) => {
        Object.assign(state2, partial)
      }
      const manager2 = createSettingsManager(setState2, () => state2)
      const loaded = manager2.loadFromStorage()
      expect(loaded.currency).toBe('PHP')
      expect(loaded.darkMode).toBe('dark')
    })

    it('merges with defaults for partial stored settings', () => {
      // Simulate storing only partial settings directly via MMKV
      saveToMMKV({ currency: 'USD' })

      const loaded = manager.loadFromStorage()
      expect(loaded.currency).toBe('USD')
      expect(loaded.enableLowStockAlerts).toBe(true) // from defaults
    })
  })

  describe('updateSettings', () => {
    it('merges partial updates into current settings', () => {
      manager.updateSettings({ currency: 'PHP' })
      expect(state.settings.currency).toBe('PHP')
      // Other settings unchanged
      expect(state.settings.enableLowStockAlerts).toBe(true)
      expect(state.settings.darkMode).toBe('system')
    })

    it('updates multiple fields at once', () => {
      manager.updateSettings({
        currency: 'USD',
        darkMode: 'dark',
        autoReorderPoint: 20,
      })
      expect(state.settings.currency).toBe('USD')
      expect(state.settings.darkMode).toBe('dark')
      expect(state.settings.autoReorderPoint).toBe(20)
    })

    it('persists to MMKV', () => {
      manager.updateSettings({ currency: 'EUR' })

      // Verify by loading from fresh manager
      const state2: SettingsState = { settings: { ...DEFAULT_SETTINGS } }
      const setState2 = (partial: Partial<SettingsState>) => {
        Object.assign(state2, partial)
      }
      const manager2 = createSettingsManager(setState2, () => state2)
      const loaded = manager2.loadFromStorage()
      expect(loaded.currency).toBe('EUR')
    })

    it('can set darkMode to light', () => {
      manager.updateSettings({ darkMode: 'light' })
      expect(state.settings.darkMode).toBe('light')
    })

    it('can set darkMode to dark', () => {
      manager.updateSettings({ darkMode: 'dark' })
      expect(state.settings.darkMode).toBe('dark')
    })

    it('can set darkMode to system', () => {
      manager.updateSettings({ darkMode: 'dark' })
      manager.updateSettings({ darkMode: 'system' })
      expect(state.settings.darkMode).toBe('system')
    })
  })

  describe('resetSettings', () => {
    it('reverts to DEFAULT_SETTINGS', () => {
      manager.updateSettings({
        currency: 'PHP',
        darkMode: 'dark',
        enableLowStockAlerts: false,
      })

      manager.resetSettings()
      expect(state.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('persists reset to MMKV', () => {
      manager.updateSettings({ currency: 'PHP' })
      manager.resetSettings()

      const state2: SettingsState = { settings: { ...DEFAULT_SETTINGS } }
      const setState2 = (partial: Partial<SettingsState>) => {
        Object.assign(state2, partial)
      }
      const manager2 = createSettingsManager(setState2, () => state2)
      const loaded = manager2.loadFromStorage()
      expect(loaded).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('three-state darkMode', () => {
    it('supports light | dark | system values', () => {
      const modes: AppSettings['darkMode'][] = ['light', 'dark', 'system']
      for (const mode of modes) {
        manager.updateSettings({ darkMode: mode })
        expect(state.settings.darkMode).toBe(mode)
      }
    })
  })
})
