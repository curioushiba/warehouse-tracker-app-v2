import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { TransactionType } from '@/lib/supabase/types'

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
  updatedAt: string
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
}

const DB_NAME = 'inventory-tracker-offline'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<InventoryDB>> | null = null

export async function getDB(): Promise<IDBPDatabase<InventoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<InventoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
