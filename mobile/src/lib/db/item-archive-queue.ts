import type { SQLiteDatabase } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'
import type { QueuedItemArchive, ItemOperationStatus } from '@/types/offline'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface ArchiveRow {
  id: string
  item_id: string
  action: string
  expected_version: number
  idempotency_key: string
  user_id: string
  status: string
  retry_count: number
  last_error: string | null
  created_at: string
  device_timestamp: string
}

function rowToQueuedItemArchive(row: ArchiveRow): QueuedItemArchive {
  return {
    id: row.id,
    itemId: row.item_id,
    action: row.action as 'archive' | 'restore',
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

export function addItemArchiveToQueue(
  db: Db,
  itemId: string,
  action: 'archive' | 'restore',
  expectedVersion: number,
  userId: string
): QueuedItemArchive {
  const id = randomUUID()
  const idempotencyKey = randomUUID()
  const now = new Date().toISOString()

  db.runSync(
    `INSERT INTO item_archive_queue
      (id, item_id, action, expected_version, idempotency_key, user_id,
       status, retry_count, last_error, created_at, device_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    itemId,
    action,
    expectedVersion,
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
    itemId,
    action,
    expectedVersion,
    idempotencyKey,
    userId,
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
    createdAt: now,
    deviceTimestamp: now,
  }
}

export function getQueuedItemArchives(db: Db): QueuedItemArchive[] {
  const rows = db.getAllSync<ArchiveRow>(
    'SELECT * FROM item_archive_queue ORDER BY created_at ASC'
  )
  return rows.map(rowToQueuedItemArchive)
}

export function getQueuedArchivesByItem(db: Db, itemId: string): QueuedItemArchive[] {
  const rows = db.getAllSync<ArchiveRow>(
    'SELECT * FROM item_archive_queue WHERE item_id = ? ORDER BY created_at ASC',
    itemId
  )
  return rows.map(rowToQueuedItemArchive)
}

export function getQueuedArchivesByStatus(db: Db, status: ItemOperationStatus): QueuedItemArchive[] {
  const rows = db.getAllSync<ArchiveRow>(
    'SELECT * FROM item_archive_queue WHERE status = ? ORDER BY created_at ASC',
    status
  )
  return rows.map(rowToQueuedItemArchive)
}

export function getItemArchiveQueueCount(db: Db): number {
  const row = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM item_archive_queue'
  )
  return row?.cnt ?? 0
}

export function updateItemArchiveStatus(
  db: Db,
  id: string,
  status: ItemOperationStatus,
  error?: string
): void {
  if (status === 'failed') {
    db.runSync(
      'UPDATE item_archive_queue SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?',
      status,
      error ?? null,
      id
    )
  } else {
    db.runSync(
      'UPDATE item_archive_queue SET status = ?, last_error = ? WHERE id = ?',
      status,
      error ?? null,
      id
    )
  }
}

export function removeItemArchiveFromQueue(db: Db, id: string): void {
  db.runSync('DELETE FROM item_archive_queue WHERE id = ?', id)
}

export function clearItemArchiveQueue(db: Db): void {
  db.runSync('DELETE FROM item_archive_queue')
}
