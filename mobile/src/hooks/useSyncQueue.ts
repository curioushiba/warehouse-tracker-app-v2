import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingCount, getSyncMetadata, setSyncMetadata } from '@/lib/db/operations';
import { processQueue, refreshItemCache } from '@/lib/sync/sync';
import { checkOnlineStatus } from '@/lib/sync/online-status';

export interface SyncQueueState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
}

export interface SyncQueueActions {
  syncNow: () => Promise<void>;
  refreshCache: () => Promise<void>;
}

export type UseSyncQueueReturn = SyncQueueState & SyncQueueActions;

/**
 * Core sync-queue manager extracted as a pure-logic factory for testability.
 * The React hook `useSyncQueue` is a thin wrapper around this.
 */
export function createSyncQueueManager(deps: {
  getDb: () => import('expo-sqlite').SQLiteDatabase;
  getSupabase: () => import('@supabase/supabase-js').SupabaseClient;
  getUserId: () => string | undefined;
  checkOnline: () => Promise<boolean>;
  onStateChange: (patch: Partial<SyncQueueState>) => void;
  getState: () => SyncQueueState;
}) {
  const { getDb, getSupabase, getUserId, checkOnline, onStateChange, getState } = deps;

  function refreshCount(): void {
    try {
      const count = getPendingCount(getDb());
      onStateChange({ pendingCount: count });
    } catch {
      // DB may not be ready yet
    }
  }

  function readLastSyncTime(): void {
    try {
      const time = getSyncMetadata(getDb(), 'last_sync_time');
      onStateChange({ lastSyncTime: time });
    } catch {
      // DB may not be ready yet
    }
  }

  async function syncNow(): Promise<void> {
    const userId = getUserId();
    if (!userId) return;

    const state = getState();
    if (state.isSyncing) return;

    const online = await checkOnline();
    if (!online) {
      onStateChange({ error: 'Device is offline' });
      return;
    }

    onStateChange({ isSyncing: true, error: null });

    try {
      const result = await processQueue(getDb(), getSupabase(), userId);
      const now = new Date().toISOString();

      try {
        setSyncMetadata(getDb(), 'last_sync_time', now);
      } catch {
        // Non-critical
      }

      // Refresh item cache so search results are up-to-date
      try {
        await refreshItemCache(getDb(), getSupabase());
      } catch {
        // Cache refresh failure is non-critical during sync
      }

      const errorMsg =
        result.failed > 0
          ? `${result.failed} transaction(s) failed to sync`
          : null;

      onStateChange({
        isSyncing: false,
        lastSyncTime: now,
        error: errorMsg,
        pendingCount: getPendingCount(getDb()),
      });
    } catch (err) {
      onStateChange({
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  async function refreshCache(): Promise<void> {
    const online = await checkOnline();
    if (!online) {
      onStateChange({ error: 'Device is offline' });
      return;
    }

    try {
      await refreshItemCache(getDb(), getSupabase());
      onStateChange({ error: null });
    } catch (err) {
      onStateChange({
        error: err instanceof Error ? err.message : 'Cache refresh failed',
      });
    }
  }

  return { refreshCount, readLastSyncTime, syncNow, refreshCache };
}

/**
 * React hook that manages offline transaction queue sync.
 *
 * - Automatically syncs when the app returns to the foreground.
 * - Exposes `syncNow` for manual trigger and `refreshCache` for item cache updates.
 * - Tracks pending count, syncing state, last sync time, and errors.
 */
export function useSyncQueue(): UseSyncQueueReturn {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [state, setState] = useState<SyncQueueState>({
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const manager = useRef(
    createSyncQueueManager({
      getDb: () => db,
      getSupabase: () => {
        if (!supabase) throw new Error('Supabase not configured');
        return supabase;
      },
      getUserId: () => user?.id,
      checkOnline: checkOnlineStatus,
      onStateChange: (patch) =>
        setState((prev) => ({ ...prev, ...patch })),
      getState: () => stateRef.current,
    }),
  ).current;

  // Load initial state
  useEffect(() => {
    manager.refreshCount();
    manager.readLastSyncTime();
  }, [manager]);

  // Auto-sync (including cache refresh) when user becomes available
  useEffect(() => {
    if (user?.id) {
      void manager.syncNow();
    }
  }, [manager, user?.id]);

  // Auto-sync when app comes to foreground
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus): void {
      if (nextState === 'active' && user?.id) {
        manager.refreshCount();
        void manager.syncNow();
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [manager, user?.id]);

  const syncNow = useCallback(() => manager.syncNow(), [manager]);
  const refreshCache = useCallback(() => manager.refreshCache(), [manager]);

  return { ...state, syncNow, refreshCache };
}
