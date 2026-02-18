import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  addItemCreateToQueue,
  getQueuedItemCreates,
  getQueuedItemCreateById,
  getQueuedItemCreatesByStatus,
  getItemCreateQueueCount,
  updateItemCreateStatus,
  updateItemCreateData,
  removeItemCreateFromQueue,
  clearItemCreateQueue,
} from './item-create-queue'
import type { QueuedItemCreate } from '@/types/offline'
import type { ItemInsert } from '@/lib/supabase/types'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('item-create-queue', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  const sampleItemData: Partial<ItemInsert> = {
    name: 'New Item',
    description: 'A test item',
    unit: 'pcs',
    min_stock: 5,
    category_id: 'cat-1',
  }

  // ---------------------------------------------------------------------------
  // addItemCreateToQueue
  // ---------------------------------------------------------------------------
  describe('addItemCreateToQueue', () => {
    it('generates an id', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('generates a TEMP-{8char} sku', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.tempSku).toBeDefined()
      expect(result.tempSku).toMatch(/^TEMP-[A-Z0-9]{8}$/)
    })

    it('generates unique temp skus for different creates', () => {
      const create1 = addItemCreateToQueue(db, sampleItemData, 'user-1')
      const create2 = addItemCreateToQueue(db, { ...sampleItemData, name: 'Another Item' }, 'user-1')

      expect(create1.tempSku).not.toBe(create2.tempSku)
    })

    it('generates an idempotencyKey', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.idempotencyKey).toBeDefined()
      expect(typeof result.idempotencyKey).toBe('string')
      expect(result.idempotencyKey.length).toBeGreaterThan(0)
    })

    it('generates unique ids and idempotency keys', () => {
      const create1 = addItemCreateToQueue(db, sampleItemData, 'user-1')
      const create2 = addItemCreateToQueue(db, { ...sampleItemData, name: 'Another' }, 'user-1')

      expect(create1.id).not.toBe(create2.id)
      expect(create1.idempotencyKey).not.toBe(create2.idempotencyKey)
    })

    it('sets status to pending', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')
      expect(result.status).toBe('pending')
    })

    it('sets retryCount to 0', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')
      expect(result.retryCount).toBe(0)
    })

    it('sets createdAt to a valid ISO timestamp', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.createdAt).toBeDefined()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('sets deviceTimestamp to a valid ISO timestamp', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.deviceTimestamp).toBeDefined()
      expect(new Date(result.deviceTimestamp).toISOString()).toBe(result.deviceTimestamp)
    })

    it('stores the userId', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-42')
      expect(result.userId).toBe('user-42')
    })

    it('stores itemData with the generated id merged in', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result.itemData).toBeDefined()
      expect(result.itemData.name).toBe('New Item')
      expect(result.itemData.description).toBe('A test item')
      expect(result.itemData.unit).toBe('pcs')
      expect(result.itemData.min_stock).toBe(5)
      expect(result.itemData.id).toBe(result.id)
    })

    it('JSON-serializes itemData in the database', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      const row = db.getFirstSync(
        'SELECT item_data FROM item_create_queue WHERE id = ?',
        result.id
      ) as { item_data: string } | null
      expect(row).not.toBeNull()
      const parsed = JSON.parse(row!.item_data)
      expect(parsed.name).toBe('New Item')
      expect(parsed.id).toBe(result.id)
    })

    it('returns the full QueuedItemCreate object', () => {
      const result = addItemCreateToQueue(db, sampleItemData, 'user-1')

      expect(result).toMatchObject({
        userId: 'user-1',
        status: 'pending',
        retryCount: 0,
        itemData: expect.objectContaining({ name: 'New Item' }),
      })
      expect(result.tempSku).toMatch(/^TEMP-/)
      expect(result.id).toBeDefined()
      expect(result.idempotencyKey).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.deviceTimestamp).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemCreates
  // ---------------------------------------------------------------------------
  describe('getQueuedItemCreates', () => {
    it('returns empty array when queue is empty', () => {
      expect(getQueuedItemCreates(db)).toEqual([])
    })

    it('returns all queued creates', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')

      const result = getQueuedItemCreates(db)
      expect(result).toHaveLength(2)
    })

    it('returns creates ordered by created_at ASC', () => {
      const create1 = addItemCreateToQueue(db, { ...sampleItemData, name: 'First' }, 'user-1')
      const create2 = addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')

      const result = getQueuedItemCreates(db)
      expect(result[0].id).toBe(create1.id)
      expect(result[1].id).toBe(create2.id)
    })

    it('deserializes JSON itemData back to object', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')

      const result = getQueuedItemCreates(db)
      expect(result[0].itemData).toEqual(expect.objectContaining({
        name: 'New Item',
        description: 'A test item',
        unit: 'pcs',
      }))
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemCreateById
  // ---------------------------------------------------------------------------
  describe('getQueuedItemCreateById', () => {
    it('returns null when id does not exist', () => {
      expect(getQueuedItemCreateById(db, 'nonexistent-id')).toBeNull()
    })

    it('returns the queued create by id', () => {
      const created = addItemCreateToQueue(db, sampleItemData, 'user-1')

      const result = getQueuedItemCreateById(db, created.id)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(created.id)
      expect(result!.tempSku).toBe(created.tempSku)
    })

    it('deserializes itemData in the returned object', () => {
      const created = addItemCreateToQueue(db, sampleItemData, 'user-1')

      const result = getQueuedItemCreateById(db, created.id)
      expect(result!.itemData).toEqual(expect.objectContaining({ name: 'New Item' }))
    })
  })

  // ---------------------------------------------------------------------------
  // getQueuedItemCreatesByStatus
  // ---------------------------------------------------------------------------
  describe('getQueuedItemCreatesByStatus', () => {
    it('returns empty array when no creates with status', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')

      const result = getQueuedItemCreatesByStatus(db, 'failed')
      expect(result).toEqual([])
    })

    it('returns only creates with the specified status', () => {
      const create1 = addItemCreateToQueue(db, { ...sampleItemData, name: 'First' }, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')

      updateItemCreateStatus(db, create1.id, 'syncing')

      const pending = getQueuedItemCreatesByStatus(db, 'pending')
      expect(pending).toHaveLength(1)
      expect(pending[0].itemData.name).toBe('Second')

      const syncing = getQueuedItemCreatesByStatus(db, 'syncing')
      expect(syncing).toHaveLength(1)
      expect(syncing[0].itemData.name).toBe('First')
    })
  })

  // ---------------------------------------------------------------------------
  // getItemCreateQueueCount
  // ---------------------------------------------------------------------------
  describe('getItemCreateQueueCount', () => {
    it('returns 0 when queue is empty', () => {
      expect(getItemCreateQueueCount(db)).toBe(0)
    })

    it('returns correct count', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Third' }, 'user-1')

      expect(getItemCreateQueueCount(db)).toBe(3)
    })

    it('reflects removals', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')

      removeItemCreateFromQueue(db, create.id)
      expect(getItemCreateQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // updateItemCreateStatus
  // ---------------------------------------------------------------------------
  describe('updateItemCreateStatus', () => {
    it('updates the status field', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateStatus(db, create.id, 'syncing')

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.status).toBe('syncing')
    })

    it('stores the error message when provided', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateStatus(db, create.id, 'failed', 'Server error')

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.lastError).toBe('Server error')
    })

    it('increments retryCount when status is failed', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateStatus(db, create.id, 'failed', 'Error 1')
      expect(getQueuedItemCreateById(db, create.id)!.retryCount).toBe(1)

      updateItemCreateStatus(db, create.id, 'failed', 'Error 2')
      expect(getQueuedItemCreateById(db, create.id)!.retryCount).toBe(2)

      updateItemCreateStatus(db, create.id, 'failed', 'Error 3')
      expect(getQueuedItemCreateById(db, create.id)!.retryCount).toBe(3)
    })

    it('does not increment retryCount for non-failed status', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateStatus(db, create.id, 'syncing')
      expect(getQueuedItemCreateById(db, create.id)!.retryCount).toBe(0)
    })

    it('clears lastError when no error provided on non-failed status', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateStatus(db, create.id, 'failed', 'Some error')
      updateItemCreateStatus(db, create.id, 'pending')

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.lastError).toBeUndefined()
    })

    it('is a no-op for non-existent id', () => {
      updateItemCreateStatus(db, 'nonexistent-id', 'failed', 'Error')
      expect(getItemCreateQueueCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // updateItemCreateData
  // ---------------------------------------------------------------------------
  describe('updateItemCreateData', () => {
    it('merges new data into existing itemData', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateData(db, create.id, { name: 'Updated Name', barcode: 'BC-001' })

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.itemData.name).toBe('Updated Name')
      expect(result!.itemData.barcode).toBe('BC-001')
      // Original fields preserved
      expect(result!.itemData.description).toBe('A test item')
      expect(result!.itemData.unit).toBe('pcs')
    })

    it('overwrites existing fields with new values', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateData(db, create.id, { min_stock: 20 })

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.itemData.min_stock).toBe(20)
    })

    it('adds new fields that did not exist before', () => {
      const create = addItemCreateToQueue(db, { name: 'Minimal' }, 'user-1')

      updateItemCreateData(db, create.id, { unit: 'kg', max_stock: 100 })

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.itemData.unit).toBe('kg')
      expect(result!.itemData.max_stock).toBe(100)
    })

    it('preserves the id field in itemData after merge', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      updateItemCreateData(db, create.id, { name: 'Updated' })

      const result = getQueuedItemCreateById(db, create.id)
      expect(result!.itemData.id).toBe(create.id)
    })

    it('is a no-op for non-existent id', () => {
      updateItemCreateData(db, 'nonexistent-id', { name: 'Ghost' })
      expect(getItemCreateQueueCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // removeItemCreateFromQueue
  // ---------------------------------------------------------------------------
  describe('removeItemCreateFromQueue', () => {
    it('removes the create by id', () => {
      const create = addItemCreateToQueue(db, sampleItemData, 'user-1')

      removeItemCreateFromQueue(db, create.id)
      expect(getQueuedItemCreates(db)).toEqual([])
    })

    it('only removes the specified create', () => {
      const create1 = addItemCreateToQueue(db, sampleItemData, 'user-1')
      const create2 = addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')

      removeItemCreateFromQueue(db, create1.id)

      const remaining = getQueuedItemCreates(db)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(create2.id)
    })

    it('is a no-op for non-existent id', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')
      removeItemCreateFromQueue(db, 'nonexistent-id')
      expect(getItemCreateQueueCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // clearItemCreateQueue
  // ---------------------------------------------------------------------------
  describe('clearItemCreateQueue', () => {
    it('removes all creates from queue', () => {
      addItemCreateToQueue(db, sampleItemData, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Second' }, 'user-1')
      addItemCreateToQueue(db, { ...sampleItemData, name: 'Third' }, 'user-1')

      clearItemCreateQueue(db)

      expect(getQueuedItemCreates(db)).toEqual([])
      expect(getItemCreateQueueCount(db)).toBe(0)
    })

    it('is a no-op when queue is already empty', () => {
      clearItemCreateQueue(db)
      expect(getItemCreateQueueCount(db)).toBe(0)
    })
  })
})
