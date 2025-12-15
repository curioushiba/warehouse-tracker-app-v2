'use server'

import { createClient } from '@/lib/supabase/server'
import type { Alert, Item } from '@/lib/supabase/types'

export interface DashboardStats {
  totalItems: number
  lowStockItems: number
  criticalStockItems: number
  todayTransactions: number
  pendingSync: number
  recentAlerts: Alert[]
}

export interface DashboardData {
  stats: DashboardStats
  lowStockItemsList: Item[]
}

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel - using the view for low stock count
    const [
      totalItemsResult,
      lowStockResult,
      criticalStockResult,
      todayTransactionsResult,
      pendingSyncResult,
      alertsResult,
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

      // Recent unread alerts
      supabase
        .from('alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return {
      success: true,
      data: {
        totalItems: totalItemsResult.count ?? 0,
        lowStockItems: lowStockResult.count ?? 0,
        criticalStockItems: criticalStockResult.count ?? 0,
        todayTransactions: todayTransactionsResult.count ?? 0,
        pendingSync: pendingSyncResult.count ?? 0,
        recentAlerts: alertsResult.data ?? [],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
    }
  }
}

/**
 * Get dashboard data including stats and low stock items in a single call.
 * This consolidates what was previously 3 separate API calls into 2.
 */
export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel
    const [
      totalItemsResult,
      lowStockItemsResult,
      criticalStockResult,
      todayTransactionsResult,
      pendingSyncResult,
      alertsResult,
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

      // Recent unread alerts
      supabase
        .from('alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return {
      success: true,
      data: {
        stats: {
          totalItems: totalItemsResult.count ?? 0,
          lowStockItems: lowStockItemsResult.count ?? 0,
          criticalStockItems: criticalStockResult.count ?? 0,
          todayTransactions: todayTransactionsResult.count ?? 0,
          pendingSync: pendingSyncResult.count ?? 0,
          recentAlerts: alertsResult.data ?? [],
        },
        lowStockItemsList: (lowStockItemsResult.data ?? []) as Item[],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
    }
  }
}

export async function getRecentActivity(limit: number = 10) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inv_transactions')
      .select(`
        *,
        item:inv_items(name, sku),
        user:profiles(first_name, last_name)
      `)
      .order('server_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent activity',
    }
  }
}
