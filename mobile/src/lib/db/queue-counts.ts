import type { SQLiteDatabase } from 'expo-sqlite'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

export interface QueueCounts {
  creates: number
  edits: number
  archives: number
  images: number
  transactions: number
}

export function getAllQueueCounts(db: Db): QueueCounts {
  const getCount = (table: string): number => {
    const row = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table}`
    )
    return row?.cnt ?? 0
  }

  return {
    creates: getCount('item_create_queue'),
    edits: getCount('item_edit_queue'),
    archives: getCount('item_archive_queue'),
    images: getCount('pending_images'),
    transactions: getCount('transaction_queue'),
  }
}
