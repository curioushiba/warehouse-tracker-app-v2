import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '../../test/mocks/expo-sqlite';
import { runMigrations } from '../db/migrations';
import {
  enqueueProduction,
  getLocalSyncErrors,
  storeLocalSyncError,
} from '../db/operations';
import { processQueue, flushLocalSyncErrors } from './sync';
import type { PendingProduction } from '../db/types';

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

function createMockSupabase(rpcResult: { success: boolean; error?: string } = { success: true }) {
  return {
    rpc: vi.fn(async () =>
      rpcResult.success
        ? { error: null }
        : { error: { code: '500', message: rpcResult.error ?? 'fail' } },
    ),
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
        gte: vi.fn(() => ({
          lt: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  };
}

describe('recordSyncError local fallback', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as any);
  });

  afterEach(() => {
    db.close();
  });

  it('stores error locally when supabase insert fails', async () => {
    const pending = makePending();
    enqueueProduction(db as any, pending);

    // Mock supabase where RPC fails and sync_errors insert also fails (offline)
    const supabase = {
      rpc: vi.fn(async () => ({ error: { code: '500', message: 'Server error' } })),
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: { message: 'offline' } })),
      })),
    };

    const result = await processQueue(db as any, supabase as any, 'user-1');
    expect(result.failed).toBe(1);

    // Should have stored the error locally
    const localErrors = getLocalSyncErrors(db as any);
    expect(localErrors).toHaveLength(1);
    expect(localErrors[0].errorMessage).toBe('Server error');
  });
});

describe('flushLocalSyncErrors', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as any);
  });

  afterEach(() => {
    db.close();
  });

  it('uploads and removes local errors when supabase insert succeeds', async () => {
    storeLocalSyncError(db as any, 'err-1', { type: 'test' }, 'error msg', 'user-1');
    expect(getLocalSyncErrors(db as any)).toHaveLength(1);

    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: null })),
      })),
    };

    await flushLocalSyncErrors(db as any, supabase as any);
    expect(getLocalSyncErrors(db as any)).toHaveLength(0);
  });

  it('keeps local errors when supabase insert still fails', async () => {
    storeLocalSyncError(db as any, 'err-2', { type: 'test' }, 'error msg', 'user-1');

    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: { message: 'still offline' } })),
      })),
    };

    await flushLocalSyncErrors(db as any, supabase as any);
    expect(getLocalSyncErrors(db as any)).toHaveLength(1);
  });
});
