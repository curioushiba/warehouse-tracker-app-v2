import type { SQLiteDatabase } from 'expo-sqlite'
import type { QueuedTransaction } from '@/types/offline'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface TransactionRow {
  id: string
  transaction_type: string
  item_id: string
  quantity: number
  notes: string | null
  source_location_id: string | null
  destination_location_id: string | null
  device_timestamp: string
  idempotency_key: string
  user_id: string
  retry_count: number
  last_error: string | null
  created_at: string
  domain: string | null
}

function rowToQueuedTransaction(row: TransactionRow): QueuedTransaction {
  return {
    id: row.id,
    transactionType: row.transaction_type as QueuedTransaction['transactionType'],
    itemId: row.item_id,
    quantity: row.quantity,
    notes: row.notes ?? undefined,
    sourceLocationId: row.source_location_id ?? undefined,
    destinationLocationId: row.destination_location_id ?? undefined,
    deviceTimestamp: row.device_timestamp,
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    domain: (row.domain as QueuedTransaction['domain']) ?? undefined,
  }
}

export function addToQueue(
  db: Db,
  tx: Omit<QueuedTransaction, 'retryCount' | 'lastError' | 'createdAt'>
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO transaction_queue
      (id, transaction_type, item_id, quantity, notes, source_location_id,
       destination_location_id, device_timestamp, idempotency_key, user_id,
       retry_count, last_error, created_at, domain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tx.id,
    tx.transactionType,
    tx.itemId,
    tx.quantity,
    tx.notes ?? null,
    tx.sourceLocationId ?? null,
    tx.destinationLocationId ?? null,
    tx.deviceTimestamp,
    tx.idempotencyKey,
    tx.userId,
    0,
    null,
    now,
    tx.domain ?? null
  )
}

export function getQueuedTransactions(db: Db): QueuedTransaction[] {
  const rows = db.getAllSync<TransactionRow>(
    'SELECT * FROM transaction_queue ORDER BY created_at ASC'
  )
  return rows.map(rowToQueuedTransaction)
}

export function getQueueCount(db: Db): number {
  const row = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM transaction_queue'
  )
  return row?.cnt ?? 0
}

export function removeFromQueue(db: Db, id: string): void {
  db.runSync('DELETE FROM transaction_queue WHERE id = ?', id)
}

export function incrementRetryCount(db: Db, id: string, error: string): void {
  db.runSync(
    'UPDATE transaction_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    error,
    id
  )
}

export function clearQueue(db: Db): void {
  db.runSync('DELETE FROM transaction_queue')
}

export function getTransactionsByDomain(db: Db, domain: string): QueuedTransaction[] {
  const rows = db.getAllSync<TransactionRow>(
    'SELECT * FROM transaction_queue WHERE domain = ? ORDER BY created_at ASC',
    domain
  )
  return rows.map(rowToQueuedTransaction)
}
