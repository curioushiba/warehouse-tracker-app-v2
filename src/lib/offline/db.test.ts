import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueuedTransaction, CachedItem, QueuedItemEdit, PendingImage, QueuedItemCreate, QueuedItemArchive } from './db'

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
  version: 1,
  updatedAt: '2024-01-15T10:00:00Z',
}

const mockItemCreateData = {
  name: 'New Item',
  description: 'Test description',
  category_id: 'cat-1',
  unit: 'pieces',
  min_stock: 10,
}

const mockArchiveData = {
  itemId: 'item-1',
  action: 'archive' as const,
  expectedVersion: 1,
  userId: 'user-1',
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
          id: expect.any(String),
          itemId: 'item-1',
          isOfflineItem: false,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: expect.any(String),
        }))
        expect(result.itemId).toBe('item-1')
        expect(result.status).toBe('pending')
        expect(result.isOfflineItem).toBe(false)
      })
    })

    describe('getPendingImages', () => {
      it('should return all pending images', async () => {
        const mockImages: PendingImage[] = [
          { id: 'img-1', itemId: 'item-1', isOfflineItem: false, blob: mockBlob, filename: 'test1.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
          { id: 'img-2', itemId: 'item-2', isOfflineItem: false, blob: mockBlob, filename: 'test2.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T11:00:00Z' },
        ]
        mockGetAll.mockResolvedValue(mockImages)

        const { getPendingImages } = await import('./db')
        const result = await getPendingImages()

        expect(mockGetAll).toHaveBeenCalledWith('pendingImages')
        expect(result).toEqual(mockImages)
      })
    })

    describe('getPendingImagesForItem', () => {
      it('should return pending images for specific item', async () => {
        const mockImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: false,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex.mockResolvedValue([mockImage])

        const { getPendingImagesForItem } = await import('./db')
        const result = await getPendingImagesForItem('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('pendingImages', 'by-item', 'item-1')
        expect(result).toEqual([mockImage])
      })
    })

    describe('updatePendingImageStatus', () => {
      it('should update status and error for existing image', async () => {
        const existingImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: false,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingImage)

        const { updatePendingImageStatus } = await import('./db')
        await updatePendingImageStatus('img-1', 'failed', 'Upload failed')

        expect(mockPut).toHaveBeenCalledWith('pendingImages', {
          ...existingImage,
          status: 'failed',
          lastError: 'Upload failed',
          retryCount: 1,
        })
      })
    })

    describe('removePendingImage', () => {
      it('should delete a pending image by id', async () => {
        const { removePendingImage } = await import('./db')

        await removePendingImage('img-1')

        expect(mockDelete).toHaveBeenCalledWith('pendingImages', 'img-1')
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

  describe('Item Create Queue Operations', () => {
    describe('addItemCreateToQueue', () => {
      it('should add a create with generated id, tempSku, and idempotencyKey', async () => {
        const { addItemCreateToQueue } = await import('./db')

        const result = await addItemCreateToQueue(mockItemCreateData, 'user-1')

        expect(mockPut).toHaveBeenCalledWith('itemCreateQueue', expect.objectContaining({
          id: 'mock-uuid-12345',
          idempotencyKey: 'mock-uuid-12345',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
        }))
        // tempSku is derived from id.slice(0, 8).toUpperCase()
        expect(result.tempSku).toBe('TEMP-MOCK-UUI')
        expect(result.id).toBe('mock-uuid-12345')
        expect(result.status).toBe('pending')
        expect(result.retryCount).toBe(0)
        // itemData should include the id
        expect(result.itemData.id).toBe('mock-uuid-12345')
        expect(result.itemData.name).toBe(mockItemCreateData.name)
      })

      it('should generate tempSku from first 8 chars of id uppercased', async () => {
        const { addItemCreateToQueue } = await import('./db')

        const result = await addItemCreateToQueue(mockItemCreateData, 'user-1')

        // With mock UUID 'mock-uuid-12345', slice(0,8) = 'mock-uui', uppercased = 'MOCK-UUI'
        expect(result.tempSku).toMatch(/^TEMP-/)
        expect(result.tempSku.length).toBe(13) // 'TEMP-' (5) + 8 chars
      })
    })

    describe('getQueuedItemCreates', () => {
      it('should return all creates ordered by creation', async () => {
        const mockCreates: QueuedItemCreate[] = [
          { id: 'create-1', tempSku: 'TEMP-AAAAAAAA', itemData: mockItemCreateData, idempotencyKey: 'key-1', userId: 'user-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T09:00:00Z', deviceTimestamp: '2024-01-15T09:00:00Z' },
          { id: 'create-2', tempSku: 'TEMP-BBBBBBBB', itemData: mockItemCreateData, idempotencyKey: 'key-2', userId: 'user-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z', deviceTimestamp: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockCreates)

        const { getQueuedItemCreates } = await import('./db')
        const result = await getQueuedItemCreates()

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemCreateQueue', 'by-created')
        expect(result).toEqual(mockCreates)
      })

      it('should return empty array when queue is empty', async () => {
        mockGetAllFromIndex.mockResolvedValue([])

        const { getQueuedItemCreates } = await import('./db')
        const result = await getQueuedItemCreates()

        expect(result).toEqual([])
      })
    })

    describe('getQueuedItemCreateById', () => {
      it('should return create by id', async () => {
        const mockCreate: QueuedItemCreate = {
          id: 'create-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: mockItemCreateData,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(mockCreate)

        const { getQueuedItemCreateById } = await import('./db')
        const result = await getQueuedItemCreateById('create-1')

        expect(mockGet).toHaveBeenCalledWith('itemCreateQueue', 'create-1')
        expect(result).toEqual(mockCreate)
      })

      it('should return undefined for non-existent id', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getQueuedItemCreateById } = await import('./db')
        const result = await getQueuedItemCreateById('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getQueuedItemCreatesByStatus', () => {
      it('should return creates filtered by status', async () => {
        const mockCreates: QueuedItemCreate[] = [
          { id: 'create-1', tempSku: 'TEMP-AAAAAAAA', itemData: mockItemCreateData, idempotencyKey: 'key-1', userId: 'user-1', status: 'failed', retryCount: 1, createdAt: '2024-01-15T10:00:00Z', deviceTimestamp: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockCreates)

        const { getQueuedItemCreatesByStatus } = await import('./db')
        const result = await getQueuedItemCreatesByStatus('failed')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemCreateQueue', 'by-status', 'failed')
        expect(result).toEqual(mockCreates)
      })
    })

    describe('getItemCreateQueueCount', () => {
      it('should return count of queued creates', async () => {
        mockCount.mockResolvedValue(3)

        const { getItemCreateQueueCount } = await import('./db')
        const result = await getItemCreateQueueCount()

        expect(mockCount).toHaveBeenCalledWith('itemCreateQueue')
        expect(result).toBe(3)
      })

      it('should return 0 when empty', async () => {
        mockCount.mockResolvedValue(0)

        const { getItemCreateQueueCount } = await import('./db')
        const result = await getItemCreateQueueCount()

        expect(result).toBe(0)
      })
    })

    describe('updateItemCreateStatus', () => {
      it('should update status and set error', async () => {
        const existingCreate: QueuedItemCreate = {
          id: 'create-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: mockItemCreateData,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingCreate)

        const { updateItemCreateStatus } = await import('./db')
        await updateItemCreateStatus('create-1', 'failed', 'Network error')

        expect(mockPut).toHaveBeenCalledWith('itemCreateQueue', {
          ...existingCreate,
          status: 'failed',
          lastError: 'Network error',
          retryCount: 1, // Incremented on failure
        })
      })

      it('should increment retryCount on failed status', async () => {
        const existingCreate: QueuedItemCreate = {
          id: 'create-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: mockItemCreateData,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'syncing',
          retryCount: 2,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingCreate)

        const { updateItemCreateStatus } = await import('./db')
        await updateItemCreateStatus('create-1', 'failed', 'Server error')

        expect(mockPut).toHaveBeenCalledWith('itemCreateQueue', expect.objectContaining({
          retryCount: 3, // Incremented from 2 to 3
        }))
      })

      it('should not increment retryCount on syncing status', async () => {
        const existingCreate: QueuedItemCreate = {
          id: 'create-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: mockItemCreateData,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingCreate)

        const { updateItemCreateStatus } = await import('./db')
        await updateItemCreateStatus('create-1', 'syncing')

        expect(mockPut).toHaveBeenCalledWith('itemCreateQueue', {
          ...existingCreate,
          status: 'syncing',
          lastError: undefined,
          retryCount: 0, // Not incremented
        })
      })
    })

    describe('updateItemCreateData', () => {
      it('should merge new itemData with existing', async () => {
        const existingCreate: QueuedItemCreate = {
          id: 'create-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: { name: 'Original', unit: 'pcs' },
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingCreate)

        const { updateItemCreateData } = await import('./db')
        await updateItemCreateData('create-1', { name: 'Updated', min_stock: 5 })

        expect(mockPut).toHaveBeenCalledWith('itemCreateQueue', {
          ...existingCreate,
          itemData: { name: 'Updated', unit: 'pcs', min_stock: 5 },
        })
      })

      it('should do nothing for non-existent id', async () => {
        mockGet.mockResolvedValue(undefined)

        const { updateItemCreateData } = await import('./db')
        await updateItemCreateData('non-existent', { name: 'Updated' })

        expect(mockPut).not.toHaveBeenCalled()
      })
    })

    describe('removeItemCreateFromQueue', () => {
      it('should delete create by id', async () => {
        const { removeItemCreateFromQueue } = await import('./db')

        await removeItemCreateFromQueue('create-1')

        expect(mockDelete).toHaveBeenCalledWith('itemCreateQueue', 'create-1')
      })
    })

    describe('clearItemCreateQueue', () => {
      it('should clear all creates from queue', async () => {
        const { clearItemCreateQueue } = await import('./db')

        await clearItemCreateQueue()

        expect(mockClear).toHaveBeenCalledWith('itemCreateQueue')
      })
    })
  })

  describe('Item Archive Queue Operations', () => {
    describe('addItemArchiveToQueue', () => {
      it('should add archive with generated id and idempotencyKey', async () => {
        const { addItemArchiveToQueue } = await import('./db')

        const result = await addItemArchiveToQueue('item-1', 'archive', 1, 'user-1')

        expect(mockPut).toHaveBeenCalledWith('itemArchiveQueue', expect.objectContaining({
          id: 'mock-uuid-12345',
          itemId: 'item-1',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'mock-uuid-12345',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: expect.any(String),
          deviceTimestamp: expect.any(String),
        }))
        expect(result.id).toBe('mock-uuid-12345')
        expect(result.status).toBe('pending')
        expect(result.retryCount).toBe(0)
      })

      it('should store action correctly for archive', async () => {
        const { addItemArchiveToQueue } = await import('./db')

        const result = await addItemArchiveToQueue('item-1', 'archive', 1, 'user-1')

        expect(result.action).toBe('archive')
      })

      it('should store action correctly for restore', async () => {
        const { addItemArchiveToQueue } = await import('./db')

        const result = await addItemArchiveToQueue('item-1', 'restore', 2, 'user-1')

        expect(result.action).toBe('restore')
        expect(mockPut).toHaveBeenCalledWith('itemArchiveQueue', expect.objectContaining({
          action: 'restore',
          expectedVersion: 2,
        }))
      })
    })

    describe('getQueuedItemArchives', () => {
      it('should return all archives ordered by creation', async () => {
        const mockArchives: QueuedItemArchive[] = [
          { id: 'archive-1', itemId: 'item-1', action: 'archive', expectedVersion: 1, idempotencyKey: 'key-1', userId: 'user-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T09:00:00Z', deviceTimestamp: '2024-01-15T09:00:00Z' },
          { id: 'archive-2', itemId: 'item-2', action: 'restore', expectedVersion: 2, idempotencyKey: 'key-2', userId: 'user-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z', deviceTimestamp: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockArchives)

        const { getQueuedItemArchives } = await import('./db')
        const result = await getQueuedItemArchives()

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemArchiveQueue', 'by-created')
        expect(result).toEqual(mockArchives)
      })

      it('should return empty array when queue is empty', async () => {
        mockGetAllFromIndex.mockResolvedValue([])

        const { getQueuedItemArchives } = await import('./db')
        const result = await getQueuedItemArchives()

        expect(result).toEqual([])
      })
    })

    describe('getQueuedArchivesByItem', () => {
      it('should return archives for specific itemId', async () => {
        const mockArchives: QueuedItemArchive[] = [
          { id: 'archive-1', itemId: 'item-1', action: 'archive', expectedVersion: 1, idempotencyKey: 'key-1', userId: 'user-1', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z', deviceTimestamp: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockArchives)

        const { getQueuedArchivesByItem } = await import('./db')
        const result = await getQueuedArchivesByItem('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemArchiveQueue', 'by-item', 'item-1')
        expect(result).toEqual(mockArchives)
      })

      it('should return empty array for non-existent item', async () => {
        mockGetAllFromIndex.mockResolvedValue([])

        const { getQueuedArchivesByItem } = await import('./db')
        const result = await getQueuedArchivesByItem('non-existent')

        expect(result).toEqual([])
      })
    })

    describe('getQueuedArchivesByStatus', () => {
      it('should return archives filtered by status', async () => {
        const mockArchives: QueuedItemArchive[] = [
          { id: 'archive-1', itemId: 'item-1', action: 'archive', expectedVersion: 1, idempotencyKey: 'key-1', userId: 'user-1', status: 'failed', retryCount: 1, createdAt: '2024-01-15T10:00:00Z', deviceTimestamp: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockArchives)

        const { getQueuedArchivesByStatus } = await import('./db')
        const result = await getQueuedArchivesByStatus('failed')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('itemArchiveQueue', 'by-status', 'failed')
        expect(result).toEqual(mockArchives)
      })
    })

    describe('getItemArchiveQueueCount', () => {
      it('should return count of queued archives', async () => {
        mockCount.mockResolvedValue(4)

        const { getItemArchiveQueueCount } = await import('./db')
        const result = await getItemArchiveQueueCount()

        expect(mockCount).toHaveBeenCalledWith('itemArchiveQueue')
        expect(result).toBe(4)
      })

      it('should return 0 when empty', async () => {
        mockCount.mockResolvedValue(0)

        const { getItemArchiveQueueCount } = await import('./db')
        const result = await getItemArchiveQueueCount()

        expect(result).toBe(0)
      })
    })

    describe('updateItemArchiveStatus', () => {
      it('should update status and set error', async () => {
        const existingArchive: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-1',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingArchive)

        const { updateItemArchiveStatus } = await import('./db')
        await updateItemArchiveStatus('archive-1', 'failed', 'Version conflict')

        expect(mockPut).toHaveBeenCalledWith('itemArchiveQueue', {
          ...existingArchive,
          status: 'failed',
          lastError: 'Version conflict',
          retryCount: 1, // Incremented on failure
        })
      })

      it('should increment retryCount on failed status', async () => {
        const existingArchive: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-1',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'syncing',
          retryCount: 2,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingArchive)

        const { updateItemArchiveStatus } = await import('./db')
        await updateItemArchiveStatus('archive-1', 'failed', 'Server error')

        expect(mockPut).toHaveBeenCalledWith('itemArchiveQueue', expect.objectContaining({
          retryCount: 3, // Incremented from 2 to 3
        }))
      })

      it('should not increment retryCount on syncing status', async () => {
        const existingArchive: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-1',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(existingArchive)

        const { updateItemArchiveStatus } = await import('./db')
        await updateItemArchiveStatus('archive-1', 'syncing')

        expect(mockPut).toHaveBeenCalledWith('itemArchiveQueue', {
          ...existingArchive,
          status: 'syncing',
          lastError: undefined,
          retryCount: 0, // Not incremented
        })
      })
    })

    describe('removeItemArchiveFromQueue', () => {
      it('should delete archive by id', async () => {
        const { removeItemArchiveFromQueue } = await import('./db')

        await removeItemArchiveFromQueue('archive-1')

        expect(mockDelete).toHaveBeenCalledWith('itemArchiveQueue', 'archive-1')
      })
    })

    describe('clearItemArchiveQueue', () => {
      it('should clear all archives from queue', async () => {
        const { clearItemArchiveQueue } = await import('./db')

        await clearItemArchiveQueue()

        expect(mockClear).toHaveBeenCalledWith('itemArchiveQueue')
      })
    })
  })

  describe('Extended Pending Images Operations', () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

    describe('addPendingImage with isOfflineItem', () => {
      it('should set status to waiting_for_item when isOfflineItem is true', async () => {
        const { addPendingImage } = await import('./db')

        const result = await addPendingImage('offline-item-1', mockBlob, 'test.jpg', true)

        expect(mockPut).toHaveBeenCalledWith('pendingImages', expect.objectContaining({
          itemId: 'offline-item-1',
          isOfflineItem: true,
          status: 'waiting_for_item',
        }))
        expect(result.status).toBe('waiting_for_item')
        expect(result.isOfflineItem).toBe(true)
      })
    })

    describe('getPendingImageById', () => {
      it('should return image by id', async () => {
        const mockImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: false,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGet.mockResolvedValue(mockImage)

        const { getPendingImageById } = await import('./db')
        const result = await getPendingImageById('img-1')

        expect(mockGet).toHaveBeenCalledWith('pendingImages', 'img-1')
        expect(result).toEqual(mockImage)
      })

      it('should return undefined for non-existent id', async () => {
        mockGet.mockResolvedValue(undefined)

        const { getPendingImageById } = await import('./db')
        const result = await getPendingImageById('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getPendingImagesByStatus', () => {
      it('should return images filtered by status', async () => {
        const mockImages: PendingImage[] = [
          { id: 'img-1', itemId: 'item-1', isOfflineItem: true, blob: mockBlob, filename: 'test.jpg', mimeType: 'image/jpeg', status: 'waiting_for_item', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(mockImages)

        const { getPendingImagesByStatus } = await import('./db')
        const result = await getPendingImagesByStatus('waiting_for_item')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('pendingImages', 'by-status', 'waiting_for_item')
        expect(result).toEqual(mockImages)
      })
    })

    describe('transitionWaitingImagesToReady', () => {
      it('should change waiting_for_item to pending', async () => {
        const waitingImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: true,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'waiting_for_item',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex.mockResolvedValue([waitingImage])

        const { transitionWaitingImagesToReady } = await import('./db')
        await transitionWaitingImagesToReady('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('pendingImages', 'by-item', 'item-1')
        expect(mockPut).toHaveBeenCalledWith('pendingImages', {
          ...waitingImage,
          status: 'pending',
          isOfflineItem: false,
        })
      })

      it('should set isOfflineItem to false', async () => {
        const waitingImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: true,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'waiting_for_item',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex.mockResolvedValue([waitingImage])

        const { transitionWaitingImagesToReady } = await import('./db')
        await transitionWaitingImagesToReady('item-1')

        expect(mockPut).toHaveBeenCalledWith('pendingImages', expect.objectContaining({
          isOfflineItem: false,
        }))
      })

      it('should only affect images for specified itemId', async () => {
        const image1: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: true,
          blob: mockBlob,
          filename: 'test1.jpg',
          mimeType: 'image/jpeg',
          status: 'waiting_for_item',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex.mockResolvedValue([image1])

        const { transitionWaitingImagesToReady } = await import('./db')
        await transitionWaitingImagesToReady('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('pendingImages', 'by-item', 'item-1')
        expect(mockPut).toHaveBeenCalledTimes(1)
      })

      it('should ignore images already in other statuses', async () => {
        const pendingImage: PendingImage = {
          id: 'img-1',
          itemId: 'item-1',
          isOfflineItem: false,
          blob: mockBlob,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          status: 'pending', // Already pending, not waiting_for_item
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex.mockResolvedValue([pendingImage])

        const { transitionWaitingImagesToReady } = await import('./db')
        await transitionWaitingImagesToReady('item-1')

        expect(mockPut).not.toHaveBeenCalled()
      })
    })

    describe('removePendingImagesForItem', () => {
      it('should remove all images for specified itemId', async () => {
        const images: PendingImage[] = [
          { id: 'img-1', itemId: 'item-1', isOfflineItem: false, blob: mockBlob, filename: 'test1.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T10:00:00Z' },
          { id: 'img-2', itemId: 'item-1', isOfflineItem: false, blob: mockBlob, filename: 'test2.jpg', mimeType: 'image/jpeg', status: 'pending', retryCount: 0, createdAt: '2024-01-15T11:00:00Z' },
        ]
        mockGetAllFromIndex.mockResolvedValue(images)

        // Setup transaction mock with store.delete
        const mockStoreDelete = vi.fn()
        mockTransaction.mockReturnValue({
          store: { delete: mockStoreDelete },
          done: Promise.resolve(),
        })

        const { removePendingImagesForItem } = await import('./db')
        await removePendingImagesForItem('item-1')

        expect(mockGetAllFromIndex).toHaveBeenCalledWith('pendingImages', 'by-item', 'item-1')
        expect(mockTransaction).toHaveBeenCalledWith('pendingImages', 'readwrite')
        expect(mockStoreDelete).toHaveBeenCalledWith('img-1')
        expect(mockStoreDelete).toHaveBeenCalledWith('img-2')
      })

      it('should use transaction for batch delete', async () => {
        mockGetAllFromIndex.mockResolvedValue([])
        mockTransaction.mockReturnValue({
          store: { delete: vi.fn() },
          done: Promise.resolve(),
        })

        const { removePendingImagesForItem } = await import('./db')
        await removePendingImagesForItem('item-1')

        expect(mockTransaction).toHaveBeenCalledWith('pendingImages', 'readwrite')
      })
    })
  })

  describe('Utility Functions', () => {
    describe('cacheItem', () => {
      it('should add single item to cache', async () => {
        const { cacheItem } = await import('./db')

        await cacheItem(mockCachedItem)

        expect(mockPut).toHaveBeenCalledWith('itemsCache', mockCachedItem)
      })

      it('should overwrite existing item with same id', async () => {
        const { cacheItem } = await import('./db')
        const updatedItem = { ...mockCachedItem, name: 'Updated Name' }

        await cacheItem(updatedItem)

        expect(mockPut).toHaveBeenCalledWith('itemsCache', updatedItem)
      })
    })

    describe('getAllQueueCounts', () => {
      it('should return counts for all queues', async () => {
        mockCount
          .mockResolvedValueOnce(2) // creates
          .mockResolvedValueOnce(3) // edits
          .mockResolvedValueOnce(1) // archives
          .mockResolvedValueOnce(4) // images
          .mockResolvedValueOnce(5) // transactions

        const { getAllQueueCounts } = await import('./db')
        const result = await getAllQueueCounts()

        expect(result).toEqual({
          creates: 2,
          edits: 3,
          archives: 1,
          images: 4,
          transactions: 5,
        })
      })

      it('should return zeros when all queues empty', async () => {
        mockCount.mockResolvedValue(0)

        const { getAllQueueCounts } = await import('./db')
        const result = await getAllQueueCounts()

        expect(result).toEqual({
          creates: 0,
          edits: 0,
          archives: 0,
          images: 0,
          transactions: 0,
        })
      })
    })

    describe('applyPendingOperationsToItems', () => {
      const mockItemEdit: Omit<QueuedItemEdit, 'id' | 'idempotencyKey' | 'status' | 'retryCount' | 'createdAt'> = {
        itemId: 'item-1',
        changes: { category_id: 'cat-2' },
        expectedVersion: 1,
        userId: 'user-1',
        deviceTimestamp: '2024-01-15T10:00:00Z',
      }

      it('should return original items when no pending operations', async () => {
        mockGetAllFromIndex
          .mockResolvedValueOnce([]) // creates
          .mockResolvedValueOnce([]) // edits
          .mockResolvedValueOnce([]) // archives

        const items = [
          { id: 'item-1', name: 'Item 1', is_archived: false },
          { id: 'item-2', name: 'Item 2', is_archived: false },
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.items).toEqual(items)
        expect(result.pendingOperations.size).toBe(0)
        expect(result.offlineItemIds.size).toBe(0)
      })

      it('should add offline-created items to beginning of list', async () => {
        const pendingCreate: QueuedItemCreate = {
          id: 'offline-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: { name: 'Offline Item', unit: 'pcs' },
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([pendingCreate]) // creates
          .mockResolvedValueOnce([]) // edits
          .mockResolvedValueOnce([]) // archives

        const serverItems = [
          { id: 'item-1', name: 'Server Item', is_archived: false },
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(serverItems)

        expect(result.items.length).toBe(2)
        expect(result.items[0].id).toBe('offline-1') // Offline item first
        expect(result.items[0].sku).toBe('TEMP-AAAAAAAA')
        expect(result.items[1].id).toBe('item-1') // Server item second
        expect(result.offlineItemIds.has('offline-1')).toBe(true)
      })

      it('should apply pending edits to matching items', async () => {
        const pendingEdit: QueuedItemEdit = {
          ...mockItemEdit,
          id: 'edit-1',
          idempotencyKey: 'key-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([]) // creates
          .mockResolvedValueOnce([pendingEdit]) // edits
          .mockResolvedValueOnce([]) // archives

        const items = [
          { id: 'item-1', name: 'Item 1', category_id: 'cat-1', is_archived: false },
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.items[0].category_id).toBe('cat-2') // Changed by edit
        expect(result.pendingOperations.get('item-1')?.has('pending_edit')).toBe(true)
      })

      it('should filter out items with pending archive', async () => {
        const pendingArchive: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-1',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([]) // creates
          .mockResolvedValueOnce([]) // edits
          .mockResolvedValueOnce([pendingArchive]) // archives

        const items = [
          { id: 'item-1', name: 'Item 1', is_archived: false },
          { id: 'item-2', name: 'Item 2', is_archived: false },
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.items.length).toBe(1)
        expect(result.items[0].id).toBe('item-2') // Only item-2 remains
        expect(result.pendingOperations.get('item-1')?.has('pending_archive')).toBe(true)
      })

      it('should show items with pending restore', async () => {
        const pendingRestore: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-1',
          action: 'restore',
          expectedVersion: 1,
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([]) // creates
          .mockResolvedValueOnce([]) // edits
          .mockResolvedValueOnce([pendingRestore]) // archives

        const items = [
          { id: 'item-1', name: 'Item 1', is_archived: true }, // Server says archived
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.items.length).toBe(1)
        expect(result.items[0].id).toBe('item-1') // Item shown due to pending restore
        expect(result.pendingOperations.get('item-1')?.has('pending_restore')).toBe(true)
      })

      it('should set correct pendingOperations map with operation types', async () => {
        const pendingCreate: QueuedItemCreate = {
          id: 'offline-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: { name: 'Offline' },
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T09:00:00Z',
          deviceTimestamp: '2024-01-15T09:00:00Z',
        }
        const pendingEdit: QueuedItemEdit = {
          ...mockItemEdit,
          itemId: 'item-1',
          id: 'edit-1',
          idempotencyKey: 'key-2',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
        }
        const pendingArchive: QueuedItemArchive = {
          id: 'archive-1',
          itemId: 'item-2',
          action: 'archive',
          expectedVersion: 1,
          idempotencyKey: 'key-3',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T11:00:00Z',
          deviceTimestamp: '2024-01-15T11:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([pendingCreate]) // creates
          .mockResolvedValueOnce([pendingEdit]) // edits
          .mockResolvedValueOnce([pendingArchive]) // archives

        const items = [
          { id: 'item-1', name: 'Item 1', is_archived: false },
          { id: 'item-2', name: 'Item 2', is_archived: false },
        ]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.pendingOperations.get('offline-1')?.has('offline')).toBe(true)
        expect(result.pendingOperations.get('item-1')?.has('pending_edit')).toBe(true)
        expect(result.pendingOperations.get('item-2')?.has('pending_archive')).toBe(true)
      })

      it('should set correct offlineItemIds set', async () => {
        const pendingCreate1: QueuedItemCreate = {
          id: 'offline-1',
          tempSku: 'TEMP-AAAAAAAA',
          itemData: { name: 'Offline 1' },
          idempotencyKey: 'key-1',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T09:00:00Z',
          deviceTimestamp: '2024-01-15T09:00:00Z',
        }
        const pendingCreate2: QueuedItemCreate = {
          id: 'offline-2',
          tempSku: 'TEMP-BBBBBBBB',
          itemData: { name: 'Offline 2' },
          idempotencyKey: 'key-2',
          userId: 'user-1',
          status: 'pending',
          retryCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          deviceTimestamp: '2024-01-15T10:00:00Z',
        }
        mockGetAllFromIndex
          .mockResolvedValueOnce([pendingCreate1, pendingCreate2]) // creates
          .mockResolvedValueOnce([]) // edits
          .mockResolvedValueOnce([]) // archives

        const items = [{ id: 'item-1', name: 'Server Item', is_archived: false }]

        const { applyPendingOperationsToItems } = await import('./db')
        const result = await applyPendingOperationsToItems(items)

        expect(result.offlineItemIds.size).toBe(2)
        expect(result.offlineItemIds.has('offline-1')).toBe(true)
        expect(result.offlineItemIds.has('offline-2')).toBe(true)
        expect(result.offlineItemIds.has('item-1')).toBe(false)
      })
    })
  })
})
