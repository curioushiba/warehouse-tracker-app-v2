import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTransactions,
  getTransactionById,
  getItemTransactions,
  getUserTransactions,
  submitTransaction,
  getRecentTransactions,
  getTransactionsWithDetails,
} from './transactions'
import type { Transaction, TransactionType } from '@/lib/supabase/types'

// Mock the server client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockRpc = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockIn = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}))

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Sample transaction data
const sampleTransaction: Transaction = {
  id: 'txn-1',
  transaction_type: 'check_in',
  item_id: 'item-1',
  quantity: 10,
  stock_before: 5,
  stock_after: 15,
  source_location_id: null,
  destination_location_id: 'loc-1',
  user_id: 'user-1',
  notes: 'Received shipment',
  device_timestamp: '2024-01-15T10:00:00Z',
  event_timestamp: '2024-01-15T10:00:00Z',
  server_timestamp: '2024-01-15T10:00:01Z',
  sync_status: 'synced',
  idempotency_key: 'key-1',
}

describe('transactions actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock chain
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      gte: mockGte,
      lte: mockLte,
      in: mockIn,
    })
    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
      gte: mockGte,
      lte: mockLte,
    })
    mockOrder.mockReturnValue({
      limit: mockLimit,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
    })
    mockLimit.mockReturnValue({
      eq: mockEq,
    })
    mockGte.mockReturnValue({
      lte: mockLte,
      eq: mockEq,
      order: mockOrder,
    })
    mockLte.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      gte: mockGte,
    })
    mockIn.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    })
  })

  describe('getTransactions', () => {
    it('returns all transactions when no filters provided', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(transactions)
      }
      expect(mockFrom).toHaveBeenCalledWith('inv_transactions')
    })

    it('filters by transaction type', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactions({ transactionType: 'check_in' })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('transaction_type', 'check_in')
    })

    it('filters by date range', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactions({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(result.success).toBe(true)
      expect(mockGte).toHaveBeenCalledWith('event_timestamp', '2024-01-01')
      expect(mockLte).toHaveBeenCalledWith('event_timestamp', '2024-01-31')
    })

    it('filters by item ID', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactions({ itemId: 'item-1' })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('item_id', 'item-1')
    })

    it('filters by user ID', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactions({ userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('returns error when query fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const result = await getTransactions()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getTransactionById', () => {
    it('returns transaction when found', async () => {
      mockSingle.mockResolvedValueOnce({ data: sampleTransaction, error: null })

      const result = await getTransactionById('txn-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(sampleTransaction)
      }
      expect(mockEq).toHaveBeenCalledWith('id', 'txn-1')
    })

    it('returns error when transaction not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const result = await getTransactionById('invalid-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not found')
      }
    })
  })

  describe('getItemTransactions', () => {
    it('returns transactions for a specific item', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getItemTransactions('item-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(transactions)
      }
      expect(mockEq).toHaveBeenCalledWith('item_id', 'item-1')
    })

    it('returns error when query fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } })

      const result = await getItemTransactions('item-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Query failed')
      }
    })
  })

  describe('getUserTransactions', () => {
    it('returns transactions for a specific user', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getUserTransactions('user-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(transactions)
      }
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('returns error when query fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } })

      const result = await getUserTransactions('user-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Query failed')
      }
    })
  })

  describe('submitTransaction', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
    })

    it('submits a check_in transaction successfully', async () => {
      const newTransaction = { ...sampleTransaction }
      mockRpc.mockResolvedValueOnce({ data: newTransaction, error: null })

      const result = await submitTransaction({
        transactionType: 'check_in',
        itemId: 'item-1',
        quantity: 10,
        notes: 'Received shipment',
        destinationLocationId: 'loc-1',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(newTransaction)
      }
      expect(mockRpc).toHaveBeenCalledWith('submit_transaction', expect.objectContaining({
        p_transaction_type: 'check_in',
        p_item_id: 'item-1',
        p_quantity: 10,
      }))
    })

    it('submits a check_out transaction successfully', async () => {
      const checkOutTxn = { ...sampleTransaction, transaction_type: 'check_out' as TransactionType }
      mockRpc.mockResolvedValueOnce({ data: checkOutTxn, error: null })

      const result = await submitTransaction({
        transactionType: 'check_out',
        itemId: 'item-1',
        quantity: 5,
        sourceLocationId: 'loc-1',
      })

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('submit_transaction', expect.objectContaining({
        p_transaction_type: 'check_out',
        p_quantity: 5,
      }))
    })

    it('submits a transfer transaction with source and destination', async () => {
      const transferTxn = { ...sampleTransaction, transaction_type: 'transfer' as TransactionType }
      mockRpc.mockResolvedValueOnce({ data: transferTxn, error: null })

      const result = await submitTransaction({
        transactionType: 'transfer',
        itemId: 'item-1',
        quantity: 3,
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
      })

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('submit_transaction', expect.objectContaining({
        p_transaction_type: 'transfer',
        p_source_location_id: 'loc-1',
        p_destination_location_id: 'loc-2',
      }))
    })

    it('uses idempotency key when provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: sampleTransaction, error: null })

      await submitTransaction({
        transactionType: 'check_in',
        itemId: 'item-1',
        quantity: 10,
        idempotencyKey: 'unique-key-123',
      })

      expect(mockRpc).toHaveBeenCalledWith('submit_transaction', expect.objectContaining({
        p_idempotency_key: 'unique-key-123',
      }))
    })

    it('returns error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const result = await submitTransaction({
        transactionType: 'check_in',
        itemId: 'item-1',
        quantity: 10,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not authenticated')
      }
    })

    it('returns error when RPC call fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Insufficient stock' } })

      const result = await submitTransaction({
        transactionType: 'check_out',
        itemId: 'item-1',
        quantity: 1000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Insufficient stock')
      }
    })
  })

  describe('getRecentTransactions', () => {
    it('returns recent transactions with default limit of 10', async () => {
      const transactions = [sampleTransaction]
      mockLimit.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getRecentTransactions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(transactions)
      }
      expect(mockLimit).toHaveBeenCalledWith(10)
      expect(mockOrder).toHaveBeenCalledWith('event_timestamp', { ascending: false })
    })

    it('returns recent transactions with custom limit', async () => {
      const transactions = [sampleTransaction]
      mockLimit.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getRecentTransactions(5)

      expect(result.success).toBe(true)
      expect(mockLimit).toHaveBeenCalledWith(5)
    })

    it('returns error when query fails', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } })

      const result = await getRecentTransactions()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Query failed')
      }
    })
  })

  describe('getTransactionsWithDetails', () => {
    it('should order transactions by event_timestamp descending', async () => {
      const transactions = [sampleTransaction]
      mockOrder.mockResolvedValueOnce({ data: transactions, error: null })

      const result = await getTransactionsWithDetails()

      expect(result.success).toBe(true)
      // This test verifies that transactions are ordered by event_timestamp, not server_timestamp
      // Per CLAUDE.md: "event_timestamp for reporting/analytics, server_timestamp for audit ordering"
      // UI displays should use event_timestamp for chronological user-facing ordering
      expect(mockOrder).toHaveBeenCalledWith('event_timestamp', { ascending: false })
    })
  })
})
