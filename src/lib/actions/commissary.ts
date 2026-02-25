'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Item,
  ProductionLog,
  ProductionTarget,
  ProductionTargetInsert,
  ProductionTargetUpdate,
  ProductionRecommendation,
} from '@/lib/supabase/types'
import {
  type ActionResult,
  type PaginatedResult,
  success,
  failure,
  paginatedSuccess,
} from '@/lib/types/action-result'

export type { ActionResult, PaginatedResult } from '@/lib/types/action-result'

// ============================================================================
// Helpers
// ============================================================================

async function requireAdmin(): Promise<
  { user: { id: string }; error: null } | { user: null; error: string }
> {
  const cookieClient = await createClient()
  const { data: { user }, error: authError } = await cookieClient.auth.getUser()
  if (authError || !user) return { user: null, error: 'Not authenticated' }

  const { data: profile, error: profileError } = await cookieClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) return { user: null, error: `Profile lookup failed: ${profileError.message}` }
  const profileData = profile as { role: string } | null
  if (profileData?.role !== 'admin') return { user: null, error: 'Admin access required' }
  return { user, error: null }
}

// ============================================================================
// Types
// ============================================================================

export interface ProductionLogWithDetails extends ProductionLog {
  item_name: string
  item_sku: string
  user_name: string
}

export interface ProductionLogFilters {
  itemId?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  status?: 'completed' | 'cancelled'
  page?: number
  pageSize?: number
}

export interface ProductionTargetFilters {
  itemId?: string
  dateFrom?: string
  dateTo?: string
  isRecurring?: boolean
}

export interface SubmitProductionInput {
  itemId: string
  quantityProduced: number
  wasteQuantity?: number
  wasteReason?: string
  notes?: string
}

export interface CommissaryDashboardData {
  totalCommissaryItems: number
  itemsBelowTarget: number
  producedToday: number
  targetCompletionPercent: number
}

export interface CommissaryAnalyticsData {
  producedThisWeek: number
  avgDailyProduction: number
  wastePercent: number
  targetCompletionRate: number
  perItemBreakdown: PerItemAnalytics[]
  perUserBreakdown: PerUserAnalytics[]
  stockDaysRemaining: StockDaysItem[]
}

export interface PerItemAnalytics {
  itemId: string
  itemName: string
  itemSku: string
  producedThisWeek: number
  avgDaily: number
  wasteQuantity: number
  targetHitRate: number
}

export interface PerUserAnalytics {
  userId: string
  userName: string
  totalProduced: number
  itemsCount: number
  wastePercent: number
}

export interface StockDaysItem {
  itemId: string
  itemName: string
  currentStock: number
  dailyConsumption: number
  daysRemaining: number | null
  unit: string
}

export interface BulkRecurringTargetInput {
  itemId: string
  targetQuantity: number
  daysOfWeek: number[]
  priority?: number
  notes?: string
}

// ============================================================================
// Production Logs
// ============================================================================

const DEFAULT_PAGE_SIZE = 25

export async function getProductionLogs(
  filters?: ProductionLogFilters
): Promise<ActionResult<PaginatedResult<ProductionLogWithDetails>>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('inv_production_logs')
      .select(`
        *,
        item:inv_items(name, sku),
        user:profiles(first_name, last_name)
      `, { count: 'exact' })
      .order('event_timestamp', { ascending: false })
      .range(from, to)

    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId)
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters?.dateFrom) {
      query = query.gte('event_timestamp', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('event_timestamp', filters.dateTo + 'T23:59:59.999Z')
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error, count } = await query

    if (error) return failure(error.message)

    const logs: ProductionLogWithDetails[] = (data ?? []).map((row: Record<string, unknown>) => {
      const item = row.item as { name: string; sku: string } | null
      const userProfile = row.user as { first_name: string | null; last_name: string | null } | null
      return {
        ...(row as unknown as ProductionLog),
        item_name: item?.name ?? 'Unknown',
        item_sku: item?.sku ?? '',
        user_name: userProfile
          ? `${userProfile.first_name ?? ''} ${userProfile.last_name ?? ''}`.trim() || 'Unknown'
          : 'Unknown',
      }
    })

    const totalCount = count ?? 0
    return paginatedSuccess(logs, totalCount, page, pageSize)
  } catch {
    return failure('Failed to fetch production logs')
  }
}

export async function getProductionLogById(
  id: string
): Promise<ActionResult<ProductionLogWithDetails>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_production_logs')
      .select(`
        *,
        item:inv_items(name, sku),
        user:profiles(first_name, last_name)
      `)
      .eq('id', id)
      .single()

    if (error) return failure(error.message)

    const item = (data as Record<string, unknown>).item as { name: string; sku: string } | null
    const userProfile = (data as Record<string, unknown>).user as { first_name: string | null; last_name: string | null } | null

    return success({
      ...(data as unknown as ProductionLog),
      item_name: item?.name ?? 'Unknown',
      item_sku: item?.sku ?? '',
      user_name: userProfile
        ? `${userProfile.first_name ?? ''} ${userProfile.last_name ?? ''}`.trim() || 'Unknown'
        : 'Unknown',
    })
  } catch {
    return failure('Failed to fetch production log')
  }
}

