import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  addItemArchiveToQueue,
  getQueuedItemArchives,
  getQueuedArchivesByItem,
  getQueuedArchivesByStatus,
  getItemArchiveQueueCount,
  updateItemArchiveStatus,
  removeItemArchiveFromQueue,
  clearItemArchiveQueue,
} from './item-archive-queue'
import type { QueuedItemArchive } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('item-archive-queue', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---------------------------------------------------------------------------
  // addItemArchiveToQueue
  // ---------------------------------------------------------------------------
  describe('addItemArchiveToQueue', () => {
    it('generates an id', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('generates an idempotencyKey', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      expect(result.idempotencyKey).toBeDefined()
      expect(typeof result.idempotencyKey).toBe('string')
      expect(result.idempotencyKey.length).toBeGreaterThan(0)
    })

    it('generates unique ids for different archives', () => {
      const archive1 = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      const archive2 = addItemArchiveToQueue(db, 'item-2', 'archive', 1, 'user-1')

      expect(archive1.id).not.toBe(archive2.id)
      expect(archive1.idempotencyKey).not.toBe(archive2.idempotencyKey)
    })

    it('supports archive action', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      expect(result.action).toBe('archive')
    })

    it('supports restore action', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'restore', 2, 'user-1')
      expect(result.action).toBe('restore')
    })

    it('sets status to pending', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      expect(result.status).toBe('pending')
    })

    it('sets retryCount to 0', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      expect(result.retryCount).toBe(0)
    })

    it('sets createdAt to a valid ISO timestamp', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      expect(result.createdAt).toBeDefined()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('sets deviceTimestamp to a valid ISO timestamp', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      expect(result.deviceTimestamp).toBeDefined()
      expect(new Date(result.deviceTimestamp).toISOString()).toBe(result.deviceTimestamp)
    })

    it('stores the provided fields correctly', () => {
      const result = addItemArchiveToQueue(db, 'item-42', 'restore', 5, 'user-99')

      expect(result.itemId).toBe('item-42')
      expect(result.action).toBe('restore')
      expect(result.expectedVersion).toBe(5)
      expect(result.userId).toBe('user-99')
    })

    it('returns the full QueuedItemArchive object', () => {
      const result = addItemArchiveToQueue(db, 'item-1', 'archive', 3, 'user-1')

      expect(result).toMatchObject({
        itemId: 'item-1',
        action: 'archive',
        expectedVersion: 3,
        userId: 'user-1',
        status: 'pending',
        retryCount: 0,
      })
      expect(result.id).toBeDefined()
      expect(result.idempotencyKey).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.deviceTimestamp).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemArchives
  // ---------------------------------------------------------------------------
  describe('getQueuedItemArchives', () => {
    it('returns empty array when queue is empty', () => {
      expect(getQueuedItemArchives(db)).toEqual([])
    })

    it('returns all queued archives', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 2, 'user-1')

      const result = getQueuedItemArchives(db)
      expect(result).toHaveLength(2)
    })

    it('returns archives ordered by created_at ASC', () => {
      const archive1 = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      const archive2 = addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')

      const result = getQueuedItemArchives(db)
      expect(result[0].id).toBe(archive1.id)
      expect(result[1].id).toBe(archive2.id)
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedArchivesByItem
  // ---------------------------------------------------------------------------
  describe('getQueuedArchivesByItem', () => {
    it('returns empty array when no archives for item', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      const result = getQueuedArchivesByItem(db, 'item-999')
      expect(result).toEqual([])
    })

    it('returns only archives for the specified item', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-1', 'restore', 2, 'user-1')

      const result = getQueuedArchivesByItem(db, 'item-1')
      expect(result).toHaveLength(2)
      expect(result.every((a) => a.itemId === 'item-1')).toBe(true)
    })

    it('returns archive and restore actions for same item', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-1', 'restore', 2, 'user-1')

      const result = getQueuedArchivesByItem(db, 'item-1')
      const actions = result.map((a) => a.action)
      expect(actions).toContain('archive')
      expect(actions).toContain('restore')
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedArchivesByStatus
  // ---------------------------------------------------------------------------
  describe('getQueuedArchivesByStatus', () => {
    it('returns empty array when no archives with status', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      const result = getQueuedArchivesByStatus(db, 'failed')
      expect(result).toEqual([])
    })

    it('returns only archives with the specified status', () => {
      const archive1 = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')

      updateItemArchiveStatus(db, archive1.id, 'syncing')

      const pending = getQueuedArchivesByStatus(db, 'pending')
      expect(pending).toHaveLength(1)
      expect(pending[0].itemId).toBe('item-2')

      const syncing = getQueuedArchivesByStatus(db, 'syncing')
      expect(syncing).toHaveLength(1)
      expect(syncing[0].itemId).toBe('item-1')
    })

    it('returns multiple archives with same status', () => {
      const a1 = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      const a2 = addItemArchiveToQueue(db, 'item-2', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, a1.id, 'failed', 'Error 1')
      updateItemArchiveStatus(db, a2.id, 'failed', 'Error 2')

      const failed = getQueuedArchivesByStatus(db, 'failed')
      expect(failed).toHaveLength(2)
    })
  })

  // ---------------------------------------------------------------------------
  // getItemArchiveQueueCount
  // ---------------------------------------------------------------------------
  describe('getItemArchiveQueueCount', () => {
    it('returns 0 when queue is empty', () => {
      expect(getItemArchiveQueueCount(db)).toBe(0)
    })

    it('returns correct count', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-3', 'archive', 1, 'user-1')

      expect(getItemArchiveQueueCount(db)).toBe(3)
    })

    it('reflects removals', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')

      removeItemArchiveFromQueue(db, archive.id)
      expect(getItemArchiveQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // updateItemArchiveStatus
  // ---------------------------------------------------------------------------
  describe('updateItemArchiveStatus', () => {
    it('updates the status field', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, archive.id, 'syncing')

      const archives = getQueuedItemArchives(db)
      expect(archives[0].status).toBe('syncing')
    })

    it('stores the error message when provided', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, archive.id, 'failed', 'Conflict error')

      const archives = getQueuedItemArchives(db)
      expect(archives[0].lastError).toBe('Conflict error')
    })

    it('increments retryCount when status is failed', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, archive.id, 'failed', 'Error 1')
      let archives = getQueuedItemArchives(db)
      expect(archives[0].retryCount).toBe(1)

      updateItemArchiveStatus(db, archive.id, 'failed', 'Error 2')
      archives = getQueuedItemArchives(db)
      expect(archives[0].retryCount).toBe(2)

      updateItemArchiveStatus(db, archive.id, 'failed', 'Error 3')
      archives = getQueuedItemArchives(db)
      expect(archives[0].retryCount).toBe(3)
    })

    it('does not increment retryCount for non-failed status', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, archive.id, 'syncing')
      const archives = getQueuedItemArchives(db)
      expect(archives[0].retryCount).toBe(0)
    })

    it('clears lastError when no error provided on non-failed status', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      updateItemArchiveStatus(db, archive.id, 'failed', 'Some error')
      updateItemArchiveStatus(db, archive.id, 'pending')

      const archives = getQueuedItemArchives(db)
      expect(archives[0].lastError).toBeUndefined()
    })

    it('is a no-op for non-existent id', () => {
      updateItemArchiveStatus(db, 'nonexistent-id', 'failed', 'Error')
      expect(getItemArchiveQueueCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // removeItemArchiveFromQueue
  // ---------------------------------------------------------------------------
  describe('removeItemArchiveFromQueue', () => {
    it('removes the archive by id', () => {
      const archive = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')

      removeItemArchiveFromQueue(db, archive.id)
      expect(getQueuedItemArchives(db)).toEqual([])
    })

    it('only removes the specified archive', () => {
      const archive1 = addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      const archive2 = addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')

      removeItemArchiveFromQueue(db, archive1.id)

      const remaining = getQueuedItemArchives(db)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(archive2.id)
    })

    it('is a no-op for non-existent id', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      removeItemArchiveFromQueue(db, 'nonexistent-id')
      expect(getItemArchiveQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // clearItemArchiveQueue
  // ---------------------------------------------------------------------------
  describe('clearItemArchiveQueue', () => {
    it('removes all archives from queue', () => {
      addItemArchiveToQueue(db, 'item-1', 'archive', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-2', 'restore', 1, 'user-1')
      addItemArchiveToQueue(db, 'item-3', 'archive', 1, 'user-1')

      clearItemArchiveQueue(db)

      expect(getQueuedItemArchives(db)).toEqual([])
      expect(getItemArchiveQueueCount(db)).toBe(0)
    })

    it('is a no-op when queue is already empty', () => {
      clearItemArchiveQueue(db)
      expect(getItemArchiveQueueCount(db)).toBe(0)
    })
  })
})
