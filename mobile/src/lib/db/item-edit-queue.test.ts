import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  addItemEditToQueue,
  getQueuedItemEdits,
  getQueuedItemEditsByItem,
  getQueuedItemEditsByStatus,
  getItemEditQueueCount,
  updateItemEditStatus,
  removeItemEditFromQueue,
  clearItemEditQueue,
} from './item-edit-queue'
import type { QueuedItemEdit } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('item-edit-queue', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---------------------------------------------------------------------------
  // addItemEditToQueue
  // ---------------------------------------------------------------------------
  describe('addItemEditToQueue', () => {
    it('generates an id for the queued edit', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Updated Name' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('generates an idempotencyKey', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Updated Name' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.idempotencyKey).toBeDefined()
      expect(typeof result.idempotencyKey).toBe('string')
      expect(result.idempotencyKey.length).toBeGreaterThan(0)
    })

    it('generates unique ids for different edits', () => {
      const edit1 = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Name A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      const edit2 = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Name B' },
        expectedVersion: 2,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      expect(edit1.id).not.toBe(edit2.id)
      expect(edit1.idempotencyKey).not.toBe(edit2.idempotencyKey)
    })

    it('JSON-serializes the changes field', () => {
      const changes = { name: 'New Name', description: 'New Desc', min_stock: 5 }
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes,
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      // Read raw row to verify JSON serialization
      const row = db.getFirstSync(
        'SELECT changes FROM item_edit_queue WHERE item_id = ?',
        'item-1'
      ) as { changes: string } | null
      expect(row).not.toBeNull()
      expect(JSON.parse(row!.changes)).toEqual(changes)
    })

    it('sets status to pending', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Updated' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.status).toBe('pending')
    })

    it('sets retryCount to 0', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Updated' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.retryCount).toBe(0)
    })

    it('sets createdAt to a valid ISO timestamp', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Updated' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.createdAt).toBeDefined()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('stores the provided fields correctly', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-42',
        changes: { unit: 'kg' },
        expectedVersion: 3,
        userId: 'user-99',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result.itemId).toBe('item-42')
      expect(result.changes).toEqual({ unit: 'kg' })
      expect(result.expectedVersion).toBe(3)
      expect(result.userId).toBe('user-99')
      expect(result.deviceTimestamp).toBe('2026-01-15T10:00:00.000Z')
    })

    it('returns the full QueuedItemEdit object', () => {
      const result = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'Test' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      expect(result).toMatchObject({
        itemId: 'item-1',
        changes: { name: 'Test' },
        expectedVersion: 1,
        userId: 'user-1',
        status: 'pending',
        retryCount: 0,
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemEdits
  // ---------------------------------------------------------------------------
  describe('getQueuedItemEdits', () => {
    it('returns empty array when queue is empty', () => {
      const result = getQueuedItemEdits(db)
      expect(result).toEqual([])
    })

    it('returns all queued edits', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      const result = getQueuedItemEdits(db)
      expect(result).toHaveLength(2)
    })

    it('returns edits ordered by created_at ASC', () => {
      // Insert in reverse order but with explicit timestamps so we can verify ordering
      const edit1 = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'First' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      const edit2 = addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'Second' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      const result = getQueuedItemEdits(db)
      expect(result[0].id).toBe(edit1.id)
      expect(result[1].id).toBe(edit2.id)
    })

    it('deserializes JSON changes back to object', () => {
      const changes = { name: 'Updated', description: 'New desc', min_stock: 10 }
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes,
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      const result = getQueuedItemEdits(db)
      expect(result[0].changes).toEqual(changes)
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemEditsByItem
  // ---------------------------------------------------------------------------
  describe('getQueuedItemEditsByItem', () => {
    it('returns empty array when no edits for item', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      const result = getQueuedItemEditsByItem(db, 'item-999')
      expect(result).toEqual([])
    })

    it('returns only edits for the specified item', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { description: 'C' },
        expectedVersion: 2,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:02:00.000Z',
      })

      const result = getQueuedItemEditsByItem(db, 'item-1')
      expect(result).toHaveLength(2)
      expect(result.every((e) => e.itemId === 'item-1')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemEditsByStatus
  // ---------------------------------------------------------------------------
  describe('getQueuedItemEditsByStatus', () => {
    it('returns empty array when no edits with status', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      const result = getQueuedItemEditsByStatus(db, 'failed')
      expect(result).toEqual([])
    })

    it('returns only edits with the specified status', () => {
      const edit1 = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      updateItemEditStatus(db, edit1.id, 'syncing')

      const pending = getQueuedItemEditsByStatus(db, 'pending')
      expect(pending).toHaveLength(1)
      expect(pending[0].itemId).toBe('item-2')

      const syncing = getQueuedItemEditsByStatus(db, 'syncing')
      expect(syncing).toHaveLength(1)
      expect(syncing[0].itemId).toBe('item-1')
    })
  })

  // ---------------------------------------------------------------------------
  // getItemEditQueueCount
  // ---------------------------------------------------------------------------
  describe('getItemEditQueueCount', () => {
    it('returns 0 when queue is empty', () => {
      expect(getItemEditQueueCount(db)).toBe(0)
    })

    it('returns correct count after adding edits', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-3',
        changes: { name: 'C' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:02:00.000Z',
      })

      expect(getItemEditQueueCount(db)).toBe(3)
    })

    it('reflects removals', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      removeItemEditFromQueue(db, edit.id)
      expect(getItemEditQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // updateItemEditStatus
  // ---------------------------------------------------------------------------
  describe('updateItemEditStatus', () => {
    it('updates the status field', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      updateItemEditStatus(db, edit.id, 'syncing')

      const edits = getQueuedItemEdits(db)
      expect(edits[0].status).toBe('syncing')
    })

    it('stores the error message when provided', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      updateItemEditStatus(db, edit.id, 'failed', 'Network timeout')

      const edits = getQueuedItemEdits(db)
      expect(edits[0].lastError).toBe('Network timeout')
    })

    it('increments retryCount when status is failed', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      updateItemEditStatus(db, edit.id, 'failed', 'Error 1')
      let edits = getQueuedItemEdits(db)
      expect(edits[0].retryCount).toBe(1)

      updateItemEditStatus(db, edit.id, 'failed', 'Error 2')
      edits = getQueuedItemEdits(db)
      expect(edits[0].retryCount).toBe(2)

      updateItemEditStatus(db, edit.id, 'failed', 'Error 3')
      edits = getQueuedItemEdits(db)
      expect(edits[0].retryCount).toBe(3)
    })

    it('does not increment retryCount for non-failed status', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      updateItemEditStatus(db, edit.id, 'syncing')
      const edits = getQueuedItemEdits(db)
      expect(edits[0].retryCount).toBe(0)
    })

    it('clears lastError when no error provided on non-failed status', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      updateItemEditStatus(db, edit.id, 'failed', 'Some error')
      updateItemEditStatus(db, edit.id, 'pending')

      const edits = getQueuedItemEdits(db)
      expect(edits[0].lastError).toBeUndefined()
    })

    it('is a no-op for non-existent id', () => {
      // Should not throw
      updateItemEditStatus(db, 'nonexistent-id', 'failed', 'Error')
      expect(getItemEditQueueCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // removeItemEditFromQueue
  // ---------------------------------------------------------------------------
  describe('removeItemEditFromQueue', () => {
    it('removes the edit by id', () => {
      const edit = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      removeItemEditFromQueue(db, edit.id)
      expect(getQueuedItemEdits(db)).toEqual([])
    })

    it('only removes the specified edit', () => {
      const edit1 = addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      const edit2 = addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })

      removeItemEditFromQueue(db, edit1.id)

      const remaining = getQueuedItemEdits(db)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(edit2.id)
    })

    it('is a no-op for non-existent id', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })

      removeItemEditFromQueue(db, 'nonexistent-id')
      expect(getItemEditQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // clearItemEditQueue
  // ---------------------------------------------------------------------------
  describe('clearItemEditQueue', () => {
    it('removes all edits from queue', () => {
      addItemEditToQueue(db, {
        itemId: 'item-1',
        changes: { name: 'A' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:00:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-2',
        changes: { name: 'B' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:01:00.000Z',
      })
      addItemEditToQueue(db, {
        itemId: 'item-3',
        changes: { name: 'C' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2026-01-15T10:02:00.000Z',
      })

      clearItemEditQueue(db)

      expect(getQueuedItemEdits(db)).toEqual([])
      expect(getItemEditQueueCount(db)).toBe(0)
    })

    it('is a no-op when queue is already empty', () => {
      clearItemEditQueue(db)
      expect(getItemEditQueueCount(db)).toBe(0)
    })
  })
})