export async function submitProduction(
  input: SubmitProductionInput
): Promise<ActionResult<ProductionLog>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await (supabase.rpc as Function)('submit_production', {
      p_item_id: input.itemId,
      p_quantity_produced: input.quantityProduced,
      p_user_id: user.id,
      p_device_timestamp: new Date().toISOString(),
      p_waste_quantity: input.wasteQuantity ?? 0,
      p_waste_reason: input.wasteReason ?? null,
      p_notes: input.notes ?? null,
    })

    if (error) return failure(error.message)

    const result = Array.isArray(data) ? data[0] : data
    if (!result) return failure('No result returned from submit_production')

    revalidatePath('/admin/commissary')
    revalidatePath('/admin/commissary/production')
    revalidatePath('/admin')
    return success(result as ProductionLog)
  } catch {
    return failure('Failed to submit production')
  }
}

// ============================================================================
// Production Targets
// ============================================================================

export async function getProductionTargets(
  filters?: ProductionTargetFilters
): Promise<ActionResult<ProductionTarget[]>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    let query = supabase
      .from('inv_production_targets')
      .select('*')
      .order('target_date', { ascending: false, nullsFirst: false })
      .order('priority', { ascending: false })

    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId)
    }
    if (filters?.isRecurring !== undefined) {
      query = query.eq('is_recurring', filters.isRecurring)
    }
    if (filters?.dateFrom) {
      query = query.gte('target_date', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('target_date', filters.dateTo)
    }

    const { data, error } = await query

    if (error) return failure(error.message)
    return success(data ?? [])
  } catch {
    return failure('Failed to fetch production targets')
  }
}

export async function setProductionTarget(
  input: {
    itemId: string
    targetQuantity: number
    targetDate?: string
    priority?: number
    isRecurring?: boolean
    dayOfWeek?: number
    notes?: string
  }
): Promise<ActionResult<ProductionTarget>> {
  try {
    const auth = await requireAdmin()
    if (auth.error) return failure(auth.error)
    const user = auth.user!

    const supabase = createAdminClient()

    const insert: ProductionTargetInsert = {
      item_id: input.itemId,
      target_quantity: input.targetQuantity,
      target_date: input.targetDate ?? null,
      priority: input.priority ?? 50,
      is_recurring: input.isRecurring ?? false,
      day_of_week: input.dayOfWeek ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    }


    const { data, error } = await (supabase.from('inv_production_targets') as any)
      .insert(insert)
      .select()
      .single()

    if (error) return failure(error.message)

    revalidatePath('/admin/commissary')
    revalidatePath('/admin/commissary/targets')
    return success(data as ProductionTarget)
  } catch {
    return failure('Failed to set production target')
  }
}

export async function updateProductionTarget(
  id: string,
  input: {
    targetQuantity?: number
    targetDate?: string | null
    priority?: number
    isRecurring?: boolean
    dayOfWeek?: number | null
    notes?: string | null
  }
): Promise<ActionResult<ProductionTarget>> {
  try {
    const auth = await requireAdmin()
    if (auth.error) return failure(auth.error)

    const supabase = createAdminClient()

    const update: ProductionTargetUpdate = {}
    if (input.targetQuantity !== undefined) update.target_quantity = input.targetQuantity
    if (input.targetDate !== undefined) update.target_date = input.targetDate
    if (input.priority !== undefined) update.priority = input.priority
    if (input.isRecurring !== undefined) update.is_recurring = input.isRecurring
    if (input.dayOfWeek !== undefined) update.day_of_week = input.dayOfWeek
    if (input.notes !== undefined) update.notes = input.notes


    const { data, error } = await (supabase.from('inv_production_targets') as any)
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return failure(error.message)

    revalidatePath('/admin/commissary')
    revalidatePath('/admin/commissary/targets')
    return success(data as ProductionTarget)
  } catch {
    return failure('Failed to update production target')
  }
}

export async function deleteProductionTarget(
  id: string
): Promise<ActionResult<void>> {
  try {
    const auth = await requireAdmin()
    if (auth.error) return failure(auth.error)

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('inv_production_targets')
      .delete()
      .eq('id', id)

    if (error) return failure(error.message)

    revalidatePath('/admin/commissary')
    revalidatePath('/admin/commissary/targets')
    return success(undefined)
  } catch {
    return failure('Failed to delete production target')
  }
}

