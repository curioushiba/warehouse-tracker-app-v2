import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Item, ItemInsert, ItemUpdate } from '@/lib/supabase/types'
import { type ActionResult, type PaginatedResult, success, failure, paginatedSuccess } from '@/lib/types/action-result'

// ---------------------------------------------------------------------------
// Domain configuration
// ---------------------------------------------------------------------------

export interface DomainConfig {
  itemsTable: 'inv_items' | 'fg_items' | 'cm_items'
  transactionsTable: 'inv_transactions' | 'fg_transactions' | 'cm_transactions'
  submitRpc: 'submit_transaction' | 'submit_fg_transaction' | 'submit_cm_transaction'
  revalidatePaths: string[]
}

// SAFETY NOTE: All queries use `.from(domain.itemsTable as 'inv_items')` to satisfy
// Supabase's typed client. This works because fg_items and inv_items share identical
// Row/Insert/Update shapes. If schemas ever diverge, these casts will silently hide
// type mismatches — at that point, use a generic/union approach instead.

export const INV_DOMAIN: DomainConfig = {
  itemsTable: 'inv_items',
  transactionsTable: 'inv_transactions',
  submitRpc: 'submit_transaction',
  revalidatePaths: ['/items', '/admin/items'],
}

export const FG_DOMAIN: DomainConfig = {
  itemsTable: 'fg_items',
  transactionsTable: 'fg_transactions',
  submitRpc: 'submit_fg_transaction',
  revalidatePaths: ['/admin/frozengoods/items'],
}

export const CM_DOMAIN: DomainConfig = {
  itemsTable: 'cm_items',
  transactionsTable: 'cm_transactions',
  submitRpc: 'submit_cm_transaction',
  revalidatePaths: ['/admin/commissary/items'],
}

// ---------------------------------------------------------------------------
// Filter interfaces
// ---------------------------------------------------------------------------

export interface ItemFilters {
  categoryId?: string
  locationId?: string
  isArchived?: boolean
  search?: string
  stockLevel?: 'critical' | 'low' | 'normal' | 'overstocked'
}

export interface PaginatedItemFilters extends ItemFilters {
  page?: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 25

/**
 * Escape special LIKE pattern characters to prevent SQL injection via wildcards.
 * Characters % and _ have special meaning in LIKE patterns.
 */
export function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&')
}

function revalidateDomain(domain: DomainConfig) {
  domain.revalidatePaths.forEach((p) => revalidatePath(p))
}

// ---------------------------------------------------------------------------
// Query implementations
// ---------------------------------------------------------------------------

