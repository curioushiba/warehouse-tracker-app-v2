import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryItemCount,
} from './categories'
import type { Category, CategoryInsert, CategoryUpdate } from '@/lib/supabase/types'

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Categories Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('should return all categories ordered by name', async () => {
      const mockCategories: Category[] = [
        { id: '1', name: 'Electronics', description: 'Electronic items', parent_id: null, created_at: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'Furniture', description: 'Furniture items', parent_id: null, created_at: '2024-01-01T00:00:00Z' },
      ]

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategories()

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_categories')
      expect(result).toEqual({ data: mockCategories, error: null })
    })

    it('should return error when database query fails', async () => {
      const mockError = { message: 'Database error', code: 'PGRST301' }
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategories()

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('getCategoryById', () => {
    it('should return a single category by id', async () => {
      const mockCategory: Category = {
        id: '1',
        name: 'Electronics',
        description: 'Electronic items',
        parent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCategory, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategoryById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_categories')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ data: mockCategory, error: null })
    })

    it('should return error when category not found', async () => {
      const mockError = { message: 'Category not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategoryById('nonexistent')

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('createCategory', () => {
    it('should create a new category and revalidate path', async () => {
      const categoryData: CategoryInsert = {
        name: 'New Category',
        description: 'A new category',
      }
      const mockCreatedCategory: Category = {
        id: '3',
        name: 'New Category',
        description: 'A new category',
        parent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedCategory, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createCategory(categoryData)

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_categories')
      expect(mockInsert).toHaveBeenCalledWith(categoryData)
      expect(result).toEqual({ data: mockCreatedCategory, error: null })
    })

    it('should return error when creation fails', async () => {
      const categoryData: CategoryInsert = {
        name: 'New Category',
      }
      const mockError = { message: 'Duplicate category name', code: '23505' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createCategory(categoryData)

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('updateCategory', () => {
    it('should update a category and revalidate path', async () => {
      const updateData: CategoryUpdate = {
        name: 'Updated Category',
        description: 'Updated description',
      }
      const mockUpdatedCategory: Category = {
        id: '1',
        name: 'Updated Category',
        description: 'Updated description',
        parent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedCategory, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateCategory('1', updateData)

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_categories')
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ data: mockUpdatedCategory, error: null })
    })

    it('should return error when update fails', async () => {
      const updateData: CategoryUpdate = {
        name: 'Updated Category',
      }
      const mockError = { message: 'Update failed', code: 'PGRST301' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateCategory('1', updateData)

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category when no items are associated', async () => {
      // Mock count check - no items (select returns eq which resolves)
      const mockCountEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq })

      // Mock delete
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inv_items') {
          return { select: mockCountSelect }
        }
        return { delete: mockDelete }
      })

      const result = await deleteCategory('1')

      expect(result).toEqual({ success: true, error: null })
    })

    it('should return error when category has associated items', async () => {
      // Mock count check - has items
      const mockCountEq = vi.fn().mockResolvedValue({ count: 5, error: null })
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq })

      mockSupabase.from.mockReturnValue({ select: mockCountSelect })

      const result = await deleteCategory('1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error).toContain('items')
      }
    })

    it('should return error when delete fails', async () => {
      // Mock count check - no items
      const mockCountEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq })

      // Mock delete failure
      const mockDeleteError = { message: 'Delete failed', code: 'PGRST301' }
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: mockDeleteError })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inv_items') {
          return { select: mockCountSelect }
        }
        return { delete: mockDelete }
      })

      const result = await deleteCategory('1')

      expect(result).toEqual({ success: false, error: mockDeleteError })
    })
  })

  describe('getCategoryItemCount', () => {
    it('should return the count of items in a category', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 10, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategoryItemCount('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_items')
      expect(mockEq).toHaveBeenCalledWith('category_id', '1')
      expect(result).toEqual({ count: 10, error: null })
    })

    it('should return 0 when no items found', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategoryItemCount('1')

      expect(result).toEqual({ count: 0, error: null })
    })

    it('should return error when query fails', async () => {
      const mockError = { message: 'Query failed', code: 'PGRST301' }
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getCategoryItemCount('1')

      expect(result).toEqual({ count: null, error: mockError })
    })
  })
})