export async function bulkSetRecurringTargets(
  inputs: BulkRecurringTargetInput[]
): Promise<ActionResult<ProductionTarget[]>> {
  try {
    const auth = await requireAdmin()
    if (auth.error) return failure(auth.error)
    const user = auth.user!

    const supabase = createAdminClient()

    const inserts: ProductionTargetInsert[] = inputs.flatMap(input =>
      input.daysOfWeek.map(dow => ({
        item_id: input.itemId,
        target_quantity: input.targetQuantity,
        target_date: null,
        priority: input.priority ?? 50,
        is_recurring: true,
        day_of_week: dow,
        notes: input.notes ?? null,
        created_by: user.id,
      }))
    )


    const { data, error } = await (supabase.from('inv_production_targets') as any)
      .insert(inserts)
      .select()

    if (error) return failure(error.message)

    revalidatePath('/admin/commissary')
    revalidatePath('/admin/commissary/targets')
    return success(data ?? [])
  } catch {
    return failure('Failed to set recurring targets')
  }
}

// ============================================================================
// Intelligence & Recommendations
// ============================================================================

export async function getProductionRecommendations(): Promise<ActionResult<ProductionRecommendation[]>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_production_recommendations')
      .select('*')
      .order('is_priority', { ascending: false })
      .order('priority', { ascending: false })

    if (error) return failure(error.message)

    return success((data ?? []) as ProductionRecommendation[])
  } catch {
    return failure('Failed to fetch production recommendations')
  }
}

export async function getCommissaryDashboardData(): Promise<ActionResult<CommissaryDashboardData>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const [
      commissaryItemsResult,
      recommendationsResult,
      producedTodayResult,
    ] = await Promise.all([
      supabase
        .from('inv_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('is_commissary', true),
      supabase
        .from('inv_production_recommendations')
        .select('*'),
      supabase
        .from('inv_production_logs')
        .select('quantity_produced')
        .gte('event_timestamp', today)
        .eq('status', 'completed'),
    ])

    const totalCommissaryItems = commissaryItemsResult.count ?? 0
    const recommendations = (recommendationsResult.data ?? []) as ProductionRecommendation[]
    const producedRows = (producedTodayResult.data ?? []) as { quantity_produced: number }[]

    const producedToday = producedRows.reduce((sum, r) => sum + r.quantity_produced, 0)

    const itemsWithTarget = recommendations.filter(r => r.target_today > 0)
    const itemsBelowTarget = itemsWithTarget.filter(r => r.produced_today < r.target_today).length

    const targetCompletionPercent = itemsWithTarget.length > 0
      ? Math.round((itemsWithTarget.filter(r => r.produced_today >= r.target_today).length / itemsWithTarget.length) * 100)
      : 0

    return success({
      totalCommissaryItems,
      itemsBelowTarget,
      producedToday,
      targetCompletionPercent,
    })
  } catch {
    return failure('Failed to fetch commissary dashboard data')
  }
}

// ============================================================================
// Analytics
// ============================================================================

