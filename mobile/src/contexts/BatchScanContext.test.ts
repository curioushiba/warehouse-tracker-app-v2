import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MIN_QUANTITY, MAX_QUANTITY } from '@/lib/constants'
import {
  createBatchScanManager,
  type BatchItem,
  type BatchScanState,
  type BatchScanManager,
  type BatchTransactionType,
} from './BatchScanContext'

// expo-crypto is already mocked in setup-vitest.ts (randomUUID)

/**
 * BatchScanContext is a React context provider wrapping batch scan logic.
 * We test the pure state management logic via createBatchScanManager().
 */

function makeItem(id: string, name: string = `Item ${id}`) {
  return {
    id,
    sku: `SKU-${id}`,
    name,
    description: null,
    category_id: null,
    location_id: null,
    unit: 'pcs',
    current_stock: 100,
    min_stock: 10,
    max_stock: null,
    unit_price: null,
    barcode: null,
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('createBatchScanManager', () => {
  let state: BatchScanState
  let setState: (partial: Partial<BatchScanState>) => void
  let manager: BatchScanManager

  beforeEach(() => {
    state = {
      items: [],
      transactionType: 'in' as BatchTransactionType,
    }
    setState = (partial) => {
      state = { ...state, ...partial }
    }
    manager = createBatchScanManager(setState, () => state)
  })

  describe('initial state', () => {
    it('starts with empty items', () => {
      expect(state.items).toEqual([])
    })

    it('starts with transaction type "in"', () => {
      expect(state.transactionType).toBe('in')
    })
  })

  describe('addItem', () => {
    it('adds an item with quantity=1', () => {
      const added = manager.addItem(makeItem('item-1'))
      expect(added).toBe(true)
      expect(state.items).toHaveLength(1)
      expect(state.items[0].itemId).toBe('item-1')
      expect(state.items[0].quantity).toBe(1)
    })

    it('generates an idempotencyKey for each item', () => {
      manager.addItem(makeItem('item-1'))
      expect(state.items[0].idempotencyKey).toBeDefined()
      expect(state.items[0].idempotencyKey.length).toBeGreaterThan(0)
    })

    it('returns false for duplicate item (same id)', () => {
      manager.addItem(makeItem('item-1'))
      const added = manager.addItem(makeItem('item-1'))
      expect(added).toBe(false)
      expect(state.items).toHaveLength(1)
    })

    it('adds multiple different items', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.addItem(makeItem('item-3'))
      expect(state.items).toHaveLength(3)
    })

    it('stores the full item reference', () => {
      const item = makeItem('item-1', 'Widget')
      manager.addItem(item)
      expect(state.items[0].item).toEqual(item)
    })
  })

  describe('incrementItem', () => {
    it('increments quantity by 1', () => {
      manager.addItem(makeItem('item-1'))
      manager.incrementItem('item-1')
      expect(state.items[0].quantity).toBe(2)
    })

    it('rounds to 3 decimal places', () => {
      manager.addItem(makeItem('item-1'))
      // Set a fractional quantity first
      manager.updateQuantity('item-1', 1.999)
      manager.incrementItem('item-1')
      expect(state.items[0].quantity).toBe(2.999)
    })

    it('does nothing for non-existent item', () => {
      manager.addItem(makeItem('item-1'))
      manager.incrementItem('non-existent')
      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(1)
    })
  })

  describe('updateQuantity', () => {
    it('updates quantity for an item', () => {
      manager.addItem(makeItem('item-1'))
      manager.updateQuantity('item-1', 5)
      expect(state.items[0].quantity).toBe(5)
    })

    it('clamps to MIN_QUANTITY (0.001) when below', () => {
      manager.addItem(makeItem('item-1'))
      manager.updateQuantity('item-1', 0)
      expect(state.items[0].quantity).toBe(MIN_QUANTITY)
    })

    it('clamps to MAX_QUANTITY (9999.999) when above', () => {
      manager.addItem(makeItem('item-1'))
      manager.updateQuantity('item-1', 10000)
      expect(state.items[0].quantity).toBe(MAX_QUANTITY)
    })

    it('rounds to 3 decimal places', () => {
      manager.addItem(makeItem('item-1'))
      manager.updateQuantity('item-1', 3.14159)
      expect(state.items[0].quantity).toBe(3.142)
    })

    it('clamps negative values to MIN_QUANTITY', () => {
      manager.addItem(makeItem('item-1'))
      manager.updateQuantity('item-1', -5)
      expect(state.items[0].quantity).toBe(MIN_QUANTITY)
    })
  })

  describe('removeItem', () => {
    it('removes an item by id', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.removeItem('item-1')
      expect(state.items).toHaveLength(1)
      expect(state.items[0].itemId).toBe('item-2')
    })

    it('does nothing for non-existent item', () => {
      manager.addItem(makeItem('item-1'))
      manager.removeItem('non-existent')
      expect(state.items).toHaveLength(1)
    })
  })

  describe('removeItems', () => {
    it('removes multiple items by id', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.addItem(makeItem('item-3'))
      manager.removeItems(['item-1', 'item-3'])
      expect(state.items).toHaveLength(1)
      expect(state.items[0].itemId).toBe('item-2')
    })

    it('handles empty ids array', () => {
      manager.addItem(makeItem('item-1'))
      manager.removeItems([])
      expect(state.items).toHaveLength(1)
    })
  })

  describe('clearBatch', () => {
    it('removes all items', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.clearBatch()
      expect(state.items).toEqual([])
    })
  })

  describe('setTransactionType', () => {
    it('sets transaction type to "out"', () => {
      manager.setTransactionType('out')
      expect(state.transactionType).toBe('out')
    })

    it('sets transaction type to "in"', () => {
      manager.setTransactionType('out')
      manager.setTransactionType('in')
      expect(state.transactionType).toBe('in')
    })
  })

  describe('hasItem', () => {
    it('returns true for existing item', () => {
      manager.addItem(makeItem('item-1'))
      expect(manager.hasItem('item-1')).toBe(true)
    })

    it('returns false for non-existent item', () => {
      expect(manager.hasItem('item-1')).toBe(false)
    })

    it('returns false after item removed', () => {
      manager.addItem(makeItem('item-1'))
      manager.removeItem('item-1')
      expect(manager.hasItem('item-1')).toBe(false)
    })
  })

  describe('totalItems', () => {
    it('returns 0 for empty batch', () => {
      expect(manager.totalItems()).toBe(0)
    })

    it('returns count of items', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.addItem(makeItem('item-3'))
      expect(manager.totalItems()).toBe(3)
    })
  })

  describe('totalUnits', () => {
    it('returns 0 for empty batch', () => {
      expect(manager.totalUnits()).toBe(0)
    })

    it('sums all quantities', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.updateQuantity('item-1', 5)
      manager.updateQuantity('item-2', 3.5)
      expect(manager.totalUnits()).toBe(8.5)
    })

    it('rounds total to 3 decimal places', () => {
      manager.addItem(makeItem('item-1'))
      manager.addItem(makeItem('item-2'))
      manager.addItem(makeItem('item-3'))
      manager.updateQuantity('item-1', 1.111)
      manager.updateQuantity('item-2', 2.222)
      manager.updateQuantity('item-3', 3.333)
      expect(manager.totalUnits()).toBe(6.666)
    })
  })
})
