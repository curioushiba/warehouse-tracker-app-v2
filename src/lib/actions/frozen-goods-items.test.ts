import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Item } from '@/lib/supabase/types'

// Mock data
const mockFgItems: Item[] = [
  {
    id: '1',
    sku: 'FG-001000',
    name: 'Frozen Chicken Breast',
    description: 'Frozen goods chicken',
    category_id: 'cat-1',
    location_id: 'loc-1',
    unit: 'kg',
    current_stock: 50,
    min_stock: 10,
    max_stock: 100,
    unit_price: 5.99,
    barcode: null,
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Mock Supabase query builder
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOr = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRange = vi.fn()
const mockFrom = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockSelect.mockReturnThis()
  mockInsert.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockEq.mockReturnThis()
  mockOr.mockReturnThis()
  mockOrder.mockReturnThis()
  mockLimit.mockReturnThis()
  mockRange.mockReturnThis()
  mockMaybeSingle.mockReturnThis()

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    or: mockOr,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
  })
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

describe('Frozen Goods Items Server Actions', () => {
  describe('getFgItems', () => {
    it('should query fg_items table', async () => {
      mockOrder.mockResolvedValue({ data: mockFgItems, error: null })

      const { getFgItems } = await import('./frozen-goods-items')
      const result = await getFgItems()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockFgItems)
      }
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
    })

    it('should filter by search term', async () => {
      mockOrder.mockResolvedValue({ data: mockFgItems, error: null })

      const { getFgItems } = await import('./frozen-goods-items')
      await getFgItems({ search: 'Chicken' })

      expect(mockFrom).toHaveBeenCalledWith('fg_items')
      expect(mockOr).toHaveBeenCalledWith('name.ilike.%Chicken%,sku.ilike.%Chicken%')
    })

    it('should return error when query fails', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } })

      const { getFgItems } = await import('./frozen-goods-items')
      const result = await getFgItems()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getFgItemById', () => {
    it('should query fg_items table by id', async () => {
      mockSingle.mockResolvedValue({ data: mockFgItems[0], error: null })

      const { getFgItemById } = await import('./frozen-goods-items')
      const result = await getFgItemById('1')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('getFgItemByCode', () => {
    it('should query fg_items by barcode or sku', async () => {
      mockMaybeSingle.mockResolvedValue({ data: mockFgItems[0], error: null })

      const { getFgItemByCode } = await import('./frozen-goods-items')
      const result = await getFgItemByCode('FG-001000')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
      expect(mockOr).toHaveBeenCalledWith('barcode.eq.FG-001000,sku.eq.FG-001000')
    })
  })

  describe('createFgItem', () => {
    it('should insert into fg_items table', async () => {
      mockSingle.mockResolvedValue({ data: mockFgItems[0], error: null })

      const { createFgItem } = await import('./frozen-goods-items')
      const result = await createFgItem({ name: 'Frozen Chicken Breast', unit: 'kg' })

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should revalidate frozengoods path on success', async () => {
      mockSingle.mockResolvedValue({ data: mockFgItems[0], error: null })
      const { revalidatePath } = await import('next/cache')

      const { createFgItem } = await import('./frozen-goods-items')
      await createFgItem({ name: 'Frozen Chicken Breast' })

      expect(revalidatePath).toHaveBeenCalledWith('/admin/frozengoods/items')
    })
  })

  describe('updateFgItem', () => {
    it('should update fg_items table', async () => {
      mockSingle.mockResolvedValue({ data: mockFgItems[0], error: null })

      const { updateFgItem } = await import('./frozen-goods-items')
      const result = await updateFgItem('1', { name: 'Updated Chicken' })

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('archiveFgItem', () => {
    it('should archive item in fg_items table', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockFgItems[0], is_archived: true }, error: null })

      const { archiveFgItem } = await import('./frozen-goods-items')
      const result = await archiveFgItem('1')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_items')
    })
  })
})
