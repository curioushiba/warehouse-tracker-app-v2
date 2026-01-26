import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { TransactionType, ItemUpdate, ItemInsert, Item, Category } from '@/lib/supabase/types'

// Offline transaction queue item
export interface QueuedTransaction {
  id: string
  transactionType: TransactionType
  itemId: string
  quantity: number
  notes?: string
  sourceLocationId?: string
  destinationLocationId?: string
  deviceTimestamp: string
  idempotencyKey: string
  userId: string
  retryCount: number
  lastError?: string
  createdAt: string
}

// Cached item for offline access
export interface CachedItem {
  id: string
  sku: string
  name: string
  description?: string
  categoryId?: string
  locationId?: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  barcode?: string
  unitPrice?: number
  imageUrl?: string
  version: number
  isArchived?: boolean
  isOfflineCreated?: boolean // Flag for items created offline
  updatedAt: string
}

// Shared status type for all item operations
export type ItemOperationStatus = 'pending' | 'syncing' | 'failed'

// Item edit queue types (alias for backwards compatibility)
export type ItemEditStatus = ItemOperationStatus

export interface QueuedItemEdit {
  id: string
  itemId: string
  changes: Partial<ItemUpdate>
  expectedVersion: number
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

// Item create queue for offline item creation
export interface QueuedItemCreate {
  id: string                    // Client-generated UUID (becomes actual item ID)
  tempSku: string               // Temporary SKU: "TEMP-XXXXXXXX"
  itemData: Partial<ItemInsert> // Full item data
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

// Item archive queue for offline archive/restore operations
export interface QueuedItemArchive {
  id: string                    // Queue entry ID
  itemId: string                // Target item
  action: 'archive' | 'restore'
  expectedVersion: number
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

// Pending image upload (updated for offline-created items)
export type PendingImageStatus = 'pending' | 'uploading' | 'failed' | 'waiting_for_item'

export interface PendingImage {
  id: string                    // Unique ID for the pending image
  itemId: string
  isOfflineItem: boolean        // True if item not yet synced to server
  blob: Blob
  filename: string
  mimeType: string
  createdAt: string
  status: PendingImageStatus
  retryCount: number
  lastError?: string
}

// Cached category for offline access
export interface CachedCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  createdAt: string
}

// Database schema
interface InventoryDB extends DBSchema {
  transactionQueue: {
    key: string
    value: QueuedTransaction
    indexes: {
      'by-created': string
      'by-item': string
    }
  }
  itemsCache: {
    key: string
    value: CachedItem
    indexes: {
      'by-sku': string
      'by-barcode': string
    }
  }
  metadata: {
    key: string
    value: {
      key: string
      value: string | number | boolean
      updatedAt: string
    }
  }
  itemEditQueue: {
    key: string
    value: QueuedItemEdit
    indexes: {
      'by-created': string
      'by-item': string
      'by-status': ItemOperationStatus
    }
  }
  pendingImages: {
    key: string
    value: PendingImage
    indexes: {
      'by-status': PendingImageStatus
      'by-item': string
    }
  }
  itemCreateQueue: {
    key: string
    value: QueuedItemCreate
    indexes: {
      'by-created': string
      'by-status': ItemOperationStatus
    }
  }
  itemArchiveQueue: {
    key: string
    value: QueuedItemArchive
    indexes: {
      'by-created': string
      'by-item': string
      'by-status': ItemOperationStatus
    }
  }
  categoriesCache: {
    key: string
    value: CachedCategory
  }
}

const DB_NAME = 'inventory-tracker-offline'
const DB_VERSION = 4

let dbPromise: Promise<IDBPDatabase<InventoryDB>> | null = null

export async function getDB(): Promise<IDBPDatabase<InventoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<InventoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: Initial stores
        if (oldVersion < 1) {
          // Transaction queue store
          if (!db.objectStoreNames.contains('transactionQueue')) {
            const txStore = db.createObjectStore('transactionQueue', { keyPath: 'id' })
            txStore.createIndex('by-created', 'createdAt')
            txStore.createIndex('by-item', 'itemId')
          }

          // Items cache store
          if (!db.objectStoreNames.contains('itemsCache')) {
            const itemsStore = db.createObjectStore('itemsCache', { keyPath: 'id' })
            itemsStore.createIndex('by-sku', 'sku', { unique: true })
            itemsStore.createIndex('by-barcode', 'barcode')
          }

          // Metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' })
          }
        }

