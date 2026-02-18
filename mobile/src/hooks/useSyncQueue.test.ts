import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockAddToQueue = vi.fn()
const mockGetQueuedTransactions = vi.fn(() => [])
const mockGetQueueCount = vi.fn(() => 0)
const mockRemoveFromQueue = vi.fn()
const mockIncrementRetryCount = vi.fn()

vi.mock('@/lib/db/transaction-queue', () => ({
  addToQueue: (...args: unknown[]) => mockAddToQueue(...args),
  getQueuedTransactions: (...args: unknown[]) => mockGetQueuedTransactions(...args),
  getQueueCount: (...args: unknown[]) => mockGetQueueCount(...args),
  removeFromQueue: (...args: unknown[]) => mockRemoveFromQueue(...args),
  incrementRetryCount: (...args: unknown[]) => mockIncrementRetryCount(...args),
}))

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 8)),
}))

const mockRpc = vi.fn()
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSupabaseFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockSupabaseFrom,
  }),
}))

vi.mock('@/lib/domain-config', () => ({
  DOMAIN_CONFIGS: {
    commissary: {
      id: 'commissary',
      rpcSubmitTransaction: 'submit_cm_transaction',
      transactionDomain: 'commissary',
    },
    'frozen-goods': {
      id: 'frozen-goods',
      rpcSubmitTransaction: 'submit_fg_transaction',
      transactionDomain: 'frozen-goods',
    },
  },
}))

vi.mock('@/lib/constants', () => ({
  MAX_RETRY_COUNT: 3,
  SYNC_INTERVAL_MS: 30000,
  TRANSACTION_TIMEOUT_MS: 60000,
}))

import { createSyncQueueManager, type SyncQueueState } from './useSyncQueue'
import type { DomainId } from '@/lib/domain-config'

// --- Tests ---

