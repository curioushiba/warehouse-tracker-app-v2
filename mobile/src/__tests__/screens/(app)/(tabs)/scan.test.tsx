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

const mockAddItem = jest.fn(() => true)
const mockHasItem = jest.fn(() => false)
const mockIncrementItem = jest.fn()
const mockSetTransactionType = jest.fn()

const mockUseBatchScan = jest.fn(() => ({
  items: [] as any[],
  addItem: mockAddItem,
  hasItem: mockHasItem,
  totalItems: 0,
  transactionType: 'in' as const,
  setTransactionType: mockSetTransactionType,
  incrementItem: mockIncrementItem,
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  removeItems: jest.fn(),
  clearBatch: jest.fn(),
  totalUnits: 0,
}))
jest.mock('@/contexts/BatchScanContext', () => ({
  useBatchScan: (...args: any[]) => mockUseBatchScan(...args),
}))

const mockTriggerFeedback = jest.fn()
const mockTriggerDuplicateAlert = jest.fn()
jest.mock('@/hooks/useScanFeedback', () => ({
  useScanFeedback: () => ({
    triggerFeedback: mockTriggerFeedback,
    triggerDuplicateAlert: mockTriggerDuplicateAlert,
    clearFeedback: jest.fn(),
    feedbackItem: null,
    isVisible: false,
    isExiting: false,
  }),
}))

const mockGetCachedItemByBarcode = jest.fn()
const mockGetCachedItem = jest.fn()
jest.mock('@/lib/db/items-cache', () => ({
  getCachedItemByBarcode: (...args: any[]) => mockGetCachedItemByBarcode(...args),
  getCachedItem: (...args: any[]) => mockGetCachedItem(...args),
}))

jest.mock('@/contexts/DomainContext', () => ({
  useDomain: () => ({
    domainId: 'commissary',
    domainConfig: null,
    setDomain: jest.fn(),
    clearDomain: jest.fn(),
  }),
}))

const mockUseItemCache = jest.fn(() => ({
  items: [] as any[],
  isLoading: false,
  error: null,
  refreshItems: jest.fn(),
}))
jest.mock('@/hooks/useItemCache', () => ({
  useItemCache: (...args: any[]) => mockUseItemCache(...args),
}))

// Mock expo-sqlite for db usage in the screen
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
    isDark: false,
  }),
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

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
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

import ScanScreen from '@/app/(app)/(tabs)/scan'

// --- Test data ---

// CachedItem format (camelCase) - what getCachedItemByBarcode returns
const testCachedItem = {
  id: 'item-1',
  sku: 'SKU-001',
  name: 'Test Item',
  description: undefined,
  categoryId: undefined,
  locationId: undefined,
  unit: 'pcs',
  currentStock: 100,
  minStock: 10,
  maxStock: undefined,
  unitPrice: undefined,
  barcode: 'PT-00001',
  imageUrl: undefined,
  isArchived: false,
  version: 1,
  updatedAt: '2024-01-01T00:00:00Z',
}

