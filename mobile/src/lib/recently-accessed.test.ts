import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '@/test/mocks/expo-sqlite';
import { runMigrations } from '@/lib/db/migrations';
import { cacheItems } from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import type { UnifiedTransaction } from '@/lib/transactions';
import { getRecentlyAccessedItems } from './recently-accessed';

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
    quantity_decimals: 3,
    is_archived: false,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTx(overrides: Partial<UnifiedTransaction> = {}): UnifiedTransaction {
  return {
    id: 'tx-1',
    item_id: 'item-1',
    transaction_type: 'check_in',
    quantity: 1,
    notes: null,
    timestamp: '2026-01-01T00:00:00Z',
    status: 'completed',
    ...overrides,
  };
}

describe('getRecentlyAccessedItems', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as unknown as import('expo-sqlite').SQLiteDatabase);
  });

  afterEach(() => {
    db.close();
  });

  it('should return empty array for empty transactions', () => {
    const result = getRecentlyAccessedItems(db as never, []);
    expect(result).toEqual([]);
  });

  it('should return a single item from a single transaction', () => {
    cacheItems(db as never, [makeItem({ id: 'item-1', name: 'Alpha' })]);
    const txs = [makeTx({ id: 'tx-1', item_id: 'item-1' })];

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-1');
    expect(result[0].name).toBe('Alpha');
  });

  it('should deduplicate items appearing in multiple transactions', () => {
    cacheItems(db as never, [makeItem({ id: 'item-1' })]);
    const txs = [
      makeTx({ id: 'tx-1', item_id: 'item-1', timestamp: '2026-01-01T00:02:00Z' }),
      makeTx({ id: 'tx-2', item_id: 'item-1', timestamp: '2026-01-01T00:01:00Z' }),
      makeTx({ id: 'tx-3', item_id: 'item-1', timestamp: '2026-01-01T00:00:00Z' }),
    ];

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result).toHaveLength(1);
  });

  it('should preserve recency order (newest-first input)', () => {
    cacheItems(db as never, [
      makeItem({ id: 'item-a', name: 'Alpha', sku: 'A' }),
      makeItem({ id: 'item-b', name: 'Beta', sku: 'B', barcode: 'BC-B' }),
      makeItem({ id: 'item-c', name: 'Charlie', sku: 'C', barcode: 'BC-C' }),
    ]);
    const txs = [
      makeTx({ id: 'tx-1', item_id: 'item-b', timestamp: '2026-01-01T00:03:00Z' }),
      makeTx({ id: 'tx-2', item_id: 'item-a', timestamp: '2026-01-01T00:02:00Z' }),
      makeTx({ id: 'tx-3', item_id: 'item-c', timestamp: '2026-01-01T00:01:00Z' }),
    ];

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result.map((i) => i.id)).toEqual(['item-b', 'item-a', 'item-c']);
  });

  it('should skip items not in cache', () => {
    cacheItems(db as never, [makeItem({ id: 'item-1' })]);
    const txs = [
      makeTx({ id: 'tx-1', item_id: 'item-missing', timestamp: '2026-01-01T00:02:00Z' }),
      makeTx({ id: 'tx-2', item_id: 'item-1', timestamp: '2026-01-01T00:01:00Z' }),
    ];

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-1');
  });

  it('should respect the limit parameter', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `item-${i}`, name: `Item ${i}`, sku: `SKU-${i}`, barcode: `BC-${i}` }),
    );
    cacheItems(db as never, items);
    const txs = items.map((item, i) =>
      makeTx({ id: `tx-${i}`, item_id: item.id, timestamp: `2026-01-01T00:0${4 - i}:00Z` }),
    );

    const result = getRecentlyAccessedItems(db as never, txs, 3);
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('should default limit to 10', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      makeItem({ id: `item-${i}`, name: `Item ${i}`, sku: `SKU-${i}`, barcode: `BC-${i}` }),
    );
    cacheItems(db as never, items);
    const txs = items.map((item, i) =>
      makeTx({ id: `tx-${i}`, item_id: item.id, timestamp: new Date(2026, 0, 1, 0, 0, 14 - i).toISOString() }),
    );

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result).toHaveLength(10);
  });

  it('should handle mixed deduplicated and unique items', () => {
    cacheItems(db as never, [
      makeItem({ id: 'item-a', name: 'Alpha', sku: 'A' }),
      makeItem({ id: 'item-b', name: 'Beta', sku: 'B', barcode: 'BC-B' }),
    ]);
    const txs = [
      makeTx({ id: 'tx-1', item_id: 'item-a', timestamp: '2026-01-01T00:04:00Z' }),
      makeTx({ id: 'tx-2', item_id: 'item-b', timestamp: '2026-01-01T00:03:00Z' }),
      makeTx({ id: 'tx-3', item_id: 'item-a', timestamp: '2026-01-01T00:02:00Z' }),
      makeTx({ id: 'tx-4', item_id: 'item-b', timestamp: '2026-01-01T00:01:00Z' }),
    ];

    const result = getRecentlyAccessedItems(db as never, txs);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(['item-a', 'item-b']);
  });
});
