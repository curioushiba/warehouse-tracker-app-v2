'use server'

import { createClient } from '@/lib/supabase/server'
import type { Transaction, TransactionType } from '@/lib/supabase/types'
import { type PaginatedResult, paginatedSuccess } from '@/lib/types/action-result'

// Result type for consistent error handling
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Re-export for convenience
export type { PaginatedResult } from '@/lib/types/action-result'

// Filter interface for getTransactions
export interface TransactionFilters {
  transactionType?: TransactionType
  itemId?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface PaginatedTransactionFilters extends TransactionFilters {
  page?: number
  pageSize?: number
  search?: string
}

// Input interface for submitTransaction
export interface TransactionInput {
  transactionType: TransactionType
  itemId: string
  quantity: number
  notes?: string
  sourceLocationId?: string
  destinationLocationId?: string
  idempotencyKey?: string
}

/**
 * Get transactions with optional filters
 */
export async function getTransactions(
  filters?: TransactionFilters
): Promise<ActionResult<Transaction[]>> {
  const supabase = await createClient()

  let query = supabase
    .from('inv_transactions')
    .select('*')

  if (filters?.transactionType) {
    query = query.eq('transaction_type', filters.transactionType)
  }

  if (filters?.itemId) {
    query = query.eq('item_id', filters.itemId)
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.startDate) {
    query = query.gte('server_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('server_timestamp', filters.endDate)
  }

  const { data, error } = await query.order('server_timestamp', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}

/**
 * Get transactions with embedded item/user/location display fields.
 *
 * This is optimized for admin UI tables so we don't have to fetch entire
 * items/users/locations tables just to render names.
 */
export type TransactionWithDetails = Transaction & {
  item: { name: string; sku: string; unit: string | null } | null
  user: { first_name: string | null; last_name: string | null; email: string | null } | null
  source_location: { name: string } | null
  destination_location: { name: string } | null
}

export interface GetTransactionsWithDetailsOptions {
  /** Max number of rows to return */
  limit?: number
}

export async function getTransactionsWithDetails(
  filters?: TransactionFilters,
  options?: GetTransactionsWithDetailsOptions
): Promise<ActionResult<TransactionWithDetails[]>> {
  const supabase = await createClient()

  // Note: locations has two FKs from inv_transactions (source/destination).
  // Use explicit relationship names to avoid ambiguity in PostgREST.
  let query = supabase
    .from('inv_transactions')
    .select(
      `
        *,
        item:inv_items(name, sku, unit),
        user:profiles(first_name, last_name, email),
        source_location:locations!inv_transactions_source_location_id_fkey(name),
        destination_location:locations!inv_transactions_destination_location_id_fkey(name)
      `
    )

  if (filters?.transactionType) {
    query = query.eq('transaction_type', filters.transactionType)
  }

  if (filters?.itemId) {
    query = query.eq('item_id', filters.itemId)
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.startDate) {
    query = query.gte('server_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('server_timestamp', filters.endDate)
  }

  query = query.order('server_timestamp', { ascending: false })

  const limit = options?.limit
  if (typeof limit === 'number') {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: (data ?? []) as TransactionWithDetails[] }
}

const DEFAULT_PAGE_SIZE = 25

/**
 * Get transactions with server-side pagination, filtering, and search.
 * This is optimized for admin list views with large datasets.
 */
export async function getTransactionsWithDetailsPaginated(
  filters?: PaginatedTransactionFilters
): Promise<ActionResult<PaginatedResult<TransactionWithDetails>>> {
  const supabase = await createClient()
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE
  const offset = (page - 1) * pageSize

  // Build count query
  let countQuery = supabase
    .from('inv_transactions')
    .select('*', { count: 'exact', head: true })

  // Build data query with joins
  let dataQuery = supabase
    .from('inv_transactions')
    .select(
      `
        *,
        item:inv_items(name, sku, unit),
        user:profiles(first_name, last_name, email),
        source_location:locations!inv_transactions_source_location_id_fkey(name),
        destination_location:locations!inv_transactions_destination_location_id_fkey(name)
      `
    )

  // Apply transaction type filter
  if (filters?.transactionType) {
    countQuery = countQuery.eq('transaction_type', filters.transactionType)
    dataQuery = dataQuery.eq('transaction_type', filters.transactionType)
  }

  // Apply item filter
  if (filters?.itemId) {
    countQuery = countQuery.eq('item_id', filters.itemId)
    dataQuery = dataQuery.eq('item_id', filters.itemId)
  }

  // Apply user filter
  if (filters?.userId) {
    countQuery = countQuery.eq('user_id', filters.userId)
    dataQuery = dataQuery.eq('user_id', filters.userId)
  }

  // Apply date filters
  if (filters?.startDate) {
    countQuery = countQuery.gte('server_timestamp', filters.startDate)
    dataQuery = dataQuery.gte('server_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    countQuery = countQuery.lte('server_timestamp', filters.endDate)
    dataQuery = dataQuery.lte('server_timestamp', filters.endDate)
  }

  // Execute count query
  const { count, error: countError } = await countQuery

  if (countError) {
    return { success: false, error: countError.message }
  }

  // Apply pagination and ordering to data query
  dataQuery = dataQuery
    .order('server_timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error } = await dataQuery

  if (error) {
    return { success: false, error: error.message }
  }

  // Apply client-side search filter if specified
  // (Search spans item name, SKU, user name - requires joined data)
  let filteredData = (data ?? []) as TransactionWithDetails[]
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filteredData = filteredData.filter((tx) => {
      const itemName = tx.item?.name?.toLowerCase() ?? ''
      const itemSku = tx.item?.sku?.toLowerCase() ?? ''
      const userName = `${tx.user?.first_name ?? ''} ${tx.user?.last_name ?? ''}`.toLowerCase()
      const notes = tx.notes?.toLowerCase() ?? ''
      return (
        itemName.includes(searchLower) ||
        itemSku.includes(searchLower) ||
        userName.includes(searchLower) ||
        notes.includes(searchLower)
      )
    })
  }

  return paginatedSuccess(filteredData, count ?? 0, page, pageSize)
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(
  id: string
): Promise<ActionResult<Transaction>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inv_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get all transactions for a specific item
 */
export async function getItemTransactions(
  itemId: string
): Promise<ActionResult<Transaction[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inv_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('server_timestamp', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}

/**
 * Get all transactions by a specific user
 */
export async function getUserTransactions(
  userId: string
): Promise<ActionResult<Transaction[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inv_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('server_timestamp', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}

/**
 * Submit a new transaction using the database function
 * This ensures atomic stock updates and validation
 */
export async function submitTransaction(
  input: TransactionInput
): Promise<ActionResult<Transaction>> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Call the database function for atomic transaction processing
  const { data, error } = await supabase.rpc('submit_transaction', {
    p_transaction_type: input.transactionType,
    p_item_id: input.itemId,
    p_quantity: input.quantity,
    p_user_id: user.id,
    p_notes: input.notes ?? null,
    p_source_location_id: input.sourceLocationId ?? null,
    p_destination_location_id: input.destinationLocationId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_device_timestamp: new Date().toISOString(),
  } as never)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get recent transactions with a limit
 */
export async function getRecentTransactions(
  limit: number = 10
): Promise<ActionResult<Transaction[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inv_transactions')
    .select('*')
    .order('server_timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}
