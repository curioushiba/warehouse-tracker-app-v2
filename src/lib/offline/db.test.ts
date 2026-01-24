import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueuedTransaction, CachedItem, QueuedItemEdit, PendingImage } from './db'

// Mock IndexedDB operations
const mockPut = vi.fn()
const mockGet = vi.fn()
const mockGetAll = vi.fn()
const mockGetAllFromIndex = vi.fn()
const mockGetFromIndex = vi.fn()
const mockDelete = vi.fn()
const mockClear = vi.fn()
const mockCount = vi.fn()
const mockTransaction = vi.fn()
const mockStorePut = vi.fn()

const mockDB = {
  put: mockPut,
  get: mockGet,
  getAll: mockGetAll,
  getAllFromIndex: mockGetAllFromIndex,
  getFromIndex: mockGetFromIndex,
  delete: mockDelete,
  clear: mockClear,
  count: mockCount,
  transaction: mockTransaction,
}

// Mock idb library
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}))

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'mock-uuid-12345')
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID })

// Sample test data
const mockQueuedTransaction: Omit<QueuedTransaction, 'retryCount' | 'createdAt'> = {
  id: 'tx-123',
  transactionType: 'in',
  itemId: 'item-1',
  quantity: 10,
  notes: 'Test transaction',
  deviceTimestamp: '2024-01-15T10:00:00Z',
  idempotencyKey: 'idem-key-123',
  userId: 'user-1',
}

const mockCachedItem: CachedItem = {
  id: 'item-1',
  sku: 'SKU-001',
  name: 'Test Item',
  description: 'Test description',
  categoryId: 'cat-1',
  locationId: 'loc-1',
  unit: 'pieces',
  currentStock: 100,
  minStock: 10,
  maxStock: 200,
  barcode: '1234567890123',
  updatedAt: '2024-01-15T10:00:00Z',
}

