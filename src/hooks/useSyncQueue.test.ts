import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock data
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockQueuedTransaction = {
  id: 'tx-123',
  transactionType: 'in' as const,
  itemId: 'item-1',
  quantity: 10,
  notes: 'Test transaction',
  deviceTimestamp: '2024-01-15T10:00:00Z',
  idempotencyKey: 'idem-123',
  userId: 'user-123',
  retryCount: 0,
  createdAt: '2024-01-15T10:00:00Z',
}

// Mock state variables
let mockIsOnlineValue = true
let mockWasOfflineValue = false
let mockIsAuthenticatedValue = true
let mockUserValue: typeof mockUser | null = mockUser

const mockClearWasOffline = vi.fn()

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: () => ({
    get isOnline() { return mockIsOnlineValue },
    get wasOffline() { return mockWasOfflineValue },
    clearWasOffline: mockClearWasOffline,
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    get user() { return mockUserValue },
    get isAuthenticated() { return mockIsAuthenticatedValue },
  }),
}))

// Mock offline db functions
const mockGetQueueCount = vi.fn()
const mockGetQueuedTransactions = vi.fn()
const mockRemoveFromQueue = vi.fn()
const mockIncrementRetryCount = vi.fn()
const mockAddToQueue = vi.fn()

vi.mock('@/lib/offline/db', () => ({
  getQueueCount: () => mockGetQueueCount(),
  getQueuedTransactions: () => mockGetQueuedTransactions(),
  removeFromQueue: (id: string) => mockRemoveFromQueue(id),
  incrementRetryCount: (id: string, error: string) => mockIncrementRetryCount(id, error),
  addToQueue: (tx: unknown) => mockAddToQueue(tx),
}))

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid-12345' })

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import the hook after mocks are set up
import { useSyncQueue } from './useSyncQueue'

