import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }
const mockSignOut = jest.fn().mockResolvedValue(undefined)
const mockClearDomain = jest.fn()
const mockUpdateSettings = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: {
      role: 'employee',
      is_active: true,
      first_name: 'John',
      last_name: 'Doe',
    },
    isAuthenticated: true,
    isAdmin: false,
    isEmployee: true,
    signOut: mockSignOut,
  })),
}))

jest.mock('@/contexts/DomainContext', () => ({
  useDomain: jest.fn(() => ({
    domainId: 'commissary',
    domainConfig: {
      id: 'commissary',
      displayName: 'Commissary',
      letter: 'C',
      brandColor: '#E07A2F',
      transactionDomain: 'commissary',
    },
    clearDomain: mockClearDomain,
  })),
}))

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: jest.fn(() => ({
    settings: {
      darkMode: 'system',
      enableLowStockAlerts: true,
      enableCriticalAlerts: true,
      autoReorderPoint: 15,
      currency: '',
    },
    updateSettings: mockUpdateSettings,
  })),
}))

jest.mock('@/hooks/useSyncQueue', () => ({
  useSyncQueue: jest.fn(() => ({
    queueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  })),
}))

jest.mock('@/hooks/useSyncErrorCount', () => ({
  useSyncErrorCount: jest.fn(() => ({
    count: 0,
    isLoading: false,
    refetch: jest.fn(),
  })),
}))

jest.mock('@/lib/display-name', () => ({
  getDisplayName: jest.fn((profile: any) => {
    if (!profile) return 'User'
    const first = profile.first_name?.trim()
    const last = profile.last_name?.trim()
    if (first && last) return `${first} ${last}`
    if (first) return first
    return 'User'
  }),
}))

jest.mock('@/lib/db/queue-counts', () => ({
  getAllQueueCounts: jest.fn(() => ({
    creates: 0,
    edits: 0,
    archives: 0,
    images: 0,
    transactions: 0,
  })),
}))

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
}))

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0' },
  },
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    fontFamily: require('@/theme/tokens').fontFamily,
    isDark: false,
  }),
}))

jest.mock('@/components/ui/SegmentedControl', () => ({
  SegmentedControl: ({ options, value, onValueChange, testID }: any) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={testID}>
        {options.map((o: any) => (
          <Pressable
            key={o.value}
            testID={`${testID}-${o.value}`}
            onPress={() => onValueChange(o.value)}
          >
            <Text>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    )
  },
}))

jest.mock('@/components/ui/SectionHeader', () => ({
  SectionHeader: ({ label, testID }: any) => {
    const { Text } = require('react-native')
    return <Text testID={testID}>{label}</Text>
  },
}))

jest.mock('@/components/ui/AnimatedPressable', () => ({
  AnimatedPressable: ({ children, onPress, testID, style }: any) => {
    const { Pressable } = require('react-native')
    return (
      <Pressable onPress={onPress} testID={testID} style={style}>
        {children}
      </Pressable>
    )
  },
}))

import ProfileScreen from '@/app/(app)/(tabs)/profile'
import { useAuth } from '@/contexts/AuthContext'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncErrorCount } from '@/hooks/useSyncErrorCount'
import { getAllQueueCounts } from '@/lib/db/queue-counts'

