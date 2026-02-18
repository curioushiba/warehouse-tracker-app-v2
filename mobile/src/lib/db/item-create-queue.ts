import type { SQLiteDatabase } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'
import type { QueuedItemCreate, ItemOperationStatus } from '@/types/offline'
import type { ItemInsert } from '@/lib/supabase/types'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface CreateRow {
  id: string
  temp_sku: string
  item_data: string
  idempotency_key: string
  user_id: string
  status: string
  retry_count: number
  last_error: string | null
  created_at: string
  device_timestamp: string
}

function rowToQueuedItemCreate(row: CreateRow): QueuedItemCreate {
  return {
    id: row.id,
    tempSku: row.temp_sku,
    itemData: JSON.parse(row.item_data) as Partial<ItemInsert>,
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    status: row.status as ItemOperationStatus,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    deviceTimestamp: row.device_timestamp,
  }
}

function generateTempSku(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'TEMP-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function addItemCreateToQueue(
  db: Db,
  itemData: Partial<ItemInsert>,
  userId: string
): QueuedItemCreate {
  const id = randomUUID()
  const idempotencyKey = randomUUID()
  const tempSku = generateTempSku()
  const now = new Date().toISOString()

  const mergedItemData = { ...itemData, id }

  db.runSync(
    `INSERT INTO item_create_queue
      (id, temp_sku, item_data, idempotency_key, user_id,
       status, retry_count, last_error, created_at, device_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    tempSku,
    JSON.stringify(mergedItemData),
    idempotencyKey,
    userId,
    'pending',
    0,
    null,
    now,
    now
  )

  return {
    id,
    tempSku,
    itemData: mergedItemData,
    idempotencyKey,
    userId,
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
    createdAt: now,
    deviceTimestamp: now,
  }
}

export function getQueuedItemCreates(db: Db): QueuedItemCreate[] {
  const rows = db.getAllSync<CreateRow>(
    'SELECT * FROM item_create_queue ORDER BY created_at ASC'
  )
  return rows.map(rowToQueuedItemCreate)
}

export function getQueuedItemCreateById(db: Db, id: string): QueuedItemCreate | null {
  const row = db.getFirstSync<CreateRow>(
    'SELECT * FROM item_create_queue WHERE id = ?',
    id
  )
  return row ? rowToQueuedItemCreate(row) : null
}

export function getQueuedItemCreatesByStatus(db: Db, status: ItemOperationStatus): QueuedItemCreate[] {
  const rows = db.getAllSync<CreateRow>(
    'SELECT * FROM item_create_queue WHERE status = ? ORDER BY created_at ASC',
    status
  )
  return rows.map(rowToQueuedItemCreate)
}

export function getItemCreateQueueCount(db: Db): number {
  const row = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM item_create_queue'
  )
  return row?.cnt ?? 0
}

export function updateItemCreateStatus(
  db: Db,
  id: string,
  status: ItemOperationStatus,
  error?: string
): void {
  if (status === 'failed') {
    db.runSync(
      'UPDATE item_create_queue SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?',
      status,
      error ?? null,
      id
    )
  } else {
    db.runSync(
      'UPDATE item_create_queue SET status = ?, last_error = ? WHERE id = ?',
      status,
      error ?? null,
      id
    )
  }
}

export function updateItemCreateData(
  db: Db,
  id: string,
  newData: Partial<ItemInsert>
): void {
  const row = db.getFirstSync<{ item_data: string }>(
    'SELECT item_data FROM item_create_queue WHERE id = ?',
    id
  )
  if (!row) return

  const existing = JSON.parse(row.item_data) as Partial<ItemInsert>
  const merged = { ...existing, ...newData }

  db.runSync(
    'UPDATE item_create_queue SET item_data = ? WHERE id = ?',
    JSON.stringify(merged),
    id
  )
}

export function removeItemCreateFromQueue(db: Db, id: string): void {
  db.runSync('DELETE FROM item_create_queue WHERE id = ?', id)
}

export function clearItemCreateQueue(db: Db): void {
  db.runSync('DELETE FROM item_create_queue')
}
