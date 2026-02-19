import React from 'react'
import { render } from '@testing-library/react-native'

// --- Mocks ---

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native')
    return require('react').createElement(Text, { testID: 'redirect' }, `Redirect:${href}`)
  },
  Tabs: ({ children }: any) => children,
  Stack: Object.assign(
    ({ children }: any) => {
      const { View } = require('react-native')
      return require('react').createElement(View, { testID: 'stack' }, children)
    },
    {
      Screen: ({ name }: any) => {
        const { View } = require('react-native')
        return require('react').createElement(View, { testID: `screen-${name}` })
      },
    }
  ),
  Slot: () => {
    const { View } = require('react-native')
    return require('react').createElement(View, { testID: 'slot' })
  },
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: '1', email: 'user@example.com' },
    profile: { role: 'employee' },
    isAuthenticated: true,
    isLoading: false,
    isAdmin: false,
    isEmployee: true,
    isActive: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  })),
}))

jest.mock('@/contexts/DomainContext', () => ({
  useDomain: jest.fn(() => ({
    domainId: 'commissary',
    domainConfig: { id: 'commissary', displayName: 'Commissary', brandColor: '#E07A2F' },
    setDomain: jest.fn(),
    clearDomain: jest.fn(),
  })),
}))

jest.mock('expo-sqlite', () => ({
  SQLiteProvider: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native')
    return require('react').createElement(View, { testID: 'sqlite-provider' }, children)
  },
}))

jest.mock('@/hooks/useDeviceType', () => ({
  useDeviceType: jest.fn(() => 'phone'),
}))

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}))

jest.mock('@/lib/sync/backgroundTask', () => ({
  BACKGROUND_SYNC_TASK: 'background-sync',
}))

jest.mock('@/lib/constants', () => ({
  BACKGROUND_FETCH_INTERVAL: 900,
}))

jest.mock('@/contexts/BatchScanContext', () => ({
  BatchScanProvider: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native')
    return require('react').createElement(View, { testID: 'batch-scan-provider' }, children)
  },
}))

import AppLayout from '@/app/(app)/_layout'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'

// --- Tests ---

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'user@example.com' },
      profile: { role: 'employee' },
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
      isEmployee: true,
      isActive: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    })
    ;(useDomain as jest.Mock).mockReturnValue({
      domainId: 'commissary',
      domainConfig: { id: 'commissary', displayName: 'Commissary', brandColor: '#E07A2F' },
      setDomain: jest.fn(),
      clearDomain: jest.fn(),
    })
  })

  it('redirects to login when not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      isEmployee: false,
      isActive: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    })

    const { getByTestId } = render(<AppLayout />)
    const redirect = getByTestId('redirect')
    expect(redirect.props.children).toContain('login')
  })

  it('redirects to domain-picker when no domain selected', () => {
    ;(useDomain as jest.Mock).mockReturnValue({
      domainId: null,
      domainConfig: null,
      setDomain: jest.fn(),
      clearDomain: jest.fn(),
    })

    const { getByTestId } = render(<AppLayout />)
    const redirect = getByTestId('redirect')
    expect(redirect.props.children).toContain('domain-picker')
  })

  it('renders Stack when authenticated and domain selected', () => {
    const { getByTestId } = render(<AppLayout />)
    expect(getByTestId('stack')).toBeTruthy()
  })

  it('wraps in SQLiteProvider', () => {
    const { getByTestId } = render(<AppLayout />)
    expect(getByTestId('sqlite-provider')).toBeTruthy()
  })

  it('wraps in BatchScanProvider', () => {
    const { getByTestId } = render(<AppLayout />)
    expect(getByTestId('batch-scan-provider')).toBeTruthy()
  })

  it('returns null while loading', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,
      isEmployee: false,
      isActive: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    })

    const { toJSON } = render(<AppLayout />)
    expect(toJSON()).toBeNull()
  })
})
