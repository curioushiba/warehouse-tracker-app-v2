'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Item, ItemInsert, ItemUpdate } from '@/lib/supabase/types'
import { type ActionResult, type PaginatedResult, success, failure, paginatedSuccess } from '@/lib/types/action-result'

// Re-export for backwards compatibility
export type { ActionResult, PaginatedResult } from '@/lib/types/action-result'

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

export async function getItems(filters?: ItemFilters): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('inv_items')
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
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
    }

    query = query.order('name')

    const { data, error } = await query

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch items')
  }
}

const DEFAULT_PAGE_SIZE = 25

/**
 * Get items with server-side pagination, filtering, and search.
 * This is optimized for admin list views with large datasets.
 */
export async function getItemsPaginated(
  filters?: PaginatedItemFilters
): Promise<ActionResult<PaginatedResult<Item>>> {
  try {
    const supabase = await createClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE
    const offset = (page - 1) * pageSize

    // Build base query for count
    let countQuery = supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', filters?.isArchived ?? false)

    // Build data query
    let dataQuery = supabase
      .from('inv_items')
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
      const searchPattern = `%${filters.search}%`
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
  } catch (err) {
    return failure('Failed to fetch items')
  }
}

export async function getItemById(id: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch item')
  }
}

export async function getItemBySku(sku: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('sku', sku)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch item')
  }
}

export async function getItemByBarcode(barcode: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch item')
  }
}

export async function createItem(itemData: ItemInsert): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from('inv_items')
      .insert(itemData as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/items')
    return success(item)
  } catch (err) {
    return failure('Failed to create item')
  }
}

export async function updateItem(id: string, itemData: ItemUpdate, expectedVersion?: number): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    // If version is provided, implement optimistic locking
    if (expectedVersion !== undefined) {
      // First check if the item version matches
      const { data: currentItem, error: fetchError } = await supabase
        .from('inv_items')
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
        .from('inv_items')
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

      revalidatePath('/items')
      revalidatePath(`/items/${id}`)
      return success(item)
    }

    // Without version check (backwards compatible)
    const { data: item, error } = await supabase
      .from('inv_items')
      .update(itemData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/items')
    revalidatePath(`/items/${id}`)
    return success(item)
  } catch (err) {
    return failure('Failed to update item')
  }
}

export async function archiveItem(id: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from('inv_items')
      .update({ is_archived: true } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/items')
    revalidatePath(`/items/${id}`)
    return success(item)
  } catch (err) {
    return failure('Failed to archive item')
  }
}

export async function restoreItem(id: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from('inv_items')
      .update({ is_archived: false } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/items')
    revalidatePath(`/items/${id}`)
    return success(item)
  } catch (err) {
    return failure('Failed to restore item')
  }
}

export async function getLowStockItems(limit?: number): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    // Use the inv_low_stock_items view for efficient server-side filtering
    // The view filters WHERE current_stock < min_stock AND is_archived = false
    let query = supabase
      .from('inv_low_stock_items')
      .select('*')

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      return failure(error.message)
    }

    return success((data ?? []) as Item[])
  } catch (err) {
    return failure('Failed to fetch low stock items')
  }
}

/**
 * Escape special LIKE pattern characters to prevent SQL injection via wildcards.
 * Characters % and _ have special meaning in LIKE patterns.
 */
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&')
}

export async function searchItems(query: string): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()
    const escaped = escapeLikePattern(query)

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('is_archived', false)
      .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
      .order('name')
      .limit(15)

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to search items')
  }
}

/**
 * Lookup an item by barcode OR sku in a single query.
 * This replaces the pattern of sequential getItemByBarcode() then getItemBySku() calls.
 */
export async function getItemByCode(code: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
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
  } catch (err) {
    return failure('Failed to fetch item')
  }
}

/**
 * Get recently updated items with a limit.
 * Optimized for the scan page "recent items" display.
 */
export async function getRecentItems(limit: number = 4): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch recent items')
  }
}

/**
 * Generate a PT code (PT-XXXXX format) for an item that doesn't have a barcode.
 * Uses an atomic database function to prevent race conditions where concurrent
 * requests could waste sequence numbers.
 */
