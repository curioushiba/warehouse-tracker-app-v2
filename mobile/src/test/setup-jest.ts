/**
 * Jest setup for component tests (jest-expo preset).
 * Mocks native modules used in UI components.
 */

// expo-camera mock
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraType: { back: 'back', front: 'front' },
}))

// expo-haptics mock
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// expo-av mock
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(),
            unloadAsync: jest.fn(),
            setPositionAsync: jest.fn(),
          },
          status: { isLoaded: true },
        })
      ),
    },
    setAudioModeAsync: jest.fn(),
  },
}))

// expo-image mock
jest.mock('expo-image', () => {
  const { View } = require('react-native')
  return {
    Image: View,
  }
})

// react-native-mmkv mock
jest.mock('react-native-mmkv', () => {
  const store = new Map()
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: (key: string, value: unknown) => store.set(key, value),
      getString: (key: string) => {
        const v = store.get(key)
        return typeof v === 'string' ? v : undefined
      },
      getNumber: (key: string) => {
        const v = store.get(key)
        return typeof v === 'number' ? v : 0
      },
      getBoolean: (key: string) => {
        const v = store.get(key)
        return typeof v === 'boolean' ? v : false
      },
      delete: (key: string) => store.delete(key),
      contains: (key: string) => store.has(key),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys()),
    })),
  }
})

// expo-crypto mock
jest.mock('expo-crypto', () => ({
  randomUUID: () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    }),
}))

// @react-native-community/netinfo mock
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      })
    ),
  },
}))

// lucide-react-native mock - returns simple Text components for icons
jest.mock('lucide-react-native', () => {
  const { Text } = require('react-native')
  return new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) => {
        if (prop === '__esModule') return true
        // Return a component that renders the icon name as text
        const IconComponent = (props: Record<string, unknown>) =>
          require('react').createElement(Text, {
            testID: props.testID || `icon-${prop}`,
            accessibilityLabel: `${prop} icon`,
          })
        IconComponent.displayName = prop
        return IconComponent
      },
    }
  )
})

// expo-linear-gradient mock
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native')
  return {
    LinearGradient: View,
  }
})

// react-native-toast-message mock
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}))

// expo-sqlite mock (for components that may import db functions)
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  SQLiteDatabase: class {},
}))

// react-native-url-polyfill mock
jest.mock('react-native-url-polyfill/auto', () => ({}))

// @supabase/supabase-js mock
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  })),
}))

// react-native-reanimated mock
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => {}
  return Reanimated
})

// react-native-safe-area-context mock
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  }
})

// expo-router mock
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Stack: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => null,
}))

// expo-status-bar mock
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}))

// expo-splash-screen mock
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

// expo-background-fetch mock
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
}))

// expo-task-manager mock
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
}))
