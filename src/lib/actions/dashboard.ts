'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { Item } from '@/lib/supabase/types'
import { type ActionResult, success, failure } from '@/lib/types/action-result'

export type { ActionResult } from '@/lib/types/action-result'

export interface DashboardStats {
  totalItems: number
  lowStockItems: number
  criticalStockItems: number
  todayTransactions: number
  pendingSync: number
}

export interface DashboardData {
  stats: DashboardStats
  lowStockItemsList: Item[]
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel - using the view for low stock count
    const [
      totalItemsResult,
      lowStockResult,
      criticalStockResult,
      todayTransactionsResult,
      pendingSyncResult,
    ] = await Promise.all([
      // Total items (non-archived)
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false),

      // Low stock items - use the view for efficient server-side filtering
      supabase
        .from('inv_low_stock_items')
        .select('*', { count: 'exact', head: true })
        .gt('current_stock', 0),

      // Critical stock (current_stock = 0)
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('current_stock', 0),

      // Today's transactions
      supabase
        .from('inv_transactions')
        .select('id', { count: 'exact', head: true })
        .gte('server_timestamp', today),

      // Pending sync errors
      supabase
        .from('sync_errors')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    return success({
      totalItems: totalItemsResult.count ?? 0,
      lowStockItems: lowStockResult.count ?? 0,
      criticalStockItems: criticalStockResult.count ?? 0,
      todayTransactions: todayTransactionsResult.count ?? 0,
      pendingSync: pendingSyncResult.count ?? 0,
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch dashboard stats')
  }
}

/**
 * Get dashboard data including stats and low stock items in a single call.
 * This consolidates what was previously 3 separate API calls into 2.
 */
export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel
    const [
      totalItemsResult,
      lowStockItemsResult,
      criticalStockResult,
      todayTransactionsResult,
      pendingSyncResult,
    ] = await Promise.all([
      // Total items (non-archived)
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false),

      // Low stock items - get both count and items from the view
      supabase
        .from('inv_low_stock_items')
        .select('*', { count: 'exact' })
        .gt('current_stock', 0)
        .limit(5),

      // Critical stock (current_stock = 0)
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('current_stock', 0),

      // Today's transactions
      supabase
        .from('inv_transactions')
        .select('id', { count: 'exact', head: true })
        .gte('server_timestamp', today),

      // Pending sync errors
      supabase
        .from('sync_errors')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    return success({
      stats: {
        totalItems: totalItemsResult.count ?? 0,
        lowStockItems: lowStockItemsResult.count ?? 0,
        criticalStockItems: criticalStockResult.count ?? 0,
        todayTransactions: todayTransactionsResult.count ?? 0,
        pendingSync: pendingSyncResult.count ?? 0,
      },
      lowStockItemsList: (lowStockItemsResult.data ?? []) as Item[],
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch dashboard data')
  }
}

export async function getRecentActivity(limit: number = 10) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_transactions')
      .select(`
        *,
        item:inv_items(name, sku),
        user:profiles(first_name, last_name)
      `)
      .order('event_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return failure(error.message)
    }

    return success(data)
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch recent activity')
  }
}

// ============================================================================
// Panel Data Functions for Expandable Stat Cards
// ============================================================================

export type PriorityLevel = 'critical' | 'urgent' | 'watch'

export interface LowStockDetailItem {
  id: string
  name: string
  sku: string
  current_stock: number
  min_stock: number | null
  max_stock: number | null
  daily_consumption_rate: number
  days_to_stockout: number | null
  reorder_quantity: number | null
  priority: PriorityLevel
}

export interface LowStockDetails {
  items: LowStockDetailItem[]
  totalCount: number
}

/**
 * Get detailed low stock items with consumption rates and days-to-stockout
 */
export async function getLowStockDetails(): Promise<ActionResult<LowStockDetails>> {
  try {
    const supabase = createAdminClient()

    // Get low stock items with their consumption rates
    const { data: lowStockItems, error: itemsError, count } = await supabase
      .from('inv_low_stock_items')
      .select('*', { count: 'exact' })
      .gt('current_stock', 0)
      .order('current_stock', { ascending: true })

    if (itemsError) {
      return failure(itemsError.message)
    }

    if (!lowStockItems || lowStockItems.length === 0) {
      return success({ items: [], totalCount: 0 })
    }

    // Cast to Item[] - view returns same columns as inv_items but Supabase types don't include views
    const items = lowStockItems as Item[]

    // Get consumption rates for these items
    const itemIds = items.map((item) => item.id)
    const { data: consumptionRates, error: ratesError } = await supabase
      .from('inv_item_consumption_rates')
      .select('item_id, daily_consumption_rate')
      .in('item_id', itemIds)

    if (ratesError) {
      // If view doesn't exist, proceed without consumption rates
      console.warn('Could not fetch consumption rates:', ratesError.message)
    }

    // Create a map for quick lookup - cast needed as Supabase doesn't generate types for views
    const ratesMap = new Map<string, number>()
    const rates = (consumptionRates ?? []) as { item_id: string; daily_consumption_rate: number }[]
    for (const rate of rates) {
      ratesMap.set(rate.item_id, rate.daily_consumption_rate)
    }

    // Calculate days to stockout and priority for each item
    const detailItems: LowStockDetailItem[] = items.map((item) => {
      const dailyRate = ratesMap.get(item.id) ?? 0
      const daysToStockout = dailyRate > 0 ? Math.floor(item.current_stock / dailyRate) : null
      const reorderQty = item.max_stock != null ? item.max_stock - item.current_stock : null

      // Determine priority based on days to stockout
      let priority: PriorityLevel = 'watch'
      if (daysToStockout !== null) {
        if (daysToStockout <= 3) {
          priority = 'critical'
        } else if (daysToStockout <= 7) {
          priority = 'urgent'
        } else if (daysToStockout <= 14) {
          priority = 'watch'
        }
      } else {
        // If no consumption data, use stock level to determine priority
        const minStock = item.min_stock ?? 0
        const stockRatio = minStock > 0 ? item.current_stock / minStock : 1
        if (stockRatio <= 0.25) {
          priority = 'critical'
        } else if (stockRatio <= 0.5) {
          priority = 'urgent'
        }
      }

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        max_stock: item.max_stock,
        daily_consumption_rate: dailyRate,
        days_to_stockout: daysToStockout,
        reorder_quantity: reorderQty,
        priority,
      }
    })

    // Sort by priority (critical first), then by days to stockout
    const priorityOrder: Record<PriorityLevel, number> = { critical: 0, urgent: 1, watch: 2 }
    detailItems.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      // If both have days_to_stockout, sort by that
      if (a.days_to_stockout !== null && b.days_to_stockout !== null) {
        return a.days_to_stockout - b.days_to_stockout
      }
      // Items with no data go to the end
      if (a.days_to_stockout === null) return 1
      if (b.days_to_stockout === null) return -1
      return 0
    })

    return success({ items: detailItems, totalCount: count ?? detailItems.length })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch low stock details')
  }
}

