'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Alert, AlertInsert } from '@/lib/supabase/types'

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function getAlerts(unreadOnly: boolean = false): Promise<ActionResult<Alert[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Failed to fetch alerts' }
  }
}

export async function markAlertRead(id: string): Promise<ActionResult<Alert>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('alerts')
      .update({ is_read: true } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Failed to mark alert as read' }
  }
}

export async function markAllAlertsRead(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true } as never)
      .eq('is_read', false)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to mark all alerts as read' }
  }
}

export async function deleteAlert(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to delete alert' }
  }
}

export async function createAlert(data: AlertInsert): Promise<ActionResult<Alert>> {
  try {
    const supabase = await createClient()

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert(data as never)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true, data: alert }
  } catch (err) {
    return { success: false, error: 'Failed to create alert' }
  }
}

export async function getUnreadAlertCount(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: count ?? 0 }
  } catch (err) {
    return { success: false, error: 'Failed to get alert count' }
  }
}
