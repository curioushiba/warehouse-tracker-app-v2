'use server'

import { createClient } from '@/lib/supabase/server'
import type { Alert } from '@/lib/supabase/types'

export interface DashboardStats {
  totalItems: number
  lowStockItems: number
  criticalStockItems: number
  todayTransactions: number
  pendingSync: number
  recentAlerts: Alert[]
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

    // Run all queries in parallel
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
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false),

      // Low stock items (current_stock <= min_stock but > 0)
      supabase
        .from('inv_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gt('current_stock', 0)
        .lte('current_stock', supabase.rpc('get_min_stock_threshold')),

      // Critical stock (current_stock = 0)
      supabase
        .from('inv_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('current_stock', 0),

      // Today's transactions
      supabase
        .from('inv_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('server_timestamp', today),

      // Pending sync errors
      supabase
        .from('sync_errors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Recent unread alerts
      supabase
        .from('alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // For low stock, we need a different approach since we can't use column comparison in Supabase directly
    // We'll fetch items and count them client-side
    const { data: items } = await supabase
      .from('inv_items')
      .select('current_stock, min_stock')
      .eq('is_archived', false)
      .gt('current_stock', 0)

    const typedItems = items as { current_stock: number; min_stock: number }[] | null
    const lowStockCount = typedItems?.filter(item => item.current_stock <= item.min_stock).length ?? 0

    return {
      success: true,
      data: {
        totalItems: totalItemsResult.count ?? 0,
        lowStockItems: lowStockCount,
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