// Item format (snake_case) - used in batch scan context
const testItem = {
  id: 'item-1',
  sku: 'SKU-001',
  name: 'Test Item',
  description: null,
  category_id: null,
  location_id: null,
  unit: 'pcs',
  current_stock: 100,
  min_stock: 10,
  max_stock: null,
  unit_price: null,
  barcode: 'PT-00001',
  image_url: null,
  is_archived: false,
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// --- Tests ---

describe('ScanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockAddItem.mockReturnValue(true)
    mockHasItem.mockReturnValue(false)
    mockGetCachedItemByBarcode.mockReturnValue(null)
    mockGetCachedItem.mockReturnValue(null)
    mockUseItemCache.mockReturnValue({
      items: [] as any[],
      isLoading: false,
      error: null,
      refreshItems: jest.fn(),
    })
    // Reset to default empty batch (clearAllMocks does not reset mockReturnValue)
    mockUseBatchScan.mockReturnValue({
      items: [] as any[],
      addItem: mockAddItem,
      hasItem: mockHasItem,
      totalItems: 0,
      transactionType: 'in' as const,
      setTransactionType: mockSetTransactionType,
      incrementItem: mockIncrementItem,
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 0,
    })
  })

  it('renders scanner in scan mode (default)', () => {
    const { getByTestId } = render(<ScanScreen />)
    expect(getByTestId('barcode-scanner')).toBeTruthy()
  })

  it('renders segmented controls for type and mode', () => {
    const { getByTestId } = render(<ScanScreen />)
    expect(getByTestId('type-control')).toBeTruthy()
    expect(getByTestId('mode-control')).toBeTruthy()
  })

  it('calls getCachedItemByBarcode when barcode scanned', () => {
    mockGetCachedItemByBarcode.mockReturnValue(testCachedItem)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(mockGetCachedItemByBarcode).toHaveBeenCalledWith(
      expect.anything(),
      'PT-00001'
    )
  })

  it('adds item to batch when found', () => {
    mockGetCachedItemByBarcode.mockReturnValue(testCachedItem)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'item-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: 'PT-00001',
      })
    )
  })

  it('triggers scan feedback on successful scan', () => {
    mockGetCachedItemByBarcode.mockReturnValue(testCachedItem)
    mockAddItem.mockReturnValue(true)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(mockTriggerFeedback).toHaveBeenCalledWith({
      itemName: 'Test Item',
      itemImageUrl: null,
    })
  })

  it('increments quantity and shows toast on duplicate scan', () => {
    const Toast = require('react-native-toast-message').default
    mockGetCachedItemByBarcode.mockReturnValue(testCachedItem)
    mockAddItem.mockReturnValue(false)
    mockHasItem.mockReturnValue(true)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(mockIncrementItem).toHaveBeenCalledWith('item-1')
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Quantity updated',
      })
    )
  })

  it('shows "Item not found" toast for unknown barcode', () => {
    const Toast = require('react-native-toast-message').default
    mockGetCachedItemByBarcode.mockReturnValue(null)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'UNKNOWN-123' })
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Item not found',
      })
    )
  })

  it('shows batch mini-list with current items', () => {
    mockUseBatchScan.mockReturnValue({
      items: [
        {
          itemId: 'item-1',
          item: testItem,
          quantity: 2,
          idempotencyKey: 'key-1',
        },
      ],
      addItem: mockAddItem,
      hasItem: mockHasItem,
      totalItems: 1,
      transactionType: 'in' as const,
      setTransactionType: mockSetTransactionType,
      incrementItem: mockIncrementItem,
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 2,
    })
    const { getByTestId } = render(<ScanScreen />)
    // Floating pill and mini-list both show "1 item", use testID
    expect(getByTestId('batch-count-pill')).toBeTruthy()
  })

  it('Review Batch button navigates to batch-review', () => {
    mockUseBatchScan.mockReturnValue({
      items: [
        {
          itemId: 'item-1',
          item: testItem,
          quantity: 1,
          idempotencyKey: 'key-1',
        },
      ],
      addItem: mockAddItem,
      hasItem: mockHasItem,
      totalItems: 1,
      transactionType: 'in' as const,
      setTransactionType: mockSetTransactionType,
      incrementItem: mockIncrementItem,
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 1,
    })
    const { getByText } = render(<ScanScreen />)
    fireEvent.press(getByText('Review Batch'))
    expect(mockRouter.push).toHaveBeenCalledWith('/batch-review')
  })

  it('transaction type toggle between in/out via SegmentedControl', () => {
    const { getByTestId } = render(<ScanScreen />)
    // Clear any calls from useEffect (params.type init)
    mockSetTransactionType.mockClear()
    fireEvent.press(getByTestId('type-control-out'))
    expect(mockSetTransactionType).toHaveBeenCalledWith('out')
  })

  it('shows manual search tab when toggled via SegmentedControl', () => {
    const { getByTestId } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    expect(getByTestId('manual-search')).toBeTruthy()
  })

  it('manual search shows ItemSearchAutocomplete', () => {
    const { getByTestId } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    expect(getByTestId('item-search-autocomplete')).toBeTruthy()
  })

  it('disables type toggle when batch has items', () => {
    mockUseBatchScan.mockReturnValue({
      items: [
        {
          itemId: 'item-1',
          item: testItem,
          quantity: 1,
          idempotencyKey: 'key-1',
        },
      ],
      addItem: mockAddItem,
      hasItem: mockHasItem,
      totalItems: 1,
      transactionType: 'in' as const,
      setTransactionType: mockSetTransactionType,
      incrementItem: mockIncrementItem,
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 1,
    })
    const { getByText } = render(<ScanScreen />)
    // The lock notice should appear
    expect(getByText('Lock: items in batch')).toBeTruthy()
  })

  it('shows scan instruction text initially', () => {
    const { getByText } = render(<ScanScreen />)
    expect(getByText('Point camera at barcode')).toBeTruthy()
  })

  it('passes domainId to useItemCache', () => {
    render(<ScanScreen />)
    expect(mockUseItemCache).toHaveBeenCalledWith(expect.anything(), 'commissary')
  })

  it('shows error banner in search mode when useItemCache has an error', () => {
    const mockRefresh = jest.fn()
    mockUseItemCache.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refreshItems: mockRefresh,
    })

    const { getByTestId, getByText } = render(<ScanScreen />)
    // Switch to search mode
    fireEvent.press(getByTestId('mode-control-search'))
    expect(getByTestId('item-cache-error')).toBeTruthy()
    expect(getByText('Network error')).toBeTruthy()
  })

  it('retry button in error banner calls refreshItems', () => {
    const mockRefresh = jest.fn()
    mockUseItemCache.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refreshItems: mockRefresh,
    })

    const { getByTestId } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    fireEvent.press(getByTestId('item-cache-retry'))
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('does not show error banner when no error', () => {
    mockUseItemCache.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refreshItems: jest.fn(),
    })

    const { getByTestId, queryByTestId } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    expect(queryByTestId('item-cache-error')).toBeNull()
  })

  it('uses useItemCache items for autocomplete in search mode', () => {
    mockUseItemCache.mockReturnValue({
      items: [
        {
          id: 'item-cached-1',
          sku: 'SKU-C1',
          name: 'Cached Item',
          barcode: 'BC-C1',
          unit: 'pcs',
          currentStock: 10,
          minStock: 1,
          version: 1,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refreshItems: jest.fn(),
    })

    const { getByTestId } = render(<ScanScreen />)
    // Switch to search mode
    fireEvent.press(getByTestId('mode-control-search'))
    // The autocomplete should be rendered (with the cached items)
    expect(getByTestId('item-search-autocomplete')).toBeTruthy()
  })

  it('passes isLoading to autocomplete — shows "Loading items..." when loading', () => {
    mockUseItemCache.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refreshItems: jest.fn(),
    })

    const { getByTestId, getByText } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    fireEvent.changeText(getByTestId('item-search-autocomplete-input'), 'test')
    expect(getByText('Loading items...')).toBeTruthy()
  })

  it('shows search results after loading completes', () => {
    mockUseItemCache.mockReturnValue({
      items: [
        {
          id: 'item-cached-1',
          sku: 'SKU-C1',
          name: 'Cached Widget',
          barcode: 'BC-C1',
          unit: 'pcs',
          currentStock: 10,
          minStock: 1,
          version: 1,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refreshItems: jest.fn(),
    })

    const { getByTestId, getByText } = render(<ScanScreen />)
    fireEvent.press(getByTestId('mode-control-search'))
    fireEvent.changeText(getByTestId('item-search-autocomplete-input'), 'Cached')
    expect(getByText('Cached Widget')).toBeTruthy()
  })

  it('handleManualSelect uses getCachedItem with selected.id', () => {
    mockGetCachedItem.mockReturnValue(testCachedItem)

    // We need to mock the ItemSearchAutocomplete to capture onSelect
    const { getByTestId } = render(<ScanScreen />)
    // Switch to search mode
    fireEvent.press(getByTestId('mode-control-search'))

    // Trigger the onSelect callback via the autocomplete
    const autocomplete = getByTestId('item-search-autocomplete')
    fireEvent(autocomplete, 'onSelect', { id: 'item-1', name: 'Test Item', sku: 'SKU-001' })

    expect(mockGetCachedItem).toHaveBeenCalledWith(expect.anything(), 'item-1')
  })
})
