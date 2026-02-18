import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import { exportQueues, importQueues } from './backup'
import { addToQueue } from './transaction-queue'
import { addItemEditToQueue } from './item-edit-queue'
import { addItemCreateToQueue } from './item-create-queue'
import { addItemArchiveToQueue } from './item-archive-queue'
import { addPendingImage } from './pending-images'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('backup', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  describe('exportQueues', () => {
    it('returns valid JSON with schemaVersion', () => {
      const json = exportQueues(db)
      const parsed = JSON.parse(json)
      expect(parsed.schemaVersion).toBe(4)
    })

    it('exports empty tables as empty arrays', () => {
      const json = exportQueues(db)
      const parsed = JSON.parse(json)
      expect(parsed.transactionQueue).toEqual([])
      expect(parsed.itemEditQueue).toEqual([])
      expect(parsed.itemCreateQueue).toEqual([])
      expect(parsed.itemArchiveQueue).toEqual([])
      expect(parsed.pendingImages).toEqual([])
    })

    it('exports transaction queue data', () => {
      addToQueue(db, {
        id: 'tx-1',
        transactionType: 'in',
        itemId: 'item-1',
        quantity: 5,
        notes: 'test',
        sourceLocationId: '',
        destinationLocationId: '',
        deviceTimestamp: '2024-01-01T00:00:00Z',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        domain: 'commissary',
      })

      const json = exportQueues(db)
      const parsed = JSON.parse(json)
      expect(parsed.transactionQueue).toHaveLength(1)
      expect(parsed.transactionQueue[0].id).toBe('tx-1')
    })

    it('exports all queue tables', () => {
      addToQueue(db, {
        id: 'tx-1', transactionType: 'in', itemId: 'i1', quantity: 1,
        notes: '', sourceLocationId: '', destinationLocationId: '',
        deviceTimestamp: '2024-01-01T00:00:00Z', idempotencyKey: 'k1',
        userId: 'u1', domain: 'commissary',
      })

      addItemEditToQueue(db, {
        itemId: 'i1', changes: { name: 'Updated' },
        expectedVersion: 1, userId: 'u1',
        deviceTimestamp: '2024-01-01T00:00:00Z',
      })

      addItemCreateToQueue(db, { name: 'New Item', unit: 'pcs' }, 'u1')

      addItemArchiveToQueue(db, 'i1', 'archive', 1, 'u1')

      addPendingImage(db, 'i1', 'file:///test.jpg', 'test.jpg', 'image/jpeg', false)

      const json = exportQueues(db)
      const parsed = JSON.parse(json)
      expect(parsed.transactionQueue).toHaveLength(1)
      expect(parsed.itemEditQueue).toHaveLength(1)
      expect(parsed.itemCreateQueue).toHaveLength(1)
      expect(parsed.itemArchiveQueue).toHaveLength(1)
      expect(parsed.pendingImages).toHaveLength(1)
    })
  })

  describe('importQueues', () => {
    it('restores data from exported JSON', () => {
      // Add some data
      addToQueue(db, {
        id: 'tx-orig', transactionType: 'out', itemId: 'i1', quantity: 2,
        notes: '', sourceLocationId: '', destinationLocationId: '',
        deviceTimestamp: '2024-01-01T00:00:00Z', idempotencyKey: 'k-orig',
        userId: 'u1', domain: 'frozen-goods',
      })

      // Export
      const json = exportQueues(db)

      // Clear all tables
      db.runSync('DELETE FROM transaction_queue')
      const emptyCount = db.getFirstSync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transaction_queue')
      expect(emptyCount?.cnt).toBe(0)

      // Import
      importQueues(db, json)

      // Verify restored
      const restored = db.getFirstSync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transaction_queue')
      expect(restored?.cnt).toBe(1)
    })

    it('clears existing data before importing', () => {
      // Add existing data
      addToQueue(db, {
        id: 'tx-existing', transactionType: 'in', itemId: 'i1', quantity: 1,
        notes: '', sourceLocationId: '', destinationLocationId: '',
        deviceTimestamp: '2024-01-01T00:00:00Z', idempotencyKey: 'k-ex',
        userId: 'u1', domain: 'commissary',
      })

      // Import with different data
      const importData = {
        schemaVersion: 4,
        transactionQueue: [{
          id: 'tx-new', transaction_type: 'out', item_id: 'i2', quantity: 3,
          notes: null, source_location_id: null, destination_location_id: null,
          device_timestamp: '2024-01-01T00:00:00Z', idempotency_key: 'k-new',
          user_id: 'u2', retry_count: 0, last_error: null,
          created_at: '2024-01-01T00:00:00Z', domain: 'frozen-goods',
        }],
        itemEditQueue: [],
        itemCreateQueue: [],
        itemArchiveQueue: [],
        pendingImages: [],
      }

      importQueues(db, JSON.stringify(importData))

      const count = db.getFirstSync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transaction_queue')
      expect(count?.cnt).toBe(1) // Only the imported one

      const row = db.getFirstSync<{ id: string }>('SELECT id FROM transaction_queue')
      expect(row?.id).toBe('tx-new')
    })

    it('rejects invalid JSON', () => {
      expect(() => importQueues(db, 'not json')).toThrow()
    })

    it('rejects schema version mismatch', () => {
      const json = JSON.stringify({ schemaVersion: 999, transactionQueue: [] })
      expect(() => importQueues(db, json)).toThrow(/schema/i)
    })

    it('roundtrip preserves data', () => {
      addToQueue(db, {
        id: 'tx-rt', transactionType: 'in', itemId: 'i-rt', quantity: 42,
        notes: 'roundtrip', sourceLocationId: 'loc-a', destinationLocationId: 'loc-b',
        deviceTimestamp: '2024-06-15T12:00:00Z', idempotencyKey: 'k-rt',
        userId: 'u-rt', domain: 'commissary',
      })

      const exported = exportQueues(db)

      // Clear and reimport
      db.runSync('DELETE FROM transaction_queue')
      importQueues(db, exported)

      // Re-export and compare
      const reExported = exportQueues(db)
      const orig = JSON.parse(exported)
      const restored = JSON.parse(reExported)

      expect(restored.transactionQueue).toHaveLength(orig.transactionQueue.length)
      expect(restored.transactionQueue[0].id).toBe('tx-rt')
      expect(restored.transactionQueue[0].quantity).toBe(42)
      expect(restored.transactionQueue[0].notes).toBe('roundtrip')
    })
  })
})
