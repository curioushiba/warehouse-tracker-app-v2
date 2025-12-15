import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Item, ItemInsert, ItemUpdate } from '@/lib/supabase/types'

// Mock data
const mockItems: Item[] = [
  {
    id: '1',
    sku: 'SKU-001',
    name: 'Test Item 1',
    description: 'Description 1',
    category_id: 'cat-1',
    location_id: 'loc-1',
    unit: 'pieces',
    current_stock: 100,
    min_stock: 10,
    max_stock: 200,
    unit_price: 9.99,
    barcode: '1234567890123',
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    sku: 'SKU-002',
    name: 'Test Item 2',
    description: 'Description 2',
    category_id: 'cat-2',
    location_id: 'loc-2',
    unit: 'boxes',
    current_stock: 5,
    min_stock: 10,
    max_stock: 50,
    unit_price: 19.99,
    barcode: '9876543210987',
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

// Mock Supabase query builder
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockIlike = vi.fn()
const mockOr = vi.fn()
const mockLt = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

// Reset and setup mocks before each test
beforeEach(() => {
  vi.clearAllMocks()

  // Setup chainable mock methods
  mockSelect.mockReturnThis()
  mockInsert.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockEq.mockReturnThis()
  mockIlike.mockReturnThis()
  mockOr.mockReturnThis()
  mockLt.mockReturnThis()
  mockOrder.mockReturnThis()
  mockMaybeSingle.mockReturnThis()

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    ilike: mockIlike,
    or: mockOr,
    lt: mockLt,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
  })
})

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

