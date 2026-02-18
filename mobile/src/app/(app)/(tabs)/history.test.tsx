import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'

// --- Mocks ---

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: { role: 'employee', is_active: true, first_name: 'Test', last_name: 'User' },
    isAuthenticated: true,
    isAdmin: false,
    signOut: jest.fn(),
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
      itemsTable: 'cm_items',
      transactionsTable: 'cm_transactions',
      rpcSubmitTransaction: 'submit_cm_transaction',
      transactionDomain: 'commissary',
    },
  })),
}))

const mockLimit = jest.fn()
const mockOrder = jest.fn(() => ({ limit: mockLimit }))
const mockEq = jest.fn(() => ({ order: mockOrder }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: jest.fn(),
  }),
}))

const mockGetTransactionsByDomain = jest.fn()
jest.mock('@/lib/db/transaction-queue', () => ({
  getTransactionsByDomain: (...args: unknown[]) => mockGetTransactionsByDomain(...args),
}))

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
}))

import HistoryScreen from './history'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'

// --- Mock data ---

const mockTransactions = [
  {
    id: 'tx-1',
    transaction_type: 'check_in',
    quantity: 10,
    notes: 'Received shipment',
    item_id: 'item-1',
    item_name: 'Rice Flour',
    user_id: 'user-1',
    event_timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    server_timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'tx-2',
    transaction_type: 'check_out',
    quantity: 3,
    notes: 'For production',
    item_id: 'item-2',
    item_name: 'Sugar',
    user_id: 'user-1',
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    server_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'tx-3',
    transaction_type: 'adjustment',
    quantity: -5,
    notes: 'Inventory correction',
    item_id: 'item-3',
    item_name: 'Butter',
    user_id: 'user-1',
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    server_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

const mockPendingTransactions = [
  {
    id: 'pending-1',
    transactionType: 'in',
    itemId: 'item-4',
    quantity: 7,
    notes: 'Offline entry',
    deviceTimestamp: new Date().toISOString(),
    idempotencyKey: 'idem-1',
    userId: 'user-1',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    domain: 'commissary',
  },
]

// --- Tests ---

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetTransactionsByDomain.mockReturnValue([])
    mockLimit.mockResolvedValue({ data: mockTransactions, error: null })
  })

  it('shows loading spinner initially', async () => {
    // Make the fetch hang to catch loading state
    mockLimit.mockReturnValue(new Promise(() => {}))
    const { getByTestId } = render(<HistoryScreen />)
    expect(getByTestId('history-loading')).toBeTruthy()
  })

  it('renders transaction list after loading', async () => {
    const { getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByText('Rice Flour')).toBeTruthy()
      expect(getByText('Sugar')).toBeTruthy()
      expect(getByText('Butter')).toBeTruthy()
    }, { timeout: 10000 })
  }, 15000)

  it('shows TransactionTypeBadge for each transaction type', async () => {
    const { getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('tx-badge-tx-1')).toBeTruthy()
      expect(getByTestId('tx-badge-tx-2')).toBeTruthy()
      expect(getByTestId('tx-badge-tx-3')).toBeTruthy()
    })
  })

  it('shows relative time for each transaction', async () => {
    const { getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByText('5 minutes ago')).toBeTruthy()
      expect(getByText('2 hours ago')).toBeTruthy()
      expect(getByText('1 day ago')).toBeTruthy()
    })
  })

  it('shows empty state when no transactions', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByText('No transactions yet')).toBeTruthy()
    })
  })

  it('pull-to-refresh triggers re-fetch', async () => {
    const { getByTestId, UNSAFE_getByType } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('history-list')).toBeTruthy()
    })

    // Trigger refresh via the RefreshControl's onRefresh
    const { RefreshControl: RCType } = require('react-native')
    const flatList = getByTestId('history-list')
    const refreshControl = flatList.props.refreshControl
    await act(async () => {
      refreshControl.props.onRefresh()
    })

    // from() called on initial load + refresh
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(2)
    })
  })

  it('shows pending transactions with Pending badge from local queue', async () => {
    mockGetTransactionsByDomain.mockReturnValue(mockPendingTransactions)

    const { getByTestId, getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('pending-badge-pending-1')).toBeTruthy()
      expect(getByText('Pending')).toBeTruthy()
    })
  })

  it('opens detail modal when transaction tapped', async () => {
    const { getByTestId, getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('tx-row-tx-1')).toBeTruthy()
    })

    fireEvent.press(getByTestId('tx-row-tx-1'))

    await waitFor(() => {
      expect(getByText('Transaction Details')).toBeTruthy()
      expect(getByText('Received shipment')).toBeTruthy()
    })
  })

  it('fetches from correct transactions table based on domain', async () => {
    render(<HistoryScreen />)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('cm_transactions')
    })
  })

  it('uses frozen-goods table when domain is frozen-goods', async () => {
    ;(useDomain as jest.Mock).mockReturnValue({
      domainId: 'frozen-goods',
      domainConfig: {
        id: 'frozen-goods',
        displayName: 'Frozen Goods',
        letter: 'F',
        brandColor: '#2563EB',
        itemsTable: 'fg_items',
        transactionsTable: 'fg_transactions',
        rpcSubmitTransaction: 'submit_fg_transaction',
        transactionDomain: 'frozen-goods',
      },
    })

    render(<HistoryScreen />)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('fg_transactions')
    })
  })
})
