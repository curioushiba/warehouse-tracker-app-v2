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

const mockUseBatchScan = jest.fn(() => ({
  items: [] as any[],
  addItem: jest.fn(),
  hasItem: jest.fn(),
  totalItems: 0,
  transactionType: 'in' as const,
  setTransactionType: jest.fn(),
  incrementItem: jest.fn(),
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  removeItems: jest.fn(),
  clearBatch: jest.fn(),
  totalUnits: 0,
}))
jest.mock('@/contexts/BatchScanContext', () => ({
  useBatchScan: (...args: any[]) => mockUseBatchScan(...args),
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

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}))

jest.mock('@/components/ui/SectionHeader', () => ({
  SectionHeader: ({ label, testID }: any) => {
    const { Text } = require('react-native')
    return <Text testID={testID}>{label}</Text>
  },
}))

jest.mock('@/components/ui/StatCard', () => ({
  StatCard: ({ label, value, testID, onPress }: any) => {
    const { Text, Pressable, View } = require('react-native')
    const Wrapper = onPress ? Pressable : View
    return (
      <Wrapper testID={testID} onPress={onPress}>
        <Text>{value}</Text>
        <Text>{label}</Text>
      </Wrapper>
    )
  },
}))

import HomeScreen from '@/app/(app)/(tabs)/index'
import { getDisplayName } from '@/lib/display-name'

// --- Tests ---

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockUseBatchScan.mockReturnValue({
      items: [] as any[],
      addItem: jest.fn(),
      hasItem: jest.fn(),
      totalItems: 0,
      transactionType: 'in' as const,
      setTransactionType: jest.fn(),
      incrementItem: jest.fn(),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 0,
    })
  })

  it('renders user display name (from getDisplayName)', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getDisplayName).toHaveBeenCalled()
    expect(getByText(/Test User/)).toBeTruthy()
  })

  it('renders greeting with current date', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('greeting-name')).toBeTruthy()
    expect(getByTestId('greeting-date')).toBeTruthy()
  })

  it('renders Check In card that navigates to scan with type=in', () => {
    const { getByText } = render(<HomeScreen />)
    const checkInButton = getByText('Check In')
    fireEvent.press(checkInButton)
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/scan', params: { type: 'in' } })
    )
  })

  it('renders Check Out card that navigates to scan with type=out', () => {
    const { getByText } = render(<HomeScreen />)
    const checkOutButton = getByText('Check Out')
    fireEvent.press(checkOutButton)
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/scan', params: { type: 'out' } })
    )
  })

  it('renders quick action descriptions', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getByText('Receive stock')).toBeTruthy()
    expect(getByText('Dispatch stock')).toBeTruthy()
  })

  it('renders section headers', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('section-quick-actions')).toBeTruthy()
    expect(getByTestId('section-todays-summary')).toBeTruthy()
  })

  it('renders stat cards', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('stat-pending')).toBeTruthy()
    expect(getByTestId('stat-errors')).toBeTruthy()
    expect(getByTestId('stat-batch')).toBeTruthy()
  })

  it('stat errors card navigates to sync-errors on press', () => {
    const { getByTestId } = render(<HomeScreen />)
    fireEvent.press(getByTestId('stat-errors'))
    expect(mockRouter.push).toHaveBeenCalledWith('/sync-errors')
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

  it('hides sync section when queue is 0 and online', () => {
    mockUseSyncQueue.mockReturnValue({
      queueCount: 0,
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
      syncQueue: mockSyncQueue,
      queueTransaction: mockQueueTransaction,
    })
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      clearWasOffline: jest.fn(),
    })
    const { queryByTestId } = render(<HomeScreen />)
    expect(queryByTestId('sync-indicator')).toBeNull()
  })

  it('shows resume batch banner when batch has items', () => {
    mockUseBatchScan.mockReturnValue({
      items: [{ itemId: 'item-1', item: { name: 'Test' }, quantity: 1, idempotencyKey: 'k1' }] as any[],
      addItem: jest.fn(),
      hasItem: jest.fn(),
      totalItems: 1,
      transactionType: 'in' as const,
      setTransactionType: jest.fn(),
      incrementItem: jest.fn(),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 1,
    })
    const { getByTestId, getByText } = render(<HomeScreen />)
    expect(getByTestId('resume-batch-banner')).toBeTruthy()
    expect(getByText(/1 item in your batch/)).toBeTruthy()
  })

  it('resume batch banner navigates to scan', () => {
    mockUseBatchScan.mockReturnValue({
      items: [{ itemId: 'item-1', item: { name: 'Test' }, quantity: 1, idempotencyKey: 'k1' }] as any[],
      addItem: jest.fn(),
      hasItem: jest.fn(),
      totalItems: 1,
      transactionType: 'in' as const,
      setTransactionType: jest.fn(),
      incrementItem: jest.fn(),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 1,
    })
    const { getByTestId } = render(<HomeScreen />)
    fireEvent.press(getByTestId('resume-batch-banner'))
    expect(mockRouter.push).toHaveBeenCalledWith('/scan')
  })

  it('hides resume batch banner when no items', () => {
    const { queryByTestId } = render(<HomeScreen />)
    expect(queryByTestId('resume-batch-banner')).toBeNull()
  })
})
