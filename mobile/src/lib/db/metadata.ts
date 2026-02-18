import type { SQLiteDatabase } from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

type MetadataValue = string | number | boolean

export function setMetadata(db: Db, key: string, value: MetadataValue): void {
  // Store with type prefix: b:true/b:false, n:42, or raw string
  let serialized: string
  if (typeof value === 'boolean') {
    serialized = `b:${value}`
  } else if (typeof value === 'number') {
    serialized = `n:${value}`
  } else {
    serialized = value
  }
  const now = new Date().toISOString()
  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)',
    key,
    serialized,
    now
  )
}

export function getMetadata(db: Db, key: string): MetadataValue | undefined {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM metadata WHERE key = ?',
    key
  )
  if (!row) return undefined

  const val = row.value
  // Detect type-prefixed values
  if (val === 'b:true') return true
  if (val === 'b:false') return false
  if (val.startsWith('n:')) {
    const num = Number(val.slice(2))
    if (!isNaN(num)) return num
  }
  return val
}

export function getLastSyncTime(db: Db): string | undefined {
  const value = getMetadata(db, 'last_sync_time')
  return typeof value === 'string' ? value : undefined
}

export function setLastSyncTime(db: Db, time: string): void {
  setMetadata(db, 'last_sync_time', time)
}

export function getDeviceId(db: Db): string {
  const existing = getMetadata(db, 'device_id')
  if (typeof existing === 'string' && existing.length > 0) {
    return existing
  }

  const deviceId = randomUUID()
  setMetadata(db, 'device_id', deviceId)
  return deviceId
}