describe('Offline Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup transaction mock with store
    mockTransaction.mockReturnValue({
      store: { put: mockStorePut },
      done: Promise.resolve(),
    })
  })

  describe('Transaction Queue Operations', () => {
    describe('addToQueue', () => {
      it('should add a transaction to the queue with retryCount 0 and createdAt', async () => {
        const { addToQueue } = await import('./db')

        await addToQueue(mockQueuedTransaction)

        expect(mockPut).toHaveBeenCalledWith('transactionQueue', expect.objectContaining({
          ...mockQueuedTransaction,
          retryCount: 0,
          createdAt: expect.any(String),
        }))
      })

      it('should set createdAt to current ISO timestamp', async () => {
        const { addToQueue } = await import('./db')
        const before = new Date().toISOString()

        await addToQueue(mockQueuedTransaction)

        const after = new Date().toISOString()
        const call = mockPut.mock.calls[0][1]
        expect(call.createdAt >= before).toBe(true)
        expect(call.createdAt <= after).toBe(true)
      })
    })

    describe('getQueuedTransactions', () => {
      it('should return all transactions ordered by created date', async () => {
        const mockTransactions: QueuedTransaction[] = [
          { ...mockQueuedTransaction, retryCount: 0, createdAt: '2024-01-15T09:00:00Z' },
          { ...mockQueuedTransaction, id: 'tx-124', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockTransactions)

        const { getQueuedTransactions } = await import('./db')
        const result = await getQueuedTransactions()

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('transactionQueue', 'by-created')
        expect(result).toEqual(mockTransactions)
      })

      it('should return empty array when queue is empty', async () => {
        mockGetAllFromIndex.mockResolvedValue([])

        const { getQueuedTransactions } = await import('./db')
        const result = await getQueuedTransactions()

        expect(result).toEqual([])
      })
    })

    describe('getQueueCount', () => {
      it('should return the count of queued transactions', async () => {
        mockCount.mockResolvedValue(5)

        const { getQueueCount } = await import('./db')
        const result = await getQueueCount()

        expect(mockCount).toHaveBeenCalledWith('transactionQueue')
        expect(result).toBe(5)
      })

      it('should return 0 when queue is empty', async () => {
        mockCount.mockResolvedValue(0)

        const { getQueueCount } = await import('./db')
        const result = await getQueueCount()

        expect(result).toBe(0)
      })
    })

    describe('removeFromQueue', () => {
      it('should delete a transaction by id', async () => {
        const { removeFromQueue } = await import('./db')

        await removeFromQueue('tx-123')

        expect(mockDelete).toHaveBeenCalledWith('transactionQueue', 'tx-123')
      })
    })

    describe('updateQueueItem', () => {
      it('should update existing transaction with partial data', async () => {
        const existingTx: QueuedTransaction = {
          ...mockQueuedTransaction,
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingTx)

        const { updateQueueItem } = await import('./db')
        await updateQueueItem('tx-123', { notes: 'Updated notes' })

        expect(mockGet).toHaveBeenCalledWith('transactionQueue', 'tx-123')
        expect(mockPut).toHaveBeenCalledWith('transactionQueue', {
          ...existingTx,
          notes: 'Updated notes',
        })
      })

      it('should not update if transaction does not exist', async () => {
        mockGet.mockResolvedValue(undefined)

        const { updateQueueItem } = await import('./db')
        await updateQueueItem('non-existent', { notes: 'Updated' })

        expect(mockPut).not.toHaveBeenCalled()
      })
    })

    describe('incrementRetryCount', () => {
      it('should increment retry count and set last error', async () => {
        const existingTx: QueuedTransaction = {
          ...mockQueuedTransaction,
          retryCount: 2,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingTx)

        const { incrementRetryCount } = await import('./db')
        await incrementRetryCount('tx-123', 'Network error')

        expect(mockPut).toHaveBeenCalledWith('transactionQueue', {
          ...existingTx,
          retryCount: 3,
          lastError: 'Network error',
        })
      })

      it('should not update if transaction does not exist', async () => {
        mockGet.mockResolvedValue(undefined)

        const { incrementRetryCount } = await import('./db')
        await incrementRetryCount('non-existent', 'Error')

        expect(mockPut).not.toHaveBeenCalled()
      })
    })

    describe('clearQueue', () => {
      it('should clear all transactions from queue', async () => {
        const { clearQueue } = await import('./db')

        await clearQueue()

        expect(mockClear).toHaveBeenCalledWith('transactionQueue')
      })
    })
  })

  describe('Items Cache Operations', () => {
    describe('cacheItems', () => {
      it('should batch cache multiple items', async () => {
        const items: CachedItem[] = [
          mockCachedItem,
          { ...mockCachedItem, id: 'item-2', sku: 'SKU-002' },
        ]

        const { cacheItems } = await import('./db')
        await cacheItems(items)

        expect(mockTransaction).toHaveBeenCalledWith('itemsCache', 'readwrite')
        expect(mockStorePut).toHaveBeenCalledTimes(2)
        expect(mockStorePut).toHaveBeenCalledWith(items[0])
        expect(mockStorePut).toHaveBeenCalledWith(items[1])
      })

      it('should handle empty array', async () => {
        const { cacheItems } = await import('./db')
        await cacheItems([])

        expect(mockTransaction).toHaveBeenCalledWith('itemsCache', 'readwrite')
        expect(mockStorePut).not.toHaveBeenCalled()
      })
    })

    describe('getCachedItem', () => {
      it('should return item by id', async () => {
        mockGet.mockResolvedValue(mockCachedItem)

        const { getCachedItem } = await import('./db')
        const result = await getCachedItem('item-1')

        expect(mockGet).toHaveBeenCalledWith('itemsCache', 'item-1')
        expect(result).toEqual(mockCachedItem)
      })

      it('should return undefined for non-existent item', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getCachedItem } = await import('./db')
        const result = await getCachedItem('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getCachedItemBySku', () => {
      it('should return item by SKU using index', async () => {
        mockGetFromIndex.mockResolvedValue(mockCachedItem)

        const { getCachedItemBySku } = await import('./db')
        const result = await getCachedItemBySku('SKU-001')

        expect(mockGetFromIndex).toHaveBeenCalledWith('itemsCache', 'by-sku', 'SKU-001')
        expect(result).toEqual(mockCachedItem)
      })

      it('should return undefined for non-existent SKU', async () => {
        mockGetFromIndex.mockResolvedValue(undefined)

        const { getCachedItemBySku } = await import('./db')
        const result = await getCachedItemBySku('NON-EXISTENT')

        expect(result).toBeUndefined()
      })
    })

    describe('getCachedItemByBarcode', () => {
      it('should return item by barcode using index', async () => {
        mockGetFromIndex.mockResolvedValue(mockCachedItem)

        const { getCachedItemByBarcode } = await import('./db')
        const result = await getCachedItemByBarcode('1234567890123')

        expect(mockGetFromIndex).toHaveBeenCalledWith('itemsCache', 'by-barcode', '1234567890123')
        expect(result).toEqual(mockCachedItem)
      })

      it('should return undefined for non-existent barcode', async () => {
        mockGetFromIndex.mockResolvedValue(undefined)

        const { getCachedItemByBarcode } = await import('./db')
        const result = await getCachedItemByBarcode('0000000000000')

        expect(result).toBeUndefined()
      })
    })

    describe('getAllCachedItems', () => {
      it('should return all cached items', async () => {
        const items = [mockCachedItem, { ...mockCachedItem, id: 'item-2' }]
        mockGetAll.mockResolvedValue(items)

        const { getAllCachedItems } = await import('./db')
        const result = await getAllCachedItems()

        expect(mockGetAll).toHaveBeenCalledWith('itemsCache')
        expect(result).toEqual(items)
      })

      it('should return empty array when no items cached', async () => {
        mockGetAll.mockResolvedValue([])

        const { getAllCachedItems } = await import('./db')
        const result = await getAllCachedItems()

        expect(result).toEqual([])
      })
    })

    describe('clearItemsCache', () => {
      it('should clear all items from cache', async () => {
        const { clearItemsCache } = await import('./db')

        await clearItemsCache()

        expect(mockClear).toHaveBeenCalledWith('itemsCache')
      })
    })
  })

  describe('Metadata Operations', () => {
    describe('setMetadata', () => {
      it('should store string metadata with timestamp', async () => {
        const { setMetadata } = await import('./db')

        await setMetadata('testKey', 'testValue')

        expect(mockPut).toHaveBeenCalledWith('metadata', {
          key: 'testKey',
          value: 'testValue',
          updatedAt: expect.any(String),
        })
      })

      it('should store number metadata', async () => {
        const { setMetadata } = await import('./db')

        await setMetadata('count', 42)

        expect(mockPut).toHaveBeenCalledWith('metadata', {
          key: 'count',
          value: 42,
          updatedAt: expect.any(String),
        })
      })

      it('should store boolean metadata', async () => {
        const { setMetadata } = await import('./db')

        await setMetadata('isEnabled', true)

        expect(mockPut).toHaveBeenCalledWith('metadata', {
          key: 'isEnabled',
          value: true,
          updatedAt: expect.any(String),
        })
      })
    })

    describe('getMetadata', () => {
      it('should return stored value', async () => {
        mockGet.mockResolvedValue({
          key: 'testKey',
          value: 'testValue',
          updatedAt: '2024-01-15T10:00:00Z',
        })

        const { getMetadata } = await import('./db')
        const result = await getMetadata('testKey')

        expect(mockGet).toHaveBeenCalledWith('metadata', 'testKey')
        expect(result).toBe('testValue')
      })

      it('should return undefined for non-existent key', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getMetadata } = await import('./db')
        const result = await getMetadata('nonExistent')

        expect(result).toBeUndefined()
      })
    })

    describe('getLastSyncTime', () => {
      it('should return last sync time as string', async () => {
        mockGet.mockResolvedValue({
          key: 'lastSyncTime',
          value: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        })

        const { getLastSyncTime } = await import('./db')
        const result = await getLastSyncTime()

        expect(result).toBe('2024-01-15T10:00:00Z')
      })

      it('should return undefined if not set', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getLastSyncTime } = await import('./db')
        const result = await getLastSyncTime()

        expect(result).toBeUndefined()
      })

      it('should return undefined if value is not a string', async () => {
        mockGet.mockResolvedValue({
          key: 'lastSyncTime',
          value: 123, // wrong type
          updatedAt: '2024-01-15T10:00:00Z',
        })

        const { getLastSyncTime } = await import('./db')
        const result = await getLastSyncTime()

        expect(result).toBeUndefined()
      })
    })

    describe('setLastSyncTime', () => {
      it('should store last sync time', async () => {
        const { setLastSyncTime } = await import('./db')

        await setLastSyncTime('2024-01-15T10:00:00Z')

        expect(mockPut).toHaveBeenCalledWith('metadata', {
          key: 'lastSyncTime',
          value: '2024-01-15T10:00:00Z',
          updatedAt: expect.any(String),
        })
      })
    })

    describe('getDeviceId', () => {
      it('should return existing device ID', async () => {
        mockGet.mockResolvedValue({
          key: 'deviceId',
          value: 'existing-device-id',
          updatedAt: '2024-01-15T10:00:00Z',
        })

        const { getDeviceId } = await import('./db')
        const result = await getDeviceId()

        expect(result).toBe('existing-device-id')
        expect(mockPut).not.toHaveBeenCalled()
      })

      it('should generate and store new device ID if not exists', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getDeviceId } = await import('./db')
        const result = await getDeviceId()

        expect(result).toBe('device-mock-uuid-12345')
        expect(mockPut).toHaveBeenCalledWith('metadata', {
          key: 'deviceId',
          value: 'device-mock-uuid-12345',
          updatedAt: expect.any(String),
        })
      })

      it('should generate new ID if stored value is not a string', async () => {
        mockGet.mockResolvedValue({
          key: 'deviceId',
          value: 123, // wrong type
          updatedAt: '2024-01-15T10:00:00Z',
        })

        const { getDeviceId } = await import('./db')
        const result = await getDeviceId()

        expect(result).toBe('device-mock-uuid-12345')
        expect(mockPut).toHaveBeenCalled()
      })
    })
  })

  describe('Item Edit Queue Operations', () => {
    const mockItemEdit: Omit<QueuedItemEdit, 'id' | 'idempotencyKey' | 'status' | 'retryCount' | 'createdAt'> = {
      itemId: 'item-1',
      changes: { category_id: 'cat-2' },
      expectedVersion: 1,
      userId: 'user-1',
      deviceTimestamp: '2024-01-15T10:00:00Z',
    }

    describe('addItemEditToQueue', () => {
      it('should add an item edit to the queue with generated id and idempotencyKey', async () => {
        const { addItemEditToQueue } = await import('./db')

        const result = await addItemEditToQueue(mockItemEdit)

        expect(mockPut).toHaveBeenCalledWith('itemEditQueue', expect.objectContaining({
          ...mockItemEdit,
          id: 'mock-uuid-12345',
          idempotencyKey: 'mock-uuid-12345',
          status: 'pending',
          retryCount: 0,
          createdAt: expect.any(String),
        }))
        expect(result.id).toBe('mock-uuid-12345')
        expect(result.status).toBe('pending')
      })
    })

    describe('getQueuedItemEdits', () => {
      it('should return all item edits ordered by creation', async () => {
        const mockEdits: QueuedItemEdit[] = [
          { ...mockItemEdit, id: 'edit-1', idempotencyKey: 'key-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T09:00:00Z' },
          { ...mockItemEdit, id: 'edit-2', idempotencyKey: 'key-2', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockEdits)

        const { getQueuedItemEdits } = await import('./db')
        const result = await getQueuedItemEdits()

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemEditQueue', 'by-created')
        expect(result).toEqual(mockEdits)
      })
    })

    describe('getQueuedItemEditsByItem', () => {
      it('should return edits for specific item', async () => {
        const mockEdits: QueuedItemEdit[] = [
          { ...mockItemEdit, id: 'edit-1', idempotencyKey: 'key-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T09:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockEdits)

        const { getQueuedItemEditsByItem } = await import('./db')
        const result = await getQueuedItemEditsByItem('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemEditQueue', 'by-item', 'item-1')
        expect(result).toEqual(mockEdits)
      })
    })

    describe('getItemEditQueueCount', () => {
      it('should return the count of queued item edits', async () => {
        mockCount.mockResolvedValue(3)

        const { getItemEditQueueCount } = await import('./db')
        const result = await getItemEditQueueCount()

        expect(mockCount).toHaveBeenCalledWith('itemEditQueue')
        expect(result).toBe(3)
      })
    })

    describe('updateItemEditStatus', () => {
      it('should update status and error for existing edit', async () => {
        const existingEdit: QueuedItemEdit = {
          ...mockItemEdit,
          id: 'edit-1',
          idempotencyKey: 'key-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingEdit)

        const { updateItemEditStatus } = await import('./db')
        await updateItemEditStatus('edit-1', 'failed', 'Network error')

        expect(mockPut).toHaveBeenCalledWith('itemEditQueue', {
          ...existingEdit,
          status: 'failed',
          lastError: 'Network error',
          retryCount: 1, // Incremented on failure
        })
      })

      it('should not increment retry count for syncing status', async () => {
        const existingEdit: QueuedItemEdit = {
          ...mockItemEdit,
          id: 'edit-1',
          idempotencyKey: 'key-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingEdit)

        const { updateItemEditStatus } = await import('./db')
        await updateItemEditStatus('edit-1', 'syncing')

        expect(mockPut).toHaveBeenCalledWith('itemEditQueue', {
          ...existingEdit,
          status: 'syncing',
          lastError: undefined,
          retryCount: 0, // Not incremented
        })
      })
    })

    describe('removeItemEditFromQueue', () => {
      it('should delete an item edit by id', async () => {
        const { removeItemEditFromQueue } = await import('./db')

        await removeItemEditFromQueue('edit-1')

        expect(mockDelete).toHaveBeenCalledWith('itemEditQueue', 'edit-1')
      })
    })

    describe('clearItemEditQueue', () => {
      it('should clear all item edits from queue', async () => {
        const { clearItemEditQueue } = await import('./db')

        await clearItemEditQueue()

        expect(mockClear).toHaveBeenCalledWith('itemEditQueue')
      })
    })
  })

  describe('Pending Images Operations', () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

    describe('addPendingImage', () => {
      it('should add a pending image to the queue', async () => {
        const { addPendingImage } = await import('./db')

        const result = await addPendingImage('item-1', mockBlob, 'test.jpg')

        expect(mockPut).toHaveBeenCalledWith('pendingImages', expect.objectContaining({
          itemId: 'item-1',
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: expect.any(String),
        }))
        expect(result.itemId).toBe('item-1')
        expect(result.status).toBe('pending')
      })
    })

    describe('getPendingImages', () => {
      it('should return all pending images', async () => {
        const mockImages: PendingImage[] = [
          { itemId: 'item-1', blob: mockBlob, filename: 'test1.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
          { itemId: 'item-2', blob: mockBlob, filename: 'test2.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T11:00:00Z' },
        ]
        mockGetAll.mockResolvedValue(mockImages)

        const { getPendingImages } = await import('./db')
        const result = await getPendingImages()

        expect(mockGetAll).toHaveBeenCalledWith('pendingImages')
        expect(result).toEqual(mockImages)
      })
    })

    describe('getPendingImageForItem', () => {
      it('should return pending image for specific item', async () => {
        const mockImage: PendingImage = {
          itemId: 'item-1',
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(mockImage)

        const { getPendingImageForItem } = await import('./db')
        const result = await getPendingImageForItem('item-1')

        expect(mockGet).toHaveBeenCalledWith('pendingImages', 'item-1')
        expect(result).toEqual(mockImage)
      })
    })

    describe('updatePendingImageStatus', () => {
      it('should update status and error for existing image', async () => {
        const existingImage: PendingImage = {
          itemId: 'item-1',
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingImage)

        const { updatePendingImageStatus } = await import('./db')
        await updatePendingImageStatus('item-1', 'failed', 'Upload failed')

        expect(mockPut).toHaveBeenCalledWith('pendingImages', {
          ...existingImage,
          status: 'failed',
          lastError: 'Upload failed',
          retryCount: 1,
        })
      })
    })

    describe('removePendingImage', () => {
      it('should delete a pending image by itemId', async () => {
        const { removePendingImage } = await import('./db')

        await removePendingImage('item-1')

        expect(mockDelete).toHaveBeenCalledWith('pendingImages', 'item-1')
      })
    })

    describe('getPendingImageCount', () => {
      it('should return the count of pending images', async () => {
        mockCount.mockResolvedValue(2)

        const { getPendingImageCount } = await import('./db')
        const result = await getPendingImageCount()

        expect(mockCount).toHaveBeenCalledWith('pendingImages')
        expect(result).toBe(2)
      })
    })
  })

  describe('updateCachedItem', () => {
    it('should update existing cached item', async () => {
      mockGet.mockResolvedValue(mockCachedItem)

      const { updateCachedItem } = await import('./db')
      const result = await updateCachedItem('item-1', { name: 'Updated Name' })

      expect(mockGet).toHaveBeenCalledWith('itemsCache', 'item-1')
      expect(mockPut).toHaveBeenCalledWith('itemsCache', expect.objectContaining({
        ...mockCachedItem,
        name: 'Updated Name',
        updatedAt: expect.any(String),
      }))
      expect(result?.name).toBe('Updated Name')
    })

    it('should return undefined for non-existent item', async () => {
      mockGet.mockResolvedValue(undefined)

      const { updateCachedItem } = await import('./db')
      const result = await updateCachedItem('non-existent', { name: 'Updated' })

      expect(result).toBeUndefined()
      expect(mockPut).not.toHaveBeenCalled()
    })
  })

  describe('applyPendingEditsToItems', () => {
    const mockItemEdit: Omit<QueuedItemEdit, 'id' | 'idempotencyKey' | 'status' | 'retryCount' | 'createdAt'> = {
      itemId: 'item-1',
      changes: { category_id: 'cat-2' },
      expectedVersion: 1,
      userId: 'user-1',
      deviceTimestamp: '2024-01-15T10:00:00Z',
    }

    it('should return original items when no pending edits exist', async () => {
      mockGetAllFromIndex.mockResolvedValue([])

      const items = [
        { id: 'item-1', name: 'Item 1', category_id: 'cat-1' },
        { id: 'item-2', name: 'Item 2', category_id: 'cat-1' },
      ]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      expect(result.items).toEqual(items)
      expect(result.pendingItemIds.size).toBe(0)
    })

    it('should return empty array when items array is empty', async () => {
      mockGetAllFromIndex.mockResolvedValue([])

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems([])

      expect(result.items).toEqual([])
      expect(result.pendingItemIds.size).toBe(0)
    })

    it('should apply single edit to matching item', async () => {
      const pendingEdit: QueuedItemEdit = {
        ...mockItemEdit,
        id: 'edit-1',
        idempotencyKey: 'key-1',
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
      }
      mockGetAllFromIndex.mockResolvedValue([pendingEdit])

      const items = [
        { id: 'item-1', name: 'Item 1', category_id: 'cat-1' },
        { id: 'item-2', name: 'Item 2', category_id: 'cat-1' },
      ]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      expect(result.items[0].category_id).toBe('cat-2') // Changed
      expect(result.items[1].category_id).toBe('cat-1') // Unchanged
      expect(result.pendingItemIds.has('item-1')).toBe(true)
      expect(result.pendingItemIds.has('item-2')).toBe(false)
    })

    it('should apply multiple edits to same item in order', async () => {
      const pendingEdits: QueuedItemEdit[] = [
        {
          ...mockItemEdit,
          id: 'edit-1',
          idempotencyKey: 'key-1',
          changes: { min_stock: 5 },
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T09:00:00Z',
        },
        {
          ...mockItemEdit,
          id: 'edit-2',
          idempotencyKey: 'key-2',
          changes: { min_stock: 10, max_stock: 100 },
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ]
      mockGetAllFromIndex.mockResolvedValue(pendingEdits)

      const items = [
        { id: 'item-1', name: 'Item 1', min_stock: 0, max_stock: 50 },
      ]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      // Second edit should win (applied last)
      expect(result.items[0].min_stock).toBe(10)
      expect(result.items[0].max_stock).toBe(100)
      expect(result.pendingItemIds.size).toBe(1)
    })

    it('should apply edits to multiple different items', async () => {
      const pendingEdits: QueuedItemEdit[] = [
        {
          ...mockItemEdit,
          itemId: 'item-1',
          id: 'edit-1',
          idempotencyKey: 'key-1',
          changes: { unit_price: 10.99 },
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T09:00:00Z',
        },
        {
          ...mockItemEdit,
          itemId: 'item-3',
          id: 'edit-2',
          idempotencyKey: 'key-2',
          changes: { unit_price: 25.00 },
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ]
      mockGetAllFromIndex.mockResolvedValue(pendingEdits)

      const items = [
        { id: 'item-1', name: 'Item 1', unit_price: 5.00 },
        { id: 'item-2', name: 'Item 2', unit_price: 15.00 },
        { id: 'item-3', name: 'Item 3', unit_price: 20.00 },
      ]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      expect(result.items[0].unit_price).toBe(10.99) // Changed
      expect(result.items[1].unit_price).toBe(15.00) // Unchanged
      expect(result.items[2].unit_price).toBe(25.00) // Changed
      expect(result.pendingItemIds.has('item-1')).toBe(true)
      expect(result.pendingItemIds.has('item-2')).toBe(false)
      expect(result.pendingItemIds.has('item-3')).toBe(true)
    })

    it('should not modify items that have no pending edits', async () => {
      const pendingEdit: QueuedItemEdit = {
        ...mockItemEdit,
        itemId: 'item-99', // Non-existent in items array
        id: 'edit-1',
        idempotencyKey: 'key-1',
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
      }
      mockGetAllFromIndex.mockResolvedValue([pendingEdit])

      const items = [
        { id: 'item-1', name: 'Item 1', category_id: 'cat-1' },
      ]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      expect(result.items[0]).toEqual(items[0])
      expect(result.pendingItemIds.has('item-99')).toBe(true)
      expect(result.pendingItemIds.has('item-1')).toBe(false)
    })

    it('should correctly populate pendingItemIds set', async () => {
      const pendingEdits: QueuedItemEdit[] = [
        {
          ...mockItemEdit,
          itemId: 'item-1',
          id: 'edit-1',
          idempotencyKey: 'key-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T09:00:00Z',
        },
        {
          ...mockItemEdit,
          itemId: 'item-1',
          id: 'edit-2',
          idempotencyKey: 'key-2',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          ...mockItemEdit,
          itemId: 'item-3',
          id: 'edit-3',
          idempotencyKey: 'key-3',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T11:00:00Z',
        },
      ]
      mockGetAllFromIndex.mockResolvedValue(pendingEdits)

      const items = [{ id: 'item-1', name: 'Item 1' }]

      const { applyPendingEditsToItems } = await import('./db')
      const result = await applyPendingEditsToItems(items)

      expect(result.pendingItemIds.size).toBe(2) // item-1 and item-3
      expect(result.pendingItemIds.has('item-1')).toBe(true)
      expect(result.pendingItemIds.has('item-3')).toBe(true)
    })
  })
})
