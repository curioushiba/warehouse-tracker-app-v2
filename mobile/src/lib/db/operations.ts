import type { SQLiteDatabase } from 'expo-sqlite';
import { toBoolean, fromBoolean } from './conversions';
import type { TransactionType } from '../types';
import type { PendingTransaction, CachedItem } from './types';

// --- Raw row types matching SQLite column formats ---

interface PendingTransactionRow {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
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
  unit_price: number | null;
  category_id: string | null;
  category_name: string | null;
  quantity_decimals: number;
  is_archived: number;
  updated_at: string;
}

// --- Row conversion helpers ---

function toPendingTransaction(row: PendingTransactionRow): PendingTransaction {
  return {
    id: row.id,
    item_id: row.item_id,
    transaction_type: row.transaction_type as TransactionType,
    quantity: row.quantity,
    notes: row.notes,
    device_timestamp: row.device_timestamp,
    created_at: row.created_at,
    status: row.status as PendingTransaction['status'],
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
    unit_price: row.unit_price,
    category_id: row.category_id,
    category_name: row.category_name,
    quantity_decimals: row.quantity_decimals,
    is_archived: toBoolean(row.is_archived),
    updated_at: row.updated_at,
  };
}

// --- Transaction queue operations ---

export function enqueueTransaction(db: SQLiteDatabase, tx: PendingTransaction): void {
  db.runSync(
    `INSERT INTO pending_transactions (id, item_id, transaction_type, quantity, notes, device_timestamp, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.item_id, tx.transaction_type, tx.quantity, tx.notes, tx.device_timestamp, tx.created_at, tx.status]
  );
}

export function getPendingTransactions(db: SQLiteDatabase): PendingTransaction[] {
  const rows = db.getAllSync<PendingTransactionRow>(
    'SELECT * FROM pending_transactions ORDER BY created_at ASC'
  );
  return rows.map(toPendingTransaction);
}

export function getTransactionById(db: SQLiteDatabase, id: string): PendingTransaction | null {
  const row = db.getFirstSync<PendingTransactionRow>(
    'SELECT * FROM pending_transactions WHERE id = ?',
    [id]
  );
  return row ? toPendingTransaction(row) : null;
}

export function updateTransactionStatus(
  db: SQLiteDatabase,
  id: string,
  status: 'pending' | 'syncing' | 'failed'
): void {
  db.runSync(
    'UPDATE pending_transactions SET status = ? WHERE id = ?',
    [status, id]
  );
}

export function removeTransaction(db: SQLiteDatabase, id: string): void {
  db.runSync('DELETE FROM pending_transactions WHERE id = ?', [id]);
}

export function getPendingCount(db: SQLiteDatabase): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_transactions'
  );
  return row?.count ?? 0;
}

export function clearAllTransactions(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM pending_transactions');
}

// --- Item cache operations ---

export function cacheItemsRaw(db: SQLiteDatabase, items: CachedItem[]): void {
  for (const item of items) {
    db.runSync(
      `INSERT OR REPLACE INTO item_cache (id, sku, name, barcode, current_stock, min_stock, max_stock, unit, unit_price, category_id, category_name, quantity_decimals, is_archived, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.sku,
        item.name,
        item.barcode,
        item.current_stock,
        item.min_stock,
        item.max_stock,
        item.unit,
        item.unit_price,
        item.category_id,
        item.category_name,
        item.quantity_decimals,
        fromBoolean(item.is_archived),
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

export function getCachedItemByBarcode(db: SQLiteDatabase, barcode: string): CachedItem | null {
  const row = db.getFirstSync<CachedItemRow>(
    'SELECT * FROM item_cache WHERE barcode = ?',
    [barcode]
  );
  return row ? toCachedItem(row) : null;
}

export function getCachedItemBySku(db: SQLiteDatabase, sku: string): CachedItem | null {
  const row = db.getFirstSync<CachedItemRow>(
    'SELECT * FROM item_cache WHERE sku = ?',
    [sku]
  );
  return row ? toCachedItem(row) : null;
}

export function searchCachedItems(db: SQLiteDatabase, query: string): CachedItem[] {
  const pattern = `%${query}%`;
  const rows = db.getAllSync<CachedItemRow>(
    'SELECT * FROM item_cache WHERE name LIKE ? OR sku LIKE ? OR barcode LIKE ? ORDER BY name ASC',
    [pattern, pattern, pattern]
  );
  return rows.map(toCachedItem);
}

export function searchCachedItemsLimited(db: SQLiteDatabase, query: string, limit = 50): CachedItem[] {
  const pattern = `%${query}%`;
  const rows = db.getAllSync<CachedItemRow>(
    `SELECT * FROM item_cache
     WHERE (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) AND is_archived = 0
     ORDER BY name ASC LIMIT ?`,
    [pattern, pattern, pattern, limit]
  );
  return rows.map(toCachedItem);
}

export function getAllCachedItems(db: SQLiteDatabase): CachedItem[] {
  const rows = db.getAllSync<CachedItemRow>(
    'SELECT * FROM item_cache ORDER BY name ASC'
  );
  return rows.map(toCachedItem);
}

export function getCachedItemNames(db: SQLiteDatabase, itemIds: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const id of itemIds) {
    const row = db.getFirstSync<{ name: string }>('SELECT name FROM item_cache WHERE id = ?', [id]);
    if (row) result.set(id, row.name);
  }
  return result;
}

export function clearItemCache(db: SQLiteDatabase): void {
  db.runSync('DELETE FROM item_cache');
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
