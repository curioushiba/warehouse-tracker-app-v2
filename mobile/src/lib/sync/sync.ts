import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPendingTransactions,
  updateTransactionStatus,
  removeTransaction,
  cacheItemsRaw,
  clearItemCache,
  setSyncMetadata,
} from '@/lib/db/operations';
import type { TransactionType } from '@/lib/types';
import type { PendingTransaction, CachedItem } from '@/lib/db/types';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Submit a single transaction to Supabase via the submit_transaction RPC.
 * Uses tx.id as the idempotency key so retries are safe.
 */
export async function submitTransaction(
  supabase: SupabaseClient,
  tx: PendingTransaction,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('submit_transaction', {
    p_transaction_type: tx.transaction_type,
    p_item_id: tx.item_id,
    p_quantity: tx.quantity,
    p_user_id: userId,
    p_notes: tx.notes || null,
    p_source_location_id: null,
    p_destination_location_id: null,
    p_idempotency_key: tx.id,
    p_device_timestamp: tx.device_timestamp,
  } as never);

  if (error) {
    // Idempotent duplicate — treat as success
    if (error.code === '23505') {
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record a failed transaction to the sync_errors table for admin review.
 */
async function recordSyncError(
  supabase: SupabaseClient,
  tx: PendingTransaction,
  errorMessage: string,
  userId: string,
): Promise<void> {
  await supabase.from('sync_errors').insert({
    transaction_data: {
      id: tx.id,
      item_id: tx.item_id,
      transaction_type: tx.transaction_type,
      quantity: tx.quantity,
      notes: tx.notes,
      device_timestamp: tx.device_timestamp,
      user_id: userId,
      idempotency_key: tx.id,
    },
    error_message: errorMessage,
    user_id: userId,
  } as never);
}

/**
 * Process all pending transactions in the offline queue.
 *
 * For each transaction:
 * 1. Mark as 'syncing'
 * 2. Submit to Supabase RPC
 * 3. On success: remove from local queue
 * 4. On failure: mark as 'failed' and record to sync_errors table
 */
export async function processQueue(
  db: SQLiteDatabase,
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult> {
  const pending = getPendingTransactions(db);

  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const tx of pending) {
    updateTransactionStatus(db, tx.id, 'syncing');

    const result = await submitTransaction(supabase, tx, userId);

    if (result.success) {
      removeTransaction(db, tx.id);
      synced++;
    } else {
      const errorMsg = result.error ?? 'Unknown error';
      updateTransactionStatus(db, tx.id, 'failed');
      await recordSyncError(supabase, tx, errorMsg, userId);
      errors.push(errorMsg);
      failed++;
    }
  }

  return { synced, failed, errors };
}

/**
 * Supabase row shape returned by the item cache query.
 * The joined category comes back as an object (or null).
 */
interface SupabaseItemRow {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  unit_price: number | null;
  category_id: string | null;
  is_archived: boolean;
  updated_at: string;
  category: { name: string } | null;
}

/**
 * Refresh the local item cache from Supabase.
 * Fetches all non-archived items with their category name and writes them
 * to the SQLite item_cache table.
 */
export async function refreshItemCache(
  db: SQLiteDatabase,
  supabase: SupabaseClient,
): Promise<void> {
  const { data, error } = await supabase
    .from('inv_items')
    .select('*, category:inv_categories(name)')
    .eq('is_archived', false);

  if (error) {
    throw new Error(`Failed to fetch items: ${error.message}`);
  }

  const items: CachedItem[] = (data as SupabaseItemRow[]).map(
    ({ category, ...fields }) => ({
      ...fields,
      category_name: category?.name ?? null,
      quantity_decimals: 3,
    }),
  );

  db.execSync('BEGIN');
  try {
    clearItemCache(db);
    cacheItemsRaw(db, items);
    setSyncMetadata(db, 'last_item_cache_refresh', new Date().toISOString());
    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }
}

/**
 * Supabase row shape for transaction history queries.
 */
interface SupabaseTransactionRow {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  server_timestamp: string;
}

export interface CompletedTransaction {
  id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  notes: string | null;
  timestamp: string;
  status: 'completed';
}

/**
 * Fetch recent completed transactions from Supabase for the current user.
 * Returns an empty array on network failure (graceful offline).
 */
export async function fetchRecentTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<CompletedTransaction[]> {
  const { data, error } = await supabase
    .from('inv_transactions')
    .select('id, item_id, transaction_type, quantity, notes, server_timestamp')
    .eq('user_id', userId)
    .order('server_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data as SupabaseTransactionRow[]).map(
    ({ server_timestamp, transaction_type, ...fields }) => ({
      ...fields,
      transaction_type: transaction_type as TransactionType,
      timestamp: server_timestamp,
      status: 'completed' as const,
    }),
  );
}
