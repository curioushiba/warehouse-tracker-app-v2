import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '@/test/mocks/expo-sqlite';
import { runMigrations } from '@/lib/db/migrations';
import { enqueueTransaction, getPendingTransactions, getTransactionById, getSyncMetadata, getAllCachedItems, cacheItems } from '@/lib/db/operations';
import { processQueue, submitTransaction, refreshItemCache, fetchRecentTransactions } from './sync';
import type { PendingTransaction } from '@/lib/db/types';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeTx(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    id: 'tx-1',
    item_id: 'item-1',
    transaction_type: 'check_in',
    quantity: 5,
    notes: null,
    device_timestamp: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    status: 'pending',
    ...overrides,
  };
}

function createMockSupabase(rpcResult: { error: null | { code: string; message: string } } = { error: null }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('sync engine', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as unknown as import('expo-sqlite').SQLiteDatabase);
  });

  afterEach(() => {
    db.close();
  });

  describe('submitTransaction', () => {
    it('should call RPC with correct parameters', async () => {
      const supabase = createMockSupabase();
      const tx = makeTx();

      const result = await submitTransaction(supabase, tx, 'user-123');

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('submit_transaction', {
        p_transaction_type: 'check_in',
        p_item_id: 'item-1',
        p_quantity: 5,
        p_user_id: 'user-123',
        p_notes: null,
        p_source_location_id: null,
        p_destination_location_id: null,
        p_idempotency_key: 'tx-1',
        p_device_timestamp: '2026-01-01T00:00:00Z',
      });
    });

    it('should return failure with error message on RPC error', async () => {
      const supabase = createMockSupabase({
        error: { code: '42501', message: 'Permission denied' },
      });

      const result = await submitTransaction(supabase, makeTx(), 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should treat duplicate idempotency key (23505) as success', async () => {
      const supabase = createMockSupabase({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      const result = await submitTransaction(supabase, makeTx(), 'user-123');

      expect(result.success).toBe(true);
    });
  });

  describe('processQueue', () => {
    it('should return zeroes when queue is empty', async () => {
      const supabase = createMockSupabase();

      const result = await processQueue(db as never, supabase, 'user-123');

      expect(result).toEqual({ synced: 0, failed: 0, errors: [] });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should process transactions in FIFO order and remove on success', async () => {
      const supabase = createMockSupabase();
      enqueueTransaction(db as never, makeTx({ id: 'tx-a', created_at: '2026-01-01T00:00:00Z' }));
      enqueueTransaction(db as never, makeTx({ id: 'tx-b', created_at: '2026-01-01T00:00:01Z' }));

      const result = await processQueue(db as never, supabase, 'user-123');

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
      // Both transactions should be removed from the queue
      expect(getPendingTransactions(db as never)).toEqual([]);
    });

    it('should mark failed transactions and record sync errors', async () => {
      const supabase = createMockSupabase({
        error: { code: '42501', message: 'User is inactive' },
      });
      enqueueTransaction(db as never, makeTx({ id: 'tx-fail' }));

      const result = await processQueue(db as never, supabase, 'user-123');

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual(['User is inactive']);
      // Failed transaction should remain in queue with 'failed' status
      const remaining = getTransactionById(db as never, 'tx-fail');
      expect(remaining?.status).toBe('failed');
      // Should have recorded the error to sync_errors table
      expect(supabase.from).toHaveBeenCalledWith('sync_errors');
    });

    it('should handle mixed success and failure', async () => {
      // First call succeeds, second fails
      const supabase = {
        rpc: vi.fn()
          .mockResolvedValueOnce({ error: null })
          .mockResolvedValueOnce({ error: { code: '42501', message: 'Item archived' } }),
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as SupabaseClient;

      enqueueTransaction(db as never, makeTx({ id: 'tx-ok', created_at: '2026-01-01T00:00:00Z' }));
      enqueueTransaction(db as never, makeTx({ id: 'tx-bad', created_at: '2026-01-01T00:00:01Z' }));

      const result = await processQueue(db as never, supabase, 'user-123');

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual(['Item archived']);
      // Successful one removed, failed one still in queue
      expect(getTransactionById(db as never, 'tx-ok')).toBeNull();
      expect(getTransactionById(db as never, 'tx-bad')?.status).toBe('failed');
    });
  });

  describe('refreshItemCache', () => {
    it('should fetch items from Supabase and cache them locally', async () => {
      const mockData = [
        {
          id: 'item-1',
          sku: 'SKU-001',
          name: 'Test Item',
          barcode: 'BC-001',
          current_stock: 50,
          min_stock: 5,
          max_stock: 200,
          unit: 'kg',
          unit_price: 12.50,
          category_id: 'cat-1',
          is_archived: false,
          updated_at: '2026-01-15T00:00:00Z',
          category: { name: 'Produce' },
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      await refreshItemCache(db as never, supabase);

      // Verify items were written to local cache
      const { getCachedItem } = await import('@/lib/db/operations');
      const cached = getCachedItem(db as never, 'item-1');
      expect(cached).toBeTruthy();
      expect(cached?.name).toBe('Test Item');
      expect(cached?.category_name).toBe('Produce');
      expect(cached?.current_stock).toBe(50);

      // Verify sync metadata was updated
      const lastRefresh = getSyncMetadata(db as never, 'last_item_cache_refresh');
      expect(lastRefresh).toBeTruthy();
    });

    it('should throw an error when Supabase fetch fails', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error' },
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(refreshItemCache(db as never, supabase)).rejects.toThrow(
        'Failed to fetch items: Network error'
      );
    });

    it('should clear stale items before caching new ones', async () => {
      // Pre-populate cache with a stale item
      const { cacheItems, getCachedItem } = await import('@/lib/db/operations');
      cacheItems(db as never, [
        {
          id: 'stale-item',
          sku: 'STALE-001',
          name: 'Stale Item',
          barcode: null,
          current_stock: 99,
          min_stock: 0,
          max_stock: null,
          unit: 'pcs',
          unit_price: null,
          category_id: null,
          category_name: null,
          quantity_decimals: 3,
          is_archived: true,
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]);

      // Verify stale item exists
      expect(getCachedItem(db as never, 'stale-item')).toBeTruthy();

      const mockData = [
        {
          id: 'fresh-item',
          sku: 'FRESH-001',
          name: 'Fresh Item',
          barcode: null,
          current_stock: 10,
          min_stock: 1,
          max_stock: null,
          unit: 'pcs',
          unit_price: null,
          category_id: null,
          is_archived: false,
          updated_at: '2026-01-15T00:00:00Z',
          category: null,
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      await refreshItemCache(db as never, supabase);

      // Stale item should be removed
      expect(getCachedItem(db as never, 'stale-item')).toBeNull();
      // Fresh item should exist
      expect(getCachedItem(db as never, 'fresh-item')).toBeTruthy();
    });

    it('should set quantity_decimals to 3 for cached items', async () => {
      const mockData = [
        {
          id: 'item-dec',
          sku: 'SKU-DEC',
          name: 'Decimal Item',
          barcode: null,
          current_stock: 10,
          min_stock: 1,
          max_stock: null,
          unit: 'kg',
          unit_price: null,
          category_id: null,
          is_archived: false,
          updated_at: '2026-01-15T00:00:00Z',
          category: null,
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      await refreshItemCache(db as never, supabase);

      const { getCachedItem } = await import('@/lib/db/operations');
      const cached = getCachedItem(db as never, 'item-dec');
      expect(cached?.quantity_decimals).toBe(3);
    });

    it('should wrap clear+insert+metadata in a single transaction', async () => {
      // Pre-populate cache
      cacheItems(db as never, [
        {
          id: 'pre-item',
          sku: 'PRE-001',
          name: 'Pre Item',
          barcode: null,
          current_stock: 10,
          min_stock: 1,
          max_stock: null,
          unit: 'pcs',
          unit_price: null,
          category_id: null,
          category_name: null,
          quantity_decimals: 3,
          is_archived: false,
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]);

      const mockData = [
        {
          id: 'new-item',
          sku: 'NEW-001',
          name: 'New Item',
          barcode: null,
          current_stock: 5,
          min_stock: 1,
          max_stock: null,
          unit: 'pcs',
          unit_price: null,
          category_id: null,
          is_archived: false,
          updated_at: '2026-01-15T00:00:00Z',
          category: null,
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const execSpy = vi.spyOn(db, 'execSync');

      await refreshItemCache(db as never, supabase);

      const calls = execSpy.mock.calls.map(c => c[0]);
      expect(calls).toContain('BEGIN');
      expect(calls).toContain('COMMIT');
      expect(calls.indexOf('BEGIN')).toBeLessThan(calls.indexOf('COMMIT'));

      // Old item gone, new item present
      const { getCachedItem } = await import('@/lib/db/operations');
      expect(getCachedItem(db as never, 'pre-item')).toBeNull();
      expect(getCachedItem(db as never, 'new-item')).toBeTruthy();

      execSpy.mockRestore();
    });

    it('should handle items without a category', async () => {
      const mockData = [
        {
          id: 'item-no-cat',
          sku: 'SKU-NC',
          name: 'No Category Item',
          barcode: null,
          current_stock: 10,
          min_stock: 1,
          max_stock: null,
          unit: 'pcs',
          unit_price: null,
          category_id: null,
          is_archived: false,
          updated_at: '2026-01-15T00:00:00Z',
          category: null,
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      await refreshItemCache(db as never, supabase);

      const { getCachedItem } = await import('@/lib/db/operations');
      const cached = getCachedItem(db as never, 'item-no-cat');
      expect(cached).toBeTruthy();
      expect(cached?.category_name).toBeNull();
      expect(cached?.barcode).toBeNull();
    });
  });

  describe('fetchRecentTransactions', () => {
    it('should fetch and map transactions from Supabase', async () => {
      const mockData = [
        {
          id: 'tx-remote-1',
          item_id: 'item-1',
          transaction_type: 'check_in',
          quantity: 10,
          notes: 'Received shipment',
          server_timestamp: '2026-01-15T12:00:00Z',
        },
        {
          id: 'tx-remote-2',
          item_id: 'item-2',
          transaction_type: 'check_out',
          quantity: 5,
          notes: null,
          server_timestamp: '2026-01-15T11:00:00Z',
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await fetchRecentTransactions(supabase, 'user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'tx-remote-1',
        item_id: 'item-1',
        transaction_type: 'check_in',
        quantity: 10,
        notes: 'Received shipment',
        timestamp: '2026-01-15T12:00:00Z',
        status: 'completed',
      });
      expect(result[1].status).toBe('completed');
      expect(result[1].transaction_type).toBe('check_out');
    });

    it('should return empty array on Supabase error', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await fetchRecentTransactions(supabase, 'user-123');

      expect(result).toEqual([]);
    });

    it('should pass correct query parameters', async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
      const eqFn = vi.fn().mockReturnValue({ order: orderFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      const fromFn = vi.fn().mockReturnValue({ select: selectFn });

      const supabase = { from: fromFn } as unknown as SupabaseClient;

      await fetchRecentTransactions(supabase, 'user-456', 25);

      expect(fromFn).toHaveBeenCalledWith('inv_transactions');
      expect(selectFn).toHaveBeenCalledWith('id, item_id, transaction_type, quantity, notes, server_timestamp');
      expect(eqFn).toHaveBeenCalledWith('user_id', 'user-456');
      expect(orderFn).toHaveBeenCalledWith('server_timestamp', { ascending: false });
      expect(limitFn).toHaveBeenCalledWith(25);
    });
  });
});
