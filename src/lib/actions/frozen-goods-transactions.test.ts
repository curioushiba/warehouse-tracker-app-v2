import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase query builder
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRange = vi.fn()
const mockFrom = vi.fn()

const mockTransactions = [
  {
    id: 'tx-1',
    transaction_type: 'check_in',
    item_id: 'item-1',
    quantity: 10,
    stock_before: 40,
    stock_after: 50,
    user_id: 'user-1',
    notes: null,
    device_timestamp: '2024-01-01T10:00:00Z',
    event_timestamp: '2024-01-01T10:00:00Z',
    server_timestamp: '2024-01-01T10:00:01Z',
    sync_status: 'synced',
    idempotency_key: 'key-1',
    item: {
      name: 'Frozen Chicken',
      sku: 'FG-001000',
      unit: 'kg',
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()

  mockSelect.mockReturnThis()
  mockEq.mockReturnThis()
  mockOrder.mockReturnThis()
  mockLimit.mockReturnThis()
  mockRange.mockReturnThis()

  mockFrom.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
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

describe('Frozen Goods Transactions Server Actions', () => {
  describe('getFgEmployeeTransactionsWithItems', () => {
    it('should query fg_transactions table with item join', async () => {
      mockOrder.mockResolvedValue({ data: mockTransactions, error: null })

      const { getFgEmployeeTransactionsWithItems } = await import('./frozen-goods-transactions')
      const result = await getFgEmployeeTransactionsWithItems('user-1')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fg_transactions')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('should return error when query fails', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Query failed' } })

      const { getFgEmployeeTransactionsWithItems } = await import('./frozen-goods-transactions')
      const result = await getFgEmployeeTransactionsWithItems('user-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Query failed')
      }
    })
  })
})
