import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BatchScanProvider, useBatchScan } from './BatchScanContext'
import type { Item } from '@/lib/supabase/types'

// Mock crypto.randomUUID
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
})

// Mock item data
const createMockItem = (id: string, overrides?: Partial<Item>): Item => ({
  id,
  sku: `SKU-${id}`,
  name: `Test Item ${id}`,
  description: `Description for ${id}`,
  category_id: 'cat-1',
  location_id: 'loc-1',
  store_id: null,
  unit: 'pieces',
  current_stock: 100,
  min_stock: 10,
  max_stock: 200,
  unit_price: 9.99,
  barcode: `barcode-${id}`,
  image_url: null,
  is_archived: false,
  is_commissary: false,
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BatchScanProvider>{children}</BatchScanProvider>
)

describe('BatchScanContext', () => {
  beforeEach(() => {
    uuidCounter = 0
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      expect(result.current.items).toEqual([])
      expect(result.current.transactionType).toBe('in')
      expect(result.current.totalItems).toBe(0)
      expect(result.current.totalUnits).toBe(0)
    })
  })

  describe('addItem', () => {
    it('adds item to batch with quantity 1', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].itemId).toBe('item-1')
      expect(result.current.items[0].item).toEqual(item)
      expect(result.current.items[0].quantity).toBe(1)
    })

    it('generates unique idempotency key for each item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item1 = createMockItem('item-1')
      const item2 = createMockItem('item-2')

      act(() => {
        result.current.addItem(item1)
        result.current.addItem(item2)
      })

      expect(result.current.items[0].idempotencyKey).toBe('uuid-1')
      expect(result.current.items[1].idempotencyKey).toBe('uuid-2')
      expect(result.current.items[0].idempotencyKey).not.toBe(result.current.items[1].idempotencyKey)
    })

    it('returns true when item added successfully', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      let added: boolean = false
      act(() => {
        added = result.current.addItem(item)
      })

      expect(added).toBe(true)
    })

    it('returns false when adding duplicate item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      let added: boolean = true
      act(() => {
        added = result.current.addItem(item)
      })

      expect(added).toBe(false)
      expect(result.current.items).toHaveLength(1) // Still only one item
    })

    it('does not add duplicate even with different item object reference', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item1 = createMockItem('item-1')
      const item2 = createMockItem('item-1') // Same ID, different object

      act(() => {
        result.current.addItem(item1)
      })

      let added: boolean = true
      act(() => {
        added = result.current.addItem(item2)
      })

      expect(added).toBe(false)
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('incrementItem', () => {
    it('increments quantity for existing item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })
      expect(result.current.items[0].quantity).toBe(1)

      act(() => {
        result.current.incrementItem('item-1')
      })
      expect(result.current.items[0].quantity).toBe(2)

      act(() => {
        result.current.incrementItem('item-1')
      })
      expect(result.current.items[0].quantity).toBe(3)
    })

    it('does nothing for non-existent item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.incrementItem('non-existent')
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].quantity).toBe(1)
    })
  })

  describe('updateQuantity', () => {
    it('updates quantity for existing item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.updateQuantity('item-1', 5)
      })

      expect(result.current.items[0].quantity).toBe(5)
    })

    it('clamps quantity to minimum (0.001)', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.updateQuantity('item-1', 0)
      })

      expect(result.current.items[0].quantity).toBe(0.001)
    })

    it('clamps quantity to maximum (9999.999)', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.updateQuantity('item-1', 99999)
      })

      expect(result.current.items[0].quantity).toBe(9999.999)
    })

    it('rounds to 3 decimal places', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.updateQuantity('item-1', 1.12345)
      })

      expect(result.current.items[0].quantity).toBe(1.123)
    })

    it('rounds properly (1.1235 -> 1.124)', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.updateQuantity('item-1', 1.1235)
      })

      expect(result.current.items[0].quantity).toBe(1.124)
    })
  })

  describe('removeItem', () => {
    it('removes item by ID', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item1 = createMockItem('item-1')
      const item2 = createMockItem('item-2')

      act(() => {
        result.current.addItem(item1)
        result.current.addItem(item2)
      })
      expect(result.current.items).toHaveLength(2)

      act(() => {
        result.current.removeItem('item-1')
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].itemId).toBe('item-2')
    })

    it('does nothing if item not found', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.removeItem('non-existent')
      })

      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('removeItems', () => {
    it('removes multiple items by IDs', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item1 = createMockItem('item-1')
      const item2 = createMockItem('item-2')
      const item3 = createMockItem('item-3')

      act(() => {
        result.current.addItem(item1)
        result.current.addItem(item2)
        result.current.addItem(item3)
      })

      act(() => {
        result.current.removeItems(['item-1', 'item-3'])
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].itemId).toBe('item-2')
    })

    it('handles empty array gracefully', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.removeItems([])
      })

      expect(result.current.items).toHaveLength(1)
    })

    it('handles non-existent IDs gracefully', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      act(() => {
        result.current.removeItems(['non-existent', 'also-non-existent'])
      })

      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('clearBatch', () => {
    it('removes all items', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
        result.current.addItem(createMockItem('item-3'))
      })
      expect(result.current.items).toHaveLength(3)

      act(() => {
        result.current.clearBatch()
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.totalItems).toBe(0)
      expect(result.current.totalUnits).toBe(0)
    })

    it('does nothing if already empty', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.clearBatch()
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('setTransactionType', () => {
    it('changes transaction type', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      expect(result.current.transactionType).toBe('in')

      act(() => {
        result.current.setTransactionType('out')
      })

      expect(result.current.transactionType).toBe('out')
    })

    it('can switch back and forth', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.setTransactionType('out')
      })
      expect(result.current.transactionType).toBe('out')

      act(() => {
        result.current.setTransactionType('in')
      })
      expect(result.current.transactionType).toBe('in')
    })
  })

  describe('hasItem', () => {
    it('returns true for existing item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })

      expect(result.current.hasItem('item-1')).toBe(true)
    })

    it('returns false for non-existing item', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      expect(result.current.hasItem('non-existent')).toBe(false)
    })

    it('returns false after item is removed', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })
      const item = createMockItem('item-1')

      act(() => {
        result.current.addItem(item)
      })
      expect(result.current.hasItem('item-1')).toBe(true)

      act(() => {
        result.current.removeItem('item-1')
      })
      expect(result.current.hasItem('item-1')).toBe(false)
    })
  })

  describe('totalItems', () => {
    it('returns count of items', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
        result.current.addItem(createMockItem('item-3'))
      })

      expect(result.current.totalItems).toBe(3)
    })

    it('updates when items are removed', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
      })
      expect(result.current.totalItems).toBe(2)

      act(() => {
        result.current.removeItem('item-1')
      })
      expect(result.current.totalItems).toBe(1)
    })
  })

  describe('totalUnits', () => {
    it('returns sum of all quantities', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
        result.current.addItem(createMockItem('item-3'))
      })

      expect(result.current.totalUnits).toBe(3) // 1 + 1 + 1
    })

    it('updates when quantities change', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
      })
      expect(result.current.totalUnits).toBe(2)

      act(() => {
        result.current.updateQuantity('item-1', 5)
      })
      expect(result.current.totalUnits).toBe(6) // 5 + 1
    })

    it('rounds total to 3 decimal places', () => {
      const { result } = renderHook(() => useBatchScan(), { wrapper })

      act(() => {
        result.current.addItem(createMockItem('item-1'))
        result.current.addItem(createMockItem('item-2'))
        result.current.updateQuantity('item-1', 1.111)
        result.current.updateQuantity('item-2', 2.222)
      })

      expect(result.current.totalUnits).toBe(3.333)
    })
  })

  describe('useBatchScan without provider', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useBatchScan())
      }).toThrow('useBatchScan must be used within a BatchScanProvider')

      consoleSpy.mockRestore()
    })
  })
})
