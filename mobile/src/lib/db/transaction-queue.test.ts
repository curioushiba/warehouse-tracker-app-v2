import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  addToQueue,
  getQueuedTransactions,
  getQueueCount,
  removeFromQueue,
  incrementRetryCount,
  clearQueue,
  getTransactionsByDomain,
} from './transaction-queue'
import type { QueuedTransaction } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

function makeTx(overrides: Partial<QueuedTransaction> = {}): Omit<QueuedTransaction, 'retryCount' | 'lastError' | 'createdAt'> {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 8),
    transactionType: 'check_in',
    itemId: 'item-1',
    quantity: 10,
    notes: 'test note',
    deviceTimestamp: '2024-06-15T12:00:00Z',
    idempotencyKey: 'idem-' + Math.random().toString(36).slice(2, 8),
    userId: 'user-1',
    domain: 'commissary',
    ...overrides,
  }
}

describe('transaction-queue', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---- addToQueue ----

  describe('addToQueue', () => {
    it('inserts a transaction into the queue', () => {
      const tx = makeTx({ id: 'tx-add-1' })
      addToQueue(db, tx)

      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT * FROM transaction_queue WHERE id = ?',
        'tx-add-1'
      )
      expect(row).not.toBeNull()
      expect(row!.id).toBe('tx-add-1')
      expect(row!.transaction_type).toBe('check_in')
      expect(row!.item_id).toBe('item-1')
      expect(row!.quantity).toBe(10)
    })

    it('sets retryCount to 0', () => {
      const tx = makeTx({ id: 'tx-retry-0' })
      addToQueue(db, tx)

      const row = db.getFirstSync<{ retry_count: number }>(
        'SELECT retry_count FROM transaction_queue WHERE id = ?',
        'tx-retry-0'
      )
      expect(row!.retry_count).toBe(0)
    })

    it('stores the createdAt timestamp', () => {
      const tx = makeTx({ id: 'tx-time-1' })
      addToQueue(db, tx)

      const row = db.getFirstSync<{ created_at: string }>(
        'SELECT created_at FROM transaction_queue WHERE id = ?',
        'tx-time-1'
      )
      expect(row).not.toBeNull()
      expect(row!.created_at).toBeTruthy()
      // Should be a valid ISO string
      expect(() => new Date(row!.created_at)).not.toThrow()
    })

    it('stores the domain field', () => {
      const tx = makeTx({ id: 'tx-domain-1', domain: 'frozen-goods' })
      addToQueue(db, tx)

      const row = db.getFirstSync<{ domain: string }>(
        'SELECT domain FROM transaction_queue WHERE id = ?',
        'tx-domain-1'
      )
      expect(row!.domain).toBe('frozen-goods')
    })

    it('stores optional fields (notes, sourceLocationId, destinationLocationId)', () => {
      const tx = makeTx({
        id: 'tx-opts-1',
        notes: 'received from supplier',
        sourceLocationId: 'loc-src',
        destinationLocationId: 'loc-dst',
      })
      addToQueue(db, tx)

      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT notes, source_location_id, destination_location_id FROM transaction_queue WHERE id = ?',
        'tx-opts-1'
      )
      expect(row!.notes).toBe('received from supplier')
      expect(row!.source_location_id).toBe('loc-src')
      expect(row!.destination_location_id).toBe('loc-dst')
    })

    it('handles null optional fields', () => {
      const tx = makeTx({
        id: 'tx-null-1',
        notes: undefined,
        sourceLocationId: undefined,
        destinationLocationId: undefined,
        domain: undefined,
      })
      addToQueue(db, tx)

      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT notes, source_location_id, destination_location_id, domain FROM transaction_queue WHERE id = ?',
        'tx-null-1'
      )
      expect(row!.notes).toBeNull()
      expect(row!.source_location_id).toBeNull()
      expect(row!.destination_location_id).toBeNull()
      expect(row!.domain).toBeNull()
    })
  })

  // ---- getQueuedTransactions ----

  describe('getQueuedTransactions', () => {
    it('returns an empty array when queue is empty', () => {
      const result = getQueuedTransactions(db)
      expect(result).toEqual([])
    })

    it('returns all queued transactions', () => {
      addToQueue(db, makeTx({ id: 'tx-a' }))
      addToQueue(db, makeTx({ id: 'tx-b' }))
      addToQueue(db, makeTx({ id: 'tx-c' }))

      const result = getQueuedTransactions(db)
      expect(result).toHaveLength(3)
    })

    it('returns transactions ordered by created_at ASC (FIFO)', () => {
      // Insert with explicit known ordering by staggering inserts
      const tx1 = makeTx({ id: 'tx-first' })
      const tx2 = makeTx({ id: 'tx-second' })
      const tx3 = makeTx({ id: 'tx-third' })

      addToQueue(db, tx1)
      addToQueue(db, tx2)
      addToQueue(db, tx3)

      const result = getQueuedTransactions(db)
      expect(result[0].id).toBe('tx-first')
      expect(result[1].id).toBe('tx-second')
      expect(result[2].id).toBe('tx-third')
    })

    it('returns QueuedTransaction objects with correct field mapping', () => {
      addToQueue(db, makeTx({
        id: 'tx-map-1',
        transactionType: 'check_out',
        itemId: 'item-42',
        quantity: 5.5,
        notes: 'test',
        deviceTimestamp: '2024-06-15T14:00:00Z',
        idempotencyKey: 'idem-map-1',
        userId: 'user-42',
        domain: 'commissary',
      }))

      const result = getQueuedTransactions(db)
      expect(result).toHaveLength(1)

      const tx = result[0]
      expect(tx.id).toBe('tx-map-1')
      expect(tx.transactionType).toBe('check_out')
      expect(tx.itemId).toBe('item-42')
      expect(tx.quantity).toBe(5.5)
      expect(tx.notes).toBe('test')
      expect(tx.idempotencyKey).toBe('idem-map-1')
      expect(tx.userId).toBe('user-42')
      expect(tx.retryCount).toBe(0)
      expect(tx.domain).toBe('commissary')
    })
  })

  // ---- getQueueCount ----

  describe('getQueueCount', () => {
    it('returns 0 when queue is empty', () => {
      expect(getQueueCount(db)).toBe(0)
    })

    it('returns the correct count', () => {
      addToQueue(db, makeTx({ id: 'tx-c1' }))
      addToQueue(db, makeTx({ id: 'tx-c2' }))
      addToQueue(db, makeTx({ id: 'tx-c3' }))

      expect(getQueueCount(db)).toBe(3)
    })

    it('updates count after removal', () => {
      addToQueue(db, makeTx({ id: 'tx-c4' }))
      addToQueue(db, makeTx({ id: 'tx-c5' }))
      removeFromQueue(db, 'tx-c4')

      expect(getQueueCount(db)).toBe(1)
    })
  })

  // ---- removeFromQueue ----

  describe('removeFromQueue', () => {
    it('deletes a transaction by id', () => {
      addToQueue(db, makeTx({ id: 'tx-del-1' }))
      addToQueue(db, makeTx({ id: 'tx-del-2' }))

      removeFromQueue(db, 'tx-del-1')

      const remaining = getQueuedTransactions(db)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('tx-del-2')
    })

    it('is a no-op for a non-existent id', () => {
      addToQueue(db, makeTx({ id: 'tx-exists' }))

      expect(() => removeFromQueue(db, 'tx-does-not-exist')).not.toThrow()
      expect(getQueueCount(db)).toBe(1)
    })
  })

  // ---- incrementRetryCount ----

  describe('incrementRetryCount', () => {
    it('increments the retry count by 1', () => {
      addToQueue(db, makeTx({ id: 'tx-retry-1' }))

      incrementRetryCount(db, 'tx-retry-1', 'Network error')

      const row = db.getFirstSync<{ retry_count: number }>(
        'SELECT retry_count FROM transaction_queue WHERE id = ?',
        'tx-retry-1'
      )
      expect(row!.retry_count).toBe(1)
    })

    it('stores the error message', () => {
      addToQueue(db, makeTx({ id: 'tx-err-1' }))

      incrementRetryCount(db, 'tx-err-1', 'Timeout error')

      const row = db.getFirstSync<{ last_error: string }>(
        'SELECT last_error FROM transaction_queue WHERE id = ?',
        'tx-err-1'
      )
      expect(row!.last_error).toBe('Timeout error')
    })

    it('increments multiple times', () => {
      addToQueue(db, makeTx({ id: 'tx-multi-retry' }))

      incrementRetryCount(db, 'tx-multi-retry', 'Error 1')
      incrementRetryCount(db, 'tx-multi-retry', 'Error 2')
      incrementRetryCount(db, 'tx-multi-retry', 'Error 3')

      const row = db.getFirstSync<{ retry_count: number; last_error: string }>(
        'SELECT retry_count, last_error FROM transaction_queue WHERE id = ?',
        'tx-multi-retry'
      )
      expect(row!.retry_count).toBe(3)
      expect(row!.last_error).toBe('Error 3')
    })

    it('overwrites the previous error message', () => {
      addToQueue(db, makeTx({ id: 'tx-overwrite' }))

      incrementRetryCount(db, 'tx-overwrite', 'First error')
      incrementRetryCount(db, 'tx-overwrite', 'Second error')

      const row = db.getFirstSync<{ last_error: string }>(
        'SELECT last_error FROM transaction_queue WHERE id = ?',
        'tx-overwrite'
      )
      expect(row!.last_error).toBe('Second error')
    })
  })

  // ---- clearQueue ----

  describe('clearQueue', () => {
    it('removes all transactions from the queue', () => {
      addToQueue(db, makeTx({ id: 'tx-clr-1' }))
      addToQueue(db, makeTx({ id: 'tx-clr-2' }))
      addToQueue(db, makeTx({ id: 'tx-clr-3' }))

      clearQueue(db)

      expect(getQueueCount(db)).toBe(0)
      expect(getQueuedTransactions(db)).toEqual([])
    })

    it('does not error when queue is already empty', () => {
      expect(() => clearQueue(db)).not.toThrow()
    })
  })

  // ---- getTransactionsByDomain ----

  describe('getTransactionsByDomain', () => {
    it('returns only transactions matching the specified domain', () => {
      addToQueue(db, makeTx({ id: 'tx-cm-1', domain: 'commissary' }))
      addToQueue(db, makeTx({ id: 'tx-fg-1', domain: 'frozen-goods' }))
      addToQueue(db, makeTx({ id: 'tx-cm-2', domain: 'commissary' }))

      const cmTxs = getTransactionsByDomain(db, 'commissary')
      expect(cmTxs).toHaveLength(2)
      expect(cmTxs.every((tx) => tx.domain === 'commissary')).toBe(true)
    })

    it('returns empty array when no transactions match the domain', () => {
      addToQueue(db, makeTx({ id: 'tx-cm-only', domain: 'commissary' }))

      const fgTxs = getTransactionsByDomain(db, 'frozen-goods')
      expect(fgTxs).toEqual([])
    })

    it('returns empty array when queue is empty', () => {
      const result = getTransactionsByDomain(db, 'commissary')
      expect(result).toEqual([])
    })

    it('returns transactions in created_at ASC order', () => {
      addToQueue(db, makeTx({ id: 'tx-d-first', domain: 'commissary' }))
      addToQueue(db, makeTx({ id: 'tx-d-second', domain: 'commissary' }))

      const result = getTransactionsByDomain(db, 'commissary')
      expect(result[0].id).toBe('tx-d-first')
      expect(result[1].id).toBe('tx-d-second')
    })
  })
})
