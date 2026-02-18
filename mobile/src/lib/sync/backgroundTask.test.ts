import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock url-polyfill before importing the module
vi.mock('react-native-url-polyfill/auto', () => ({}))

// Mock expo-sqlite
const mockGetQueuedTransactions = vi.fn(() => [])
const mockRemoveFromQueue = vi.fn()
const mockIncrementRetryCount = vi.fn()

vi.mock('@/lib/db/transaction-queue', () => ({
  getQueuedTransactions: (...args: unknown[]) => mockGetQueuedTransactions(...args),
  removeFromQueue: (...args: unknown[]) => mockRemoveFromQueue(...args),
  incrementRetryCount: (...args: unknown[]) => mockIncrementRetryCount(...args),
}))

const mockRpc = vi.fn()
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}))

const mockGetSessionToken = vi.fn(() => Promise.resolve('valid-token' as string | undefined))
vi.mock('@/lib/storage/storage', () => ({
  getSessionToken: (...args: unknown[]) => mockGetSessionToken(...args),
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

import {
  BACKGROUND_SYNC_TASK,
  processBackgroundSync,
  type BackgroundSyncResult,
} from './backgroundTask'

describe('backgroundTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionToken.mockResolvedValue('valid-token')
    mockGetQueuedTransactions.mockReturnValue([])
    mockRpc.mockResolvedValue({ error: null })
  })

  it('exports BACKGROUND_SYNC_TASK constant', () => {
    expect(BACKGROUND_SYNC_TASK).toBe('background-sync')
  })

  it('returns NoData when queue is empty', async () => {
    mockGetQueuedTransactions.mockReturnValue([])
    const result = await processBackgroundSync({} as never)
    expect(result).toBe('NoData')
  })

  it('returns NewData when transactions are processed successfully', async () => {
    mockGetQueuedTransactions.mockReturnValue([
      {
        id: 'tx-1',
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 5,
        notes: '',
        idempotencyKey: 'key-1',
        deviceTimestamp: '2024-01-01T00:00:00Z',
        userId: 'user-1',
        retryCount: 0,
        domain: 'commissary',
      },
    ])
    mockRpc.mockResolvedValue({ error: null })

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('NewData')
    expect(mockRemoveFromQueue).toHaveBeenCalledWith(expect.anything(), 'tx-1')
  })

  it('increments retry count on RPC error', async () => {
    mockGetQueuedTransactions.mockReturnValue([
      {
        id: 'tx-2',
        transactionType: 'out',
        itemId: 'item-2',
        quantity: 3,
        notes: '',
        idempotencyKey: 'key-2',
        deviceTimestamp: '2024-01-01T00:00:00Z',
        userId: 'user-1',
        retryCount: 0,
        domain: 'commissary',
      },
    ])
    mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } })

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('Failed')
    expect(mockIncrementRetryCount).toHaveBeenCalledWith(
      expect.anything(),
      'tx-2',
      'RPC failed'
    )
  })

  it('skips transactions with unknown domain', async () => {
    mockGetQueuedTransactions.mockReturnValue([
      {
        id: 'tx-3',
        transactionType: 'in',
        itemId: 'item-3',
        quantity: 1,
        notes: '',
        idempotencyKey: 'key-3',
        deviceTimestamp: '2024-01-01T00:00:00Z',
        userId: 'user-1',
        retryCount: 0,
        domain: 'unknown-domain',
      },
    ])

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('NoData')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('handles no auth gracefully', async () => {
    mockGetSessionToken.mockResolvedValue(undefined)

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('NoData')
  })

  it('processes multiple transactions in FIFO order', async () => {
    const callOrder: string[] = []
    mockGetQueuedTransactions.mockReturnValue([
      {
        id: 'tx-a', transactionType: 'in', itemId: 'i-a', quantity: 1,
        notes: '', idempotencyKey: 'k-a', deviceTimestamp: '2024-01-01T00:00:00Z',
        userId: 'user-1', retryCount: 0, domain: 'commissary',
      },
      {
        id: 'tx-b', transactionType: 'out', itemId: 'i-b', quantity: 2,
        notes: '', idempotencyKey: 'k-b', deviceTimestamp: '2024-01-01T01:00:00Z',
        userId: 'user-1', retryCount: 0, domain: 'frozen-goods',
      },
    ])
    mockRpc.mockImplementation(async () => {
      callOrder.push('rpc')
      return { error: null }
    })
    mockRemoveFromQueue.mockImplementation((_db: unknown, id: string) => {
      callOrder.push(`remove-${id}`)
    })

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('NewData')
    expect(callOrder).toEqual(['rpc', 'remove-tx-a', 'rpc', 'remove-tx-b'])
  })

  it('returns Failed when an exception is thrown', async () => {
    mockGetQueuedTransactions.mockImplementation(() => {
      throw new Error('DB read failed')
    })

    const result = await processBackgroundSync({} as never)
    expect(result).toBe('Failed')
  })
})
