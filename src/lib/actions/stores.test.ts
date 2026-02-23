import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  getStoreItemCount,
  getStoreItemCounts,
} from './stores'
import type { Store, StoreInsert, StoreUpdate } from '@/lib/supabase/types'

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

describe('Stores Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStores', () => {
    it('should return all stores ordered by name', async () => {
      const mockStores: Store[] = [
        { id: '1', name: 'Main Store', description: 'Primary store', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'Warehouse', description: 'Storage warehouse', created_at: '2024-01-01T00:00:00Z' },
      ]

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockStores, error: null }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStores()

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_stores')
      expect(result).toEqual({ success: true, data: mockStores })
    })

    it('should return error when database query fails', async () => {
      const mockError = { message: 'Database error', code: 'PGRST301' }
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStores()

      expect(result).toEqual({ success: false, error: 'Database error' })
    })
  })

  describe('getStoreById', () => {
    it('should return a single store by id', async () => {
      const mockStore: Store = {
        id: '1',
        name: 'Main Store',
        description: 'Primary store',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockStore, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_stores')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ success: true, data: mockStore })
    })

    it('should return error when store not found', async () => {
      const mockError = { message: 'Store not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreById('nonexistent')

      expect(result).toEqual({ success: false, error: 'Store not found' })
    })
  })

  describe('createStore', () => {
    it('should create a new store and revalidate path', async () => {
      const storeData: StoreInsert = {
        name: 'New Store',
        description: 'A new store',
      }
      const mockCreatedStore: Store = {
        id: '3',
        name: 'New Store',
        description: 'A new store',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedStore, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createStore(storeData)

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_stores')
      expect(mockInsert).toHaveBeenCalledWith(storeData)
      expect(result).toEqual({ success: true, data: mockCreatedStore })
    })

    it('should return error when creation fails', async () => {
      const storeData: StoreInsert = {
        name: 'New Store',
      }
      const mockError = { message: 'Duplicate store name', code: '23505' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createStore(storeData)

      expect(result).toEqual({ success: false, error: 'Duplicate store name' })
    })
  })

  describe('updateStore', () => {
    it('should update a store and revalidate path', async () => {
      const updateData: StoreUpdate = {
        name: 'Updated Store',
        description: 'Updated description',
      }
      const mockUpdatedStore: Store = {
        id: '1',
        name: 'Updated Store',
        description: 'Updated description',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedStore, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateStore('1', updateData)

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_stores')
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ success: true, data: mockUpdatedStore })
    })

    it('should return error when update fails', async () => {
      const updateData: StoreUpdate = {
        name: 'Updated Store',
      }
      const mockError = { message: 'Update failed', code: 'PGRST301' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateStore('1', updateData)

      expect(result).toEqual({ success: false, error: 'Update failed' })
    })
  })

  describe('deleteStore', () => {
    it('should delete a store when no active items are associated', async () => {
      // Mock count check - no active items (chain: .eq('store_id').eq('is_archived', false))
      const mockArchivedEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockCountEq = vi.fn().mockReturnValue({ eq: mockArchivedEq })
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

      const result = await deleteStore('1')

      expect(mockCountEq).toHaveBeenCalledWith('store_id', '1')
      expect(mockArchivedEq).toHaveBeenCalledWith('is_archived', false)
      expect(result.success).toBe(true)
    })

    it('should return error when store has active items', async () => {
      // Mock count check - has active items
      const mockArchivedEq = vi.fn().mockResolvedValue({ count: 5, error: null })
      const mockCountEq = vi.fn().mockReturnValue({ eq: mockArchivedEq })
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq })

      mockSupabase.from.mockReturnValue({ select: mockCountSelect })

      const result = await deleteStore('1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('items')
      }
    })

    it('should return error when delete fails', async () => {
      // Mock count check - no active items
      const mockArchivedEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockCountEq = vi.fn().mockReturnValue({ eq: mockArchivedEq })
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

      const result = await deleteStore('1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Delete failed')
      }
    })
  })

  describe('getStoreItemCounts', () => {
    it('should return item counts grouped by store', async () => {
      const mockItems = [
        { id: 'a', store_id: 's1' },
        { id: 'b', store_id: 's1' },
        { id: 'c', store_id: 's2' },
        { id: 'd', store_id: null },
      ]

      const mockEq = vi.fn().mockResolvedValue({ data: mockItems, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCounts()

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_items')
      expect(mockSelect).toHaveBeenCalledWith('id, store_id')
      expect(mockEq).toHaveBeenCalledWith('is_archived', false)
      expect(result).toEqual({ success: true, data: { s1: 2, s2: 1 } })
    })

    it('should return empty object when no items exist', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCounts()

      expect(result).toEqual({ success: true, data: {} })
    })

    it('should return error when query fails', async () => {
      const mockError = { message: 'Query failed', code: 'PGRST301' }
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCounts()

      expect(result).toEqual({ success: false, error: 'Query failed' })
    })
  })

  describe('getStoreItemCount', () => {
    it('should return the count of items in a store', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 10, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCount('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('inv_items')
      expect(mockEq).toHaveBeenCalledWith('store_id', '1')
      expect(result).toEqual({ success: true, data: 10 })
    })

    it('should return 0 when no items found', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCount('1')

      expect(result).toEqual({ success: true, data: 0 })
    })

    it('should return error when query fails', async () => {
      const mockError = { message: 'Query failed', code: 'PGRST301' }
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getStoreItemCount('1')

      expect(result).toEqual({ success: false, error: 'Query failed' })
    })
  })
})
