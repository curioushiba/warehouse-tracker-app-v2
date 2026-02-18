import { describe, it, expect, beforeEach } from 'vitest'
import {
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
  clearSelectedDomain,
  getDarkMode,
  setDarkMode,
  getSettings,
  setSettings,
} from './storage'

describe('AsyncStorage Storage', () => {
  beforeEach(async () => {
    await clearAll()
  })

  describe('Generic operations', () => {
    it('setString/getString stores and retrieves strings', async () => {
      await setString('key', 'value')
      expect(await getString('key')).toBe('value')
    })

    it('getString returns undefined for missing key', async () => {
      expect(await getString('nonexistent')).toBeUndefined()
    })

    it('setObject/getObject serializes and deserializes JSON', async () => {
      const obj = { name: 'test', count: 42 }
      await setObject('data', obj)
      expect(await getObject('data')).toEqual(obj)
    })

    it('getObject returns undefined for missing key', async () => {
      expect(await getObject('nonexistent')).toBeUndefined()
    })

    it('setBoolean/getBoolean stores and retrieves booleans', async () => {
      await setBoolean('flag', true)
      expect(await getBoolean('flag')).toBe(true)
      await setBoolean('flag', false)
      expect(await getBoolean('flag')).toBe(false)
    })

    it('getBoolean returns false for missing key', async () => {
      expect(await getBoolean('nonexistent')).toBe(false)
    })

    it('remove deletes a key', async () => {
      await setString('key', 'value')
      await remove('key')
      expect(await getString('key')).toBeUndefined()
    })

    it('clearAll removes everything', async () => {
      await setString('a', '1')
      await setString('b', '2')
      await clearAll()
      expect(await getString('a')).toBeUndefined()
      expect(await getString('b')).toBeUndefined()
    })
  })

  describe('Typed helpers', () => {
    it('session token get/set/clear', async () => {
      expect(await getSessionToken()).toBeUndefined()
      await setSessionToken('token123')
      expect(await getSessionToken()).toBe('token123')
      await clearSession()
      expect(await getSessionToken()).toBeUndefined()
    })

    it('selected domain get/set/clear', async () => {
      expect(await getSelectedDomain()).toBeUndefined()
      await setSelectedDomain('commissary')
      expect(await getSelectedDomain()).toBe('commissary')
      await clearSelectedDomain()
      expect(await getSelectedDomain()).toBeUndefined()
    })

    it('dark mode defaults to "system"', async () => {
      expect(await getDarkMode()).toBe('system')
    })

    it('dark mode get/set', async () => {
      await setDarkMode('dark')
      expect(await getDarkMode()).toBe('dark')
      await setDarkMode('light')
      expect(await getDarkMode()).toBe('light')
    })

    it('settings get/set with object', async () => {
      expect(await getSettings()).toBeUndefined()
      const settings = { currency: 'USD', enableLowStockAlerts: true }
      await setSettings(settings)
      expect(await getSettings()).toEqual(settings)
    })
  })
})
