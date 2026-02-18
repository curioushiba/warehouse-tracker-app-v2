import type { SQLiteDatabase } from 'expo-sqlite'
import type { CachedItem } from '@/types/offline'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface ItemRow {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  location_id: string | null
  unit: string
  current_stock: number
  min_stock: number
  max_stock: number | null
  barcode: string | null
  unit_price: number | null
  image_url: string | null
  version: number
  is_archived: number
  is_offline_created: number
  updated_at: string
  domain: string | null
}

function rowToCachedItem(row: ItemRow): CachedItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description ?? undefined,
    categoryId: row.category_id ?? undefined,
    locationId: row.location_id ?? undefined,
    unit: row.unit,
    currentStock: row.current_stock,
    minStock: row.min_stock,
    maxStock: row.max_stock ?? undefined,
    barcode: row.barcode ?? undefined,
    unitPrice: row.unit_price ?? undefined,
    imageUrl: row.image_url ?? undefined,
    version: row.version,
    isArchived: row.is_archived === 1,
    isOfflineCreated: row.is_offline_created === 1,
    updatedAt: row.updated_at,
  }
}

export function cacheItems(db: Db, items: CachedItem[], domain?: string): void {
  for (const item of items) {
    db.runSync(
      `INSERT OR REPLACE INTO items_cache
        (id, sku, name, description, category_id, location_id, unit,
         current_stock, min_stock, max_stock, barcode, unit_price,
         image_url, version, is_archived, is_offline_created, updated_at, domain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.sku,
      item.name,
      item.description ?? null,
      item.categoryId ?? null,
      item.locationId ?? null,
      item.unit,
      item.currentStock,
      item.minStock,
      item.maxStock ?? null,
      item.barcode ?? null,
      item.unitPrice ?? null,
      item.imageUrl ?? null,
      item.version,
      item.isArchived ? 1 : 0,
      item.isOfflineCreated ? 1 : 0,
      item.updatedAt,
      domain ?? null
    )
  }
}

export function getCachedItem(db: Db, id: string): CachedItem | null {
  const row = db.getFirstSync<ItemRow>(
    'SELECT * FROM items_cache WHERE id = ?',
    id
  )
  return row ? rowToCachedItem(row) : null
}

export function getCachedItemBySku(db: Db, sku: string): CachedItem | null {
  const row = db.getFirstSync<ItemRow>(
    'SELECT * FROM items_cache WHERE sku = ?',
    sku
  )
  return row ? rowToCachedItem(row) : null
}

export function getCachedItemByBarcode(db: Db, barcode: string): CachedItem | null {
  const row = db.getFirstSync<ItemRow>(
    'SELECT * FROM items_cache WHERE barcode = ?',
    barcode
  )
  return row ? rowToCachedItem(row) : null
}

export function getAllCachedItems(db: Db): CachedItem[] {
  const rows = db.getAllSync<ItemRow>('SELECT * FROM items_cache')
  return rows.map(rowToCachedItem)
}

export function clearItemsCache(db: Db): void {
  db.runSync('DELETE FROM items_cache')
}

export function updateCachedItem(db: Db, id: string, updates: Partial<CachedItem>): void {
  const fieldMap: Record<string, string> = {
    sku: 'sku',
    name: 'name',
    description: 'description',
    categoryId: 'category_id',
    locationId: 'location_id',
    unit: 'unit',
    currentStock: 'current_stock',
    minStock: 'min_stock',
    maxStock: 'max_stock',
    barcode: 'barcode',
    unitPrice: 'unit_price',
    imageUrl: 'image_url',
    version: 'version',
    isArchived: 'is_archived',
    isOfflineCreated: 'is_offline_created',
    updatedAt: 'updated_at',
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(updates)) {
    const col = fieldMap[key]
    if (!col) continue

    setClauses.push(`${col} = ?`)
    if (key === 'isArchived' || key === 'isOfflineCreated') {
      values.push(value ? 1 : 0)
    } else {
      values.push(value ?? null)
    }
  }

  if (setClauses.length === 0) return

  values.push(id)
  db.runSync(
    `UPDATE items_cache SET ${setClauses.join(', ')} WHERE id = ?`,
    ...values
  )
}

export function searchCachedItems(db: Db, query: string): CachedItem[] {
  // Escape SQL LIKE special characters
  const escaped = query.replace(/[%_]/g, (ch) => `\\${ch}`)
  const pattern = `%${escaped}%`

  const rows = db.getAllSync<ItemRow>(
    `SELECT * FROM items_cache
     WHERE name LIKE ? ESCAPE '\\'
        OR sku LIKE ? ESCAPE '\\'
        OR barcode LIKE ? ESCAPE '\\'`,
    pattern,
    pattern,
    pattern
  )
  return rows.map(rowToCachedItem)
}
