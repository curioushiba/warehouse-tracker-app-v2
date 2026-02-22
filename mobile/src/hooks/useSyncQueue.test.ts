import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '@/test/mocks/expo-sqlite';
import { runMigrations } from '@/lib/db/migrations';
import { enqueueTransaction, getCachedItem } from '@/lib/db/operations';
import { createSyncQueueManager, type SyncQueueState } from './useSyncQueue';
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

const MOCK_ITEM_DATA = [
  {
    id: 'item-1',
    sku: 'SKU-001',
    name: 'Test Item',
    barcode: 'BC-001',
    current_stock: 50,
    min_stock: 5,
    max_stock: 200,
    unit: 'kg',
    unit_price: 12.5,
    category_id: 'cat-1',
    is_archived: false,
    updated_at: '2026-01-15T00:00:00Z',
    category: { name: 'Produce' },
  },
];

function createMockSupabase(
  rpcResult: { error: null | { code: string; message: string } } = { error: null },
  itemData: unknown[] = MOCK_ITEM_DATA,
) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: itemData,
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

function createTestManager(overrides: {
  db: SQLiteDatabase;
  supabase?: SupabaseClient;
  userId?: string | null;
  online?: boolean;
}) {
  const { db, supabase = createMockSupabase(), online = true } = overrides;
  const userId = overrides.userId === undefined ? 'user-123' : (overrides.userId ?? undefined);

  let state: SyncQueueState = {
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  };

  const onStateChange = vi.fn((patch: Partial<SyncQueueState>) => {
    state = { ...state, ...patch };
  });

  const manager = createSyncQueueManager({
    getDb: () => db as never,
    getSupabase: () => supabase,
    getUserId: () => userId,
    checkOnline: vi.fn().mockResolvedValue(online),
    onStateChange,
    getState: () => state,
  });

  return { manager, getState: () => state, onStateChange, supabase };
}

describe('createSyncQueueManager', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as never);
  });

  afterEach(() => {
    db.close();
  });

  describe('syncNow refreshes item cache', () => {
    it('should refresh item cache after processing empty queue', async () => {
      const supabase = createMockSupabase();
      const { manager } = createTestManager({ db, supabase });

      await manager.syncNow();

      // from() should be called for inv_items (cache refresh)
      expect(supabase.from).toHaveBeenCalledWith('inv_items');
    });

    it('should refresh item cache after processing transactions', async () => {
      const supabase = createMockSupabase();
      const { manager } = createTestManager({ db, supabase });

      enqueueTransaction(db as never, makeTx({ id: 'tx-a' }));

      await manager.syncNow();

      // Items should be cached in SQLite after sync
      const cached = getCachedItem(db as never, 'item-1');
      expect(cached).toBeTruthy();
      expect(cached?.name).toBe('Test Item');
      expect(cached?.category_name).toBe('Produce');
    });

    it('should not fail when cache refresh throws', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({ error: null }),
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error during cache refresh' },
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const { manager, getState } = createTestManager({ db, supabase });

      await manager.syncNow();

      // syncNow should complete without throwing
      expect(getState().isSyncing).toBe(false);
      // Error field should reflect queue result, not cache failure
      expect(getState().error).toBeNull();
    });
  });

  describe('syncNow guards', () => {
    it('should skip everything when offline', async () => {
      const supabase = createMockSupabase();
      const { manager } = createTestManager({ db, supabase, online: false });

      await manager.syncNow();

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should skip when no userId', async () => {
      const supabase = createMockSupabase();
      const { manager } = createTestManager({ db, supabase, userId: null });

      await manager.syncNow();

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should skip when already syncing', async () => {
      const supabase = createMockSupabase();
      const { manager, onStateChange } = createTestManager({ db, supabase });

      // Simulate already syncing by setting state before calling syncNow
      onStateChange({ isSyncing: true });

      await manager.syncNow();

      // Should not have made any network calls
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
