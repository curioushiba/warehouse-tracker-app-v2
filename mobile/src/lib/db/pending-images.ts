import type { SQLiteDatabase } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'
import type { PendingImage, PendingImageStatus } from '@/types/offline'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface ImageRow {
  id: string
  item_id: string
  is_offline_item: number
  file_uri: string
  filename: string
  mime_type: string
  status: string
  retry_count: number
  last_error: string | null
  created_at: string
}

function rowToPendingImage(row: ImageRow): PendingImage {
  return {
    id: row.id,
    itemId: row.item_id,
    isOfflineItem: row.is_offline_item === 1,
    fileUri: row.file_uri,
    filename: row.filename,
    mimeType: row.mime_type,
    status: row.status as PendingImageStatus,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
  }
}

export function addPendingImage(
  db: Db,
  itemId: string,
  fileUri: string,
  filename: string,
  mimeType: string,
  isOfflineItem: boolean = false
): PendingImage {
  const id = randomUUID()
  const now = new Date().toISOString()
  const status: PendingImageStatus = isOfflineItem ? 'waiting_for_item' : 'pending'

  db.runSync(
    `INSERT INTO pending_images
      (id, item_id, is_offline_item, file_uri, filename, mime_type,
       status, retry_count, last_error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    itemId,
    isOfflineItem ? 1 : 0,
    fileUri,
    filename,
    mimeType,
    status,
    0,
    null,
    now
  )

  return {
    id,
    itemId,
    isOfflineItem,
    fileUri,
    filename,
    mimeType,
    status,
    retryCount: 0,
    lastError: undefined,
    createdAt: now,
  }
}

export function getPendingImages(db: Db): PendingImage[] {
  const rows = db.getAllSync<ImageRow>(
    'SELECT * FROM pending_images ORDER BY created_at ASC'
  )
  return rows.map(rowToPendingImage)
}

export function getPendingImageById(db: Db, id: string): PendingImage | null {
  const row = db.getFirstSync<ImageRow>(
    'SELECT * FROM pending_images WHERE id = ?',
    id
  )
  return row ? rowToPendingImage(row) : null
}

export function getPendingImagesForItem(db: Db, itemId: string): PendingImage[] {
  const rows = db.getAllSync<ImageRow>(
    'SELECT * FROM pending_images WHERE item_id = ? ORDER BY created_at ASC',
    itemId
  )
  return rows.map(rowToPendingImage)
}

export function getPendingImagesByStatus(db: Db, status: PendingImageStatus): PendingImage[] {
  const rows = db.getAllSync<ImageRow>(
    'SELECT * FROM pending_images WHERE status = ? ORDER BY created_at ASC',
    status
  )
  return rows.map(rowToPendingImage)
}

export function updatePendingImageStatus(
  db: Db,
  id: string,
  status: PendingImageStatus,
  error?: string
): void {
  if (status === 'failed') {
    db.runSync(
      'UPDATE pending_images SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?',
      status,
      error ?? null,
      id
    )
  } else {
    db.runSync(
      'UPDATE pending_images SET status = ?, last_error = ? WHERE id = ?',
      status,
      error ?? null,
      id
    )
  }
}

export function transitionWaitingImagesToReady(db: Db, itemId: string): void {
  db.runSync(
    "UPDATE pending_images SET status = 'pending', is_offline_item = 0 WHERE item_id = ? AND status = 'waiting_for_item'",
    itemId
  )
}

export function removePendingImage(db: Db, id: string): void {
  db.runSync('DELETE FROM pending_images WHERE id = ?', id)
}

export function getPendingImageCount(db: Db): number {
  const row = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM pending_images'
  )
  return row?.cnt ?? 0
}
