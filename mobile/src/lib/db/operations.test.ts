import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '@/test/mocks/expo-sqlite';
import { runMigrations } from './migrations';
import {
  enqueueTransaction,
  getPendingTransactions,
  getTransactionById,
  updateTransactionStatus,
  removeTransaction,
  getPendingCount,
  clearAllTransactions,
  cacheItems,
  getCachedItem,
  getCachedItemByBarcode,
  getCachedItemBySku,
  searchCachedItems,
  getAllCachedItems,
  clearItemCache,
  getSyncMetadata,
  setSyncMetadata,
} from './operations';
import type { PendingTransaction, CachedItem } from './types';

function makeTx(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    id: 'tx-1',
    item_id: 'item-1',
    transaction_type: 'check_in',
    quantity: 10,
    notes: null,
    device_timestamp: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    status: 'pending',
    ...overrides,
  };
}

function makeItem(overrides: Partial<CachedItem> = {}): CachedItem {
  return {
    id: 'item-1',
    sku: 'SKU-001',
    name: 'Test Item',
    barcode: 'BC-001',
    current_stock: 100,
    min_stock: 10,
    max_stock: 500,
    unit: 'pcs',
    unit_price: 9.99,
    category_id: 'cat-1',
    category_name: 'Category A',
    quantity_decimals: 0,
    is_archived: false,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SQLite operations', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as unknown as import('expo-sqlite').SQLiteDatabase);
  });

  afterEach(() => {
    db.close();
  });

  // --- Transaction queue operations ---

  describe('enqueueTransaction + getPendingTransactions', () => {
    it('should enqueue and retrieve a transaction', () => {
      const tx = makeTx();
      enqueueTransaction(db as never, tx);

      const pending = getPendingTransactions(db as never);
      expect(pending).toHaveLength(1);
      expect(pending[0]).toEqual(tx);
    });

    it('should return transactions in FIFO order by created_at', () => {
      const tx1 = makeTx({ id: 'tx-1', created_at: '2026-01-01T00:00:00Z' });
      const tx2 = makeTx({ id: 'tx-2', created_at: '2026-01-01T00:00:01Z' });
      const tx3 = makeTx({ id: 'tx-3', created_at: '2026-01-01T00:00:02Z' });

      // Insert out of order
      enqueueTransaction(db as never, tx3);
      enqueueTransaction(db as never, tx1);
      enqueueTransaction(db as never, tx2);

      const pending = getPendingTransactions(db as never);
      expect(pending.map(t => t.id)).toEqual(['tx-1', 'tx-2', 'tx-3']);
    });

    it('should return an empty array when no transactions exist', () => {
      const pending = getPendingTransactions(db as never);
      expect(pending).toEqual([]);
    });
  });

  describe('getTransactionById', () => {
    it('should return the transaction when it exists', () => {
      const tx = makeTx({ id: 'tx-find-me' });
      enqueueTransaction(db as never, tx);

      const found = getTransactionById(db as never, 'tx-find-me');
      expect(found).toEqual(tx);
    });

    it('should return null when transaction does not exist', () => {
      const found = getTransactionById(db as never, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update the status of a transaction', () => {
      const tx = makeTx({ id: 'tx-status' });
      enqueueTransaction(db as never, tx);

      updateTransactionStatus(db as never, 'tx-status', 'syncing');

      const updated = getTransactionById(db as never, 'tx-status');
      expect(updated?.status).toBe('syncing');
    });

    it('should update status to failed', () => {
      const tx = makeTx({ id: 'tx-fail' });
      enqueueTransaction(db as never, tx);

      updateTransactionStatus(db as never, 'tx-fail', 'failed');

      const updated = getTransactionById(db as never, 'tx-fail');
      expect(updated?.status).toBe('failed');
    });
  });

  describe('removeTransaction', () => {
    it('should remove a transaction by id', () => {
      const tx1 = makeTx({ id: 'tx-keep' });
      const tx2 = makeTx({ id: 'tx-remove', created_at: '2026-01-01T00:00:01Z' });
      enqueueTransaction(db as never, tx1);
      enqueueTransaction(db as never, tx2);

      removeTransaction(db as never, 'tx-remove');

      const pending = getPendingTransactions(db as never);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('tx-keep');
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when queue is empty', () => {
      expect(getPendingCount(db as never)).toBe(0);
    });

    it('should return the correct count', () => {
      enqueueTransaction(db as never, makeTx({ id: 'tx-1' }));
      enqueueTransaction(db as never, makeTx({ id: 'tx-2', created_at: '2026-01-01T00:00:01Z' }));
      enqueueTransaction(db as never, makeTx({ id: 'tx-3', created_at: '2026-01-01T00:00:02Z' }));

      expect(getPendingCount(db as never)).toBe(3);
    });
  });

  describe('clearAllTransactions', () => {
    it('should remove all transactions', () => {
      enqueueTransaction(db as never, makeTx({ id: 'tx-1' }));
      enqueueTransaction(db as never, makeTx({ id: 'tx-2', created_at: '2026-01-01T00:00:01Z' }));

      clearAllTransactions(db as never);

      expect(getPendingTransactions(db as never)).toEqual([]);
      expect(getPendingCount(db as never)).toBe(0);
    });
  });

  // --- Item cache operations ---

  describe('cacheItems + getCachedItem', () => {
    it('should cache a single item and retrieve by id', () => {
      const item = makeItem();
      cacheItems(db as never, [item]);

      const cached = getCachedItem(db as never, 'item-1');
      expect(cached).toEqual(item);
    });

    it('should cache multiple items', () => {
      const items = [
        makeItem({ id: 'item-1', name: 'Alpha' }),
        makeItem({ id: 'item-2', name: 'Beta', sku: 'SKU-002', barcode: 'BC-002' }),
      ];
      cacheItems(db as never, items);

      expect(getCachedItem(db as never, 'item-1')).toBeTruthy();
      expect(getCachedItem(db as never, 'item-2')).toBeTruthy();
    });

    it('should return null for a non-existent item id', () => {
      expect(getCachedItem(db as never, 'nonexistent')).toBeNull();
    });

    it('should upsert existing items (INSERT OR REPLACE)', () => {
      cacheItems(db as never, [makeItem({ id: 'item-1', name: 'Original' })]);
      cacheItems(db as never, [makeItem({ id: 'item-1', name: 'Updated' })]);

      const cached = getCachedItem(db as never, 'item-1');
      expect(cached?.name).toBe('Updated');
    });
  });

  describe('getCachedItemByBarcode', () => {
    it('should retrieve an item by barcode', () => {
      cacheItems(db as never, [makeItem({ barcode: 'PT-00001' })]);

      const found = getCachedItemByBarcode(db as never, 'PT-00001');
      expect(found).toBeTruthy();
      expect(found?.barcode).toBe('PT-00001');
    });

    it('should return null for unknown barcode', () => {
      expect(getCachedItemByBarcode(db as never, 'UNKNOWN')).toBeNull();
    });
  });

  describe('getCachedItemBySku', () => {
    it('should retrieve an item by SKU', () => {
      cacheItems(db as never, [makeItem({ sku: 'MY-SKU' })]);

      const found = getCachedItemBySku(db as never, 'MY-SKU');
      expect(found).toBeTruthy();
      expect(found?.sku).toBe('MY-SKU');
    });

    it('should return null for unknown SKU', () => {
      expect(getCachedItemBySku(db as never, 'UNKNOWN')).toBeNull();
    });
  });

  describe('searchCachedItems', () => {
    beforeEach(() => {
      cacheItems(db as never, [
        makeItem({ id: 'i1', name: 'Frozen Chicken', sku: 'FC-001', barcode: 'BC-FC' }),
        makeItem({ id: 'i2', name: 'Frozen Fish', sku: 'FF-002', barcode: 'BC-FF' }),
        makeItem({ id: 'i3', name: 'Fresh Vegetables', sku: 'FV-003', barcode: 'BC-FV' }),
      ]);
    });

    it('should search by name substring', () => {
      const results = searchCachedItems(db as never, 'Frozen');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['i1', 'i2']);
    });

    it('should search by SKU substring', () => {
      const results = searchCachedItems(db as never, 'FV-003');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('i3');
    });

    it('should search by barcode substring', () => {
      const results = searchCachedItems(db as never, 'BC-FC');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('i1');
    });

    it('should return empty array for no matches', () => {
      const results = searchCachedItems(db as never, 'Nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getAllCachedItems', () => {
    it('should return all items sorted by name', () => {
      cacheItems(db as never, [
        makeItem({ id: 'i1', name: 'Zebra' }),
        makeItem({ id: 'i2', name: 'Apple', sku: 'SKU-002', barcode: 'BC-002' }),
        makeItem({ id: 'i3', name: 'Mango', sku: 'SKU-003', barcode: 'BC-003' }),
      ]);

      const all = getAllCachedItems(db as never);
      expect(all).toHaveLength(3);
      expect(all.map(i => i.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('should return empty array when cache is empty', () => {
      expect(getAllCachedItems(db as never)).toEqual([]);
    });
  });

  describe('clearItemCache', () => {
    it('should remove all cached items', () => {
      cacheItems(db as never, [makeItem({ id: 'i1' }), makeItem({ id: 'i2', sku: 'SKU-002' })]);

      clearItemCache(db as never);

      expect(getAllCachedItems(db as never)).toEqual([]);
    });
  });

  // --- Sync metadata operations ---

  describe('getSyncMetadata + setSyncMetadata', () => {
    it('should set and retrieve a metadata value', () => {
      setSyncMetadata(db as never, 'last_sync', '2026-01-15T12:00:00Z');

      const value = getSyncMetadata(db as never, 'last_sync');
      expect(value).toBe('2026-01-15T12:00:00Z');
    });

    it('should return null for missing metadata key', () => {
      const value = getSyncMetadata(db as never, 'nonexistent_key');
      expect(value).toBeNull();
    });

    it('should overwrite existing metadata value (upsert)', () => {
      setSyncMetadata(db as never, 'version', '1.0');
      setSyncMetadata(db as never, 'version', '2.0');

      expect(getSyncMetadata(db as never, 'version')).toBe('2.0');
    });
  });

  // --- Boolean conversion for is_archived ---

  describe('boolean conversion for is_archived', () => {
    it('should store is_archived as integer and convert back to boolean false', () => {
      cacheItems(db as never, [makeItem({ is_archived: false })]);

      const cached = getCachedItem(db as never, 'item-1');
      expect(cached?.is_archived).toBe(false);
      expect(typeof cached?.is_archived).toBe('boolean');
    });

    it('should store is_archived as integer and convert back to boolean true', () => {
      cacheItems(db as never, [makeItem({ is_archived: true })]);

      const cached = getCachedItem(db as never, 'item-1');
      expect(cached?.is_archived).toBe(true);
      expect(typeof cached?.is_archived).toBe('boolean');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('should handle null optional fields in cached items', () => {
      const item = makeItem({
        barcode: null,
        max_stock: null,
        unit_price: null,
        category_id: null,
        category_name: null,
      });
      cacheItems(db as never, [item]);

      const cached = getCachedItem(db as never, 'item-1');
      expect(cached?.barcode).toBeNull();
      expect(cached?.max_stock).toBeNull();
      expect(cached?.unit_price).toBeNull();
      expect(cached?.category_id).toBeNull();
      expect(cached?.category_name).toBeNull();
    });

    it('should handle transaction with notes', () => {
      const tx = makeTx({ notes: 'Delivered by truck #42' });
      enqueueTransaction(db as never, tx);

      const found = getTransactionById(db as never, tx.id);
      expect(found?.notes).toBe('Delivered by truck #42');
    });
  });
});
