import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  cacheItems,
  getCachedItem,
  getCachedItemBySku,
  getCachedItemByBarcode,
  getAllCachedItems,
  clearItemsCache,
  updateCachedItem,
  searchCachedItems,
} from './items-cache'
import type { CachedItem } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

function makeItem(overrides: Partial<CachedItem> = {}): CachedItem {
  return {
    id: 'item-' + Math.random().toString(36).slice(2, 8),
    sku: 'SKU-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    name: 'Test Item',
    description: 'A test item description',
    categoryId: 'cat-1',
    locationId: 'loc-1',
    unit: 'pcs',
    currentStock: 100,
    minStock: 10,
    maxStock: 500,
    barcode: 'BC-' + Math.random().toString(36).slice(2, 8),
    unitPrice: 9.99,
    imageUrl: 'https://img.test/item.png',
    version: 1,
    isArchived: false,
    isOfflineCreated: false,
    updatedAt: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

describe('items-cache', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---- cacheItems ----

  describe('cacheItems', () => {
    it('inserts multiple items into the cache', () => {
      const items = [
        makeItem({ id: 'item-1', sku: 'SKU-001' }),
        makeItem({ id: 'item-2', sku: 'SKU-002' }),
        makeItem({ id: 'item-3', sku: 'SKU-003' }),
      ]

      cacheItems(db, items)

      const allRows = db.getAllSync('SELECT * FROM items_cache')
      expect(allRows).toHaveLength(3)
    })

    it('handles an empty array without error', () => {
      expect(() => cacheItems(db, [])).not.toThrow()
      const allRows = db.getAllSync('SELECT * FROM items_cache')
      expect(allRows).toHaveLength(0)
    })

    it('upserts items (INSERT OR REPLACE) on conflicting id', () => {
      const item = makeItem({ id: 'item-upsert', sku: 'SKU-UPS', name: 'Original Name' })
      cacheItems(db, [item])

      const updatedItem = { ...item, name: 'Updated Name', currentStock: 200 }
      cacheItems(db, [updatedItem])

      const allRows = db.getAllSync('SELECT * FROM items_cache')
      expect(allRows).toHaveLength(1)

      const cached = getCachedItem(db, 'item-upsert')
      expect(cached).not.toBeNull()
      expect(cached!.name).toBe('Updated Name')
      expect(cached!.currentStock).toBe(200)
    })

    it('stores all CachedItem fields correctly', () => {
      const item = makeItem({
        id: 'item-fields',
        sku: 'SKU-FIELDS',
        name: 'Full Fields Item',
        description: 'Complete description',
        categoryId: 'cat-42',
        locationId: 'loc-42',
        unit: 'kg',
        currentStock: 55.5,
        minStock: 5,
        maxStock: 200,
        barcode: 'BC-FULL',
        unitPrice: 12.50,
        imageUrl: 'https://img.test/full.png',
        version: 3,
        isArchived: false,
        isOfflineCreated: true,
        updatedAt: '2024-06-15T14:00:00Z',
      })

      cacheItems(db, [item])

      const cached = getCachedItem(db, 'item-fields')
      expect(cached).not.toBeNull()
      expect(cached!.id).toBe('item-fields')
      expect(cached!.sku).toBe('SKU-FIELDS')
      expect(cached!.name).toBe('Full Fields Item')
      expect(cached!.description).toBe('Complete description')
      expect(cached!.categoryId).toBe('cat-42')
      expect(cached!.locationId).toBe('loc-42')
      expect(cached!.unit).toBe('kg')
      expect(cached!.currentStock).toBe(55.5)
      expect(cached!.minStock).toBe(5)
      expect(cached!.maxStock).toBe(200)
      expect(cached!.barcode).toBe('BC-FULL')
      expect(cached!.unitPrice).toBe(12.50)
      expect(cached!.imageUrl).toBe('https://img.test/full.png')
      expect(cached!.version).toBe(3)
      expect(cached!.isArchived).toBe(false)
      expect(cached!.isOfflineCreated).toBe(true)
      expect(cached!.updatedAt).toBe('2024-06-15T14:00:00Z')
    })

    it('stores domain when provided', () => {
      const items = [makeItem({ id: 'item-dom-1', sku: 'SKU-DOM1' })]
      cacheItems(db, items, 'commissary')

      const row = db.getFirstSync<{ domain: string | null }>(
        'SELECT domain FROM items_cache WHERE id = ?',
        'item-dom-1'
      )
      expect(row?.domain).toBe('commissary')
    })

    it('stores null domain when not provided', () => {
      const items = [makeItem({ id: 'item-nodom', sku: 'SKU-NODOM' })]
      cacheItems(db, items)

      const row = db.getFirstSync<{ domain: string | null }>(
        'SELECT domain FROM items_cache WHERE id = ?',
        'item-nodom'
      )
      expect(row?.domain).toBeNull()
    })

    it('handles items with null/undefined optional fields', () => {
      const item = makeItem({
        id: 'item-nulls',
        sku: 'SKU-NULLS',
        description: undefined,
        categoryId: undefined,
        locationId: undefined,
        maxStock: undefined,
        barcode: undefined,
        unitPrice: undefined,
        imageUrl: undefined,
        isArchived: undefined,
        isOfflineCreated: undefined,
      })

      cacheItems(db, [item])

      const cached = getCachedItem(db, 'item-nulls')
      expect(cached).not.toBeNull()
      expect(cached!.id).toBe('item-nulls')
      expect(cached!.name).toBe('Test Item')
    })
  })

  // ---- getCachedItem ----

  describe('getCachedItem', () => {
    it('returns the item when found by id', () => {
      cacheItems(db, [makeItem({ id: 'item-get-1', name: 'Found Item' })])

      const result = getCachedItem(db, 'item-get-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('item-get-1')
      expect(result!.name).toBe('Found Item')
    })

    it('returns null when item does not exist', () => {
      const result = getCachedItem(db, 'nonexistent-id')
      expect(result).toBeNull()
    })

    it('returns domain when stored with domain', () => {
      cacheItems(db, [makeItem({ id: 'item-dom-get', name: 'Domain Item' })], 'commissary')

      const result = getCachedItem(db, 'item-dom-get')
      expect(result).not.toBeNull()
      expect(result!.domain).toBe('commissary')
    })

    it('returns undefined domain when stored without domain', () => {
      cacheItems(db, [makeItem({ id: 'item-nodom-get', name: 'No Domain' })])

      const result = getCachedItem(db, 'item-nodom-get')
      expect(result).not.toBeNull()
      expect(result!.domain).toBeUndefined()
    })
  })

  // ---- getCachedItemBySku ----

  describe('getCachedItemBySku', () => {
    it('returns the item when found by SKU', () => {
      cacheItems(db, [makeItem({ id: 'item-sku-1', sku: 'SKU-FIND-ME' })])

      const result = getCachedItemBySku(db, 'SKU-FIND-ME')
      expect(result).not.toBeNull()
      expect(result!.sku).toBe('SKU-FIND-ME')
      expect(result!.id).toBe('item-sku-1')
    })

    it('returns null when SKU does not exist', () => {
      const result = getCachedItemBySku(db, 'SKU-NONEXISTENT')
      expect(result).toBeNull()
    })
  })

  // ---- getCachedItemByBarcode ----

  describe('getCachedItemByBarcode', () => {
    it('returns the item when found by barcode', () => {
      cacheItems(db, [makeItem({ id: 'item-bc-1', barcode: 'BC-SCAN-ME' })])

      const result = getCachedItemByBarcode(db, 'BC-SCAN-ME')
      expect(result).not.toBeNull()
      expect(result!.barcode).toBe('BC-SCAN-ME')
      expect(result!.id).toBe('item-bc-1')
    })

    it('returns null when barcode does not exist', () => {
      const result = getCachedItemByBarcode(db, 'BC-NONEXISTENT')
      expect(result).toBeNull()
    })
  })

  // ---- getAllCachedItems ----

  describe('getAllCachedItems', () => {
    it('returns all cached items', () => {
      cacheItems(db, [
        makeItem({ id: 'item-all-1', sku: 'SKU-A1' }),
        makeItem({ id: 'item-all-2', sku: 'SKU-A2' }),
        makeItem({ id: 'item-all-3', sku: 'SKU-A3' }),
      ])

      const result = getAllCachedItems(db)
      expect(result).toHaveLength(3)
    })

    it('returns an empty array when cache is empty', () => {
      const result = getAllCachedItems(db)
      expect(result).toEqual([])
    })

    it('returns only non-archived items when called without domain', () => {
      cacheItems(db, [
        makeItem({ id: 'item-active', sku: 'SKU-ACT', isArchived: false }),
        makeItem({ id: 'item-archived', sku: 'SKU-ARC', isArchived: true }),
      ])

      const result = getAllCachedItems(db)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-active')
    })

    it('returns only items matching domain when domain provided', () => {
      cacheItems(db, [makeItem({ id: 'item-cm', sku: 'SKU-CM' })], 'commissary')
      cacheItems(db, [makeItem({ id: 'item-fg', sku: 'SKU-FG' })], 'frozen-goods')

      const result = getAllCachedItems(db, 'commissary')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-cm')
    })

    it('excludes archived items when domain provided', () => {
      cacheItems(db, [
        makeItem({ id: 'item-cm-act', sku: 'SKU-CMA', isArchived: false }),
        makeItem({ id: 'item-cm-arc', sku: 'SKU-CMR', isArchived: true }),
      ], 'commissary')

      const result = getAllCachedItems(db, 'commissary')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-cm-act')
    })

    it('returns CachedItem objects with correct field mapping', () => {
      cacheItems(db, [makeItem({
        id: 'item-map-1',
        sku: 'SKU-MAP',
        name: 'Mapped Item',
        currentStock: 42,
        version: 7,
      })])

      const result = getAllCachedItems(db)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-map-1')
      expect(result[0].sku).toBe('SKU-MAP')
      expect(result[0].name).toBe('Mapped Item')
      expect(result[0].currentStock).toBe(42)
      expect(result[0].version).toBe(7)
    })
  })

  // ---- clearItemsCache ----

  describe('clearItemsCache', () => {
    it('removes all items from the cache', () => {
      cacheItems(db, [
        makeItem({ id: 'item-clr-1', sku: 'SKU-C1' }),
        makeItem({ id: 'item-clr-2', sku: 'SKU-C2' }),
      ])

      clearItemsCache(db)

      expect(getAllCachedItems(db)).toEqual([])
    })

    it('does not error when cache is already empty', () => {
      expect(() => clearItemsCache(db)).not.toThrow()
    })
  })

  // ---- updateCachedItem ----

  describe('updateCachedItem', () => {
    it('merges partial updates into existing item', () => {
      cacheItems(db, [makeItem({
        id: 'item-upd-1',
        sku: 'SKU-UPD',
        name: 'Original',
        currentStock: 100,
      })])

      updateCachedItem(db, 'item-upd-1', { name: 'Updated', currentStock: 200 })

      const result = getCachedItem(db, 'item-upd-1')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated')
      expect(result!.currentStock).toBe(200)
      // Other fields should remain unchanged
      expect(result!.sku).toBe('SKU-UPD')
    })

    it('updates version field', () => {
      cacheItems(db, [makeItem({ id: 'item-ver-1', sku: 'SKU-VER', version: 1 })])

      updateCachedItem(db, 'item-ver-1', { version: 2 })

      const result = getCachedItem(db, 'item-ver-1')
      expect(result!.version).toBe(2)
    })

    it('updates stock-related fields', () => {
      cacheItems(db, [makeItem({
        id: 'item-stock-1',
        sku: 'SKU-STK',
        currentStock: 50,
        minStock: 10,
        maxStock: 200,
      })])

      updateCachedItem(db, 'item-stock-1', {
        currentStock: 75,
        minStock: 15,
        maxStock: 300,
      })

      const result = getCachedItem(db, 'item-stock-1')
      expect(result!.currentStock).toBe(75)
      expect(result!.minStock).toBe(15)
      expect(result!.maxStock).toBe(300)
    })

    it('updates isArchived flag', () => {
      cacheItems(db, [makeItem({ id: 'item-arch-1', sku: 'SKU-ARCH', isArchived: false })])

      updateCachedItem(db, 'item-arch-1', { isArchived: true })

      const result = getCachedItem(db, 'item-arch-1')
      expect(result!.isArchived).toBe(true)
    })

    it('does not error when updating a nonexistent item', () => {
      expect(() => updateCachedItem(db, 'nonexistent', { name: 'nope' })).not.toThrow()
    })
  })

  // ---- searchCachedItems ----

  describe('searchCachedItems', () => {
    beforeEach(() => {
      cacheItems(db, [
        makeItem({ id: 'item-s1', sku: 'SKU-FLOUR', name: 'All Purpose Flour', barcode: 'BC-FLR-001' }),
        makeItem({ id: 'item-s2', sku: 'SKU-SUGAR', name: 'Brown Sugar', barcode: 'BC-SGR-001' }),
        makeItem({ id: 'item-s3', sku: 'SKU-RICE', name: 'Jasmine Rice', barcode: 'BC-RCE-001' }),
        makeItem({ id: 'item-s4', sku: 'SKU-FLOUR2', name: 'Bread Flour', barcode: 'BC-FLR-002' }),
      ])
    })

    it('finds items matching name (case-insensitive)', () => {
      const results = searchCachedItems(db, 'flour')
      expect(results).toHaveLength(2)
      const names = results.map((r) => r.name)
      expect(names).toContain('All Purpose Flour')
      expect(names).toContain('Bread Flour')
    })

    it('finds items matching SKU', () => {
      const results = searchCachedItems(db, 'SKU-SUGAR')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Brown Sugar')
    })

    it('finds items matching barcode', () => {
      const results = searchCachedItems(db, 'BC-RCE')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Jasmine Rice')
    })

    it('returns empty array when no items match', () => {
      const results = searchCachedItems(db, 'nonexistent-query')
      expect(results).toEqual([])
    })

    it('returns empty array when cache is empty', () => {
      clearItemsCache(db)
      const results = searchCachedItems(db, 'flour')
      expect(results).toEqual([])
    })

    it('escapes SQL LIKE special characters in the query', () => {
      cacheItems(db, [
        makeItem({ id: 'item-special', sku: 'SKU-100%OFF', name: '100% Off Special' }),
      ])

      // Searching for "100%" should match the item, not treat % as wildcard
      const results = searchCachedItems(db, '100%')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('100% Off Special')
    })

    it('escapes underscore in the query', () => {
      cacheItems(db, [
        makeItem({ id: 'item-under', sku: 'SKU_ITEM', name: 'Underscore_Item' }),
      ])

      // Searching for "_" should only match items with literal underscore
      const results = searchCachedItems(db, '_ITEM')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('item-under')
    })

    it('handles partial matches via LIKE pattern', () => {
      const results = searchCachedItems(db, 'jas')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Jasmine Rice')
    })

    it('filters by domain when provided', () => {
      clearItemsCache(db)
      cacheItems(db, [
        makeItem({ id: 'item-cm-flour', sku: 'SKU-CMF', name: 'CM Flour' }),
      ], 'commissary')
      cacheItems(db, [
        makeItem({ id: 'item-fg-flour', sku: 'SKU-FGF', name: 'FG Flour' }),
      ], 'frozen-goods')

      const results = searchCachedItems(db, 'flour', 'commissary')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('item-cm-flour')
    })

    it('excludes archived items from search results', () => {
      clearItemsCache(db)
      cacheItems(db, [
        makeItem({ id: 'item-active-flour', sku: 'SKU-AF', name: 'Active Flour', isArchived: false }),
        makeItem({ id: 'item-archived-flour', sku: 'SKU-RF', name: 'Archived Flour', isArchived: true }),
      ])

      const results = searchCachedItems(db, 'flour')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('item-active-flour')
    })

    it('returns from all domains when domain not provided and excludes archived', () => {
      clearItemsCache(db)
      cacheItems(db, [
        makeItem({ id: 'item-cm-rice', sku: 'SKU-CMR', name: 'CM Rice' }),
      ], 'commissary')
      cacheItems(db, [
        makeItem({ id: 'item-fg-rice', sku: 'SKU-FGR', name: 'FG Rice' }),
      ], 'frozen-goods')
      cacheItems(db, [
        makeItem({ id: 'item-arc-rice', sku: 'SKU-AR', name: 'Archived Rice', isArchived: true }),
      ], 'commissary')

      const results = searchCachedItems(db, 'rice')
      expect(results).toHaveLength(2)
      const ids = results.map((r) => r.id)
      expect(ids).toContain('item-cm-rice')
      expect(ids).toContain('item-fg-rice')
    })
  })
})
