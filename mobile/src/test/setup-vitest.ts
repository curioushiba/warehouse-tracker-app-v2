/**
 * Vitest setup for pure logic tests (lib/, hooks/, contexts/).
 * Mocks native modules that don't exist in Node.
 */
import { vi } from 'vitest'
import Database from 'better-sqlite3'

// --- expo-sqlite mock ---
// Wraps better-sqlite3 to match expo-sqlite's synchronous API
vi.mock('expo-sqlite', () => {
  function openDatabaseSync(_name: string) {
    const db = new Database(':memory:')

    return {
      execSync: (sql: string) => {
        db.pragma('journal_mode = WAL')
        const statements = sql.split(';').filter(s => s.trim())
        for (const stmt of statements) {
          if (stmt.trim()) db.prepare(stmt).run()
        }
      },
      runSync: (sql: string, ...params: unknown[]) => {
        const flatParams = Array.isArray(params[0]) ? params[0] : params
        const stmt = db.prepare(sql)
        const result = stmt.run(...(flatParams as (string | number | null | boolean)[]))
        return { changes: result.changes, lastInsertRowId: result.lastInsertRowid }
      },
      getFirstSync: (sql: string, ...params: unknown[]) => {
        const flatParams = Array.isArray(params[0]) ? params[0] : params
        const stmt = db.prepare(sql)
        return stmt.get(...(flatParams as (string | number | null | boolean)[])) ?? null
      },
      getAllSync: (sql: string, ...params: unknown[]) => {
        const flatParams = Array.isArray(params[0]) ? params[0] : params
        const stmt = db.prepare(sql)
        return stmt.all(...(flatParams as (string | number | null | boolean)[]))
      },
      closeSync: () => {
        db.close()
      },
      _rawDb: db,
    }
  }

  return {
    openDatabaseSync,
    SQLiteDatabase: class {},
  }
})

// --- @react-native-async-storage/async-storage mock ---
vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value)
        return Promise.resolve()
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key)
        return Promise.resolve()
      }),
      clear: vi.fn(() => {
        store.clear()
        return Promise.resolve()
      }),
      getAllKeys: vi.fn(() => Promise.resolve(Array.from(store.keys()))),
      multiGet: vi.fn((keys: string[]) =>
        Promise.resolve(keys.map((k) => [k, store.get(k) ?? null]))
      ),
      multiSet: vi.fn((pairs: [string, string][]) => {
        for (const [k, v] of pairs) store.set(k, v)
        return Promise.resolve()
      }),
      multiRemove: vi.fn((keys: string[]) => {
        for (const k of keys) store.delete(k)
        return Promise.resolve()
      }),
    },
  }
})

// --- expo-crypto mock ---
vi.mock('expo-crypto', () => ({
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },
}))

// --- @react-native-community/netinfo mock ---
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
    fetch: vi.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      })
    ),
  },
  NetInfoStateType: {
    wifi: 'wifi',
    cellular: 'cellular',
    none: 'none',
  },
}))

// --- react-native-url-polyfill mock ---
vi.mock('react-native-url-polyfill/auto', () => ({}))

// --- expo-haptics mock ---
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  selectionAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// --- expo-av mock ---
vi.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: vi.fn().mockResolvedValue({
        sound: {
          loadAsync: vi.fn(),
          playAsync: vi.fn(),
          unloadAsync: vi.fn(),
          setPositionAsync: vi.fn(),
          setVolumeAsync: vi.fn(),
        },
      }),
    },
    setAudioModeAsync: vi.fn(),
  },
}))

// --- @supabase/supabase-js mock ---
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}))

// --- react-native mock (minimal for hooks/contexts) ---
vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (obj: Record<string, unknown>) => obj.android },
  Dimensions: {
    get: () => ({ width: 360, height: 640, scale: 2, fontScale: 1 }),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Appearance: {
    getColorScheme: () => 'light',
    setColorScheme: vi.fn(),
    addChangeListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  useWindowDimensions: () => ({ width: 360, height: 640 }),
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => style,
  },
}))
