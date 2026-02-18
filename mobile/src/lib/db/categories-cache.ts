import type { SQLiteDatabase } from 'expo-sqlite'
import type { CachedCategory } from '@/types/offline'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

interface CategoryRow {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  created_at: string
}

function rowToCachedCategory(row: CategoryRow): CachedCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
    createdAt: row.created_at,
  }
}

export function cacheCategories(db: Db, categories: CachedCategory[]): void {
  // Clear existing cache before inserting new data
  db.runSync('DELETE FROM categories_cache')

  for (const cat of categories) {
    db.runSync(
      `INSERT INTO categories_cache (id, name, description, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      cat.id,
      cat.name,
      cat.description ?? null,
      cat.parentId ?? null,
      cat.createdAt
    )
  }
}

export function getAllCachedCategories(db: Db): CachedCategory[] {
  const rows = db.getAllSync<CategoryRow>(
    'SELECT * FROM categories_cache'
  )
  return rows.map(rowToCachedCategory)
}

export function clearCategoriesCache(db: Db): void {
  db.runSync('DELETE FROM categories_cache')
}
