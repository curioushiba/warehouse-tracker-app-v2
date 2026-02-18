import type { CachedItem, CachedCategory } from '@/types/offline'
import type { Item, Category } from '@/lib/supabase/types'

/**
 * Convert a CachedItem (camelCase) to an Item (snake_case) for server-compatible format.
 */
export function cachedItemToItem(cached: CachedItem): Item {
  return {
    id: cached.id,
    sku: cached.sku,
    name: cached.name,
    description: cached.description ?? null,
    category_id: cached.categoryId ?? null,
    location_id: cached.locationId ?? null,
    unit: cached.unit,
    current_stock: cached.currentStock,
    min_stock: cached.minStock,
    max_stock: cached.maxStock ?? null,
    unit_price: cached.unitPrice ?? null,
    barcode: cached.barcode ?? null,
    image_url: cached.imageUrl ?? null,
    is_archived: cached.isArchived ?? false,
    version: cached.version,
    created_at: cached.updatedAt,
    updated_at: cached.updatedAt,
  }
}

/**
 * Convert an Item (snake_case) to a CachedItem (camelCase) for local storage.
 */
export function itemToCachedItem(item: Item): CachedItem {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description ?? undefined,
    categoryId: item.category_id ?? undefined,
    locationId: item.location_id ?? undefined,
    unit: item.unit,
    currentStock: item.current_stock,
    minStock: item.min_stock,
    maxStock: item.max_stock ?? undefined,
    unitPrice: item.unit_price ?? undefined,
    barcode: item.barcode ?? undefined,
    imageUrl: item.image_url ?? undefined,
    version: item.version,
    isArchived: item.is_archived,
    isOfflineCreated: false,
    updatedAt: item.updated_at,
  }
}

/**
 * Convert a CachedCategory (camelCase) to a Category (snake_case).
 */
export function cachedCategoryToCategory(cached: CachedCategory): Category {
  return {
    id: cached.id,
    name: cached.name,
    description: cached.description ?? null,
    parent_id: cached.parentId ?? null,
    created_at: cached.createdAt,
  }
}

/**
 * Convert a Category (snake_case) to a CachedCategory (camelCase).
 */
export function categoryToCachedCategory(category: Category): CachedCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    parentId: category.parent_id ?? undefined,
    createdAt: category.created_at,
  }
}
