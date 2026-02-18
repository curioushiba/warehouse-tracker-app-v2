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
const mockSetTransactionType = jest.fn()

const mockUseBatchScan = jest.fn(() => ({
  items: [] as any[],
  addItem: mockAddItem,
  hasItem: mockHasItem,
  totalItems: 0,
  transactionType: 'in' as const,
  setTransactionType: mockSetTransactionType,
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
jest.mock('@/lib/db/items-cache', () => ({
  getCachedItemByBarcode: (...args: any[]) => mockGetCachedItemByBarcode(...args),
}))

// Mock expo-sqlite for db usage in the screen
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({})),
}))

import ScanScreen from './scan'

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
  })

  it('renders scanner in scan mode (default)', () => {
    const { getByTestId } = render(<ScanScreen />)
    expect(getByTestId('barcode-scanner')).toBeTruthy()
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

  it('shows duplicate alert when item already in batch', () => {
    mockGetCachedItemByBarcode.mockReturnValue(testCachedItem)
    mockAddItem.mockReturnValue(false)
    mockHasItem.mockReturnValue(true)
    const { getByTestId } = render(<ScanScreen />)
    const scanner = getByTestId('barcode-scanner-camera')
    fireEvent(scanner, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(mockTriggerDuplicateAlert).toHaveBeenCalled()
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
      incrementItem: jest.fn(),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      removeItems: jest.fn(),
      clearBatch: jest.fn(),
      totalUnits: 2,
    })
    const { getByText } = render(<ScanScreen />)
    expect(getByText('1 item')).toBeTruthy()
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
      incrementItem: jest.fn(),
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

  it('transaction type toggle between in/out', () => {
    mockSearchParams = { type: 'in' }
    const { getByText } = render(<ScanScreen />)
    fireEvent.press(getByText('Out'))
    expect(mockSetTransactionType).toHaveBeenCalledWith('out')
  })

  it('shows manual search tab when toggled', () => {
    const { getByText, getByTestId } = render(<ScanScreen />)
    fireEvent.press(getByText('Search'))
    expect(getByTestId('manual-search')).toBeTruthy()
  })

  it('manual search shows ItemSearchAutocomplete', () => {
    const { getByText, getByTestId } = render(<ScanScreen />)
    fireEvent.press(getByText('Search'))
    expect(getByTestId('item-search-autocomplete')).toBeTruthy()
  })
})
