'use server'

import { createClient } from '@/lib/supabase/server'
import type { Transaction, TransactionType } from '@/lib/supabase/types'

// Result type for consistent error handling
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

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