export async function getCommissaryAnalytics(): Promise<ActionResult<CommissaryAnalyticsData>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString()

    const [logsResult, recommendationsResult] = await Promise.all([
      supabase
        .from('inv_production_logs')
        .select(`
          *,
          item:inv_items(name, sku),
          user:profiles(first_name, last_name)
        `)
        .gte('event_timestamp', weekAgoStr)
        .eq('status', 'completed'),
      supabase
        .from('inv_production_recommendations')
        .select('*'),
    ])

    if (logsResult.error) return failure(logsResult.error.message)

    type LogWithJoins = ProductionLog & {
      item: { name: string; sku: string } | null
      user: { first_name: string | null; last_name: string | null } | null
    }
    const logs = (logsResult.data ?? []) as LogWithJoins[]
    const recommendations = (recommendationsResult.data ?? []) as ProductionRecommendation[]

    const producedThisWeek = logs.reduce((sum, l) => sum + l.quantity_produced, 0)
    const totalWaste = logs.reduce((sum, l) => sum + (l.waste_quantity ?? 0), 0)
    const avgDailyProduction = producedThisWeek / 7
    const wastePercent = producedThisWeek > 0 ? Math.round((totalWaste / producedThisWeek) * 100) : 0

    // Target completion rate
    const itemsWithTarget = recommendations.filter(r => r.target_today > 0)
    const targetCompletionRate = itemsWithTarget.length > 0
      ? Math.round((itemsWithTarget.filter(r => r.produced_today >= r.target_today).length / itemsWithTarget.length) * 100)
      : 0

    // Per-item breakdown
    const itemMap = new Map<string, { name: string; sku: string; produced: number; waste: number; targetMet: number; targetDays: number }>()
    for (const log of logs) {
      const key = log.item_id
      const existing = itemMap.get(key)
      if (existing) {
        existing.produced += log.quantity_produced
        existing.waste += log.waste_quantity ?? 0
        if (log.expected_quantity && log.quantity_produced >= log.expected_quantity) {
          existing.targetMet++
        }
        existing.targetDays++
      } else {
        itemMap.set(key, {
          name: log.item?.name ?? 'Unknown',
          sku: log.item?.sku ?? '',
          produced: log.quantity_produced,
          waste: log.waste_quantity ?? 0,
          targetMet: log.expected_quantity && log.quantity_produced >= log.expected_quantity ? 1 : 0,
          targetDays: 1,
        })
      }
    }

    const perItemBreakdown: PerItemAnalytics[] = Array.from(itemMap.entries()).map(([itemId, data]) => ({
      itemId,
      itemName: data.name,
      itemSku: data.sku,
      producedThisWeek: data.produced,
      avgDaily: data.produced / 7,
      wasteQuantity: data.waste,
      targetHitRate: data.targetDays > 0 ? Math.round((data.targetMet / data.targetDays) * 100) : 0,
    }))

    // Per-user breakdown
    const userMap = new Map<string, { name: string; produced: number; items: Set<string>; waste: number; totalProduced: number }>()
    for (const log of logs) {
      const key = log.user_id
      const existing = userMap.get(key)
      const userName = log.user
        ? `${log.user.first_name ?? ''} ${log.user.last_name ?? ''}`.trim() || 'Unknown'
        : 'Unknown'
      if (existing) {
        existing.produced += log.quantity_produced
        existing.items.add(log.item_id)
        existing.waste += log.waste_quantity ?? 0
        existing.totalProduced += log.quantity_produced
      } else {
        userMap.set(key, {
          name: userName,
          produced: log.quantity_produced,
          items: new Set([log.item_id]),
          waste: log.waste_quantity ?? 0,
          totalProduced: log.quantity_produced,
        })
      }
    }

    const perUserBreakdown: PerUserAnalytics[] = Array.from(userMap.entries()).map(([userId, data]) => ({
      userId,
      userName: data.name,
      totalProduced: data.produced,
      itemsCount: data.items.size,
      wastePercent: data.totalProduced > 0 ? Math.round((data.waste / data.totalProduced) * 100) : 0,
    }))

    // Stock days remaining
    const stockDaysRemaining: StockDaysItem[] = recommendations.map(r => ({
      itemId: r.item_id,
      itemName: r.name,
      currentStock: r.current_stock,
      dailyConsumption: r.daily_consumption_rate,
      daysRemaining: r.days_of_stock,
      unit: r.unit,
    }))

    return success({
      producedThisWeek,
      avgDailyProduction,
      wastePercent,
      targetCompletionRate,
      perItemBreakdown,
      perUserBreakdown,
      stockDaysRemaining,
    })
  } catch {
    return failure('Failed to fetch commissary analytics')
  }
}

// ============================================================================
// Item Management Extensions
// ============================================================================

export async function toggleCommissaryFlag(
  itemId: string,
  isCommissary: boolean
): Promise<ActionResult<Item>> {
  try {
    // Verify auth via cookie client (defense in depth — middleware also checks)
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Session expired. Please refresh the page and sign in again.')

    const supabase = createAdminClient()

    const { data, error } = await (supabase.from('inv_items') as any)
      .update({ is_commissary: isCommissary })
      .eq('id', itemId)
      .select()
      .single()

    if (error) return failure(error.message)

    revalidatePath('/admin/items')
    revalidatePath('/admin/commissary')
    return success(data as Item)
  } catch {
    return failure('Failed to update commissary flag')
  }
}

export async function togglePriorityFlag(
  itemId: string,
  isPriority: boolean
): Promise<ActionResult<Item>> {
  try {
    // Verify auth via cookie client (defense in depth — middleware also checks)
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Session expired. Please refresh the page and sign in again.')

    const supabase = createAdminClient()

    const { data, error } = await (supabase.from('inv_items') as any)
      .update({ is_priority: isPriority })
      .eq('id', itemId)
      .eq('is_commissary', true)
      .select()
      .single()

    if (error) return failure(error.message)

    revalidatePath('/admin/items')
    revalidatePath('/admin/commissary')
    return success(data as Item)
  } catch {
    return failure('Failed to update priority flag')
  }
}

export async function getCommissaryItems(): Promise<ActionResult<Item[]>> {
  try {
    const cookieClient = await createClient()
    const { data: { user }, error: authError } = await cookieClient.auth.getUser()
    if (authError || !user) return failure('Not authenticated')

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inv_items')
      .select('*')
      .eq('is_commissary', true)
      .eq('is_archived', false)
      .order('name')

    if (error) return failure(error.message)
    return success(data ?? [])
  } catch {
    return failure('Failed to fetch commissary items')
  }
}
