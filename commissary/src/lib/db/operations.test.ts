import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '../../test/mocks/expo-sqlite';
import { runMigrations } from './migrations';
import {
  enqueueProduction,
  getPendingProductionsToday,
  getPendingProductions,
  getTodaysProductions,
  cacheProductionsRaw,
} from './operations';
import type { PendingProduction, CachedProduction } from './types';

function makePending(overrides: Partial<PendingProduction> = {}): PendingProduction {
  return {
    id: `pp-${Math.random().toString(36).slice(2, 8)}`,
    item_id: 'item-1',
    quantity_produced: 5,
    waste_quantity: 0,
    waste_reason: null,
    notes: null,
    device_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

describe('getPendingProductionsToday', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as any);
  });

  afterEach(() => {
    db.close();
  });

  it('returns pending and syncing items created today', () => {
    const pending = makePending({ status: 'pending' });
    const syncing = makePending({ id: 'pp-syncing', status: 'syncing' });
    enqueueProduction(db as any, pending);
    enqueueProduction(db as any, syncing);

    const result = getPendingProductionsToday(db as any);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain(pending.id);
    expect(result.map((r) => r.id)).toContain(syncing.id);
  });

  it('excludes failed items', () => {
    const failed = makePending({ status: 'failed' });
    enqueueProduction(db as any, failed);

    const result = getPendingProductionsToday(db as any);
    expect(result).toHaveLength(0);
  });

  it('excludes items created on a different day', () => {
    const yesterday = makePending({ created_at: '2020-01-01T12:00:00.000Z' });
    enqueueProduction(db as any, yesterday);

    const result = getPendingProductionsToday(db as any);
    expect(result).toHaveLength(0);
  });
});

describe('merging production_cache + pending_productions', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as any);
  });

  afterEach(() => {
    db.close();
  });

  it('sums cached and pending quantities per item', () => {
    // Cached (synced) production
    const cached: CachedProduction = {
      id: 'cp-1',
      item_id: 'item-1',
      quantity_produced: 10,
      event_timestamp: new Date().toISOString(),
      status: 'completed',
    };
    cacheProductionsRaw(db as any, [cached]);

    // Pending production
    const pending = makePending({ item_id: 'item-1', quantity_produced: 3 });
    enqueueProduction(db as any, pending);

    // Simulate the merge logic from produce.tsx/index.tsx
    const productions = getTodaysProductions(db as any);
    const pendingToday = getPendingProductionsToday(db as any);

    const productionMap = new Map<string, number>();
    for (const p of productions) {
      const existing = productionMap.get(p.item_id) ?? 0;
      productionMap.set(p.item_id, existing + p.quantity_produced);
    }
    for (const p of pendingToday) {
      const existing = productionMap.get(p.item_id) ?? 0;
      productionMap.set(p.item_id, existing + p.quantity_produced);
    }

    expect(productionMap.get('item-1')).toBe(13);
  });

  it('corrections (negative quantity) reduce total', () => {
    const cached: CachedProduction = {
      id: 'cp-2',
      item_id: 'item-1',
      quantity_produced: 10,
      event_timestamp: new Date().toISOString(),
      status: 'completed',
    };
    cacheProductionsRaw(db as any, [cached]);

    const correction = makePending({ item_id: 'item-1', quantity_produced: -2 });
    enqueueProduction(db as any, correction);

    const productions = getTodaysProductions(db as any);
    const pendingToday = getPendingProductionsToday(db as any);

    const productionMap = new Map<string, number>();
    for (const p of productions) {
      const existing = productionMap.get(p.item_id) ?? 0;
      productionMap.set(p.item_id, existing + p.quantity_produced);
    }
    for (const p of pendingToday) {
      const existing = productionMap.get(p.item_id) ?? 0;
      productionMap.set(p.item_id, existing + p.quantity_produced);
    }

    expect(productionMap.get('item-1')).toBe(8);
  });
});
