import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase-types';
import {
  getPendingProductions,
  updateProductionStatus,
  removeProduction,
  cacheItemsRaw,
  clearItemCache,
  cacheTargetsRaw,
  clearTargetCache,
  cacheProductionsRaw,
  clearProductionCache,
  setSyncMetadata,
  storeLocalSyncError,
  getLocalSyncErrors,
  removeLocalSyncError,
} from '@/lib/db/operations';
import type { PendingProduction, CachedItem, CachedTarget, CachedProduction } from '@/lib/db/types';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Submit a single production to Supabase via the submit_production RPC.
 * Uses production.id as the idempotency key so retries are safe.
 */
export async function submitProduction(
  supabase: SupabaseClient<Database>,
  production: PendingProduction,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('submit_production', {
    p_item_id: production.item_id,
    p_quantity_produced: production.quantity_produced,
    p_user_id: userId,
    p_device_timestamp: production.device_timestamp,
    p_idempotency_key: production.id,
    p_waste_quantity: production.waste_quantity || null,
    p_waste_reason: production.waste_reason || null,
    p_notes: production.notes || null,
  });

  if (error) {
    // Idempotent duplicate — treat as success
    if (error.code === '23505') return { success: true };
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Record a failed production to the sync_errors table for admin review.
 * Falls back to local SQLite storage if the Supabase insert fails (e.g. offline).
 */
async function recordSyncError(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
  production: PendingProduction,
  errorMessage: string,
  userId: string,
): Promise<void> {
  const transactionData = {
    type: 'production',
    id: production.id,
    item_id: production.item_id,
    quantity_produced: production.quantity_produced,
    waste_quantity: production.waste_quantity,
    waste_reason: production.waste_reason,
    notes: production.notes,
    device_timestamp: production.device_timestamp,
    user_id: userId,
    idempotency_key: production.id,
  };

  const { error } = await supabase.from('sync_errors').insert({
    transaction_data: transactionData,
    error_message: errorMessage,
    user_id: userId,
  });

  if (error) {
    // Supabase insert failed (likely offline) — store locally
    storeLocalSyncError(db, production.id, transactionData, errorMessage, userId);
  }
}

/**
 * Flush locally stored sync errors to Supabase.
 * Called during syncNow to upload errors that were saved while offline.
 */
export async function flushLocalSyncErrors(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const localErrors = getLocalSyncErrors(db);
  for (const err of localErrors) {
    const { error } = await supabase.from('sync_errors').insert({
      transaction_data: err.transactionData,
      error_message: err.errorMessage,
      user_id: err.userId,
    });

    if (!error) {
      removeLocalSyncError(db, err.id);
    }
  }
}

/**
 * Process all pending productions in the offline queue.
 *
 * For each production:
 * 1. Mark as 'syncing'
 * 2. Submit to Supabase RPC
 * 3. On success: remove from local queue
 * 4. On failure: mark as 'failed' and record to sync_errors table
 */
export async function processQueue(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SyncResult> {
  const pending = getPendingProductions(db);
  if (pending.length === 0) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const p of pending) {
    updateProductionStatus(db, p.id, 'syncing');
    const result = await submitProduction(supabase, p, userId);

    if (result.success) {
      removeProduction(db, p.id);
      synced++;
    } else {
      const errorMsg = result.error ?? 'Unknown error';
      updateProductionStatus(db, p.id, 'failed');
      await recordSyncError(db, supabase, p, errorMsg, userId);
      errors.push(errorMsg);
      failed++;
    }
  }

  // Attempt to flush any locally stored sync errors
  try {
    await flushLocalSyncErrors(db, supabase);
  } catch {
    // Non-critical — will retry next sync
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
  is_commissary: boolean;
  updated_at: string;
  category: { name: string } | null;
}

/**
 * Refresh the local item cache from Supabase.
 * Fetches only commissary items (is_commissary=true, not archived) with their
 * category name and writes them to the SQLite item_cache table.
 */
export async function refreshItemCache(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  // Fetch only commissary items
  const { data, error } = await supabase
    .from('inv_items')
    .select('id, sku, name, barcode, current_stock, min_stock, max_stock, unit, is_commissary, updated_at, category:inv_categories(name)')
    .eq('is_commissary', true)
    .eq('is_archived', false);

  if (error) throw new Error(`Failed to fetch items: ${error.message}`);

  // The joined category relationship returns as a nested object
  const items: CachedItem[] = (data as SupabaseItemRow[]).map(({ category, ...fields }) => ({
    ...fields,
    category_name: category?.name ?? null,
  }));

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
 * Refresh the local target cache from Supabase.
 * Fetches today's production targets.
 */
export async function refreshTargetCache(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun, matches EXTRACT(DOW)

  // Fetch explicit targets for today + recurring targets for today's weekday
  const { data, error } = await supabase
    .from('inv_production_targets')
    .select('id, item_id, target_quantity, target_date, priority, notes, is_recurring, day_of_week')
    .or(`target_date.eq.${today},and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek})`);

  if (error) throw new Error(`Failed to fetch targets: ${error.message}`);

  // Deduplicate: explicit targets (target_date set) take priority over recurring
  const rawRows = data;
  const explicitItems = new Set(
    rawRows.filter((r) => !r.is_recurring).map((r) => r.item_id),
  );
  const deduped = rawRows.filter(
    (r) => !r.is_recurring || !explicitItems.has(r.item_id),
  );

  const targets: CachedTarget[] = deduped.map((row) => ({
    id: row.id,
    item_id: row.item_id,
    target_quantity: row.target_quantity,
    target_date: row.target_date ?? today,
    priority: row.priority,
    notes: row.notes,
  }));

  db.execSync('BEGIN');
  try {
    clearTargetCache(db);
    cacheTargetsRaw(db, targets);
    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }
}

/**
 * Refresh the local production cache from Supabase.
 * Fetches today's completed production logs.
 */
export async function refreshProductionCache(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('inv_production_logs')
    .select('id, item_id, quantity_produced, event_timestamp, status')
    .gte('event_timestamp', `${today}T00:00:00`)
    .lt('event_timestamp', `${today}T23:59:59.999`)
    .eq('status', 'completed');

  if (error) throw new Error(`Failed to fetch production logs: ${error.message}`);

  const productions: CachedProduction[] = data.map((row) => ({
    id: row.id,
    item_id: row.item_id,
    quantity_produced: row.quantity_produced,
    event_timestamp: row.event_timestamp,
    status: row.status,
  }));

  db.execSync('BEGIN');
  try {
    clearProductionCache(db);
    cacheProductionsRaw(db, productions);
    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }
}

/**
 * Refresh all local caches (items, targets, production logs) from Supabase.
 */
export async function refreshAllCaches(
  db: SQLiteDatabase,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  await refreshItemCache(db, supabase);
  await refreshTargetCache(db, supabase);
  await refreshProductionCache(db, supabase);
}