export interface CriticalStockItem {
  id: string
  name: string
  sku: string
  max_stock: number | null
  last_transaction_date: string | null
  suggested_reorder_qty: number | null
}

export interface CriticalStockDetails {
  items: CriticalStockItem[]
  totalCount: number
}

/**
 * Get critical stock items (zero stock) with last transaction date
 */
export async function getCriticalStockDetails(): Promise<ActionResult<CriticalStockDetails>> {
  try {
    const supabase = createAdminClient()

    // Get zero-stock items
    const { data: zeroStockItems, error: itemsError, count } = await supabase
      .from('inv_items')
      .select('id, name, sku, max_stock', { count: 'exact' })
      .eq('is_archived', false)
      .eq('current_stock', 0)
      .order('name', { ascending: true })

    if (itemsError) {
      return failure(itemsError.message)
    }

    if (!zeroStockItems || zeroStockItems.length === 0) {
      return success({ items: [], totalCount: 0 })
    }

    // Cast to expected type - Supabase type inference can fail with partial selects
    const stockItems = zeroStockItems as { id: string; name: string; sku: string; max_stock: number | null }[]

    // Get last transaction date for each item
    const itemIds = stockItems.map((item) => item.id)
    const { data: lastTransactions, error: transError } = await supabase
      .from('inv_transactions')
      .select('item_id, event_timestamp')
      .in('item_id', itemIds)
      .order('event_timestamp', { ascending: false })

    if (transError) {
      console.warn('Could not fetch last transactions:', transError.message)
    }

    // Build map of last transaction dates (take first result per item)
    const lastTransMap = new Map<string, string>()
    const transactions = (lastTransactions ?? []) as { item_id: string; event_timestamp: string }[]
    for (const trans of transactions) {
      if (!lastTransMap.has(trans.item_id)) {
        lastTransMap.set(trans.item_id, trans.event_timestamp)
      }
    }

    const items: CriticalStockItem[] = stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      max_stock: item.max_stock,
      last_transaction_date: lastTransMap.get(item.id) ?? null,
      suggested_reorder_qty: item.max_stock,
    }))

    return success({ items, totalCount: count ?? items.length })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch critical stock details')
  }
}

export interface CategoryBreakdown {
  id: string | null
  name: string
  count: number
}

export interface TotalItemsBreakdown {
  categories: CategoryBreakdown[]
  recentItems: Array<{ id: string; name: string; sku: string; created_at: string }>
  archivedCount: number
  totalActiveCount: number
}

/**
 * Get breakdown of total items by category
 */