        // Version 2: Add item edit queue and pending images
        if (oldVersion < 2) {
          // Item edit queue store
          if (!db.objectStoreNames.contains('itemEditQueue')) {
            const editStore = db.createObjectStore('itemEditQueue', { keyPath: 'id' })
            editStore.createIndex('by-created', 'createdAt')
            editStore.createIndex('by-item', 'itemId')
            editStore.createIndex('by-status', 'status')
          }

          // Pending images store (v2 schema - will be updated in v3)
          if (!db.objectStoreNames.contains('pendingImages')) {
            const imageStore = db.createObjectStore('pendingImages', { keyPath: 'itemId' })
            imageStore.createIndex('by-status', 'status')
          }
        }

        // Version 3: Add item create/archive queues, update pending images
        if (oldVersion < 3) {
          // Item create queue store
          if (!db.objectStoreNames.contains('itemCreateQueue')) {
            const createStore = db.createObjectStore('itemCreateQueue', { keyPath: 'id' })
            createStore.createIndex('by-created', 'createdAt')
            createStore.createIndex('by-status', 'status')
          }

          // Item archive queue store
          if (!db.objectStoreNames.contains('itemArchiveQueue')) {
            const archiveStore = db.createObjectStore('itemArchiveQueue', { keyPath: 'id' })
            archiveStore.createIndex('by-created', 'createdAt')
            archiveStore.createIndex('by-item', 'itemId')
            archiveStore.createIndex('by-status', 'status')
          }

          // Recreate pending images store with new schema (id as keyPath, by-item index)
          if (db.objectStoreNames.contains('pendingImages')) {
            // Note: We can't easily migrate data during upgrade, so we delete and recreate
            // Any pending images from v2 will be lost - acceptable trade-off for schema change
            db.deleteObjectStore('pendingImages')
          }
          const imageStore = db.createObjectStore('pendingImages', { keyPath: 'id' })
          imageStore.createIndex('by-status', 'status')
          imageStore.createIndex('by-item', 'itemId')
        }

        // Version 4: Add categories cache
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('categoriesCache')) {
            db.createObjectStore('categoriesCache', { keyPath: 'id' })
          }
        }
      },
    })
  }
  return dbPromise
}

// Transaction Queue Operations
export async function addToQueue(transaction: Omit<QueuedTransaction, 'retryCount' | 'createdAt'>): Promise<void> {
  const db = await getDB()
  await db.put('transactionQueue', {
    ...transaction,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  })
}

export async function getQueuedTransactions(): Promise<QueuedTransaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactionQueue', 'by-created')
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('transactionQueue')
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('transactionQueue', id)
}

export async function updateQueueItem(id: string, updates: Partial<QueuedTransaction>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('transactionQueue', id)
  if (existing) {
    await db.put('transactionQueue', { ...existing, ...updates })
  }
}

export async function incrementRetryCount(id: string, error: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('transactionQueue', id)
  if (existing) {
    await db.put('transactionQueue', {
      ...existing,
      retryCount: existing.retryCount + 1,
      lastError: error,
    })
  }
}

export async function clearQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('transactionQueue')
}