export async function generatePtCode(itemId: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    // Use atomic function that handles validation, generation, and update in one transaction
    const { data, error } = await supabase
      .rpc('assign_pt_code', { p_item_id: itemId } as never)
      .single()

    if (error) {
      // Map database errors to user-friendly messages
      if (error.message.includes('Item not found')) {
        return failure('Item not found')
      }
      if (error.message.includes('already has a barcode')) {
        return failure('Item already has a barcode assigned')
      }
      if (error.message.includes('archived item')) {
        return failure('Cannot generate code for archived item')
      }
      return failure(error.message)
    }

    const updatedItem = data as Item
    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)
    return success(updatedItem)
  } catch {
    return failure('Failed to generate PT code')
  }
}

/**
 * Register a manufacturer barcode to an item.
 * Validates that the barcode is not already in use by another item.
 */
export async function registerBarcode(itemId: string, barcode: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      return failure('Barcode cannot be empty')
    }

    if (barcode.trim().length > 100) {
      return failure('Barcode is too long')
    }

    const trimmedBarcode = barcode.trim()

    // Check if barcode is already in use by another item
    const { data: existingItem, error: checkError } = await supabase
      .from('inv_items')
      .select('id, name')
      .eq('barcode', trimmedBarcode)
      .maybeSingle()

    if (checkError) {
      return failure(checkError.message)
    }

    const existingData = existingItem as { id: string; name: string } | null
    if (existingData && existingData.id !== itemId) {
      return failure('This barcode is already assigned to another item')
    }

    // Fetch current item to verify it exists
    const { data: currentItem, error: fetchError } = await supabase
      .from('inv_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      return failure(fetchError.message)
    }

    const currentData = currentItem as Item
    if (currentData.is_archived) {
      return failure('Cannot register barcode for archived item')
    }

    // Update item with barcode
    const { data: updatedItem, error: updateError } = await supabase
      .from('inv_items')
      .update({ barcode: trimmedBarcode } as never)
      .eq('id', itemId)
      .select()
      .single()

    if (updateError) {
      return failure(updateError.message)
    }

    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)
    return success(updatedItem)
  } catch (err) {
    return failure('Failed to register barcode')
  }
}

/**
 * Clear the barcode from an item.
 */
export async function clearBarcode(itemId: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    const { data: updatedItem, error } = await supabase
      .from('inv_items')
      .update({ barcode: null } as never)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/items')
    revalidatePath(`/admin/items/${itemId}`)
    return success(updatedItem)
  } catch (err) {
    return failure('Failed to clear barcode')
  }
}

const MAX_BULK_ITEMS = 100
const MAX_NAME_LENGTH = 255

/**
 * Bulk create multiple items with default values.
 * Each item gets a database-generated SKU, unit="pcs", and stock=0.
 */
export async function bulkCreateItems(names: string[]): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return failure('Not authorized')
    }

    // Verify user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (profileData?.role !== 'admin') {
      return failure('Not authorized')
    }

    // Validate input array
    if (!Array.isArray(names) || names.length === 0) {
      return failure('At least one item name required')
    }

    // Limit bulk operations to reasonable size
    if (names.length > MAX_BULK_ITEMS) {
      return failure(`Cannot add more than ${MAX_BULK_ITEMS} items at once`)
    }

    // Validate and clean names
    const cleanedNames = names.map((name) => (typeof name === 'string' ? name.trim() : ''))

    // Check for empty names
    if (cleanedNames.some((name) => name === '')) {
      return failure('All item names must be non-empty')
    }

    // Check for names that are too long
    if (cleanedNames.some((name) => name.length > MAX_NAME_LENGTH)) {
      return failure(`Item names must not exceed ${MAX_NAME_LENGTH} characters`)
    }

    // Build insert array with defaults (SKU uses database default via generate_sku())
    const itemsToInsert: Omit<ItemInsert, 'sku'>[] = cleanedNames.map((name) => ({
      name,
      unit: 'pcs',
      current_stock: 0,
      min_stock: 0,
    }))

    // Single atomic insert
    const { data: createdItems, error } = await supabase
      .from('inv_items')
      .insert(itemsToInsert as never[])
      .select()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/items')
    return success((createdItems ?? []) as Item[])
  } catch (err) {
    return failure('Failed to create items')
  }
}
