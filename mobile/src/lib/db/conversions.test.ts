import { describe, it, expect } from 'vitest'
import {
  cachedItemToItem,
  itemToCachedItem,
  cachedCategoryToCategory,
  categoryToCachedCategory,
} from './conversions'
import type { CachedItem, CachedCategory } from '@/types/offline'
import type { Item, Category } from '@/lib/supabase/types'

describe('conversions', () => {
  // ---------------------------------------------------------------------------
  // cachedItemToItem
  // ---------------------------------------------------------------------------
  describe('cachedItemToItem', () => {
    it('converts all fields from camelCase to snake_case', () => {
      const cached: CachedItem = {
        id: 'item-1',
        sku: 'SKU-001',
        name: 'Test Item',
        description: 'A description',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        unit: 'pcs',
        currentStock: 100,
        minStock: 10,
        maxStock: 500,
        barcode: 'BC-001',
        unitPrice: 9.99,
        imageUrl: 'https://img.test/1.png',
        version: 3,
        isArchived: false,
        isOfflineCreated: false,
        updatedAt: '2024-06-15T12:00:00Z',
      }

      const item = cachedItemToItem(cached)

      expect(item.id).toBe('item-1')
      expect(item.sku).toBe('SKU-001')
      expect(item.name).toBe('Test Item')
      expect(item.description).toBe('A description')
      expect(item.category_id).toBe('cat-1')
      expect(item.location_id).toBe('loc-1')
      expect(item.unit).toBe('pcs')
      expect(item.current_stock).toBe(100)
      expect(item.min_stock).toBe(10)
      expect(item.max_stock).toBe(500)
      expect(item.barcode).toBe('BC-001')
      expect(item.unit_price).toBe(9.99)
      expect(item.image_url).toBe('https://img.test/1.png')
      expect(item.version).toBe(3)
      expect(item.is_archived).toBe(false)
      expect(item.updated_at).toBe('2024-06-15T12:00:00Z')
    })

    it('maps undefined optional fields to null', () => {
      const cached: CachedItem = {
        id: 'item-2',
        sku: 'SKU-002',
        name: 'Minimal Item',
        unit: 'kg',
        currentStock: 0,
        minStock: 0,
        version: 1,
        updatedAt: '2024-06-15T12:00:00Z',
      }

      const item = cachedItemToItem(cached)

      expect(item.description).toBeNull()
      expect(item.category_id).toBeNull()
      expect(item.location_id).toBeNull()
      expect(item.max_stock).toBeNull()
      expect(item.barcode).toBeNull()
      expect(item.unit_price).toBeNull()
      expect(item.image_url).toBeNull()
    })

    it('maps isArchived true correctly', () => {
      const cached: CachedItem = {
        id: 'item-3',
        sku: 'SKU-003',
        name: 'Archived Item',
        unit: 'pcs',
        currentStock: 0,
        minStock: 0,
        version: 1,
        isArchived: true,
        updatedAt: '2024-06-15T12:00:00Z',
      }

      const item = cachedItemToItem(cached)
      expect(item.is_archived).toBe(true)
    })

    it('defaults isArchived to false when undefined', () => {
      const cached: CachedItem = {
        id: 'item-4',
        sku: 'SKU-004',
        name: 'No Archive Flag',
        unit: 'pcs',
        currentStock: 0,
        minStock: 0,
        version: 1,
        updatedAt: '2024-06-15T12:00:00Z',
      }

      const item = cachedItemToItem(cached)
      expect(item.is_archived).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // itemToCachedItem
  // ---------------------------------------------------------------------------
  describe('itemToCachedItem', () => {
    it('converts all fields from snake_case to camelCase', () => {
      const item: Item = {
        id: 'item-1',
        sku: 'SKU-001',
        name: 'Server Item',
        description: 'From server',
        category_id: 'cat-1',
        location_id: 'loc-1',
        unit: 'pcs',
        current_stock: 200,
        min_stock: 20,
        max_stock: 1000,
        barcode: 'BC-SRV',
        unit_price: 19.99,
        image_url: 'https://img.test/srv.png',
        version: 5,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item)

      expect(cached.id).toBe('item-1')
      expect(cached.sku).toBe('SKU-001')
      expect(cached.name).toBe('Server Item')
      expect(cached.description).toBe('From server')
      expect(cached.categoryId).toBe('cat-1')
      expect(cached.locationId).toBe('loc-1')
      expect(cached.unit).toBe('pcs')
      expect(cached.currentStock).toBe(200)
      expect(cached.minStock).toBe(20)
      expect(cached.maxStock).toBe(1000)
      expect(cached.barcode).toBe('BC-SRV')
      expect(cached.unitPrice).toBe(19.99)
      expect(cached.imageUrl).toBe('https://img.test/srv.png')
      expect(cached.version).toBe(5)
      expect(cached.isArchived).toBe(false)
      expect(cached.isOfflineCreated).toBe(false)
      expect(cached.updatedAt).toBe('2024-06-15T12:00:00Z')
    })

    it('maps null optional fields to undefined', () => {
      const item: Item = {
        id: 'item-2',
        sku: 'SKU-002',
        name: 'Minimal Server Item',
        description: null,
        category_id: null,
        location_id: null,
        unit: 'kg',
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        barcode: null,
        unit_price: null,
        image_url: null,
        version: 1,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item)

      expect(cached.description).toBeUndefined()
      expect(cached.categoryId).toBeUndefined()
      expect(cached.locationId).toBeUndefined()
      expect(cached.maxStock).toBeUndefined()
      expect(cached.barcode).toBeUndefined()
      expect(cached.unitPrice).toBeUndefined()
      expect(cached.imageUrl).toBeUndefined()
    })

    it('maps is_archived true correctly', () => {
      const item: Item = {
        id: 'item-3',
        sku: 'SKU-003',
        name: 'Archived',
        description: null,
        category_id: null,
        location_id: null,
        unit: 'pcs',
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        barcode: null,
        unit_price: null,
        image_url: null,
        version: 1,
        is_archived: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item)
      expect(cached.isArchived).toBe(true)
    })

    it('sets domain when provided', () => {
      const item: Item = {
        id: 'item-dom',
        sku: 'SKU-DOM',
        name: 'Domain Item',
        description: null,
        category_id: null,
        location_id: null,
        unit: 'pcs',
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        barcode: null,
        unit_price: null,
        image_url: null,
        version: 1,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item, 'commissary')
      expect(cached.domain).toBe('commissary')
    })

    it('leaves domain undefined when not provided', () => {
      const item: Item = {
        id: 'item-nodom',
        sku: 'SKU-NODOM',
        name: 'No Domain Item',
        description: null,
        category_id: null,
        location_id: null,
        unit: 'pcs',
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        barcode: null,
        unit_price: null,
        image_url: null,
        version: 1,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item)
      expect(cached.domain).toBeUndefined()
    })

    it('always sets isOfflineCreated to false', () => {
      const item: Item = {
        id: 'item-4',
        sku: 'SKU-004',
        name: 'From Server',
        description: null,
        category_id: null,
        location_id: null,
        unit: 'pcs',
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        barcode: null,
        unit_price: null,
        image_url: null,
        version: 1,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(item)
      expect(cached.isOfflineCreated).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // cachedCategoryToCategory
  // ---------------------------------------------------------------------------
  describe('cachedCategoryToCategory', () => {
    it('converts all fields from camelCase to snake_case', () => {
      const cached: CachedCategory = {
        id: 'cat-1',
        name: 'Produce',
        description: 'Fresh produce',
        parentId: 'cat-parent',
        createdAt: '2024-06-15T12:00:00Z',
      }

      const category = cachedCategoryToCategory(cached)

      expect(category.id).toBe('cat-1')
      expect(category.name).toBe('Produce')
      expect(category.description).toBe('Fresh produce')
      expect(category.parent_id).toBe('cat-parent')
      expect(category.created_at).toBe('2024-06-15T12:00:00Z')
    })

    it('maps undefined optional fields to null', () => {
      const cached: CachedCategory = {
        id: 'cat-2',
        name: 'Minimal',
        createdAt: '2024-06-15T12:00:00Z',
      }

      const category = cachedCategoryToCategory(cached)

      expect(category.description).toBeNull()
      expect(category.parent_id).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // categoryToCachedCategory
  // ---------------------------------------------------------------------------
  describe('categoryToCachedCategory', () => {
    it('converts all fields from snake_case to camelCase', () => {
      const category: Category = {
        id: 'cat-1',
        name: 'Dairy',
        description: 'Dairy products',
        parent_id: 'cat-root',
        created_at: '2024-06-15T12:00:00Z',
      }

      const cached = categoryToCachedCategory(category)

      expect(cached.id).toBe('cat-1')
      expect(cached.name).toBe('Dairy')
      expect(cached.description).toBe('Dairy products')
      expect(cached.parentId).toBe('cat-root')
      expect(cached.createdAt).toBe('2024-06-15T12:00:00Z')
    })

    it('maps null optional fields to undefined', () => {
      const category: Category = {
        id: 'cat-2',
        name: 'Minimal',
        description: null,
        parent_id: null,
        created_at: '2024-06-15T12:00:00Z',
      }

      const cached = categoryToCachedCategory(category)

      expect(cached.description).toBeUndefined()
      expect(cached.parentId).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Round-trip conversions
  // ---------------------------------------------------------------------------
  describe('round-trip conversions', () => {
    it('item round-trip preserves data (Item -> CachedItem -> Item)', () => {
      const original: Item = {
        id: 'item-rt',
        sku: 'SKU-RT',
        name: 'Round Trip Item',
        description: 'Testing round trip',
        category_id: 'cat-1',
        location_id: 'loc-1',
        unit: 'pcs',
        current_stock: 50,
        min_stock: 5,
        max_stock: 200,
        barcode: 'BC-RT',
        unit_price: 12.50,
        image_url: 'https://img.test/rt.png',
        version: 2,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T12:00:00Z',
      }

      const cached = itemToCachedItem(original)
      const backToItem = cachedItemToItem(cached)

      expect(backToItem.id).toBe(original.id)
      expect(backToItem.sku).toBe(original.sku)
      expect(backToItem.name).toBe(original.name)
      expect(backToItem.description).toBe(original.description)
      expect(backToItem.category_id).toBe(original.category_id)
      expect(backToItem.location_id).toBe(original.location_id)
      expect(backToItem.unit).toBe(original.unit)
      expect(backToItem.current_stock).toBe(original.current_stock)
      expect(backToItem.min_stock).toBe(original.min_stock)
      expect(backToItem.max_stock).toBe(original.max_stock)
      expect(backToItem.barcode).toBe(original.barcode)
      expect(backToItem.unit_price).toBe(original.unit_price)
      expect(backToItem.image_url).toBe(original.image_url)
      expect(backToItem.version).toBe(original.version)
      expect(backToItem.is_archived).toBe(original.is_archived)
      expect(backToItem.updated_at).toBe(original.updated_at)
    })

    it('category round-trip preserves data (Category -> CachedCategory -> Category)', () => {
      const original: Category = {
        id: 'cat-rt',
        name: 'Round Trip Category',
        description: 'Testing round trip',
        parent_id: 'cat-parent-rt',
        created_at: '2024-06-15T12:00:00Z',
      }

      const cached = categoryToCachedCategory(original)
      const backToCategory = cachedCategoryToCategory(cached)

      expect(backToCategory.id).toBe(original.id)
      expect(backToCategory.name).toBe(original.name)
      expect(backToCategory.description).toBe(original.description)
      expect(backToCategory.parent_id).toBe(original.parent_id)
      expect(backToCategory.created_at).toBe(original.created_at)
    })
  })
})