// Items Cache Operations
export async function cacheItems(items: CachedItem[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('itemsCache', 'readwrite')
  await Promise.all([
    ...items.map(item => tx.store.put(item)),
    tx.done,
  ])
}

export async function getCachedItem(id: string): Promise<CachedItem | undefined> {
  const db = await getDB()
  return db.get('itemsCache', id)
}

export async function getCachedItemBySku(sku: string): Promise<CachedItem | undefined> {
  const db = await getDB()
  return db.getFromIndex('itemsCache', 'by-sku', sku)
}

export async function getCachedItemByBarcode(barcode: string): Promise<CachedItem | undefined> {
  const db = await getDB()
  return db.getFromIndex('itemsCache', 'by-barcode', barcode)
}

export async function getAllCachedItems(): Promise<CachedItem[]> {
  const db = await getDB()
  return db.getAll('itemsCache')
}

export async function clearItemsCache(): Promise<void> {
  const db = await getDB()
  await db.clear('itemsCache')
}

// Metadata Operations
export async function setMetadata(key: string, value: string | number | boolean): Promise<void> {
  const db = await getDB()
  await db.put('metadata', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export async function getMetadata(key: string): Promise<string | number | boolean | undefined> {
  const db = await getDB()
  const record = await db.get('metadata', key)
  return record?.value
}

export async function getLastSyncTime(): Promise<string | undefined> {
  const value = await getMetadata('lastSyncTime')
  return typeof value === 'string' ? value : undefined
}

export async function setLastSyncTime(time: string): Promise<void> {
  await setMetadata('lastSyncTime', time)
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await getMetadata('deviceId')
  if (!deviceId || typeof deviceId !== 'string') {
    deviceId = `device-${crypto.randomUUID()}`
    await setMetadata('deviceId', deviceId)
  }
  return deviceId as string
}

// Item Edit Queue Operations
export async function addItemEditToQueue(
  edit: Omit<QueuedItemEdit, 'id' | 'idempotencyKey' | 'status' | 'retryCount' | 'createdAt'>
): Promise<QueuedItemEdit> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const idempotencyKey = crypto.randomUUID()
  const queuedEdit: QueuedItemEdit = {
    ...edit,
    id,
    idempotencyKey,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  }
  await db.put('itemEditQueue', queuedEdit)
  return queuedEdit
}

export async function getQueuedItemEdits(): Promise<QueuedItemEdit[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemEditQueue', 'by-created')
}

export async function getQueuedItemEditsByItem(itemId: string): Promise<QueuedItemEdit[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemEditQueue', 'by-item', itemId)
}

export async function getQueuedItemEditsByStatus(status: ItemEditStatus): Promise<QueuedItemEdit[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemEditQueue', 'by-status', status)
}

export async function getItemEditQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('itemEditQueue')
}

export async function updateItemEditStatus(
  id: string,
  status: ItemEditStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('itemEditQueue', id)
  if (existing) {
    await db.put('itemEditQueue', {
      ...existing,
      status,
      lastError: error,
      retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
    })
  }
}

export async function removeItemEditFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('itemEditQueue', id)
}

export async function clearItemEditQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('itemEditQueue')
}

// Pending Images Operations (v3 schema - uses id as keyPath)
export async function addPendingImage(
  itemId: string,
  blob: Blob,
  filename: string,
  isOfflineItem: boolean = false
): Promise<PendingImage> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const pendingImage: PendingImage = {
    id,
    itemId,
    isOfflineItem,
    blob,
    filename,
    mimeType: blob.type,
    createdAt: new Date().toISOString(),
    status: isOfflineItem ? 'waiting_for_item' : 'pending',
    retryCount: 0,
  }
  await db.put('pendingImages', pendingImage)
  return pendingImage
}

export async function getPendingImages(): Promise<PendingImage[]> {
  const db = await getDB()
  return db.getAll('pendingImages')
}

export async function getPendingImageById(id: string): Promise<PendingImage | undefined> {
  const db = await getDB()
  return db.get('pendingImages', id)
}

export async function getPendingImagesForItem(itemId: string): Promise<PendingImage[]> {
  const db = await getDB()
  return db.getAllFromIndex('pendingImages', 'by-item', itemId)
}

export async function getPendingImagesByStatus(status: PendingImageStatus): Promise<PendingImage[]> {
  const db = await getDB()
  return db.getAllFromIndex('pendingImages', 'by-status', status)
}

export async function updatePendingImageStatus(
  id: string,
  status: PendingImageStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('pendingImages', id)
  if (existing) {
    await db.put('pendingImages', {
      ...existing,
      status,
      lastError: error,
      retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
    })
  }
}

