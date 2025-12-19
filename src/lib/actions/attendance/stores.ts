'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResult, success, failure, paginatedSuccess, PaginatedResult } from '@/lib/types/action-result'
import type { AttStore, AttStoreInsert, AttStoreUpdate, AttStoreFilters } from '@/lib/supabase/attendance-types'

const ATTENDANCE_PATH = '/admin/attendance/stores'

// ============================================
// GET STORES (PAGINATED)
// ============================================
export async function getStoresPaginated(
  filters?: AttStoreFilters
): Promise<ActionResult<PaginatedResult<AttStore>>> {
  try {
    const supabase = await createClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    const offset = (page - 1) * pageSize

    // Build count query
    let countQuery = supabase
      .from('att_stores')
      .select('*', { count: 'exact', head: true })

    if (filters?.search) {
      countQuery = countQuery.ilike('name', `%${filters.search}%`)
    }
    if (filters?.isActive !== undefined) {
      countQuery = countQuery.eq('is_active', filters.isActive)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return failure(countError.message)
    }

    // Build data query
    let dataQuery = supabase
      .from('att_stores')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (filters?.search) {
      dataQuery = dataQuery.ilike('name', `%${filters.search}%`)
    }
    if (filters?.isActive !== undefined) {
      dataQuery = dataQuery.eq('is_active', filters.isActive)
    }

    const { data, error } = await dataQuery

    if (error) {
      return failure(error.message)
    }

    return paginatedSuccess(data as AttStore[], count ?? 0, page, pageSize)
  } catch {
    return failure('Failed to fetch stores')
  }
}

// ============================================
// GET ALL STORES (for dropdowns)
// ============================================
export async function getAllStores(): Promise<ActionResult<AttStore[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_stores')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      return failure(error.message)
    }

    return success(data as AttStore[])
  } catch {
    return failure('Failed to fetch stores')
  }
}

// ============================================
// GET STORE BY ID
// ============================================
export async function getStoreById(id: string): Promise<ActionResult<AttStore>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return failure(error.message)
    }

    return success(data as AttStore)
  } catch {
    return failure('Failed to fetch store')
  }
}

// ============================================
// GET STORE BY QR CODE (for clock-in)
// ============================================
export async function getStoreByQrCode(qrCode: string): Promise<ActionResult<AttStore>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_stores')
      .select('*')
      .eq('qr_code', qrCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return failure('Store not found or inactive')
      }
      return failure(error.message)
    }

    return success(data as AttStore)
  } catch {
    return failure('Failed to fetch store')
  }
}

// ============================================
// CREATE STORE
// ============================================
export async function createStore(
  storeData: AttStoreInsert
): Promise<ActionResult<AttStore>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_stores')
      .insert(storeData as never)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttStore)
  } catch {
    return failure('Failed to create store')
  }
}

// ============================================
// UPDATE STORE
// ============================================
export async function updateStore(
  id: string,
  storeData: AttStoreUpdate
): Promise<ActionResult<AttStore>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('att_stores')
      .update(storeData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttStore)
  } catch {
    return failure('Failed to update store')
  }
}

// ============================================
// DELETE STORE
// ============================================
export async function deleteStore(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient()

    // Check for existing records
    const { count } = await supabase
      .from('att_records')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)

    if (count && count > 0) {
      return failure('Cannot delete store with attendance records. Deactivate it instead.')
    }

    const { error } = await supabase
      .from('att_stores')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(null)
  } catch {
    return failure('Failed to delete store')
  }
}

// ============================================
// GENERATE QR CODE FOR STORE
// ============================================
export async function generateStoreQrCode(storeId: string): Promise<ActionResult<AttStore>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .rpc('assign_att_code', { p_store_id: storeId } as never)
      .single()

    if (error) {
      return failure(error.message)
    }

    revalidatePath(ATTENDANCE_PATH)
    return success(data as AttStore)
  } catch {
    return failure('Failed to generate QR code')
  }
}
