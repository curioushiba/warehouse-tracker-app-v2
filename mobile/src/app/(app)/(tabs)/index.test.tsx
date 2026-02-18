import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }
let mockSearchParams: Record<string, string> = {}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams,
  Link: ({ children }: any) => children,
  Redirect: () => null,
}))

const mockUseAuth = jest.fn(() => ({
  user: { id: 'user-1', email: 'test@test.com' },
  profile: {
    id: 'user-1',
    role: 'employee',
    is_active: true,
    first_name: 'Test',
    last_name: 'User',
    name: null,
    username: 'testuser',
    email: 'test@test.com',
  },
  isAuthenticated: true,
  isAdmin: false,
  isEmployee: true,
  isActive: true,
  isLoading: false,
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}))

const mockUseDomain = jest.fn(() => ({
  domainId: 'commissary' as const,
  domainConfig: {
    id: 'commissary' as const,
    displayName: 'Commissary',
    letter: 'C',
    brandColor: '#E07A2F',
    itemsTable: 'cm_items' as const,
    transactionsTable: 'cm_transactions' as const,
    rpcSubmitTransaction: 'submit_cm_transaction' as const,
    transactionDomain: 'commissary' as const,
  },
  setDomain: jest.fn(),
  clearDomain: jest.fn(),
}))
jest.mock('@/contexts/DomainContext', () => ({
  useDomain: (...args: any[]) => mockUseDomain(...args),
}))

const mockUseOnlineStatus = jest.fn(() => ({
  isOnline: true,
  wasOffline: false,
  clearWasOffline: jest.fn(),
}))
jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: (...args: any[]) => mockUseOnlineStatus(...args),
}))

const mockSyncQueue = jest.fn()
const mockQueueTransaction = jest.fn()
const mockUseSyncQueue = jest.fn(() => ({
  queueCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  lastError: null,
  syncQueue: mockSyncQueue,
  queueTransaction: mockQueueTransaction,
}))
jest.mock('@/hooks/useSyncQueue', () => ({
  useSyncQueue: (...args: any[]) => mockUseSyncQueue(...args),
}))

const mockUseSyncErrorCount = jest.fn(() => ({
  count: 0,
  isLoading: false,
  refetch: jest.fn(),
}))
jest.mock('@/hooks/useSyncErrorCount', () => ({
  useSyncErrorCount: (...args: any[]) => mockUseSyncErrorCount(...args),
}))

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
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

import HomeScreen from './index'
import { getDisplayName } from '@/lib/display-name'

// --- Tests ---

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
  })

  it('renders user display name (from getDisplayName)', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getDisplayName).toHaveBeenCalled()
    expect(getByText(/Test User/)).toBeTruthy()
  })

  it('renders Check In button that navigates to scan with type=in', () => {
    const { getByText } = render(<HomeScreen />)
    const checkInButton = getByText('Check In')
    fireEvent.press(checkInButton)
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/scan', params: { type: 'in' } })
    )
  })

  it('renders Check Out button that navigates to scan with type=out', () => {
    const { getByText } = render(<HomeScreen />)
    const checkOutButton = getByText('Check Out')
    fireEvent.press(checkOutButton)
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/scan', params: { type: 'out' } })
    )
  })

  it('shows sync status with pending count', () => {
    mockUseSyncQueue.mockReturnValue({
      queueCount: 5,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
      syncQueue: mockSyncQueue,
      queueTransaction: mockQueueTransaction,
    })
    const { getAllByText } = render(<HomeScreen />)
    // Appears in both header and sync section indicators
    const matches = getAllByText('5 pending')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows failed sync banner when sync errors > 0', () => {
    mockUseSyncErrorCount.mockReturnValue({
      count: 3,
      isLoading: false,
      refetch: jest.fn(),
    })
    const { getByText } = render(<HomeScreen />)
    expect(getByText('3 failed transactions - Tap to view')).toBeTruthy()
  })

  it('failed sync banner navigates to sync-errors', () => {
    mockUseSyncErrorCount.mockReturnValue({
      count: 2,
      isLoading: false,
      refetch: jest.fn(),
    })
    const { getByText } = render(<HomeScreen />)
    fireEvent.press(getByText('2 failed transactions - Tap to view'))
    expect(mockRouter.push).toHaveBeenCalledWith('/sync-errors')
  })

  it('manual sync button calls syncQueue', () => {
    mockUseSyncQueue.mockReturnValue({
      queueCount: 3,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
      syncQueue: mockSyncQueue,
      queueTransaction: mockQueueTransaction,
    })
    const { getByTestId } = render(<HomeScreen />)
    fireEvent.press(getByTestId('manual-sync-button'))
    expect(mockSyncQueue).toHaveBeenCalledTimes(1)
  })

  it('shows offline banner when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
      clearWasOffline: jest.fn(),
    })
    const { getByText } = render(<HomeScreen />)
    expect(getByText('No internet connection')).toBeTruthy()
  })

  it('shows batch success toast when batchSuccess param present', () => {
    const Toast = require('react-native-toast-message').default
    mockSearchParams = { batchSuccess: '3' }
    render(<HomeScreen />)
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: expect.stringContaining('3'),
      })
    )
  })
})
