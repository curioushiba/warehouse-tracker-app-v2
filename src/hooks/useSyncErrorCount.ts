"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserPendingSyncErrorCount } from "@/lib/actions/sync-errors";
import { useAuthContext } from "@/contexts/AuthContext";

export interface UseSyncErrorCountReturn {
  failedSyncCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and track the count of pending sync errors for the current user
 */
export function useSyncErrorCount(): UseSyncErrorCountReturn {
  const { user, isAuthenticated } = useAuthContext();
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setFailedSyncCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserPendingSyncErrorCount(user.id);

      if (result.success) {
        setFailedSyncCount(result.data ?? 0);
      } else {
        setError(result.error ?? "Failed to fetch sync error count");
        setFailedSyncCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sync error count");
      setFailedSyncCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  // Initial fetch and refetch when user changes
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    failedSyncCount,
    isLoading,
    error,
    refetch: fetchCount,
  };
}
