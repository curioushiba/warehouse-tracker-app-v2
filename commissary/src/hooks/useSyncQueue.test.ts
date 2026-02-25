import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSyncQueueManager, type SyncQueueState } from './useSyncQueue';

// Minimal mock DB that satisfies getPendingCount / getSyncMetadata
function createMockDb() {
  return {
    getFirstSync: vi.fn(() => ({ count: 0 })),
    getAllSync: vi.fn(() => []),
    runSync: vi.fn(),
    execSync: vi.fn(),
  };
}

function createMockSupabase() {
  return {
    rpc: vi.fn(async () => ({ error: null })),
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

describe('createSyncQueueManager', () => {
  let state: SyncQueueState;
  let patches: Partial<SyncQueueState>[];

  beforeEach(() => {
    state = { pendingCount: 0, isSyncing: false, lastSyncTime: null, error: null };
    patches = [];
  });

  function makeManager(overrides: {
    isActive?: boolean;
    userId?: string | null;
    online?: boolean;
  } = {}) {
    const db = createMockDb();
    const supabase = createMockSupabase();

    return createSyncQueueManager({
      getDb: () => db as any,
      getSupabase: () => supabase as any,
      getUserId: () => overrides.userId === null ? undefined : (overrides.userId ?? 'user-1'),
      getIsActive: () => overrides.isActive ?? true,
      checkOnline: async () => overrides.online ?? true,
      onStateChange: (patch) => {
        state = { ...state, ...patch };
        patches.push(patch);
      },
      getState: () => state,
    });
  }

  it('syncNow short-circuits when user is deactivated', async () => {
    const manager = makeManager({ isActive: false });
    await manager.syncNow();

    expect(patches).toHaveLength(1);
    expect(patches[0].error).toBe('Account is deactivated');
    expect(state.isSyncing).toBe(false);
  });

  it('syncNow short-circuits when no userId', async () => {
    const manager = makeManager({ userId: null });
    await manager.syncNow();

    expect(patches).toHaveLength(0);
  });

  it('syncNow short-circuits when offline', async () => {
    const manager = makeManager({ online: false });
    await manager.syncNow();

    expect(state.error).toBe('Device is offline');
    expect(state.isSyncing).toBe(false);
  });

  it('syncNow proceeds when active, online, and has userId', async () => {
    const manager = makeManager();
    await manager.syncNow();

    // Should have set isSyncing true then false
    const syncingPatch = patches.find((p) => p.isSyncing === true);
    const donePatch = patches.find((p) => p.isSyncing === false);
    expect(syncingPatch).toBeDefined();
    expect(donePatch).toBeDefined();
    expect(state.isSyncing).toBe(false);
    expect(state.error).toBeNull();
  });
});