describe('Items Server Actions', () => {
  describe('getItems', () => {
    it('should return all non-archived items when no filters provided', async () => {
      // Arrange
      mockOrder.mockResolvedValue({ data: mockItems.filter(i => !i.is_archived), error: null })

      // Act
      const { getItems } = await import('./items')
      const result = await getItems()

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockItems.filter(i => !i.is_archived))
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('is_archived', false)
    })

    it('should filter items by category when categoryId is provided', async () => {
      // Arrange
      const filteredItems = [mockItems[0]]
      mockOrder.mockResolvedValue({ data: filteredItems, error: null })

      // Act
      const { getItems } = await import('./items')
      const result = await getItems({ categoryId: 'cat-1' })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(filteredItems)
      }
      expect(mockEq).toHaveBeenCalledWith('category_id', 'cat-1')
    })

    it('should filter items by location when locationId is provided', async () => {
      // Arrange
      const filteredItems = [mockItems[0]]
      mockOrder.mockResolvedValue({ data: filteredItems, error: null })

      // Act
      const { getItems } = await import('./items')
      const result = await getItems({ locationId: 'loc-1' })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(filteredItems)
      }
      expect(mockEq).toHaveBeenCalledWith('location_id', 'loc-1')
    })

    it('should filter items by search term using ilike', async () => {
      // Arrange
      const filteredItems = [mockItems[0]]
      mockOrder.mockResolvedValue({ data: filteredItems, error: null })

      // Act
      const { getItems } = await import('./items')
      const result = await getItems({ search: 'Test' })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(filteredItems)
      }
      expect(mockOr).toHaveBeenCalledWith('name.ilike.%Test%,sku.ilike.%Test%')
    })

    it('should return error when database query fails', async () => {
      // Arrange
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } })

      // Act
      const { getItems } = await import('./items')
      const result = await getItems()

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getItemById', () => {
    it('should return a single item by id', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: mockItems[0], error: null })

      // Act
      const { getItemById } = await import('./items')
      const result = await getItemById('1')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockItems[0])
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(mockSingle).toHaveBeenCalled()
    })

    it('should return error when item not found', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Item not found' } })

      // Act
      const { getItemById } = await import('./items')
      const result = await getItemById('nonexistent')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item not found')
      }
    })
  })

  describe('getItemBySku', () => {
    it('should return a single item by SKU', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: mockItems[0], error: null })

      // Act
      const { getItemBySku } = await import('./items')
      const result = await getItemBySku('SKU-001')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockItems[0])
      }
      expect(mockEq).toHaveBeenCalledWith('sku', 'SKU-001')
      expect(mockSingle).toHaveBeenCalled()
    })

    it('should return error when SKU not found', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Item not found' } })

      // Act
      const { getItemBySku } = await import('./items')
      const result = await getItemBySku('NONEXISTENT')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item not found')
      }
    })
  })

  describe('getItemByBarcode', () => {
    it('should return a single item by barcode', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: mockItems[0], error: null })

      // Act
      const { getItemByBarcode } = await import('./items')
      const result = await getItemByBarcode('1234567890123')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockItems[0])
      }
      expect(mockEq).toHaveBeenCalledWith('barcode', '1234567890123')
      expect(mockSingle).toHaveBeenCalled()
    })

    it('should return error when barcode not found', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Item not found' } })

      // Act
      const { getItemByBarcode } = await import('./items')
      const result = await getItemByBarcode('0000000000000')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item not found')
      }
    })
  })

  describe('createItem', () => {
    it('should create a new item and return it', async () => {
      // Arrange
      const newItemData: ItemInsert = {
        name: 'New Item',
        unit: 'pieces',
        current_stock: 50,
        min_stock: 5,
      }
      mockSingle.mockResolvedValue({ data: { ...mockItems[0], ...newItemData }, error: null })

      // Act
      const { createItem } = await import('./items')
      const result = await createItem(newItemData)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeTruthy()
        expect(result.data.name).toBe('New Item')
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockInsert).toHaveBeenCalledWith(newItemData)
      expect(mockSelect).toHaveBeenCalled()
      expect(mockSingle).toHaveBeenCalled()
    })

    it('should return error when create fails', async () => {
      // Arrange
      const newItemData: ItemInsert = {
        name: 'New Item',
      }
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

      // Act
      const { createItem } = await import('./items')
      const result = await createItem(newItemData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Insert failed')
      }
    })
  })

  describe('updateItem', () => {
    it('should update an existing item and return it', async () => {
      // Arrange
      const updateData: ItemUpdate = {
        name: 'Updated Item Name',
        current_stock: 75,
      }
      mockSingle.mockResolvedValue({ data: { ...mockItems[0], ...updateData }, error: null })

      // Act
      const { updateItem } = await import('./items')
      const result = await updateItem('1', updateData)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeTruthy()
        expect(result.data.name).toBe('Updated Item Name')
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('should return error when update fails', async () => {
      // Arrange
      const updateData: ItemUpdate = {
        name: 'Updated Item Name',
      }
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      // Act
      const { updateItem } = await import('./items')
      const result = await updateItem('1', updateData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Update failed')
      }
    })
  })

  describe('archiveItem', () => {
    it('should archive an item by setting is_archived to true', async () => {
      // Arrange
      const archivedItem = { ...mockItems[0], is_archived: true }
      mockSingle.mockResolvedValue({ data: archivedItem, error: null })

      // Act
      const { archiveItem } = await import('./items')
      const result = await archiveItem('1')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeTruthy()
        expect(result.data.is_archived).toBe(true)
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockUpdate).toHaveBeenCalledWith({ is_archived: true })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('should return error when archive fails', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Archive failed' } })

      // Act
      const { archiveItem } = await import('./items')
      const result = await archiveItem('1')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Archive failed')
      }
    })
  })

  describe('restoreItem', () => {
    it('should restore an archived item by setting is_archived to false', async () => {
      // Arrange
      const restoredItem = { ...mockItems[0], is_archived: false }
      mockSingle.mockResolvedValue({ data: restoredItem, error: null })

      // Act
      const { restoreItem } = await import('./items')
      const result = await restoreItem('1')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeTruthy()
        expect(result.data.is_archived).toBe(false)
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockUpdate).toHaveBeenCalledWith({ is_archived: false })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('should return error when restore fails', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Restore failed' } })

      // Act
      const { restoreItem } = await import('./items')
      const result = await restoreItem('1')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Restore failed')
      }
    })
  })

  describe('getLowStockItems', () => {
    it('should return items where current_stock is below min_stock', async () => {
      // Arrange
      const lowStockItems = [mockItems[1]] // Item 2 has current_stock 5, min_stock 10
      mockOrder.mockResolvedValue({ data: lowStockItems, error: null })

      // Act
      const { getLowStockItems } = await import('./items')
      const result = await getLowStockItems()

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(lowStockItems)
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('is_archived', false)
    })

    it('should return error when query fails', async () => {
      // Arrange
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Query failed' } })

      // Act
      const { getLowStockItems } = await import('./items')
      const result = await getLowStockItems()

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Query failed')
      }
    })
  })

  describe('searchItems', () => {
    it('should search items by name or SKU', async () => {
      // Arrange
      const searchResults = [mockItems[0]]
      mockOrder.mockResolvedValue({ data: searchResults, error: null })

      // Act
      const { searchItems } = await import('./items')
      const result = await searchItems('Test Item 1')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(searchResults)
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_items')
      expect(mockOr).toHaveBeenCalledWith('name.ilike.%Test Item 1%,sku.ilike.%Test Item 1%,barcode.ilike.%Test Item 1%')
    })

    it('should return empty array when no matches found', async () => {
      // Arrange
      mockOrder.mockResolvedValue({ data: [], error: null })

      // Act
      const { searchItems } = await import('./items')
      const result = await searchItems('nonexistent')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it('should return error when search fails', async () => {
      // Arrange
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Search failed' } })

      // Act
      const { searchItems } = await import('./items')
      const result = await searchItems('test')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Search failed')
      }
    })
  })

  describe('generatePtCode', () => {
    const itemWithoutBarcode: Item = {
      ...mockItems[0],
      id: 'item-no-barcode',
      barcode: null,
      is_archived: false,
    }

    it('should generate PT code for item without barcode', async () => {
      // Arrange
      const generatedCode = 'PT-00001'
      const updatedItem = { ...itemWithoutBarcode, barcode: generatedCode }

      // RPC returns chainable object with single() method
      mockRpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({ data: updatedItem, error: null })
      })

      // Act
      const { generatePtCode } = await import('./items')
      const result = await generatePtCode('item-no-barcode')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.barcode).toBe(generatedCode)
      }
      expect(mockRpc).toHaveBeenCalledWith('assign_pt_code', { p_item_id: 'item-no-barcode' })
    })

    it('should return error when item already has barcode', async () => {
      // Arrange - atomic function returns error
      mockRpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Item already has a barcode assigned' }
        })
      })

      // Act
      const { generatePtCode } = await import('./items')
      const result = await generatePtCode('1')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item already has a barcode assigned')
      }
    })

    it('should return error when item is archived', async () => {
      // Arrange - atomic function returns error
      mockRpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Cannot generate code for archived item' }
        })
      })

      // Act
      const { generatePtCode } = await import('./items')
      const result = await generatePtCode('archived-item')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot generate code for archived item')
      }
    })

    it('should return error when item not found', async () => {
      // Arrange - atomic function returns error
      mockRpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Item not found' }
        })
      })

      // Act
      const { generatePtCode } = await import('./items')
      const result = await generatePtCode('nonexistent')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item not found')
      }
    })
  })

  describe('registerBarcode', () => {
    const itemWithoutBarcode: Item = {
      ...mockItems[0],
      id: 'item-no-barcode',
      barcode: null,
      is_archived: false,
    }

    const archivedItem: Item = {
      ...mockItems[0],
      id: 'archived-item',
      barcode: null,
      is_archived: true,
    }

    it('should register barcode successfully', async () => {
      // Arrange
      const newBarcode = '123456789'
      const updatedItem = { ...itemWithoutBarcode, barcode: newBarcode }

      // First call: check if barcode exists on another item
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Second call: fetch current item
      mockSingle.mockResolvedValueOnce({ data: itemWithoutBarcode, error: null })
      // Third call: update item with barcode
      mockSingle.mockResolvedValueOnce({ data: updatedItem, error: null })

      // Act
      const { registerBarcode } = await import('./items')
      const result = await registerBarcode('item-no-barcode', newBarcode)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.barcode).toBe(newBarcode)
      }
    })

    it('should return error when barcode is empty', async () => {
      // Act
      const { registerBarcode } = await import('./items')
      const result = await registerBarcode('item-no-barcode', '')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Barcode cannot be empty')
      }
    })

    it('should return error when barcode is whitespace only', async () => {
      // Act
      const { registerBarcode } = await import('./items')
      const result = await registerBarcode('item-no-barcode', '   ')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Barcode cannot be empty')
      }
    })

    it('should return error when barcode is too long', async () => {
      // Act
      const { registerBarcode } = await import('./items')
      const longBarcode = 'a'.repeat(101)
      const result = await registerBarcode('item-no-barcode', longBarcode)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Barcode is too long')
      }
    })

    it('should return error when barcode is already assigned to another item', async () => {
      // Arrange - barcode exists on different item
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'other-item', name: 'Other Item' },
        error: null
      })

      // Act
      const { registerBarcode } = await import('./items')
      const result = await registerBarcode('item-no-barcode', '123456789')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('This barcode is already assigned to another item')
      }
    })

    it('should return error when item is archived', async () => {
      // Arrange
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSingle.mockResolvedValueOnce({ data: archivedItem, error: null })

      // Act
      const { registerBarcode } = await import('./items')
      const result = await registerBarcode('archived-item', '123456789')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot register barcode for archived item')
      }
    })
  })

  describe('clearBarcode', () => {
    it('should clear barcode successfully', async () => {
      // Arrange
      const clearedItem = { ...mockItems[0], barcode: null }
      mockSingle.mockResolvedValueOnce({ data: clearedItem, error: null })

      // Act
      const { clearBarcode } = await import('./items')
      const result = await clearBarcode('1')

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.barcode).toBeNull()
      }
      expect(mockUpdate).toHaveBeenCalledWith({ barcode: null })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('should return error when item not found', async () => {
      // Arrange
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Item not found' } })

      // Act
      const { clearBarcode } = await import('./items')
      const result = await clearBarcode('nonexistent')

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Item not found')
      }
    })
  })
})