export async function getTotalItemsBreakdown(): Promise<ActionResult<TotalItemsBreakdown>> {
  try {
    const supabase = createAdminClient()

    // Run queries in parallel
    const [itemsResult, categoriesResult, recentResult, archivedResult] = await Promise.all([
      // Get items with category
      supabase
        .from('inv_items')
        .select('id, category_id')
        .eq('is_archived', false),

      // Get all categories
      supabase.from('inv_categories').select('id, name'),

      // Get recently added items (last 5)
      supabase
        .from('inv_items')
        .select('id, name, sku, created_at')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5),

      // Get archived count
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', true),
    ])

    if (itemsResult.error) {
      return failure(itemsResult.error.message)
    }

    // Cast to expected types - Supabase type inference fails with partial selects
    const items = (itemsResult.data ?? []) as { id: string; category_id: string | null }[]
    const categories = (categoriesResult.data ?? []) as { id: string; name: string }[]

    // Count items per category
    const categoryCountMap = new Map<string | null, number>()
    for (const item of items) {
      const catId = item.category_id
      categoryCountMap.set(catId, (categoryCountMap.get(catId) ?? 0) + 1)
    }

    // Build category breakdown with names
    const categoryNameMap = new Map<string, string>()
    for (const cat of categories) {
      categoryNameMap.set(cat.id, cat.name)
    }

    const categoryBreakdown: CategoryBreakdown[] = []
    categoryCountMap.forEach((count, catId) => {
      categoryBreakdown.push({
        id: catId,
        name: catId ? categoryNameMap.get(catId) ?? 'Unknown' : 'Uncategorized',
        count,
      })
    })

    // Sort by count descending
    categoryBreakdown.sort((a, b) => b.count - a.count)

    // Cast recentItems - Supabase type inference fails with partial selects
    const recentItems = (recentResult.data ?? []) as { id: string; name: string; sku: string; created_at: string }[]

    return success({
      categories: categoryBreakdown,
      recentItems,
      archivedCount: archivedResult.count ?? 0,
      totalActiveCount: items.length,
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch items breakdown')
  }
}

export interface TransactionTypeBreakdown {
  type: string
  count: number
}

export interface TopActiveItem {
  id: string
  name: string
  sku: string
  transaction_count: number
}

export interface EmployeeActivity {
  id: string
  name: string
  transaction_count: number
}

export interface TodayTransactionsBreakdown {
  typeBreakdown: TransactionTypeBreakdown[]
  topActiveItems: TopActiveItem[]
  employeeActivity: EmployeeActivity[]
  totalCount: number
}

/**
 * Get breakdown of today's transactions
 */
export async function getTodayTransactionsBreakdown(): Promise<ActionResult<TodayTransactionsBreakdown>> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all transactions for today with item and user details
    const { data: transactions, error } = await supabase
      .from('inv_transactions')
      .select(`
        id,
        transaction_type,
        item_id,
        user_id,
        item:inv_items(id, name, sku),
        user:profiles(id, first_name, last_name)
      `)
      .gte('server_timestamp', today)

    if (error) {
      return failure(error.message)
    }

    if (!transactions || transactions.length === 0) {
      return success({
        typeBreakdown: [],
        topActiveItems: [],
        employeeActivity: [],
        totalCount: 0,
      })
    }

    // Cast transactions - Supabase type inference fails with complex joins
    type TransactionWithJoins = {
      id: string
      transaction_type: string
      item_id: string
      user_id: string
      item: { id: string; name: string; sku: string } | null
      user: { id: string; first_name: string; last_name: string } | null
    }
    const txns = transactions as TransactionWithJoins[]

    // Count by transaction type
    const typeCountMap = new Map<string, number>()
    for (const t of txns) {
      typeCountMap.set(t.transaction_type, (typeCountMap.get(t.transaction_type) ?? 0) + 1)
    }

    const typeBreakdown: TransactionTypeBreakdown[] = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    // Count by item
    const itemCountMap = new Map<string, { item: { id: string; name: string; sku: string }; count: number }>()
    for (const t of txns) {
      if (t.item && typeof t.item === 'object' && 'id' in t.item) {
        const item = t.item as { id: string; name: string; sku: string }
        const existing = itemCountMap.get(item.id)
        if (existing) {
          existing.count++
        } else {
          itemCountMap.set(item.id, { item, count: 1 })
        }
      }
    }

    const topActiveItems: TopActiveItem[] = Array.from(itemCountMap.values())
      .map(({ item, count }) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        transaction_count: count,
      }))
      .sort((a, b) => b.transaction_count - a.transaction_count)
      .slice(0, 5)

    // Count by employee
    const employeeCountMap = new Map<string, { user: { id: string; first_name: string; last_name: string }; count: number }>()
    for (const t of txns) {
      if (t.user && typeof t.user === 'object' && 'id' in t.user) {
        const user = t.user as { id: string; first_name: string; last_name: string }
        const existing = employeeCountMap.get(user.id)
        if (existing) {
          existing.count++
        } else {
          employeeCountMap.set(user.id, { user, count: 1 })
        }
      }
    }

    const employeeActivity: EmployeeActivity[] = Array.from(employeeCountMap.values())
      .map(({ user, count }) => ({
        id: user.id,
        name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Unknown',
        transaction_count: count,
      }))
      .sort((a, b) => b.transaction_count - a.transaction_count)

    return success({
      typeBreakdown,
      topActiveItems,
      employeeActivity,
      totalCount: txns.length,
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to fetch transactions breakdown')
  }
}
