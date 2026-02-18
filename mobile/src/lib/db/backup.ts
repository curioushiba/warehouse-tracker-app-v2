import type { SQLiteDatabase } from 'expo-sqlite'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

const SCHEMA_VERSION = 4

interface BackupData {
  schemaVersion: number
  transactionQueue: unknown[]
  itemEditQueue: unknown[]
  itemCreateQueue: unknown[]
  itemArchiveQueue: unknown[]
  pendingImages: unknown[]
}

export function exportQueues(db: Db): string {
  const data: BackupData = {
    schemaVersion: SCHEMA_VERSION,
    transactionQueue: db.getAllSync('SELECT * FROM transaction_queue'),
    itemEditQueue: db.getAllSync('SELECT * FROM item_edit_queue'),
    itemCreateQueue: db.getAllSync('SELECT * FROM item_create_queue'),
    itemArchiveQueue: db.getAllSync('SELECT * FROM item_archive_queue'),
    pendingImages: db.getAllSync('SELECT * FROM pending_images'),
  }
  return JSON.stringify(data)
}

export function importQueues(db: Db, json: string): void {
  let data: BackupData
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON')
  }

  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Schema version mismatch: expected ${SCHEMA_VERSION}, got ${data.schemaVersion}`)
  }

  // Clear existing data
  db.runSync('DELETE FROM transaction_queue')
  db.runSync('DELETE FROM item_edit_queue')
  db.runSync('DELETE FROM item_create_queue')
  db.runSync('DELETE FROM item_archive_queue')
  db.runSync('DELETE FROM pending_images')

  // Re-insert each table's rows
  for (const row of data.transactionQueue as Record<string, unknown>[]) {
    insertRow(db, 'transaction_queue', row)
  }
  for (const row of data.itemEditQueue as Record<string, unknown>[]) {
    insertRow(db, 'item_edit_queue', row)
  }
  for (const row of data.itemCreateQueue as Record<string, unknown>[]) {
    insertRow(db, 'item_create_queue', row)
  }
  for (const row of data.itemArchiveQueue as Record<string, unknown>[]) {
    insertRow(db, 'item_archive_queue', row)
  }
  for (const row of data.pendingImages as Record<string, unknown>[]) {
    insertRow(db, 'pending_images', row)
  }
}

function insertRow(db: Db, table: string, row: Record<string, unknown>): void {
  const columns = Object.keys(row)
  const placeholders = columns.map(() => '?').join(', ')
  const values = columns.map(col => row[col] ?? null)
  db.runSync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    ...values
  )
}
