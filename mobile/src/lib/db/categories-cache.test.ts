import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  cacheCategories,
  getAllCachedCategories,
  clearCategoriesCache,
} from './categories-cache'
import type { CachedCategory } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

function makeCategory(overrides: Partial<CachedCategory> = {}): CachedCategory {
  return {
    id: 'cat-' + Math.random().toString(36).slice(2, 8),
    name: 'Test Category',
    description: 'A test category',
    parentId: undefined,
    createdAt: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

describe('categories-cache', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---- cacheCategories ----

  describe('cacheCategories', () => {
    it('inserts multiple categories into the cache', () => {
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Produce' }),
        makeCategory({ id: 'cat-2', name: 'Dairy' }),
        makeCategory({ id: 'cat-3', name: 'Bakery' }),
      ]

      cacheCategories(db, categories)

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(3)
    })

    it('handles an empty array without error', () => {
      expect(() => cacheCategories(db, [])).not.toThrow()
      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(0)
    })

    it('clears existing cache before inserting new data', () => {
      cacheCategories(db, [
        makeCategory({ id: 'cat-old-1', name: 'Old Category' }),
        makeCategory({ id: 'cat-old-2', name: 'Another Old' }),
      ])

      cacheCategories(db, [
        makeCategory({ id: 'cat-new-1', name: 'New Category' }),
      ])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('New Category')
    })

    it('stores all CachedCategory fields correctly', () => {
      const cat = makeCategory({
        id: 'cat-full',
        name: 'Full Category',
        description: 'Complete description',
        parentId: 'cat-parent',
        createdAt: '2024-06-15T14:00:00Z',
      })

      cacheCategories(db, [cat])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cat-full')
      expect(result[0].name).toBe('Full Category')
      expect(result[0].description).toBe('Complete description')
      expect(result[0].parentId).toBe('cat-parent')
      expect(result[0].createdAt).toBe('2024-06-15T14:00:00Z')
    })

    it('handles categories with null/undefined optional fields', () => {
      const cat = makeCategory({
        id: 'cat-nulls',
        name: 'No Optionals',
        description: undefined,
        parentId: undefined,
      })

      cacheCategories(db, [cat])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cat-nulls')
      expect(result[0].name).toBe('No Optionals')
      expect(result[0].description).toBeUndefined()
      expect(result[0].parentId).toBeUndefined()
    })

    it('replaces all data on subsequent calls', () => {
      cacheCategories(db, [
        makeCategory({ id: 'cat-a', name: 'A' }),
        makeCategory({ id: 'cat-b', name: 'B' }),
        makeCategory({ id: 'cat-c', name: 'C' }),
      ])

      cacheCategories(db, [
        makeCategory({ id: 'cat-x', name: 'X' }),
        makeCategory({ id: 'cat-y', name: 'Y' }),
      ])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(2)
      const names = result.map((c) => c.name)
      expect(names).toContain('X')
      expect(names).toContain('Y')
      expect(names).not.toContain('A')
    })
  })

  // ---- getAllCachedCategories ----

  describe('getAllCachedCategories', () => {
    it('returns all cached categories', () => {
      cacheCategories(db, [
        makeCategory({ id: 'cat-1', name: 'First' }),
        makeCategory({ id: 'cat-2', name: 'Second' }),
        makeCategory({ id: 'cat-3', name: 'Third' }),
      ])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(3)
    })

    it('returns an empty array when cache is empty', () => {
      const result = getAllCachedCategories(db)
      expect(result).toEqual([])
    })

    it('returns CachedCategory objects with correct field mapping', () => {
      cacheCategories(db, [
        makeCategory({
          id: 'cat-mapped',
          name: 'Mapped Category',
          description: 'Mapped desc',
          parentId: 'cat-parent-1',
          createdAt: '2024-07-01T10:00:00Z',
        }),
      ])

      const result = getAllCachedCategories(db)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cat-mapped')
      expect(result[0].name).toBe('Mapped Category')
      expect(result[0].description).toBe('Mapped desc')
      expect(result[0].parentId).toBe('cat-parent-1')
      expect(result[0].createdAt).toBe('2024-07-01T10:00:00Z')
    })
  })

  // ---- clearCategoriesCache ----

  describe('clearCategoriesCache', () => {
    it('removes all categories from the cache', () => {
      cacheCategories(db, [
        makeCategory({ id: 'cat-clr-1', name: 'Clear Me 1' }),
        makeCategory({ id: 'cat-clr-2', name: 'Clear Me 2' }),
      ])

      clearCategoriesCache(db)

      expect(getAllCachedCategories(db)).toEqual([])
    })

    it('does not error when cache is already empty', () => {
      expect(() => clearCategoriesCache(db)).not.toThrow()
    })
  })
})