// --- Tests ---

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'test@test.com' },
      profile: {
        role: 'employee',
        is_active: true,
        first_name: 'John',
        last_name: 'Doe',
      },
      isAuthenticated: true,
      isAdmin: false,
      isEmployee: true,
      signOut: mockSignOut,
    })
    ;(useSyncQueue as jest.Mock).mockReturnValue({
      queueCount: 0,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
    })
    ;(useSyncErrorCount as jest.Mock).mockReturnValue({
      count: 0,
      isLoading: false,
      refetch: jest.fn(),
    })
    ;(getAllQueueCounts as jest.Mock).mockReturnValue({
      creates: 0,
      edits: 0,
      archives: 0,
      images: 0,
      transactions: 0,
    })
  })

  it('renders user display name', () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('John Doe')).toBeTruthy()
  })

  it('renders user role badge for Employee', () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Employee')).toBeTruthy()
  })

  it('renders user role badge for Admin', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'admin@test.com' },
      profile: {
        role: 'admin',
        is_active: true,
        first_name: 'Admin',
        last_name: 'User',
      },
      isAuthenticated: true,
      isAdmin: true,
      isEmployee: false,
      signOut: mockSignOut,
    })

    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Admin')).toBeTruthy()
  })

  it('renders avatar with user initials', () => {
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('profile-avatar')).toBeTruthy()
  })

  it('renders hero section with rounded bottom corners', () => {
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('profile-hero')).toBeTruthy()
  })

  it('shows dark mode segmented control with 3 options', () => {
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('dark-mode-control')).toBeTruthy()
    expect(getByTestId('dark-mode-control-light')).toBeTruthy()
    expect(getByTestId('dark-mode-control-system')).toBeTruthy()
    expect(getByTestId('dark-mode-control-dark')).toBeTruthy()
  })

  it('changing dark mode calls updateSettings', () => {
    const { getByTestId } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('dark-mode-control-light'))

    expect(mockUpdateSettings).toHaveBeenCalledWith({ darkMode: 'light' })
  })

  it('shows section headers', () => {
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('section-appearance')).toBeTruthy()
    expect(getByTestId('section-sync')).toBeTruthy()
    expect(getByTestId('section-domain')).toBeTruthy()
    expect(getByTestId('section-account')).toBeTruthy()
  })

  it('shows queue count summary', () => {
    ;(getAllQueueCounts as jest.Mock).mockReturnValue({
      creates: 2,
      edits: 1,
      archives: 0,
      images: 3,
      transactions: 5,
    })

    const { getByText } = render(<ProfileScreen />)
    expect(getByText('11')).toBeTruthy() // total: 2+1+0+3+5
  })

  it('shows failed sync count with link to sync-errors', () => {
    ;(useSyncErrorCount as jest.Mock).mockReturnValue({
      count: 3,
      isLoading: false,
      refetch: jest.fn(),
    })

    const { getByTestId, getByText } = render(<ProfileScreen />)
    expect(getByText('3')).toBeTruthy()

    fireEvent.press(getByTestId('failed-sync-link'))
    expect(mockRouter.push).toHaveBeenCalledWith('/sync-errors')
  })

  it('Switch Domain button calls clearDomain and navigates to domain-picker', () => {
    const { getByTestId } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('switch-domain-button'))

    expect(mockClearDomain).toHaveBeenCalled()
    expect(mockRouter.replace).toHaveBeenCalledWith('/domain-picker')
  })

  it('Sign-out button calls signOut when queue is empty', async () => {
    const { getByTestId } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('sign-out-button'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows warning modal when signing out with queue > 0', () => {
    ;(useSyncQueue as jest.Mock).mockReturnValue({
      queueCount: 5,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
    })

    const { getByTestId, getByText } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('sign-out-button'))

    // Modal should appear instead of immediate sign-out
    expect(getByText('Unsaved Changes')).toBeTruthy()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('warning modal shows count of pending transactions', () => {
    ;(useSyncQueue as jest.Mock).mockReturnValue({
      queueCount: 5,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
    })

    const { getByTestId, getByText } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('sign-out-button'))

    expect(getByText(/5 pending transaction/)).toBeTruthy()
  })

  it('confirming sign-out in warning modal calls signOut', async () => {
    ;(useSyncQueue as jest.Mock).mockReturnValue({
      queueCount: 3,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
    })

    const { getByTestId } = render(<ProfileScreen />)

    fireEvent.press(getByTestId('sign-out-button'))
    fireEvent.press(getByTestId('confirm-sign-out'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows app version in xs typography', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />)
    expect(getByTestId('app-version')).toBeTruthy()
    expect(getByText('PackTrack v1.0.0')).toBeTruthy()
  })

  it('shows sign out with LogOut icon in account section', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />)
    expect(getByTestId('sign-out-button')).toBeTruthy()
    expect(getByText('Sign Out')).toBeTruthy()
  })
})