export async function getItemsImpl(
  domain: DomainConfig,
  filters?: ItemFilters
): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('is_archived', filters?.isArchived ?? false)

    // Apply category filter
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    // Apply location filter
    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId)
    }

    // Apply search filter
    if (filters?.search) {
      const escaped = escapeLikePattern(filters.search)
      query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`)
    }

    query = query.order('name')

    const { data, error } = await query

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch {
    return failure('Failed to fetch items')
  }
}

export async function getItemsPaginatedImpl(
  domain: DomainConfig,
  filters?: PaginatedItemFilters
): Promise<ActionResult<PaginatedResult<Item>>> {
  try {
    const supabase = await createClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE
    const offset = (page - 1) * pageSize

    // Build base query for count
    let countQuery = supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', filters?.isArchived ?? false)

    // Build data query
    let dataQuery = supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('is_archived', filters?.isArchived ?? false)

    // Apply category filter
    if (filters?.categoryId) {
      countQuery = countQuery.eq('category_id', filters.categoryId)
      dataQuery = dataQuery.eq('category_id', filters.categoryId)
    }

    // Apply location filter
    if (filters?.locationId) {
      countQuery = countQuery.eq('location_id', filters.locationId)
      dataQuery = dataQuery.eq('location_id', filters.locationId)
    }

    // Apply search filter (server-side)
    if (filters?.search) {
      const searchPattern = `%${escapeLikePattern(filters.search)}%`
      countQuery = countQuery.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern}`)
      dataQuery = dataQuery.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern}`)
    }

    // Apply stock level filter (requires server-side calculation)
    // Note: Stock levels are derived from current_stock, min_stock, max_stock
    // This filter is applied after fetching for now, but could be optimized with a DB view

    // Execute count query
    const { count, error: countError } = await countQuery

    if (countError) {
      return failure(countError.message)
    }

    // Apply pagination and ordering to data query
    dataQuery = dataQuery
      .order('name')
      .range(offset, offset + pageSize - 1)

    const { data, error } = await dataQuery

    if (error) {
      return failure(error.message)
    }

    // Apply stock level filter client-side if specified
    // (This could be moved to a database view for better performance at scale)
    let filteredData = (data ?? []) as Item[]
    if (filters?.stockLevel) {
      filteredData = filteredData.filter((item) => {
        const stock = item.current_stock ?? 0
        const minStock = item.min_stock ?? 0
        const maxStock = item.max_stock ?? Infinity

        switch (filters.stockLevel) {
          case 'critical':
            return stock <= 0
          case 'low':
            return stock > 0 && stock < minStock
          case 'normal':
            return stock >= minStock && stock <= maxStock
          case 'overstocked':
            return maxStock !== null && stock > maxStock
          default:
            return true
        }
      })
    }

    return paginatedSuccess(filteredData, count ?? 0, page, pageSize)
  } catch {
    return failure('Failed to fetch items')
  }
}

export async function getItemByIdImpl(
  domain: DomainConfig,
  id: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch {
    return failure('Failed to fetch item')
  }
}

export async function getItemBySkuImpl(
  domain: DomainConfig,
  sku: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('sku', sku)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch {
    return failure('Failed to fetch item')
  }
}

export async function getItemByBarcodeImpl(
  domain: DomainConfig,
  barcode: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch {
    return failure('Failed to fetch item')
  }
}

/**
 * Lookup an item by barcode OR sku in a single query.
 * This replaces the pattern of sequential getItemByBarcode() then getItemBySku() calls.
 */
export async function getItemByCodeImpl(
  domain: DomainConfig,
  code: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('is_archived', false)
      .or(`barcode.eq.${code},sku.eq.${code}`)
      .limit(1)
      .maybeSingle()

    if (error) {
      return failure(error.message)
    }

    if (!data) {
      return failure('Item not found')
    }

    return success(data)
  } catch {
    return failure('Failed to fetch item')
  }
}

export async function searchItemsImpl(
  domain: DomainConfig,
  query: string,
  categoryId?: string
): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()
    const escaped = escapeLikePattern(query)

    let q = supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('is_archived', false)
      .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)

    if (categoryId) {
      q = q.eq('category_id', categoryId)
    }

    const { data, error } = await q
      .order('name')
      .limit(15)

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch {
    return failure('Failed to search items')
  }
}

/**
 * Get recently updated items with a limit.
 * Optimized for the scan page "recent items" display.
 */
export async function getRecentItemsImpl(
  domain: DomainConfig,
  limit: number = 4,
  categoryId?: string
): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    let q = supabase
      .from(domain.itemsTable as 'inv_items')
      .select('*')
      .eq('is_archived', false)

    if (categoryId) {
      q = q.eq('category_id', categoryId)
    }

    const { data, error } = await q
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch {
    return failure('Failed to fetch recent items')
  }
}

// ---------------------------------------------------------------------------
// Mutation implementations
// ---------------------------------------------------------------------------

export async function createItemImpl(
  domain: DomainConfig,
  itemData: ItemInsert
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .insert(itemData as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidateDomain(domain)
    return success(item)
  } catch {
    return failure('Failed to create item')
  }
}

export async function updateItemImpl(
  domain: DomainConfig,
  id: string,
  itemData: ItemUpdate,
  expectedVersion?: number
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    // If version is provided, implement optimistic locking
    if (expectedVersion !== undefined) {
      // First check if the item version matches
      const { data: currentItem, error: fetchError } = await supabase
        .from(domain.itemsTable as 'inv_items')
        .select('version')
        .eq('id', id)
        .single()

      if (fetchError) {
        return failure(fetchError.message)
      }

      const itemVersion = (currentItem as { version: number } | null)?.version
      if (itemVersion !== expectedVersion) {
        return failure('Item was modified, please refresh')
      }

      // Include incremented version in update
      const updateData = { ...itemData, version: expectedVersion + 1 }

      const { data: item, error } = await supabase
        .from(domain.itemsTable as 'inv_items')
        .update(updateData as never)
        .eq('id', id)
        .eq('version', expectedVersion) // Double-check with WHERE clause
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return failure('Item was modified, please refresh')
        }
        return failure(error.message)
      }

      revalidateDomain(domain)
      return success(item)
    }

    // Without version check (backwards compatible)
    const { data: item, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .update(itemData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidateDomain(domain)
    return success(item)
  } catch {
    return failure('Failed to update item')
  }
}

export async function archiveItemImpl(
  domain: DomainConfig,
  id: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .update({ is_archived: true } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidateDomain(domain)
    return success(item)
  } catch {
    return failure('Failed to archive item')
  }
}

export async function restoreItemImpl(
  domain: DomainConfig,
  id: string
): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from(domain.itemsTable as 'inv_items')
      .update({ is_archived: false } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidateDomain(domain)
    return success(item)
  } catch {
    return failure('Failed to restore item')
  }
}
