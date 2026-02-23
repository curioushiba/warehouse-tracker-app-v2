'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Store, StoreInsert, StoreUpdate } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

export type { ActionResult } from '@/lib/types/action-result'

/**
 * Get all stores ordered by name
 */
export async function getStores(): Promise<ActionResult<Store[]>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_stores')
      .select('*')
      .order('name')

    if (error) {
      return failure(error.message)
    }

    return success(data ?? [])
  } catch (err) {
    return failure('Failed to fetch stores')
  }
}

/**
 * Get a single store by ID
 */
export async function getStoreById(id: string): Promise<ActionResult<Store>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (err) {
    return failure('Failed to fetch store')
  }
}

/**
 * Create a new store
 */
export async function createStore(data: StoreInsert): Promise<ActionResult<Store>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data: store, error } = await supabase
      .from('inv_stores')
      .insert(data as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/stores')
    revalidatePath('/admin/items')
    return success(store)
  } catch (err) {
    return failure('Failed to create store')
  }
}

/**
 * Update an existing store
 */
export async function updateStore(
  id: string,
  data: StoreUpdate
): Promise<ActionResult<Store>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data: store, error } = await supabase
      .from('inv_stores')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/stores')
    revalidatePath('/admin/items')
    return success(store)
  } catch (err) {
    return failure('Failed to update store')
  }
}

/**
 * Delete a store (only if no items are associated)
 */
export async function deleteStore(id: string): Promise<ActionResult<void>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    // First check if there are any active (non-archived) items in this store
    const { count, error: countError } = await supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)
      .eq('is_archived', false)

    if (countError) {
      return failure(countError.message)
    }

    if (count && count > 0) {
      return failure(`Cannot delete store: ${count} items are associated with this store`)
    }

    // Safe to delete
    const { error } = await supabase
      .from('inv_stores')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(error.message)
    }

    revalidatePath('/admin/stores')
    revalidatePath('/admin/items')

    return success(undefined)
  } catch (err) {
    return failure('Failed to delete store')
  }
}

/**
 * Get item counts for all stores (non-archived items only)
 */
export async function getStoreItemCounts(): Promise<ActionResult<Record<string, number>>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('id, store_id')
      .eq('is_archived', false)

    if (error) {
      return failure(error.message)
    }

    const counts: Record<string, number> = {}
    for (const item of data as Array<{ id: string; store_id: string | null }>) {
      if (item.store_id) {
        counts[item.store_id] = (counts[item.store_id] ?? 0) + 1
      }
    }

    return success(counts)
  } catch (err) {
    return failure('Failed to get store item counts')
  }
}

/**
 * Get the count of items in a store
 */
export async function getStoreItemCount(id: string): Promise<ActionResult<number>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { count, error } = await supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)

    if (error) {
      return failure(error.message)
    }

    return success(count ?? 0)
  } catch (err) {
    return failure('Failed to get store item count')
  }
}
