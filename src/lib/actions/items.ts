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

export async function updateItem(id: string, itemData: ItemUpdate): Promise<ActionResult<Item>> {
  try {
    const supabase = await createClient()

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

export async function getLowStockItems(): Promise<ActionResult<Item[]>> {
  try {
    const supabase = await createClient()

    // Using a raw filter to compare current_stock < min_stock
    // Supabase doesn't have a direct column-to-column comparison,
    // so we fetch all non-archived items and filter client-side
    // Alternative: use a database function or view
    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('is_archived', false)
      .order('current_stock', { ascending: true })

    if (error) {
      return failure(error.message)
    }

    // Filter items where current_stock < min_stock
    const typedData = data as Item[] | null
    const lowStockItems = typedData?.filter(item => item.current_stock < item.min_stock) ?? []

    return success(lowStockItems)
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
