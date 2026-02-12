import type { DomainConfig } from './item-queries'
import { createClient } from '@/lib/supabase/server'
import type { Transaction, TransactionType } from '@/lib/supabase/types'
import { type ActionResult, type PaginatedResult, paginatedSuccess, success, failure } from '@/lib/types/action-result'

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
 * Accepts a DomainConfig so the same logic works for both inv and fg domains.
 */
export async function getEmployeeTransactionsWithItemsImpl(
  domain: DomainConfig,
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionWithItem[]>> {
  const supabase = await createClient()

  // PostgREST resolves `item:<table>(...)` via the FK: fg_transactions.item_id -> fg_items.id
  // (or inv_transactions.item_id -> inv_items.id). If FK or table names change, update this.
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
 * Accepts a DomainConfig so the same logic works for both inv and fg domains.
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