export async function transitionWaitingImagesToReady(itemId: string): Promise<void> {
  const db = await getDB()
  const images = await db.getAllFromIndex('pendingImages', 'by-item', itemId)
  for (const image of images) {
    if (image.status === 'waiting_for_item') {
      await db.put('pendingImages', {
        ...image,
        status: 'pending',
        isOfflineItem: false,
      })
    }
  }
}

export async function removePendingImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingImages', id)
}

export async function removePendingImagesForItem(itemId: string): Promise<void> {
  const db = await getDB()
  const images = await db.getAllFromIndex('pendingImages', 'by-item', itemId)
  const tx = db.transaction('pendingImages', 'readwrite')
  await Promise.all([
    ...images.map(img => tx.store.delete(img.id)),
    tx.done,
  ])
}

export async function getPendingImageCount(): Promise<number> {
  const db = await getDB()
  return db.count('pendingImages')
}

// Update cached item with offline edits
export async function updateCachedItem(
  id: string,
  updates: Partial<CachedItem>
): Promise<CachedItem | undefined> {
  const db = await getDB()
  const existing = await db.get('itemsCache', id)
  if (existing) {
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    await db.put('itemsCache', updated)
    return updated
  }
  return undefined
}

// Apply pending edits from IndexedDB to server-fetched items
// This ensures UI shows optimistic values even after page refresh
export async function applyPendingEditsToItems<T extends { id: string }>(
  items: T[]
): Promise<{ items: T[]; pendingItemIds: Set<string> }> {
  const pendingEdits = await getQueuedItemEdits()
  if (pendingEdits.length === 0) {
    return { items, pendingItemIds: new Set() }
  }

  // Group edits by itemId, maintaining creation order
  const editsByItem = new Map<string, QueuedItemEdit[]>()
  for (const edit of pendingEdits) {
    const existing = editsByItem.get(edit.itemId) || []
    existing.push(edit)
    editsByItem.set(edit.itemId, existing)
  }

  const pendingItemIds = new Set(editsByItem.keys())

  // Apply edits to items (changes are already in snake_case to match server field names)
  const modifiedItems = items.map(item => {
    const edits = editsByItem.get(item.id)
    if (!edits) return item

    let modified = { ...item }
    for (const edit of edits) {
      modified = { ...modified, ...edit.changes }
    }
    return modified
  })

  return { items: modifiedItems, pendingItemIds }
}

// Item Create Queue Operations
export async function addItemCreateToQueue(
  itemData: Partial<ItemInsert>,
  userId: string
): Promise<QueuedItemCreate> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const tempSku = `TEMP-${id.slice(0, 8).toUpperCase()}`
  const idempotencyKey = crypto.randomUUID()
  const now = new Date().toISOString()

  const queuedCreate: QueuedItemCreate = {
    id,
    tempSku,
    itemData: { ...itemData, id },
    idempotencyKey,
    userId,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    deviceTimestamp: now,
  }
  await db.put('itemCreateQueue', queuedCreate)
  return queuedCreate
}

export async function getQueuedItemCreates(): Promise<QueuedItemCreate[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemCreateQueue', 'by-created')
}

export async function getQueuedItemCreateById(id: string): Promise<QueuedItemCreate | undefined> {
  const db = await getDB()
  return db.get('itemCreateQueue', id)
}

export async function getQueuedItemCreatesByStatus(status: ItemOperationStatus): Promise<QueuedItemCreate[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemCreateQueue', 'by-status', status)
}

export async function getItemCreateQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('itemCreateQueue')
}

export async function updateItemCreateStatus(
  id: string,
  status: ItemOperationStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('itemCreateQueue', id)
  if (existing) {
    await db.put('itemCreateQueue', {
      ...existing,
      status,
      lastError: error,
      retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
    })
  }
}

export async function updateItemCreateData(
  id: string,
  itemData: Partial<ItemInsert>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('itemCreateQueue', id)
  if (existing) {
    await db.put('itemCreateQueue', {
      ...existing,
      itemData: { ...existing.itemData, ...itemData },
    })
  }
}

export async function removeItemCreateFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('itemCreateQueue', id)
}

