import { useEffect, useState, useCallback, useRef } from 'react'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { PING_INTERVAL_MS, PING_TIMEOUT_MS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

// --- Types ---

export interface OnlineStatusState {
  isOnline: boolean
  wasOffline: boolean
}

export interface OnlineStatusManager {
  handleNetInfoChange: (netInfoState: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void
  clearWasOffline: () => void
  startPinging: () => void
  stopPinging: () => void
  cleanup: () => void
}

// --- Pure logic (testable) ---

/**
 * Creates a state manager for online status tracking.
 * Exported for direct testing without React rendering.
 *
 * @param setState - Callback to update the state
 * @param pingFn - Async function that returns true if Supabase is reachable
 */
export function createOnlineStatusManager(
  setState: (state: Partial<OnlineStatusState>) => void,
  pingFn: () => Promise<boolean>
): OnlineStatusManager {
  let isOnline = true
  let pingInterval: ReturnType<typeof setInterval> | null = null

  function handleNetInfoChange(netInfoState: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
    const connected = netInfoState.isConnected === true

    if (connected && !isOnline) {
      // Offline -> online transition
      isOnline = true
      setState({ isOnline: true, wasOffline: true })
    } else if (connected) {
      isOnline = true
      setState({ isOnline: true })
    } else {
      isOnline = false
      setState({ isOnline: false })
    }
  }

  function clearWasOffline() {
    setState({ wasOffline: false })
  }

  function startPinging() {
    stopPinging() // Clear any existing interval
    pingInterval = setInterval(async () => {
      try {
        const reachable = await pingFn()
        if (!reachable) {
          isOnline = false
          setState({ isOnline: false })
        }
      } catch {
        isOnline = false
        setState({ isOnline: false })
      }
    }, PING_INTERVAL_MS)
  }

  function stopPinging() {
    if (pingInterval !== null) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function cleanup() {
    stopPinging()
  }

  return {
    handleNetInfoChange,
    clearWasOffline,
    startPinging,
    stopPinging,
    cleanup,
  }
}

// --- Supabase ping function ---

async function supabasePing(): Promise<boolean> {
  try {
    const supabase = createClient()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
      clearTimeout(timeout)
      return !error
    } catch {
      clearTimeout(timeout)
      return false
    }
  } catch {
    return false
  }
}

// --- React hook ---

/**
 * Tracks online/offline status using NetInfo + periodic Supabase ping.
 *
 * - Listens to @react-native-community/netinfo for connect/disconnect events
 * - Sets wasOffline=true on offline->online transition
 * - Periodically pings Supabase every 60s to verify real connectivity
 * - 5s timeout on ping sets offline
 */
export function useOnlineStatus() {
  const [state, setOnlineState] = useState<OnlineStatusState>({
    isOnline: true,
    wasOffline: false,
  })

  const managerRef = useRef<OnlineStatusManager | null>(null)

  // Create manager once
  if (!managerRef.current) {
    managerRef.current = createOnlineStatusManager(
      (partial) => setOnlineState(prev => ({ ...prev, ...partial })),
      supabasePing
    )
  }

  useEffect(() => {
    const manager = managerRef.current!

    // Subscribe to NetInfo changes
    const unsubscribe = NetInfo.addEventListener((netInfoState: NetInfoState) => {
      manager.handleNetInfoChange({
        isConnected: netInfoState.isConnected,
        isInternetReachable: netInfoState.isInternetReachable,
      })
    })

    // Start periodic Supabase ping
    manager.startPinging()

    return () => {
      unsubscribe()
      manager.cleanup()
    }
  }, [])

  const clearWasOffline = useCallback(() => {
    managerRef.current?.clearWasOffline()
  }, [])

  return {
    isOnline: state.isOnline,
    wasOffline: state.wasOffline,
    clearWasOffline,
  }
}
