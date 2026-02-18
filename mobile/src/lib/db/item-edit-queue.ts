import type { SQLiteDatabase } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'
import type { QueuedItemEdit, ItemOperationStatus } from '@/types/offline'
import type { ItemUpdate } from '@/lib/supabase/types'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface EditRow {
  id: string
  item_id: string
  changes: string
  expected_version: number
  idempotency_key: string
  user_id: string
  status: string
  retry_count: number
  last_error: string | null
  created_at: string
  device_timestamp: string
}

function rowToQueuedItemEdit(row: EditRow): QueuedItemEdit {
  return {
    id: row.id,
    itemId: row.item_id,
    changes: JSON.parse(row.changes) as Partial<ItemUpdate>,
    expectedVersion: row.expected_version,
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    status: row.status as ItemOperationStatus,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    deviceTimestamp: row.device_timestamp,
  }
}

export function addItemEditToQueue(
  db: Db,
  input: {
    itemId: string
    changes: Partial<ItemUpdate>
    expectedVersion: number
    userId: string
    deviceTimestamp: string
  }
): QueuedItemEdit {
  const id = randomUUID()
  const idempotencyKey = randomUUID()
  const now = new Date().toISOString()

  db.runSync(
    `INSERT INTO item_edit_queue
      (id, item_id, changes, expected_version, idempotency_key, user_id,
       status, retry_count, last_error, created_at, device_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.itemId,
    JSON.stringify(input.changes),
    input.expectedVersion,
    idempotencyKey,
    input.userId,
    'pending',
    0,
    null,
    now,
    input.deviceTimestamp
  )

  return {
    id,
    itemId: input.itemId,
    changes: input.changes,
    expectedVersion: input.expectedVersion,
    idempotencyKey,
    userId: input.userId,
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
    createdAt: now,
    deviceTimestamp: input.deviceTimestamp,
  }
}

export function getQueuedItemEdits(db: Db): QueuedItemEdit[] {
  const rows = db.getAllSync<EditRow>(
    'SELECT * FROM item_edit_queue ORDER BY created_at ASC'
  )
  return rows.map(rowToQueuedItemEdit)
}

export function getQueuedItemEditsByItem(db: Db, itemId: string): QueuedItemEdit[] {
  const rows = db.getAllSync<EditRow>(
    'SELECT * FROM item_edit_queue WHERE item_id = ? ORDER BY created_at ASC',
    itemId
  )
  return rows.map(rowToQueuedItemEdit)
}

export function getQueuedItemEditsByStatus(db: Db, status: ItemOperationStatus): QueuedItemEdit[] {
  const rows = db.getAllSync<EditRow>(
    'SELECT * FROM item_edit_queue WHERE status = ? ORDER BY created_at ASC',
    status
  )
  return rows.map(rowToQueuedItemEdit)
}

export function getItemEditQueueCount(db: Db): number {
  const row = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM item_edit_queue'
  )
  return row?.cnt ?? 0
}

export function updateItemEditStatus(
  db: Db,
  id: string,
  status: ItemOperationStatus,
  error?: string
): void {
  if (status === 'failed') {
    db.runSync(
      'UPDATE item_edit_queue SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?',
      status,
      error ?? null,
      id
    )
  } else {
    db.runSync(
      'UPDATE item_edit_queue SET status = ?, last_error = ? WHERE id = ?',
      status,
      error ?? null,
      id
    )
  }
}

export function removeItemEditFromQueue(db: Db, id: string): void {
  db.runSync('DELETE FROM item_edit_queue WHERE id = ?', id)
}

export function clearItemEditQueue(db: Db): void {
  db.runSync('DELETE FROM item_edit_queue')
}
