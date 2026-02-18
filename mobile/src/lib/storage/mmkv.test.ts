import { describe, it, expect, beforeEach } from 'vitest'
import {
  storage,
  setString,
  getString,
  setObject,
  getObject,
  setBoolean,
  getBoolean,
  remove,
  clearAll,
  getSessionToken,
  setSessionToken,
  clearSession,
  getSelectedDomain,
  setSelectedDomain,
  getDarkMode,
  setDarkMode,
  getSettings,
  setSettings,
} from './mmkv'

describe('MMKV Storage', () => {
  beforeEach(() => {
    clearAll()
  })

  describe('Generic operations', () => {
    it('setString/getString stores and retrieves strings', () => {
      setString('key', 'value')
      expect(getString('key')).toBe('value')
    })

    it('getString returns undefined for missing key', () => {
      expect(getString('nonexistent')).toBeUndefined()
    })

    it('setObject/getObject serializes and deserializes JSON', () => {
      const obj = { name: 'test', count: 42 }
      setObject('data', obj)
      expect(getObject('data')).toEqual(obj)
    })

    it('getObject returns undefined for missing key', () => {
      expect(getObject('nonexistent')).toBeUndefined()
    })

    it('setBoolean/getBoolean stores and retrieves booleans', () => {
      setBoolean('flag', true)
      expect(getBoolean('flag')).toBe(true)
      setBoolean('flag', false)
      expect(getBoolean('flag')).toBe(false)
    })

    it('getBoolean returns false for missing key', () => {
      expect(getBoolean('nonexistent')).toBe(false)
    })

    it('remove deletes a key', () => {
      setString('key', 'value')
      remove('key')
      expect(getString('key')).toBeUndefined()
    })

    it('clearAll removes everything', () => {
      setString('a', '1')
      setString('b', '2')
      clearAll()
      expect(getString('a')).toBeUndefined()
      expect(getString('b')).toBeUndefined()
    })
  })

  describe('Typed helpers', () => {
    it('session token get/set/clear', () => {
      expect(getSessionToken()).toBeUndefined()
      setSessionToken('token123')
      expect(getSessionToken()).toBe('token123')
      clearSession()
      expect(getSessionToken()).toBeUndefined()
    })

    it('selected domain get/set', () => {
      expect(getSelectedDomain()).toBeUndefined()
      setSelectedDomain('commissary')
      expect(getSelectedDomain()).toBe('commissary')
    })

    it('dark mode defaults to "system"', () => {
      expect(getDarkMode()).toBe('system')
    })

    it('dark mode get/set', () => {
      setDarkMode('dark')
      expect(getDarkMode()).toBe('dark')
      setDarkMode('light')
      expect(getDarkMode()).toBe('light')
    })

    it('settings get/set with object', () => {
      expect(getSettings()).toBeUndefined()
      const settings = { currency: 'USD', enableLowStockAlerts: true }
      setSettings(settings)
      expect(getSettings()).toEqual(settings)
    })
  })
})
