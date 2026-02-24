import type { SQLiteDatabase } from 'expo-sqlite';
import { toBoolean, fromBoolean } from './conversions';
import type { PendingProduction, CachedItem, CachedTarget, CachedProduction } from './types';

// --- Raw row types matching SQLite column formats ---

interface PendingProductionRow {
  id: string;
  item_id: string;
  quantity_produced: number;
  waste_quantity: number;
  waste_reason: string | null;
  notes: string | null;
  device_timestamp: string;
  created_at: string;
  status: string;
}

interface CachedItemRow {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  category_name: string | null;
  is_commissary: number;
  updated_at: string;
}

// --- Row conversion helpers ---

function toPendingProduction(row: PendingProductionRow): PendingProduction {
  return {
    id: row.id,
    item_id: row.item_id,
    quantity_produced: row.quantity_produced,
    waste_quantity: row.waste_quantity,
    waste_reason: row.waste_reason,
    notes: row.notes,
    device_timestamp: row.device_timestamp,
    created_at: row.created_at,
    status: row.status as PendingProduction['status'],
  };
}

function toCachedItem(row: CachedItemRow): CachedItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    barcode: row.barcode,
    current_stock: row.current_stock,
    min_stock: row.min_stock,
    max_stock: row.max_stock,
    unit: row.unit,
    category_name: row.category_name,
    is_commissary: toBoolean(row.is_commissary),
    updated_at: row.updated_at,
  };
}

// --- Production queue operations ---

export function enqueueProduction(db: SQLiteDatabase, production: PendingProduction): void {
  db.runSync(
    `INSERT INTO pending_productions (id, item_id, quantity_produced, waste_quantity, waste_reason, notes, device_timestamp, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      production.id,
      production.item_id,
      production.quantity_produced,
      production.waste_quantity,
      production.waste_reason,
      production.notes,
      production.device_timestamp,
      production.created_at,
      production.status,
    ]
  );
}

export function getPendingProductions(db: SQLiteDatabase): PendingProduction[] {
  const rows = db.getAllSync<PendingProductionRow>(
    'SELECT * FROM pending_productions ORDER BY created_at ASC'
  );
  return rows.map(toPendingProduction);
}

export function updateProductionStatus(
  db: SQLiteDatabase,
  id: string,
  status: 'pending' | 'syncing' | 'failed'
): void {
  db.runSync(
    'UPDATE pending_productions SET status = ? WHERE id = ?',
    [status, id]
  );
}

export function removeProduction(db: SQLiteDatabase, id: string): void {
  db.runSync('DELETE FROM pending_productions WHERE id = ?', [id]);
}

export function getPendingCount(db: SQLiteDatabase): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_productions'
  );
  return row?.count ?? 0;
}

export function clearAllProductions(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM pending_productions');
}

// --- Item cache operations ---

export function cacheItemsRaw(db: SQLiteDatabase, items: CachedItem[]): void {
  for (const item of items) {
    db.runSync(
      `INSERT OR REPLACE INTO item_cache (id, sku, name, barcode, current_stock, min_stock, max_stock, unit, category_name, is_commissary, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.sku,
        item.name,
        item.barcode,
        item.current_stock,
        item.min_stock,
        item.max_stock,
        item.unit,
        item.category_name,
        fromBoolean(item.is_commissary),
        item.updated_at,
      ]
    );
  }
}

export function cacheItems(db: SQLiteDatabase, items: CachedItem[]): void {
  if (items.length === 0) return;
  db.execSync('BEGIN');
  try {
    cacheItemsRaw(db, items);
    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }
}

export function getCachedItem(db: SQLiteDatabase, id: string): CachedItem | null {
  const row = db.getFirstSync<CachedItemRow>(
    'SELECT * FROM item_cache WHERE id = ?',
    [id]
  );
  return row ? toCachedItem(row) : null;
}

export function searchCommissaryItems(db: SQLiteDatabase, query: string, limit = 50): CachedItem[] {
  const pattern = `%${query}%`;
  const rows = db.getAllSync<CachedItemRow>(
    `SELECT * FROM item_cache
     WHERE is_commissary = 1 AND (name LIKE ? OR sku LIKE ?)
     ORDER BY name ASC LIMIT ?`,
    [pattern, pattern, limit]
  );
  return rows.map(toCachedItem);
}

export function getAllCommissaryItems(db: SQLiteDatabase): CachedItem[] {
  const rows = db.getAllSync<CachedItemRow>(
    'SELECT * FROM item_cache WHERE is_commissary = 1 ORDER BY name ASC'
  );
  return rows.map(toCachedItem);
}

export function clearItemCache(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM item_cache');
}

// --- Target cache operations ---

export function cacheTargetsRaw(db: SQLiteDatabase, targets: CachedTarget[]): void {
  for (const target of targets) {
    db.runSync(
      `INSERT OR REPLACE INTO target_cache (id, item_id, target_quantity, target_date, priority, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        target.id,
        target.item_id,
        target.target_quantity,
        target.target_date,
        target.priority,
        target.notes,
      ]
    );
  }
}

export function cacheTargets(db: SQLiteDatabase, targets: CachedTarget[]): void {
  if (targets.length === 0) return;
  db.execSync('BEGIN');
  try {
    cacheTargetsRaw(db, targets);
    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }
}

export function getTodaysTargets(db: SQLiteDatabase): CachedTarget[] {
  const rows = db.getAllSync<CachedTarget>(
    `SELECT * FROM target_cache WHERE target_date = date('now') ORDER BY priority DESC`
  );
  return rows;
}

export function clearTargetCache(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM target_cache');
}

// --- Production cache operations ---

export function cacheProductionsRaw(db: SQLiteDatabase, productions: CachedProduction[]): void {
  for (const p of productions) {
    db.runSync(
      `INSERT OR REPLACE INTO production_cache (id, item_id, quantity_produced, event_timestamp, status)
       VALUES (?, ?, ?, ?, ?)`,
      [p.id, p.item_id, p.quantity_produced, p.event_timestamp, p.status]
    );
  }
}

export function getTodaysProductions(db: SQLiteDatabase): CachedProduction[] {
  const rows = db.getAllSync<CachedProduction>(
    `SELECT * FROM production_cache WHERE date(event_timestamp) = date('now')`
  );
  return rows;
}

export function getProducedTodayForItem(db: SQLiteDatabase, itemId: string): number {
  const row = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(quantity_produced) as total FROM production_cache
     WHERE item_id = ? AND date(event_timestamp) = date('now') AND status = 'completed'`,
    [itemId]
  );
  return row?.total ?? 0;
}

export function clearProductionCache(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM production_cache');
}

// --- Sync metadata operations ---

export function getSyncMetadata(db: SQLiteDatabase, key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setSyncMetadata(db: SQLiteDatabase, key: string, value: string): void {
  db.runSync(
    'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
    [key, value]
  );
}