export async function clearItemCreateQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('itemCreateQueue')
}

// Item Archive Queue Operations
export async function addItemArchiveToQueue(
  itemId: string,
  action: 'archive' | 'restore',
  expectedVersion: number,
  userId: string
): Promise<QueuedItemArchive> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const idempotencyKey = crypto.randomUUID()
  const now = new Date().toISOString()

  const queuedArchive: QueuedItemArchive = {
    id,
    itemId,
    action,
    expectedVersion,
    idempotencyKey,
    userId,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    deviceTimestamp: now,
  }
  await db.put('itemArchiveQueue', queuedArchive)
  return queuedArchive
}

export async function getQueuedItemArchives(): Promise<QueuedItemArchive[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemArchiveQueue', 'by-created')
}

export async function getQueuedArchivesByItem(itemId: string): Promise<QueuedItemArchive[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemArchiveQueue', 'by-item', itemId)
}

export async function getQueuedArchivesByStatus(status: ItemOperationStatus): Promise<QueuedItemArchive[]> {
  const db = await getDB()
  return db.getAllFromIndex('itemArchiveQueue', 'by-status', status)
}

export async function getItemArchiveQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('itemArchiveQueue')
}

export async function updateItemArchiveStatus(
  id: string,
  status: ItemOperationStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('itemArchiveQueue', id)
  if (existing) {
    await db.put('itemArchiveQueue', {
      ...existing,
      status,
      lastError: error,
      retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
    })
  }
}

export async function removeItemArchiveFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('itemArchiveQueue', id)
}

export async function clearItemArchiveQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('itemArchiveQueue')
}

// Cache a single item (for offline-created items)
export async function cacheItem(item: CachedItem): Promise<void> {
  const db = await getDB()
  await db.put('itemsCache', item)
}

// Get all queue counts for sync status display
export async function getAllQueueCounts(): Promise<{
  creates: number
  edits: number
  archives: number
  images: number
  transactions: number
}> {
  const db = await getDB()
  const [creates, edits, archives, images, transactions] = await Promise.all([
    db.count('itemCreateQueue'),
    db.count('itemEditQueue'),
    db.count('itemArchiveQueue'),
    db.count('pendingImages'),
    db.count('transactionQueue'),
  ])
  return { creates, edits, archives, images, transactions }
}

// Pending operation types for UI display
export type PendingOperationType = 'offline' | 'pending_edit' | 'pending_archive' | 'pending_restore'

export interface PendingOperationInfo {
  itemId: string
  types: Set<PendingOperationType>
}