describe('createSyncQueueManager', () => {
  let state: SyncQueueState
  let setState: (partial: Partial<SyncQueueState>) => void
  let getState: () => SyncQueueState
  const fakeDb = {}

  beforeEach(() => {
    vi.clearAllMocks()
    state = { queueCount: 0, isSyncing: false, lastSyncTime: null, lastError: null }
    setState = (partial) => { state = { ...state, ...partial } }
    getState = () => state
    mockGetQueueCount.mockReturnValue(0)
    mockGetQueuedTransactions.mockReturnValue([])
    mockRpc.mockResolvedValue({ error: null })
  })

  // --- refreshCount ---

  describe('refreshCount', () => {
    it('reads queue count from db', () => {
      mockGetQueueCount.mockReturnValue(5)
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      manager.refreshCount()
      expect(state.queueCount).toBe(5)
    })

    it('handles db errors gracefully', () => {
      mockGetQueueCount.mockImplementation(() => { throw new Error('DB error') })
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      expect(() => manager.refreshCount()).not.toThrow()
    })
  })

  // --- queueTransaction ---

  describe('queueTransaction', () => {
    it('generates UUID and adds to queue', () => {
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', false, setState, getState)
      const id = manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 5,
      })

      expect(id).toMatch(/^mock-uuid-/)
      expect(mockAddToQueue).toHaveBeenCalledWith(
        fakeDb,
        expect.objectContaining({
          transactionType: 'in',
          itemId: 'item-1',
          quantity: 5,
          userId: 'user-1',
          domain: 'commissary',
        })
      )
    })

    it('throws when user not authenticated', () => {
      const manager = createSyncQueueManager(fakeDb, null, 'commissary', true, setState, getState)
      expect(() => manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 1,
      })).toThrow('User not authenticated')
    })

    it('throws when no domain selected', () => {
      const manager = createSyncQueueManager(fakeDb, 'user-1', null, true, setState, getState)
      expect(() => manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 1,
      })).toThrow('No domain selected')
    })

    it('triggers sync when online', async () => {
      mockGetQueuedTransactions.mockReturnValue([])
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 1,
      })

      // Give the async sync a tick to start
      await new Promise(r => setTimeout(r, 10))
      // syncQueue was called (even if no items to process after queueing)
      expect(state.isSyncing || state.lastSyncTime !== null || mockGetQueuedTransactions.mock.calls.length > 0).toBe(true)
    })

    it('does not trigger sync when offline', () => {
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', false, setState, getState)
      manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 1,
      })

      // syncQueue should not have been called - isSyncing should remain false
      expect(state.isSyncing).toBe(false)
    })

    it('refreshes count after queueing', () => {
      mockGetQueueCount.mockReturnValue(3)
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', false, setState, getState)
      manager.queueTransaction({
        transactionType: 'out',
        itemId: 'item-2',
        quantity: 2,
      })
      expect(state.queueCount).toBe(3)
    })

    it('passes optional fields', () => {
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', false, setState, getState)
      manager.queueTransaction({
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 1,
        notes: 'test notes',
        sourceLocationId: 'loc-a',
        destinationLocationId: 'loc-b',
      })

      expect(mockAddToQueue).toHaveBeenCalledWith(
        fakeDb,
        expect.objectContaining({
          notes: 'test notes',
          sourceLocationId: 'loc-a',
          destinationLocationId: 'loc-b',
        })
      )
    })
  })

  // --- syncQueue ---

  describe('syncQueue', () => {
    it('processes FIFO and removes on success', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-1', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
        {
          id: 'tx-2', transactionType: 'out', itemId: 'i-2', quantity: 2,
          notes: '', idempotencyKey: 'k-2', deviceTimestamp: '2024-01-01T01:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'frozen-goods',
        },
      ])
      mockRpc.mockResolvedValue({ error: null })

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockRemoveFromQueue).toHaveBeenCalledTimes(2)
      expect(mockRemoveFromQueue).toHaveBeenCalledWith(fakeDb, 'tx-1')
      expect(mockRemoveFromQueue).toHaveBeenCalledWith(fakeDb, 'tx-2')
      expect(state.isSyncing).toBe(false)
      expect(state.lastSyncTime).not.toBeNull()
      expect(state.lastError).toBeNull()
    })

    it('increments retry count on failure', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-fail', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
      ])
      mockRpc.mockResolvedValue({ error: { message: 'Server error' } })

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockIncrementRetryCount).toHaveBeenCalledWith(fakeDb, 'tx-fail', 'Server error')
      expect(mockRemoveFromQueue).not.toHaveBeenCalled()
    })

    it('moves to sync_errors after MAX_RETRY_COUNT', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-maxed', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 2, domain: 'commissary', // retryCount 2 + 1 = 3 >= MAX_RETRY_COUNT
        },
      ])
      mockRpc.mockResolvedValue({ error: { message: 'Still failing' } })

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      // Should insert to sync_errors
      expect(mockSupabaseFrom).toHaveBeenCalledWith('inv_sync_errors')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Still failing',
          user_id: 'user-1',
        })
      )
      // Should remove from queue
      expect(mockRemoveFromQueue).toHaveBeenCalledWith(fakeDb, 'tx-maxed')
    })

    it('skips when offline', async () => {
      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', false, setState, getState)
      await manager.syncQueue()

      expect(mockGetQueuedTransactions).not.toHaveBeenCalled()
      expect(state.isSyncing).toBe(false)
    })

    it('skips when no userId', async () => {
      const manager = createSyncQueueManager(fakeDb, null, 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockGetQueuedTransactions).not.toHaveBeenCalled()
    })

    it('sets isSyncing=true during sync', async () => {
      let syncingDuringProcess = false
      const trackSetState = (partial: Partial<SyncQueueState>) => {
        state = { ...state, ...partial }
        if (partial.isSyncing === true) syncingDuringProcess = true
      }
      mockGetQueuedTransactions.mockReturnValue([])

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, trackSetState, getState)
      await manager.syncQueue()

      expect(syncingDuringProcess).toBe(true)
      expect(state.isSyncing).toBe(false)
    })

    it('handles empty queue gracefully', async () => {
      mockGetQueuedTransactions.mockReturnValue([])

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockRpc).not.toHaveBeenCalled()
      expect(state.isSyncing).toBe(false)
      expect(state.lastSyncTime).not.toBeNull()
    })

    it('reentrant guard prevents concurrent syncs', async () => {
      let rpcCallCount = 0
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-1', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
      ])
      mockRpc.mockImplementation(async () => {
        rpcCallCount++
        await new Promise(r => setTimeout(r, 50))
        return { error: null }
      })

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)

      // Start two syncs concurrently
      const p1 = manager.syncQueue()
      const p2 = manager.syncQueue() // Should be no-op due to lock

      await Promise.all([p1, p2])

      // RPC should only be called once (second sync was blocked)
      expect(rpcCallCount).toBe(1)
    })

    it('handles exception during RPC call', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-err', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
      ])
      mockRpc.mockRejectedValue(new Error('Network failure'))

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockIncrementRetryCount).toHaveBeenCalledWith(fakeDb, 'tx-err', 'Network failure')
    })

    it('passes abort signal to RPC', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-sig', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
      ])
      mockRpc.mockResolvedValue({ error: null })

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      // Verify rpc was called with 3 args (name, params, options with signal)
      expect(mockRpc).toHaveBeenCalledWith(
        'submit_cm_transaction',
        expect.objectContaining({ p_id: 'tx-sig' }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('skips transaction with unknown domain config', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-unk', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'nonexistent',
        },
      ])

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('refreshes count after sync completes', async () => {
      mockGetQueuedTransactions.mockReturnValue([
        {
          id: 'tx-ref', transactionType: 'in', itemId: 'i-1', quantity: 1,
          notes: '', idempotencyKey: 'k-1', deviceTimestamp: '2024-01-01T00:00:00Z',
          userId: 'user-1', retryCount: 0, domain: 'commissary',
        },
      ])
      mockRpc.mockResolvedValue({ error: null })
      mockGetQueueCount.mockReturnValue(0)

      const manager = createSyncQueueManager(fakeDb, 'user-1', 'commissary', true, setState, getState)
      await manager.syncQueue()

      // refreshCount is called after processing transactions
      expect(mockGetQueueCount).toHaveBeenCalled()
    })
  })
})
