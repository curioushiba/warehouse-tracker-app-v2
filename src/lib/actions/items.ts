'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Item, ItemInsert, ItemUpdate } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

// Re-export for backwards compatibility
export type { ActionResult } from '@/lib/types/action-result'

export interface ItemFilters {
  categoryId?: string
  locationId?: string
  isArchived?: boolean
  search?: string
  stockLevel?: 'critical' | 'low' | 'normal' | 'overstocked'
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

export async function searchItems(query: string): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('is_archived', false)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .order('name')

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to search items')
  }
}

/**
 * Generate an HRG code (HRG-XXXXX format) for an item that doesn't have a barcode.
 * Uses an atomic database function to prevent race conditions where concurrent
 * requests could waste sequence numbers.
 */
export async function generateHrgCode(itemId: string): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

    // Use atomic function that handles validation, generation, and update in one transaction
    const { data, error } = await supabase
      .rpc('assign_hrg_code', { p_item_id: itemId } as never)
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
    return failure('Failed to generate HRG code')
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
