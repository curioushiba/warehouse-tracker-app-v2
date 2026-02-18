import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// --- Types ---

export interface SyncErrorCountState {
  count: number
  isLoading: boolean
}

export interface SyncErrorCountFetcher {
  fetch: () => Promise<void>
}

// --- Pure logic (testable) ---

/**
 * Creates a fetcher for sync error count from Supabase.
 * Exported for direct testing without React rendering.
 *
 * @param setState - Callback to update the state
 * @param supabaseClient - Optional Supabase client (for testing injection)
 */
export function createSyncErrorCountFetcher(
  setState: (state: Partial<SyncErrorCountState>) => void,
  supabaseClient?: ReturnType<typeof createClient>
): SyncErrorCountFetcher {
  const client = supabaseClient ?? createClient()

  async function fetchCount(): Promise<void> {
    setState({ isLoading: true })

    try {
      // Check authentication first
      const { data: userData, error: authError } = await client.auth.getUser()
      if (authError || !userData?.user) {
        setState({ count: 0, isLoading: false })
        return
      }

      // Query sync_errors table for pending count
      const { count, error } = await client
        .from('sync_errors')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) {
        setState({ count: 0, isLoading: false })
        return
      }

      setState({ count: count ?? 0, isLoading: false })
    } catch {
      setState({ count: 0, isLoading: false })
    }
  }

  return {
    fetch: fetchCount,
  }
}

// --- React hook ---

/**
 * Fetches the count of pending sync errors from Supabase.
 * Returns 0 when unauthenticated.
 */
export function useSyncErrorCount() {
  const [state, setSyncState] = useState<SyncErrorCountState>({
    count: 0,
    isLoading: false,
  })

  const fetcherRef = useRef<SyncErrorCountFetcher | null>(null)
  if (!fetcherRef.current) {
    fetcherRef.current = createSyncErrorCountFetcher(
      (partial) => setSyncState(prev => ({ ...prev, ...partial }))
    )
  }

  // Fetch on mount
  useEffect(() => {
    fetcherRef.current?.fetch()
  }, [])

  const refetch = useCallback(() => {
    return fetcherRef.current?.fetch() ?? Promise.resolve()
  }, [])

  return {
    count: state.count,
    isLoading: state.isLoading,
    refetch,
  }
}
