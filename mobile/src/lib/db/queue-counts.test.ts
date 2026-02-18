import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import { getAllQueueCounts } from './queue-counts'
import { addToQueue } from './transaction-queue'
import { addItemCreateToQueue } from './item-create-queue'
import { addItemEditToQueue } from './item-edit-queue'
import { addItemArchiveToQueue } from './item-archive-queue'
import { addPendingImage } from './pending-images'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('queue-counts', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---- getAllQueueCounts ----

  describe('getAllQueueCounts', () => {
    it('returns all zeros when all queues are empty', () => {
      const counts = getAllQueueCounts(db)

      expect(counts.creates).toBe(0)
      expect(counts.edits).toBe(0)
      expect(counts.archives).toBe(0)
      expect(counts.images).toBe(0)
      expect(counts.transactions).toBe(0)
    })

    it('returns correct count for transactions', () => {
      addToQueue(db, {
        id: 'tx-1',
        transactionType: 'check_in',
        itemId: 'item-1',
        quantity: 10,
        deviceTimestamp: '2024-06-15T12:00:00Z',
        idempotencyKey: 'idem-1',
        userId: 'user-1',
        domain: 'commissary',
      })
      addToQueue(db, {
        id: 'tx-2',
        transactionType: 'check_out',
        itemId: 'item-2',
        quantity: 5,
        deviceTimestamp: '2024-06-15T12:01:00Z',
        idempotencyKey: 'idem-2',
        userId: 'user-1',
        domain: 'commissary',
      })

      const counts = getAllQueueCounts(db)
      expect(counts.transactions).toBe(2)
      expect(counts.creates).toBe(0)
      expect(counts.edits).toBe(0)
      expect(counts.archives).toBe(0)
      expect(counts.images).toBe(0)
    })

    it('returns correct count for creates', () => {
      addItemCreateToQueue(db, { name: 'New Item 1' }, 'user-1')
      addItemCreateToQueue(db, { name: 'New Item 2' }, 'user-1')
      addItemCreateToQueue(db, { name: 'New Item 3' }, 'user-1')

      const counts = getAllQueueCounts(db)
      expect(counts.creates).toBe(3)
    })

    it('returns correct count for edits', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Edited' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2024-06-15T10:00:00Z',
      })

      const counts = getAllQueueCounts(db)
      expect(counts.edits).toBe(1)
    })

    it('returns correct count for archives', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 2, 'user-1')

      const counts = getAllQueueCounts(db)
      expect(counts.archives).toBe(2)
    })

    it('returns correct count for images', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)

      const counts = getAllQueueCounts(db)
      expect(counts.images).toBe(2)
    })

    it('returns correct counts for all 5 queues simultaneously', () => {
      // 2 transactions
      addToQueue(db, {
        id: 'tx-1',
        transactionType: 'check_in',
        itemId: 'item-1',
        quantity: 10,
        deviceTimestamp: '2024-06-15T12:00:00Z',
        idempotencyKey: 'idem-1',
        userId: 'user-1',
      })
      addToQueue(db, {
        id: 'tx-2',
        transactionType: 'check_out',
        itemId: 'item-2',
        quantity: 5,
        deviceTimestamp: '2024-06-15T12:01:00Z',
        idempotencyKey: 'idem-2',
        userId: 'user-1',
      })

      // 3 creates
      addItemCreateToQueue(db, { name: 'Create 1' }, 'user-1')
      addItemCreateToQueue(db, { name: 'Create 2' }, 'user-1')
      addItemCreateToQueue(db, { name: 'Create 3' }, 'user-1')

      // 1 edit
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Edited' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2024-06-15T10:00:00Z',
      })

      // 4 archives
      addItemArchiveToQueue(db, 'item-a', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-b', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-c', 'restore', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-d', 'archive', 1, 'user-1')

      // 2 images
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')

      const counts = getAllQueueCounts(db)
      expect(counts.transactions).toBe(2)
      expect(counts.creates).toBe(3)
      expect(counts.edits).toBe(1)
      expect(counts.archives).toBe(4)
      expect(counts.images).toBe(2)
    })
  })
})
