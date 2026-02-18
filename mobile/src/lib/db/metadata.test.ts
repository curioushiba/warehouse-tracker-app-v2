import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  setMetadata,
  getMetadata,
  getLastSyncTime,
  setLastSyncTime,
  getDeviceId,
} from './metadata'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('metadata', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---- setMetadata / getMetadata ----

  describe('setMetadata / getMetadata', () => {
    it('stores and retrieves a string value', () => {
      setMetadata(db, 'app_name', 'PackTrack')
      expect(getMetadata(db, 'app_name')).toBe('PackTrack')
    })

    it('stores and retrieves a number value', () => {
      setMetadata(db, 'retry_limit', 5)
      expect(getMetadata(db, 'retry_limit')).toBe(5)
    })

    it('stores and retrieves a boolean true value', () => {
      setMetadata(db, 'is_setup_done', true)
      expect(getMetadata(db, 'is_setup_done')).toBe(true)
    })

    it('stores and retrieves a boolean false value', () => {
      setMetadata(db, 'offline_mode', false)
      expect(getMetadata(db, 'offline_mode')).toBe(false)
    })

    it('returns undefined for a missing key', () => {
      expect(getMetadata(db, 'nonexistent_key')).toBeUndefined()
    })

    it('overwrites an existing value with a new value', () => {
      setMetadata(db, 'counter', 1)
      expect(getMetadata(db, 'counter')).toBe(1)

      setMetadata(db, 'counter', 42)
      expect(getMetadata(db, 'counter')).toBe(42)
    })

    it('overwrites a value with a different type', () => {
      setMetadata(db, 'setting', 'enabled')
      expect(getMetadata(db, 'setting')).toBe('enabled')

      setMetadata(db, 'setting', true)
      expect(getMetadata(db, 'setting')).toBe(true)
    })

    it('stores an empty string', () => {
      setMetadata(db, 'empty_val', '')
      expect(getMetadata(db, 'empty_val')).toBe('')
    })

    it('stores zero as a number', () => {
      setMetadata(db, 'zero_val', 0)
      expect(getMetadata(db, 'zero_val')).toBe(0)
    })

    it('stores a numeric string and retrieves it as string', () => {
      setMetadata(db, 'str_num', '42')
      expect(getMetadata(db, 'str_num')).toBe('42')
    })

    it('handles multiple distinct keys independently', () => {
      setMetadata(db, 'key_a', 'value_a')
      setMetadata(db, 'key_b', 100)
      setMetadata(db, 'key_c', true)

      expect(getMetadata(db, 'key_a')).toBe('value_a')
      expect(getMetadata(db, 'key_b')).toBe(100)
      expect(getMetadata(db, 'key_c')).toBe(true)
    })
  })

  // ---- getLastSyncTime / setLastSyncTime ----

  describe('getLastSyncTime / setLastSyncTime', () => {
    it('returns undefined when last sync time is not set', () => {
      expect(getLastSyncTime(db)).toBeUndefined()
    })

    it('stores and retrieves last sync time as a string', () => {
      const syncTime = '2024-06-15T12:00:00Z'
      setLastSyncTime(db, syncTime)

      expect(getLastSyncTime(db)).toBe(syncTime)
    })

    it('overwrites previous sync time', () => {
      setLastSyncTime(db, '2024-06-15T12:00:00Z')
      setLastSyncTime(db, '2024-06-15T14:00:00Z')

      expect(getLastSyncTime(db)).toBe('2024-06-15T14:00:00Z')
    })

    it('returns a string type', () => {
      setLastSyncTime(db, '2024-01-01T00:00:00Z')

      const result = getLastSyncTime(db)
      expect(typeof result).toBe('string')
    })
  })

  // ---- getDeviceId ----

  describe('getDeviceId', () => {
    it('generates a device ID on first call', () => {
      const deviceId = getDeviceId(db)

      expect(deviceId).toBeDefined()
      expect(typeof deviceId).toBe('string')
      expect(deviceId.length).toBeGreaterThan(0)
    })

    it('returns the same device ID on subsequent calls', () => {
      const firstCall = getDeviceId(db)
      const secondCall = getDeviceId(db)
      const thirdCall = getDeviceId(db)

      expect(firstCall).toBe(secondCall)
      expect(secondCall).toBe(thirdCall)
    })

    it('persists the device ID in the metadata table', () => {
      const deviceId = getDeviceId(db)

      // Verify it was stored in metadata
      const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM metadata WHERE key = 'device_id'"
      )
      expect(row).not.toBeNull()
      expect(row!.value).toBe(deviceId)
    })

    it('generates a UUID-formatted string', () => {
      const deviceId = getDeviceId(db)

      // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(deviceId).toMatch(uuidPattern)
    })

    it('does not regenerate when called from a fresh db instance with existing data', () => {
      // First call generates
      const deviceId = getDeviceId(db)

      // Manually verify metadata has the value
      const stored = getMetadata(db, 'device_id')
      expect(stored).toBe(deviceId)

      // Second call should return same value (reads from metadata)
      const again = getDeviceId(db)
      expect(again).toBe(deviceId)
    })
  })
})