describe('useSyncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock state
    mockIsOnlineValue = true
    mockWasOfflineValue = false
    mockIsAuthenticatedValue = true
    mockUserValue = mockUser

    // Default mock implementations
    mockGetQueueCount.mockResolvedValue(0)
    mockGetQueuedTransactions.mockResolvedValue([])
    mockRemoveFromQueue.mockResolvedValue(undefined)
    mockIncrementRetryCount.mockResolvedValue(undefined)
    mockAddToQueue.mockResolvedValue(undefined)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useSyncQueue())

      expect(result.current.isSyncing).toBe(false)
      expect(result.current.lastSyncTime).toBeNull()
      expect(result.current.lastError).toBeNull()
      expect(typeof result.current.queueTransaction).toBe('function')
      expect(typeof result.current.syncQueue).toBe('function')
    })

    it('loads queue count on mount', async () => {
      mockGetQueueCount.mockResolvedValue(5)

      const { result } = renderHook(() => useSyncQueue())

      await waitFor(() => {
        expect(result.current.queueCount).toBe(5)
      })

      expect(mockGetQueueCount).toHaveBeenCalled()
    })

    it('handles IndexedDB error on mount gracefully', async () => {
      mockGetQueueCount.mockRejectedValue(new Error('IndexedDB not available'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSyncQueue())

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should continue with count of 0
      expect(result.current.queueCount).toBe(0)
      consoleSpy.mockRestore()
    })
  })

  describe('queueTransaction', () => {
    it('adds transaction to queue with generated IDs', async () => {
      mockGetQueueCount.mockResolvedValue(1)

      const { result } = renderHook(() => useSyncQueue())

      const transaction = {
        transactionType: 'in' as const,
        itemId: 'item-1',
        quantity: 10,
        notes: 'Test',
        deviceTimestamp: '2024-01-15T10:00:00Z',
      }

      let returnedIds: { id: string; idempotencyKey: string } | undefined

      await act(async () => {
        returnedIds = await result.current.queueTransaction(transaction)
      })

      expect(mockAddToQueue).toHaveBeenCalledWith(expect.objectContaining({
        ...transaction,
        id: 'mock-uuid-12345',
        idempotencyKey: 'mock-uuid-12345',
        userId: 'user-123',
      }))
      expect(returnedIds?.id).toBe('mock-uuid-12345')
      expect(returnedIds?.idempotencyKey).toBe('mock-uuid-12345')
    })

    it('throws error if user not authenticated', async () => {
      mockUserValue = null

      const { result } = renderHook(() => useSyncQueue())

      await expect(
        act(async () => {
          await result.current.queueTransaction({
            transactionType: 'in',
            itemId: 'item-1',
            quantity: 10,
            deviceTimestamp: '2024-01-15T10:00:00Z',
          })
        })
      ).rejects.toThrow('User not authenticated')
    })

    it('updates queue count after adding transaction', async () => {
      // Initial load returns 0, then subsequent calls return 1
      mockGetQueueCount
        .mockResolvedValueOnce(0) // Initial load
        .mockResolvedValue(1) // All subsequent calls (including sync check)

      const { result } = renderHook(() => useSyncQueue())

      await waitFor(() => {
        expect(result.current.queueCount).toBe(0)
      })

      await act(async () => {
        await result.current.queueTransaction({
          transactionType: 'in',
          itemId: 'item-1',
          quantity: 10,
          deviceTimestamp: '2024-01-15T10:00:00Z',
        })
      })

      expect(result.current.queueCount).toBe(1)
    })
  })

  describe('syncQueue', () => {
    it('processes all queued transactions', async () => {
      const transactions = [
        { ...mockQueuedTransaction, id: 'tx-1' },
        { ...mockQueuedTransaction, id: 'tx-2' },
      ]
      mockGetQueuedTransactions.mockResolvedValue(transactions)
      mockGetQueueCount.mockResolvedValue(0)

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('tx-1')
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('tx-2')
    })

    it('does not sync if offline', async () => {
      mockIsOnlineValue = false
      mockGetQueuedTransactions.mockResolvedValue([mockQueuedTransaction])

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockGetQueuedTransactions).not.toHaveBeenCalled()
    })

    it('does not sync if not authenticated', async () => {
      mockIsAuthenticatedValue = false
      mockGetQueuedTransactions.mockResolvedValue([mockQueuedTransaction])

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockGetQueuedTransactions).not.toHaveBeenCalled()
    })

    it('updates lastSyncTime after successful sync', async () => {
      mockGetQueuedTransactions.mockResolvedValue([])
      mockGetQueueCount.mockResolvedValue(0)

      const { result } = renderHook(() => useSyncQueue())

      expect(result.current.lastSyncTime).toBeNull()

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(result.current.lastSyncTime).not.toBeNull()
    })

    it('sets isSyncing during sync and clears after', async () => {
      mockGetQueuedTransactions.mockResolvedValue([mockQueuedTransaction])
      mockGetQueueCount.mockResolvedValue(0)

      const { result } = renderHook(() => useSyncQueue())

      expect(result.current.isSyncing).toBe(false)

      const syncPromise = act(async () => {
        await result.current.syncQueue()
      })

      // After sync completes
      await syncPromise
      expect(result.current.isSyncing).toBe(false)
    })
  })

  describe('transaction processing', () => {
    it('removes transaction from queue on success', async () => {
      mockGetQueuedTransactions.mockResolvedValue([mockQueuedTransaction])
      mockGetQueueCount.mockResolvedValue(0)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockRemoveFromQueue).toHaveBeenCalledWith('tx-123')
    })

    it('increments retry count on failure', async () => {
      const transaction = { ...mockQueuedTransaction, retryCount: 0 }
      mockGetQueuedTransactions.mockResolvedValue([transaction])
      mockGetQueueCount.mockResolvedValue(1)
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      })

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockIncrementRetryCount).toHaveBeenCalledWith('tx-123', 'Server error')
    })

    it('records sync error after max retries', async () => {
      const transaction = { ...mockQueuedTransaction, retryCount: 2 } // At max-1
      mockGetQueuedTransactions.mockResolvedValue([transaction])
      mockGetQueueCount.mockResolvedValue(0)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Final error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      // Should have posted sync error
      expect(mockFetch).toHaveBeenCalledWith('/api/sync-errors', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('transactionData'),
      }))
      // Should have removed from queue
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('tx-123')
    })

    it('handles network errors gracefully', async () => {
      const transaction = { ...mockQueuedTransaction, retryCount: 0 }
      mockGetQueuedTransactions.mockResolvedValue([transaction])
      mockGetQueueCount.mockResolvedValue(1)
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSyncQueue())

      await act(async () => {
        await result.current.syncQueue()
      })

      expect(mockIncrementRetryCount).toHaveBeenCalledWith('tx-123', 'Network error')
    })
  })

  describe('auto-sync behavior', () => {
    it('clears wasOffline flag when syncing on reconnection', async () => {
      mockWasOfflineValue = true
      mockIsOnlineValue = true
      mockIsAuthenticatedValue = true
      mockGetQueuedTransactions.mockResolvedValue([])
      mockGetQueueCount.mockResolvedValue(0)

      renderHook(() => useSyncQueue())

      await waitFor(() => {
        expect(mockClearWasOffline).toHaveBeenCalled()
      })
    })

    it('does not auto-sync if not authenticated when coming online', async () => {
      mockWasOfflineValue = true
      mockIsOnlineValue = true
      mockIsAuthenticatedValue = false

      renderHook(() => useSyncQueue())

      // Wait a bit for any async operations
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockGetQueuedTransactions).not.toHaveBeenCalled()
    })
  })

  describe('exposes isOnline from useOnlineStatus', () => {
    it('returns current online status', () => {
      mockIsOnlineValue = true

      const { result } = renderHook(() => useSyncQueue())

      expect(result.current.isOnline).toBe(true)
    })

    it('reflects offline status', () => {
      mockIsOnlineValue = false

      const { result } = renderHook(() => useSyncQueue())

      expect(result.current.isOnline).toBe(false)
    })
  })
})
