import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
  Redirect: () => null,
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: {
      id: 'user-1',
      role: 'employee',
      is_active: true,
      first_name: 'Test',
      last_name: 'User',
    },
    isAuthenticated: true,
    isAdmin: false,
    isEmployee: true,
    isActive: true,
    isLoading: false,
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  })),
}))

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
}))

jest.mock('@/contexts/DomainContext', () => ({
  useDomain: jest.fn(() => ({
    domainId: 'commissary',
    domainConfig: {
      id: 'commissary',
      displayName: 'Commissary',
      letter: 'C',
      brandColor: '#E07A2F',
    },
    setDomain: jest.fn(),
    clearDomain: jest.fn(),
  })),
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
}))

jest.mock('@/components/layout/ScreenHeader', () => ({
  ScreenHeader: ({ title, onBack, rightContent, testID }: any) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={testID}>
        {onBack && <Pressable testID={`${testID}-back`} onPress={onBack} />}
        <Text>{title}</Text>
        {rightContent}
      </View>
    )
  },
}))

const mockUpdateQuantity = jest.fn()
const mockRemoveItem = jest.fn()
const mockClearBatch = jest.fn()
const mockQueueTransaction = jest.fn(() => 'tx-1')

const defaultBatchItems = [
  {
    itemId: 'item-1',
    item: {
      id: 'item-1',
      sku: 'SKU-001',
      name: 'Chicken Wings',
      unit: 'kg',
      current_stock: 50,
      min_stock: 10,
      max_stock: null,
      barcode: 'PT-00001',
      image_url: null,
      is_archived: false,
      version: 1,
      description: null,
      category_id: null,
      location_id: null,
      unit_price: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    quantity: 3,
    idempotencyKey: 'key-1',
  },
  {
    itemId: 'item-2',
    item: {
      id: 'item-2',
      sku: 'SKU-002',
      name: 'Rice',
      unit: 'kg',
      current_stock: 200,
      min_stock: 20,
      max_stock: null,
      barcode: 'PT-00002',
      image_url: null,
      is_archived: false,
      version: 1,
      description: null,
      category_id: null,
      location_id: null,
      unit_price: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    quantity: 5,
    idempotencyKey: 'key-2',
  },
]

const mockUseBatchScan = jest.fn(() => ({
  items: defaultBatchItems,
  transactionType: 'in' as const,
  totalItems: 2,
  totalUnits: 8,
  updateQuantity: mockUpdateQuantity,
  removeItem: mockRemoveItem,
  clearBatch: mockClearBatch,
  addItem: jest.fn(),
  incrementItem: jest.fn(),
  removeItems: jest.fn(),
  setTransactionType: jest.fn(),
  hasItem: jest.fn(),
}))
jest.mock('@/contexts/BatchScanContext', () => ({
  useBatchScan: (...args: any[]) => mockUseBatchScan(...args),
}))

const mockUseSyncQueue = jest.fn(() => ({
  queueCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  lastError: null,
  syncQueue: jest.fn(),
  queueTransaction: mockQueueTransaction,
}))
jest.mock('@/hooks/useSyncQueue', () => ({
  useSyncQueue: (...args: any[]) => mockUseSyncQueue(...args),
}))

import BatchReviewScreen from '@/app/(app)/batch-review'

// --- Tests ---

describe('BatchReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBatchScan.mockReturnValue({
      items: defaultBatchItems,
      transactionType: 'in' as const,
      totalItems: 2,
      totalUnits: 8,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearBatch: mockClearBatch,
      addItem: jest.fn(),
      incrementItem: jest.fn(),
      removeItems: jest.fn(),
      setTransactionType: jest.fn(),
      hasItem: jest.fn(),
    })
  })

  it('renders ScreenHeader with title and item count', () => {
    const { getByText } = render(<BatchReviewScreen />)
    expect(getByText('Batch Review')).toBeTruthy()
    expect(getByText('2 items')).toBeTruthy()
  })

  it('renders all batch items with quantities', () => {
    const { getByText } = render(<BatchReviewScreen />)
    expect(getByText('Chicken Wings')).toBeTruthy()
    expect(getByText('Rice')).toBeTruthy()
  })

  it('plus button increments quantity', () => {
    const { getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByTestId('batch-row-0-plus'))
    expect(mockUpdateQuantity).toHaveBeenCalledWith('item-1', 4)
  })

  it('minus button decrements quantity (minimum 1)', () => {
    const { getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByTestId('batch-row-0-minus'))
    expect(mockUpdateQuantity).toHaveBeenCalledWith('item-1', 2)
  })

  it('remove button removes item from batch', () => {
    const { getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByTestId('batch-row-0-remove'))
    expect(mockRemoveItem).toHaveBeenCalledWith('item-1')
  })

  it('shows confirm modal when Confirm pressed', () => {
    const { getByText, getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByText('Confirm Check In'))
    expect(getByTestId('confirm-modal')).toBeTruthy()
  })

  it('confirm modal shows transaction type and totals', () => {
    const { getByText, getAllByText } = render(<BatchReviewScreen />)
    fireEvent.press(getByText('Confirm Check In'))
    // "CHECK IN" appears in both banner and modal
    const checkInTexts = getAllByText('CHECK IN')
    expect(checkInTexts.length).toBeGreaterThanOrEqual(1)
    // "2 items" appears in both header and modal
    const itemTexts = getAllByText('2 items')
    expect(itemTexts.length).toBeGreaterThanOrEqual(2)
    expect(getByText('8 total units')).toBeTruthy()
  })

  it('calls queueTransaction for each item on confirm', async () => {
    const { getByText, getByTestId } = render(<BatchReviewScreen />)
    // Open modal
    fireEvent.press(getByText('Confirm Check In'))
    // Confirm submission
    fireEvent.press(getByTestId('confirm-modal-confirm'))
    await waitFor(() => {
      expect(mockQueueTransaction).toHaveBeenCalledTimes(2)
      expect(mockQueueTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'in',
          itemId: 'item-1',
          quantity: 3,
        })
      )
      expect(mockQueueTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'in',
          itemId: 'item-2',
          quantity: 5,
        })
      )
    })
  })

  it('navigates home after successful submission', async () => {
    const { getByText, getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByText('Confirm Check In'))
    fireEvent.press(getByTestId('confirm-modal-confirm'))
    await waitFor(() => {
      expect(mockClearBatch).toHaveBeenCalled()
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/',
          params: expect.objectContaining({ batchSuccess: '2' }),
        })
      )
    })
  })

  it('shows empty state when no items', () => {
    mockUseBatchScan.mockReturnValue({
      items: [],
      transactionType: 'in' as const,
      totalItems: 0,
      totalUnits: 0,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearBatch: mockClearBatch,
      addItem: jest.fn(),
      incrementItem: jest.fn(),
      removeItems: jest.fn(),
      setTransactionType: jest.fn(),
      hasItem: jest.fn(),
    })
    const { getByText } = render(<BatchReviewScreen />)
    expect(getByText('No items in batch')).toBeTruthy()
  })

  it('back button navigates back', () => {
    const { getByTestId } = render(<BatchReviewScreen />)
    fireEvent.press(getByTestId('screen-header-back'))
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })

  it('shows transaction type banner', () => {
    const { getByTestId } = render(<BatchReviewScreen />)
    expect(getByTestId('type-banner')).toBeTruthy()
  })

  it('shows CHECK OUT label for out type', () => {
    mockUseBatchScan.mockReturnValue({
      items: defaultBatchItems,
      transactionType: 'out' as const,
      totalItems: 2,
      totalUnits: 8,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearBatch: mockClearBatch,
      addItem: jest.fn(),
      incrementItem: jest.fn(),
      removeItems: jest.fn(),
      setTransactionType: jest.fn(),
      hasItem: jest.fn(),
    })
    const { getByText } = render(<BatchReviewScreen />)
    expect(getByText('CHECK OUT')).toBeTruthy()
    expect(getByText('Confirm Check Out')).toBeTruthy()
  })
})
