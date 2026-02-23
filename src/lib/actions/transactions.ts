'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Transaction, TransactionType } from '@/lib/supabase/types'
import type { PaginatedResult } from '@/lib/types/action-result'
import { INV_DOMAIN } from './_shared/item-queries'
import {
  getTransactionsWithDetailsPaginatedImpl,
  type TransactionWithDetails as SharedTransactionWithDetails,
  type AdminTransactionFilters,
} from './_shared/transaction-queries'

// Result type for consistent error handling
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Re-export for convenience
export type { PaginatedResult } from '@/lib/types/action-result'

// Re-export shared types with backward-compatible aliases
export type TransactionWithDetails = SharedTransactionWithDetails
export type PaginatedTransactionFilters = AdminTransactionFilters

// Filter interface for getTransactions
export interface TransactionFilters {
  transactionType?: TransactionType
  itemId?: string
  userId?: string
  startDate?: string
  endDate?: string
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
    query = query.gte('event_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_timestamp', filters.endDate)
  }

  const { data, error } = await query.order('event_timestamp', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}

export interface GetTransactionsWithDetailsOptions {
  /** Max number of rows to return */
  limit?: number
}

export async function getTransactionsWithDetails(
  filters?: TransactionFilters,
  options?: GetTransactionsWithDetailsOptions
): Promise<ActionResult<TransactionWithDetails[]>> {
  // Verify auth using cookie-based client (defense in depth — middleware also checks)
  const userClient = await createClient()
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Session expired. Please refresh the page and sign in again.' }
  }

  // Use admin client for the actual query — bypasses RLS
  // Safe because: auth verified above, route is admin-only (middleware-protected)
  const supabase = createAdminClient()

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
    query = query.gte('event_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_timestamp', filters.endDate)
  }

  query = query.order('event_timestamp', { ascending: false })

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

/**
 * Get transactions with server-side pagination, filtering, and search.
 * This is optimized for admin list views with large datasets.
 * Delegates to the shared domain-agnostic implementation.
 */
export async function getTransactionsWithDetailsPaginated(
  filters?: PaginatedTransactionFilters
): Promise<ActionResult<PaginatedResult<TransactionWithDetails>>> {
  // Verify auth using cookie-based client (defense in depth — middleware also checks)
  const userClient = await createClient()
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Session expired. Please refresh the page and sign in again.' }
  }

  // Use admin client for the actual query — bypasses RLS
  // Safe because: auth verified above, route is admin-only (middleware-protected)
  // Follows same pattern as dashboard.ts (getDashboardData, getRecentActivity)
  return getTransactionsWithDetailsPaginatedImpl(INV_DOMAIN, filters, createAdminClient())
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
    .order('event_timestamp', { ascending: false })

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
    .order('event_timestamp', { ascending: false })

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

  // Revalidate dashboard to show updated recent transactions
  revalidatePath('/admin')

  return { success: true, data }
}

/**
 * Employee-optimized transaction query with embedded item info.
 * Returns transactions for a specific user with item name/sku/unit joined,
 * avoiding the need to fetch all items separately.
 */
export type EmployeeTransactionWithItem = Transaction & {
  item: { name: string; sku: string; unit: string | null } | null
}

export interface GetEmployeeTransactionsOptions {
  /** Max number of rows to return (default: all) */
  limit?: number
  /** Filter to only today's transactions */
  todayOnly?: boolean
  /** Offset for pagination (default: 0) */
  offset?: number
}

/** Result type for paginated employee transactions */
export interface EmployeeTransactionsPaginatedResult {
  data: EmployeeTransactionWithItem[]
  hasMore: boolean
  totalCount: number
}

export async function getEmployeeTransactionsWithItems(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionWithItem[]>> {
  const supabase = await createClient()

  let query = supabase
    .from('inv_transactions')
    .select(
      `
        *,
        item:inv_items(name, sku, unit)
      `
    )
    .eq('user_id', userId)
    .order('event_timestamp', { ascending: false })

  // Filter to today's transactions if requested
  // Use UTC to avoid timezone offset issues between server and database
  if (options?.todayOnly) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    query = query.gte('event_timestamp', today.toISOString())
  }

  // Apply limit if specified
  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: (data ?? []) as EmployeeTransactionWithItem[] }
}

/**
 * Paginated employee transactions with item details.
 * Returns data, hasMore flag, and total count for efficient pagination.
 */
const DEFAULT_EMPLOYEE_PAGE_SIZE = 20

export async function getEmployeeTransactionsWithItemsPaginated(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionsPaginatedResult>> {
  const supabase = await createClient()
  const limit = options?.limit ?? DEFAULT_EMPLOYEE_PAGE_SIZE
  const offset = options?.offset ?? 0

  // Build count query first
  let countQuery = supabase
    .from('inv_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Build data query
  let dataQuery = supabase
    .from('inv_transactions')
    .select(
      `
        *,
        item:inv_items(name, sku, unit)
      `
    )
    .eq('user_id', userId)
    .order('event_timestamp', { ascending: false })

  // Filter to today's transactions if requested
  // Use UTC to avoid timezone offset issues between server and database
  if (options?.todayOnly) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayIso = today.toISOString()
    countQuery = countQuery.gte('event_timestamp', todayIso)
    dataQuery = dataQuery.gte('event_timestamp', todayIso)
  }

  // Execute count query
  const { count, error: countError } = await countQuery

  if (countError) {
    return { success: false, error: countError.message }
  }

  // Apply pagination
  dataQuery = dataQuery.range(offset, offset + limit - 1)

  const { data, error } = await dataQuery

  if (error) {
    return { success: false, error: error.message }
  }

  const totalCount = count ?? 0
  const hasMore = offset + limit < totalCount

  return {
    success: true,
    data: {
      data: (data ?? []) as EmployeeTransactionWithItem[],
      hasMore,
      totalCount,
    },
  }
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
    .order('event_timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data ?? [] }
}