// Apply all pending operations to server-fetched items
// Returns items with offline-created items merged in and edits/archives applied
export async function applyPendingOperationsToItems<T extends { id: string; is_archived?: boolean }>(
  serverItems: T[]
): Promise<{
  items: T[]
  pendingOperations: Map<string, Set<PendingOperationType>>
  offlineItemIds: Set<string>
}> {
  const [pendingCreates, pendingEdits, pendingArchives] = await Promise.all([
    getQueuedItemCreates(),
    getQueuedItemEdits(),
    getQueuedItemArchives(),
  ])

  const pendingOperations = new Map<string, Set<PendingOperationType>>()
  const offlineItemIds = new Set<string>()

  // Helper to add operation type
  const addOp = (itemId: string, type: PendingOperationType) => {
    const ops = pendingOperations.get(itemId) || new Set()
    ops.add(type)
    pendingOperations.set(itemId, ops)
  }

  // Convert offline-created items to server format for display
  const offlineCreatedItems: T[] = pendingCreates.map(create => {
    offlineItemIds.add(create.id)
    addOp(create.id, 'offline')
    // Build a minimal item object from the create data
    return {
      id: create.id,
      sku: create.tempSku,
      name: (create.itemData.name as string) || 'New Item',
      description: create.itemData.description ?? null,
      category_id: create.itemData.category_id ?? null,
      location_id: create.itemData.location_id ?? null,
      unit: create.itemData.unit || 'pcs',
      current_stock: create.itemData.current_stock ?? 0,
      min_stock: create.itemData.min_stock ?? 0,
      max_stock: create.itemData.max_stock ?? null,
      unit_price: create.itemData.unit_price ?? 0,
      barcode: create.itemData.barcode ?? null,
      image_url: create.itemData.image_url ?? null,
      is_archived: false,
      version: 0,
      created_at: create.createdAt,
      updated_at: create.createdAt,
    } as unknown as T
  })

  // Group edits by itemId
  const editsByItem = new Map<string, QueuedItemEdit[]>()
  for (const edit of pendingEdits) {
    const existing = editsByItem.get(edit.itemId) || []
    existing.push(edit)
    editsByItem.set(edit.itemId, existing)
    addOp(edit.itemId, 'pending_edit')
  }

  // Track archive operations
  const archivesByItem = new Map<string, QueuedItemArchive>()
  for (const archive of pendingArchives) {
    // Keep only the latest archive operation for each item
    archivesByItem.set(archive.itemId, archive)
    addOp(archive.itemId, archive.action === 'archive' ? 'pending_archive' : 'pending_restore')
  }

  // Combine server items with offline items
  let allItems = [...offlineCreatedItems, ...serverItems]

  // Apply edits
  allItems = allItems.map(item => {
    const edits = editsByItem.get(item.id)
    if (!edits) return item

    let modified = { ...item }
    for (const edit of edits) {
      modified = { ...modified, ...edit.changes }
    }
    return modified
  })

  // Apply archive status changes (filter out archived items or show restored items)
  allItems = allItems.filter(item => {
    const archive = archivesByItem.get(item.id)
    if (!archive) return !item.is_archived // Show non-archived by default
    // If pending archive, hide the item; if pending restore, show the item
    return archive.action === 'restore'
  })

  return { items: allItems, pendingOperations, offlineItemIds }
}

// Categories Cache Operations
export async function cacheCategories(categories: CachedCategory[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('categoriesCache', 'readwrite')
  // Clear existing cache before inserting new data
  await tx.store.clear()
  await Promise.all([
    ...categories.map(cat => tx.store.put(cat)),
    tx.done,
  ])
}

export async function getAllCachedCategories(): Promise<CachedCategory[]> {
  const db = await getDB()
  return db.getAll('categoriesCache')
}

export async function clearCategoriesCache(): Promise<void> {
  const db = await getDB()
  await db.clear('categoriesCache')
}

// Conversion helpers: CachedItem <-> Item
export function cachedItemToItem(cached: CachedItem): Item {
  return {
    id: cached.id,
    sku: cached.sku,
    name: cached.name,
    description: cached.description ?? null,
    category_id: cached.categoryId ?? null,
    location_id: cached.locationId ?? null,
    unit: cached.unit,
    current_stock: cached.currentStock,
    min_stock: cached.minStock,
    max_stock: cached.maxStock ?? null,
    unit_price: cached.unitPrice ?? null,
    barcode: cached.barcode ?? null,
    image_url: cached.imageUrl ?? null,
    is_archived: cached.isArchived ?? false,
    version: cached.version,
    created_at: cached.updatedAt,
    updated_at: cached.updatedAt,
  }
}

export function itemToCachedItem(item: Item): CachedItem {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description ?? undefined,
    categoryId: item.category_id ?? undefined,
    locationId: item.location_id ?? undefined,
    unit: item.unit,
    currentStock: item.current_stock,
    minStock: item.min_stock,
    maxStock: item.max_stock ?? undefined,
    unitPrice: item.unit_price ?? undefined,
    barcode: item.barcode ?? undefined,
    imageUrl: item.image_url ?? undefined,
    version: item.version,
    isArchived: item.is_archived,
    updatedAt: item.updated_at,
  }
}

// Conversion helpers: CachedCategory <-> Category
export function cachedCategoryToCategory(cached: CachedCategory): Category {
  return {
    id: cached.id,
    name: cached.name,
    description: cached.description ?? null,
    parent_id: cached.parentId ?? null,
    created_at: cached.createdAt,
  }
}

export function categoryToCachedCategory(category: Category): CachedCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    parentId: category.parent_id ?? undefined,
    createdAt: category.created_at,
  }
}
