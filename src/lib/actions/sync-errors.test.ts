import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SyncError, SyncErrorStatus } from '@/lib/supabase/types'

// Mock data
const mockSyncError: SyncError = {
  id: 'error-123',
  user_id: 'user-1',
  transaction_data: {
    transaction_type: 'in',
    item_id: 'item-1',
    quantity: 10,
    user_id: 'user-1',
    notes: 'Test transaction',
    idempotency_key: 'idem-123',
    device_timestamp: '2024-01-15T10:00:00Z',
  },
  error_message: 'Network error',
  status: 'pending' as SyncErrorStatus,
  resolution_notes: null,
  resolved_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

// Mock Supabase query builder
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

// Reset and setup mocks before each test
beforeEach(() => {
  vi.clearAllMocks()

  // Setup chainable mock methods
  mockSelect.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockEq.mockReturnThis()
  mockGte.mockReturnThis()
  mockLte.mockReturnThis()
  mockOrder.mockReturnThis()
  mockSingle.mockReturnThis()

  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    single: mockSingle,
    order: mockOrder,
  })
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

describe('Sync Error Actions', () => {
  describe('getSyncErrors', () => {
    it('returns all sync errors when no filters', async () => {
      mockOrder.mockResolvedValue({ data: [mockSyncError], error: null })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([mockSyncError])
      }
      expect(mockFrom).toHaveBeenCalledWith('sync_errors')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('filters by status', async () => {
      mockOrder.mockReturnThis()
      mockEq.mockResolvedValue({ data: [mockSyncError], error: null })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors({ status: 'pending' })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    })

    it('filters by userId', async () => {
      mockOrder.mockReturnThis()
      mockEq.mockResolvedValue({ data: [mockSyncError], error: null })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors({ userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('filters by date range', async () => {
      mockOrder.mockReturnThis()
      mockGte.mockReturnThis()
      mockLte.mockResolvedValue({ data: [mockSyncError], error: null })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(result.success).toBe(true)
      expect(mockGte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockLte).toHaveBeenCalledWith('created_at', '2024-01-31')
    })

    it('returns empty array when no errors found', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it('handles database error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } })

      const { getSyncErrors } = await import('./sync-errors')
      const result = await getSyncErrors()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
      consoleSpy.mockRestore()
    })
  })

  describe('getSyncErrorById', () => {
    it('returns sync error by ID', async () => {
      mockSingle.mockResolvedValue({ data: mockSyncError, error: null })

      const { getSyncErrorById } = await import('./sync-errors')
      const result = await getSyncErrorById('error-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockSyncError)
      }
      expect(mockEq).toHaveBeenCalledWith('id', 'error-123')
      expect(mockSingle).toHaveBeenCalled()
    })

    it('handles not found error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const { getSyncErrorById } = await import('./sync-errors')
      const result = await getSyncErrorById('non-existent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not found')
      }
      consoleSpy.mockRestore()
    })
  })

  describe('retrySyncError', () => {
    beforeEach(() => {
      // Reset the mock chain for retry which has multiple queries
      mockFrom.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        eq: mockEq,
        single: mockSingle,
      })
    })

    it('retries transaction and marks as resolved on success', async () => {
      // First call: fetch sync error
      mockSingle.mockResolvedValueOnce({ data: mockSyncError, error: null })
      // RPC call succeeds
      mockRpc.mockResolvedValue({ error: null })
      // Update call: mark as resolved
      mockSingle.mockResolvedValueOnce({
        data: { ...mockSyncError, status: 'resolved' },
        error: null,
      })

      const { retrySyncError } = await import('./sync-errors')
      const result = await retrySyncError('error-123')

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('submit_transaction', expect.objectContaining({
        p_transaction_type: 'in',
        p_item_id: 'item-1',
        p_quantity: 10,
      }))
    })

    it('handles fetch error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const { retrySyncError } = await import('./sync-errors')
      const result = await retrySyncError('non-existent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not found')
      }
    })

    it('updates error message when retry fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      // Fetch sync error
      mockSingle.mockResolvedValueOnce({ data: mockSyncError, error: null })
      // RPC call fails
      mockRpc.mockResolvedValue({ error: { message: 'Transaction failed' } })
      // Update error message
      mockSingle.mockResolvedValueOnce({
        data: { ...mockSyncError, error_message: 'Transaction failed' },
        error: null,
      })

      const { retrySyncError } = await import('./sync-errors')
      const result = await retrySyncError('error-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Transaction failed')
      }
      consoleSpy.mockRestore()
    })
  })

  describe('dismissSyncError', () => {
    it('dismisses sync error with notes', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSyncError, status: 'dismissed', resolution_notes: 'Test dismiss' },
        error: null,
      })

      const { dismissSyncError } = await import('./sync-errors')
      const result = await dismissSyncError('error-123', 'Test dismiss')

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'dismissed',
        resolution_notes: 'Test dismiss',
      }))
    })

    it('dismisses sync error with default notes', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSyncError, status: 'dismissed', resolution_notes: 'Manually dismissed' },
        error: null,
      })

      const { dismissSyncError } = await import('./sync-errors')
      const result = await dismissSyncError('error-123')

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'dismissed',
        resolution_notes: 'Manually dismissed',
      }))
    })

    it('handles error during dismiss', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      const { dismissSyncError } = await import('./sync-errors')
      const result = await dismissSyncError('error-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Update failed')
      }
      consoleSpy.mockRestore()
    })
  })

  describe('updateSyncError', () => {
    it('updates sync error with provided data', async () => {
      const updatedError = { ...mockSyncError, error_message: 'Updated message' }
      mockSingle.mockResolvedValue({ data: updatedError, error: null })

      const { updateSyncError } = await import('./sync-errors')
      const result = await updateSyncError('error-123', { error_message: 'Updated message' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.error_message).toBe('Updated message')
      }
      expect(mockEq).toHaveBeenCalledWith('id', 'error-123')
    })

    it('handles update error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      const { updateSyncError } = await import('./sync-errors')
      const result = await updateSyncError('error-123', { status: 'resolved' as SyncErrorStatus })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Update failed')
      }
      consoleSpy.mockRestore()
    })
  })

  describe('getPendingSyncErrorCount', () => {
    it('returns count of pending errors', async () => {
      mockEq.mockResolvedValue({ count: 5, error: null })

      const { getPendingSyncErrorCount } = await import('./sync-errors')
      const result = await getPendingSyncErrorCount()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(5)
      }
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true })
      expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    })

    it('returns 0 when no pending errors', async () => {
      mockEq.mockResolvedValue({ count: 0, error: null })

      const { getPendingSyncErrorCount } = await import('./sync-errors')
      const result = await getPendingSyncErrorCount()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(0)
      }
    })

    it('returns 0 when count is null', async () => {
      mockEq.mockResolvedValue({ count: null, error: null })

      const { getPendingSyncErrorCount } = await import('./sync-errors')
      const result = await getPendingSyncErrorCount()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(0)
      }
    })

    it('handles count error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockEq.mockResolvedValue({ count: null, error: { message: 'Count failed' } })

      const { getPendingSyncErrorCount } = await import('./sync-errors')
      const result = await getPendingSyncErrorCount()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Count failed')
      }
      consoleSpy.mockRestore()
    })
  })
})
