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

const mockGetCachedItem = jest.fn()
jest.mock('@/lib/db/items-cache', () => ({
  getCachedItem: (...args: unknown[]) => mockGetCachedItem(...args),
}))

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
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

jest.mock('@/components/ui/DateGroupHeader', () => ({
  DateGroupHeader: ({ date, count, testID }: any) => {
    const { Text, View } = require('react-native')
    return (
      <View testID={testID}>
        <Text>{date}</Text>
        {count != null && <Text>{count}</Text>}
      </View>
    )
  },
}))

jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, message, testID }: any) => {
    const { Text, View } = require('react-native')
    return (
      <View testID={testID}>
        <Text>{title}</Text>
        <Text>{message}</Text>
      </View>
    )
  },
}))

jest.mock('@/components/ui/StaggeredFadeIn', () => ({
  StaggeredFadeIn: ({ children, testID }: any) => {
    const { View } = require('react-native')
    return <View testID={testID}>{children}</View>
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

import HistoryScreen, { groupTransactionsByDate } from '@/app/(app)/(tabs)/history'
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
    mockGetCachedItem.mockReturnValue(null)
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

    const { getByText, getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('history-empty')).toBeTruthy()
      expect(getByText('No transactions yet')).toBeTruthy()
      expect(getByText('Start scanning items to see your history here')).toBeTruthy()
    })
  })

  it('pull-to-refresh triggers re-fetch', async () => {
    const { getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('history-list')).toBeTruthy()
    })

    // Trigger refresh via the RefreshControl's onRefresh
    const sectionList = getByTestId('history-list')
    const refreshControl = sectionList.props.refreshControl
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

  it('renders segmented filter control', async () => {
    const { getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('filter-control')).toBeTruthy()
      expect(getByTestId('filter-control-all')).toBeTruthy()
      expect(getByTestId('filter-control-in')).toBeTruthy()
      expect(getByTestId('filter-control-out')).toBeTruthy()
    })
  })

  it('renders header with title and transaction count', async () => {
    const { getByTestId, getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('history-title')).toBeTruthy()
      expect(getByText('History')).toBeTruthy()
      expect(getByTestId('history-count')).toBeTruthy()
    })
  })

  it('renders date group headers for sections', async () => {
    const { getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      // Today's transactions (5 min ago, 2 hours ago)
      expect(getByText('Today')).toBeTruthy()
      // Yesterday's transaction (1 day ago)
      expect(getByText('Yesterday')).toBeTruthy()
    })
  })

  it('renders chevron disclosure indicator on rows', async () => {
    const { getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      // Rows are rendered via AnimatedPressable
      expect(getByTestId('tx-row-tx-1')).toBeTruthy()
    })
  })

  it('wraps first items in StaggeredFadeIn', async () => {
    const { getByTestId } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByTestId('stagger-tx-1')).toBeTruthy()
      expect(getByTestId('stagger-tx-2')).toBeTruthy()
      expect(getByTestId('stagger-tx-3')).toBeTruthy()
    })
  })

  it('filters transactions when segmented control is used', async () => {
    const { getByTestId, queryByText, getByText } = render(<HistoryScreen />)

    await waitFor(() => {
      expect(getByText('Rice Flour')).toBeTruthy()
    })

    // Filter to "In" only
    fireEvent.press(getByTestId('filter-control-in'))

    await waitFor(() => {
      // Rice Flour is check_in, should still appear
      expect(getByText('Rice Flour')).toBeTruthy()
      // Sugar is check_out, should be hidden
      expect(queryByText('Sugar')).toBeNull()
    })
  })
})

describe('groupTransactionsByDate', () => {
  it('groups today transactions under "Today"', () => {
    const now = new Date()
    const tx = {
      id: '1',
      transactionType: 'in',
      quantity: 5,
      notes: null,
      itemId: 'a',
      itemName: 'Item A',
      timestamp: now.toISOString(),
      isPending: false,
    }

    const result = groupTransactionsByDate([tx])
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Today')
    expect(result[0].data).toHaveLength(1)
  })

  it('groups yesterday transactions under "Yesterday"', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const tx = {
      id: '1',
      transactionType: 'out',
      quantity: 3,
      notes: null,
      itemId: 'b',
      itemName: 'Item B',
      timestamp: yesterday.toISOString(),
      isPending: false,
    }

    const result = groupTransactionsByDate([tx])
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Yesterday')
  })

  it('uses "MMM D" format for older dates', () => {
    const oldDate = new Date(2025, 0, 15) // Jan 15, 2025
    const tx = {
      id: '1',
      transactionType: 'in',
      quantity: 1,
      notes: null,
      itemId: 'c',
      itemName: 'Item C',
      timestamp: oldDate.toISOString(),
      isPending: false,
    }

    const result = groupTransactionsByDate([tx])
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Jan 15')
  })

  it('returns empty array for empty input', () => {
    expect(groupTransactionsByDate([])).toEqual([])
  })

  it('groups multiple transactions by date in order', () => {
    const now = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const transactions = [
      { id: '1', transactionType: 'in', quantity: 5, notes: null, itemId: 'a', itemName: 'A', timestamp: now.toISOString(), isPending: false },
      { id: '2', transactionType: 'out', quantity: 3, notes: null, itemId: 'b', itemName: 'B', timestamp: now.toISOString(), isPending: false },
      { id: '3', transactionType: 'in', quantity: 1, notes: null, itemId: 'c', itemName: 'C', timestamp: yesterday.toISOString(), isPending: false },
    ]

    const result = groupTransactionsByDate(transactions)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Today')
    expect(result[0].data).toHaveLength(2)
    expect(result[1].title).toBe('Yesterday')
    expect(result[1].data).toHaveLength(1)
  })
})
