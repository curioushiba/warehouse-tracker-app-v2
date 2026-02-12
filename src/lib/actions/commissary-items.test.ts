import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Item } from '@/lib/supabase/types'

// Mock data
const mockCmItems: Item[] = [
  {
    id: '1',
    sku: 'CM-001000',
    name: 'Fresh Bread Loaf',
    description: 'Commissary bread',
    category_id: 'cat-1',
    location_id: 'loc-1',
    unit: 'pcs',
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

describe('Commissary Items Server Actions', () => {
  describe('getCmItems', () => {
    it('should query cm_items table', async () => {
      mockOrder.mockResolvedValue({ data: mockCmItems, error: null })

      const { getCmItems } = await import('./commissary-items')
      const result = await getCmItems()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockCmItems)
      }
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
    })

    it('should filter by search term', async () => {
      mockOrder.mockResolvedValue({ data: mockCmItems, error: null })

      const { getCmItems } = await import('./commissary-items')
      await getCmItems({ search: 'Bread' })

      expect(mockFrom).toHaveBeenCalledWith('cm_items')
      expect(mockOr).toHaveBeenCalledWith('name.ilike.%Bread%,sku.ilike.%Bread%')
    })

    it('should return error when query fails', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } })

      const { getCmItems } = await import('./commissary-items')
      const result = await getCmItems()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getCmItemById', () => {
    it('should query cm_items table by id', async () => {
      mockSingle.mockResolvedValue({ data: mockCmItems[0], error: null })

      const { getCmItemById } = await import('./commissary-items')
      const result = await getCmItemById('1')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('getCmItemByCode', () => {
    it('should query cm_items by barcode or sku', async () => {
      mockMaybeSingle.mockResolvedValue({ data: mockCmItems[0], error: null })

      const { getCmItemByCode } = await import('./commissary-items')
      const result = await getCmItemByCode('CM-001000')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
      expect(mockOr).toHaveBeenCalledWith('barcode.eq.CM-001000,sku.eq.CM-001000')
    })
  })

  describe('createCmItem', () => {
    it('should insert into cm_items table', async () => {
      mockSingle.mockResolvedValue({ data: mockCmItems[0], error: null })

      const { createCmItem } = await import('./commissary-items')
      const result = await createCmItem({ name: 'Fresh Bread Loaf', unit: 'pcs' })

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should revalidate commissary path on success', async () => {
      mockSingle.mockResolvedValue({ data: mockCmItems[0], error: null })
      const { revalidatePath } = await import('next/cache')

      const { createCmItem } = await import('./commissary-items')
      await createCmItem({ name: 'Fresh Bread Loaf' })

      expect(revalidatePath).toHaveBeenCalledWith('/admin/commissary/items')
    })
  })

  describe('updateCmItem', () => {
    it('should update cm_items table', async () => {
      mockSingle.mockResolvedValue({ data: mockCmItems[0], error: null })

      const { updateCmItem } = await import('./commissary-items')
      const result = await updateCmItem('1', { name: 'Updated Bread' })

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('archiveCmItem', () => {
    it('should archive item in cm_items table', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockCmItems[0], is_archived: true }, error: null })

      const { archiveCmItem } = await import('./commissary-items')
      const result = await archiveCmItem('1')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('cm_items')
    })
  })
})
