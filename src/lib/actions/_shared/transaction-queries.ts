import type { DomainConfig } from './item-queries'
import { createClient } from '@/lib/supabase/server'
import type { Transaction, TransactionType } from '@/lib/supabase/types'
import { type ActionResult, type PaginatedResult, paginatedSuccess, success, failure } from '@/lib/types/action-result'

// ---------------------------------------------------------------------------
// Admin transaction types & query
// ---------------------------------------------------------------------------

export type TransactionWithDetails = Transaction & {
  item: { name: string; sku: string; unit: string | null } | null
  user: { first_name: string | null; last_name: string | null; email: string | null } | null
  source_location: { name: string } | null
  destination_location: { name: string } | null
}

export interface AdminTransactionFilters {
  transactionType?: TransactionType
  itemId?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  search?: string
}

const DEFAULT_ADMIN_PAGE_SIZE = 25

/**
 * Get transactions with server-side pagination, filtering, and search.
 * Optimized for admin list views with large datasets.
 * Accepts a DomainConfig so the same logic works for the inv domain.
 */
export async function getTransactionsWithDetailsPaginatedImpl(
  domain: DomainConfig,
  filters?: AdminTransactionFilters
): Promise<ActionResult<PaginatedResult<TransactionWithDetails>>> {
  const supabase = await createClient()
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE
  const offset = (page - 1) * pageSize

  // Derive FK hint strings at runtime for PostgREST disambiguation
  const srcFk = `${domain.transactionsTable}_source_location_id_fkey`
  const dstFk = `${domain.transactionsTable}_destination_location_id_fkey`

  const selectWithJoins = `*, item:${domain.itemsTable}(name, sku, unit), user:profiles(first_name, last_name, email), source_location:locations!${srcFk}(name), destination_location:locations!${dstFk}(name)`

  // Build count query
  let countQuery = supabase
    .from(domain.transactionsTable as 'inv_transactions')
    .select('*', { count: 'exact', head: true })

  // Build data query with joins
  let dataQuery = supabase
    .from(domain.transactionsTable as 'inv_transactions')
    .select(selectWithJoins)

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
    countQuery = countQuery.gte('event_timestamp', filters.startDate)
    dataQuery = dataQuery.gte('event_timestamp', filters.startDate)
  }

  if (filters?.endDate) {
    countQuery = countQuery.lte('event_timestamp', filters.endDate)
    dataQuery = dataQuery.lte('event_timestamp', filters.endDate)
  }

  // Execute count query
  const { count, error: countError } = await countQuery

  if (countError) {
    return failure(countError.message)
  }

  // Apply pagination and ordering to data query
  dataQuery = dataQuery
    .order('event_timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error } = await dataQuery

  if (error) {
    return failure(error.message)
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

const DEFAULT_EMPLOYEE_PAGE_SIZE = 20

/**
 * Employee-optimized transaction query with embedded item info.
 * Returns transactions for a specific user with item name/sku/unit joined,
 * avoiding the need to fetch all items separately.
 *
 * Accepts a DomainConfig so the same logic works for the inv domain.
 */
export async function getEmployeeTransactionsWithItemsImpl(
  domain: DomainConfig,
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionWithItem[]>> {
  const supabase = await createClient()

  // PostgREST resolves `item:<table>(...)` via the FK: inv_transactions.item_id -> inv_items.id.
  // If FK or table names change, update this.
  const selectWithItem = `*, item:${domain.itemsTable}(name, sku, unit)`

  let query = supabase
    .from(domain.transactionsTable as 'inv_transactions')
    .select(selectWithItem)
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
    return failure(error.message)
  }

  return success((data ?? []) as EmployeeTransactionWithItem[])
}

/**
 * Paginated employee transactions with item details.
 * Returns data, hasMore flag, and total count for efficient pagination.
 *
 * Accepts a DomainConfig so the same logic works for the inv domain.
 */
export async function getEmployeeTransactionsWithItemsPaginatedImpl(
  domain: DomainConfig,
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionsPaginatedResult>> {
  const supabase = await createClient()
  const limit = options?.limit ?? DEFAULT_EMPLOYEE_PAGE_SIZE
  const offset = options?.offset ?? 0

  const selectWithItem = `*, item:${domain.itemsTable}(name, sku, unit)`

  // Build count query first
  let countQuery = supabase
    .from(domain.transactionsTable as 'inv_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Build data query
  let dataQuery = supabase
    .from(domain.transactionsTable as 'inv_transactions')
    .select(selectWithItem)
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
    return failure(countError.message)
  }

  // Apply pagination
  dataQuery = dataQuery.range(offset, offset + limit - 1)

  const { data, error } = await dataQuery

  if (error) {
    return failure(error.message)
  }

  const totalCount = count ?? 0
  const hasMore = offset + limit < totalCount

  return success({
    data: (data ?? []) as EmployeeTransactionWithItem[],
    hasMore,
    totalCount,
  })
}
