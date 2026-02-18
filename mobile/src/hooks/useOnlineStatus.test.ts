import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PING_INTERVAL_MS, PING_TIMEOUT_MS } from '@/lib/constants'
import {
  createOnlineStatusManager,
  type OnlineStatusState,
  type OnlineStatusManager,
} from './useOnlineStatus'

/**
 * useOnlineStatus is a React hook wrapping NetInfo + Supabase ping logic.
 * We test the pure state management logic via createOnlineStatusManager().
 */
describe('createOnlineStatusManager', () => {
  let setState: (state: Partial<OnlineStatusState>) => void
  let state: OnlineStatusState
  let manager: OnlineStatusManager
  let mockPing: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    state = { isOnline: true, wasOffline: false }
    setState = (partial) => {
      state = { ...state, ...partial }
    }
    mockPing = vi.fn().mockResolvedValue(true)
    manager = createOnlineStatusManager(setState, mockPing)
  })

  afterEach(() => {
    manager.cleanup()
    vi.useRealTimers()
  })

  describe('NetInfo state changes', () => {
    it('sets online when connected', () => {
      // Start offline
      state = { isOnline: false, wasOffline: false }
      manager.handleNetInfoChange({ isConnected: true, isInternetReachable: true })
      expect(state.isOnline).toBe(true)
    })

    it('sets offline when disconnected', () => {
      manager.handleNetInfoChange({ isConnected: false, isInternetReachable: false })
      expect(state.isOnline).toBe(false)
    })

    it('sets offline when isConnected is null', () => {
      manager.handleNetInfoChange({ isConnected: null, isInternetReachable: null })
      expect(state.isOnline).toBe(false)
    })

    it('sets wasOffline=true on offline->online transition', () => {
      // Go offline first
      manager.handleNetInfoChange({ isConnected: false, isInternetReachable: false })
      expect(state.isOnline).toBe(false)

      // Come back online
      manager.handleNetInfoChange({ isConnected: true, isInternetReachable: true })
      expect(state.isOnline).toBe(true)
      expect(state.wasOffline).toBe(true)
    })

    it('does not set wasOffline when already online', () => {
      // Already online, another online event
      manager.handleNetInfoChange({ isConnected: true, isInternetReachable: true })
      expect(state.wasOffline).toBe(false)
    })
  })

  describe('clearWasOffline', () => {
    it('resets wasOffline to false', () => {
      // Trigger offline->online to set wasOffline
      manager.handleNetInfoChange({ isConnected: false, isInternetReachable: false })
      manager.handleNetInfoChange({ isConnected: true, isInternetReachable: true })
      expect(state.wasOffline).toBe(true)

      manager.clearWasOffline()
      expect(state.wasOffline).toBe(false)
    })
  })

  describe('periodic Supabase ping', () => {
    it('starts ping interval on startPinging', () => {
      manager.startPinging()

      // Ping should not have been called yet (interval, not immediate)
      expect(mockPing).not.toHaveBeenCalled()

      // Advance to first ping interval
      vi.advanceTimersByTime(PING_INTERVAL_MS)
      expect(mockPing).toHaveBeenCalledTimes(1)
    })

    it('pings every PING_INTERVAL_MS', () => {
      manager.startPinging()

      vi.advanceTimersByTime(PING_INTERVAL_MS * 3)
      expect(mockPing).toHaveBeenCalledTimes(3)
    })

    it('sets offline when ping fails (rejects)', async () => {
      mockPing.mockRejectedValue(new Error('timeout'))
      manager.startPinging()

      // Advance to trigger one interval tick
      vi.advanceTimersByTime(PING_INTERVAL_MS)
      // Flush the microtask from the async callback
      await Promise.resolve()
      await Promise.resolve()

      expect(state.isOnline).toBe(false)
    })

    it('sets offline when ping returns false', async () => {
      mockPing.mockResolvedValue(false)
      manager.startPinging()

      vi.advanceTimersByTime(PING_INTERVAL_MS)
      await Promise.resolve()
      await Promise.resolve()

      expect(state.isOnline).toBe(false)
    })

    it('stays online when ping succeeds', async () => {
      mockPing.mockResolvedValue(true)
      manager.startPinging()

      vi.advanceTimersByTime(PING_INTERVAL_MS)
      await Promise.resolve()
      await Promise.resolve()

      expect(state.isOnline).toBe(true)
    })

    it('stopPinging clears the interval', () => {
      manager.startPinging()
      manager.stopPinging()

      vi.advanceTimersByTime(PING_INTERVAL_MS * 5)
      expect(mockPing).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('stops pinging on cleanup', () => {
      manager.startPinging()
      manager.cleanup()

      vi.advanceTimersByTime(PING_INTERVAL_MS * 5)
      expect(mockPing).not.toHaveBeenCalled()
    })
  })

  describe('constants', () => {
    it('uses 60s ping interval', () => {
      expect(PING_INTERVAL_MS).toBe(60_000)
    })

    it('uses 5s ping timeout', () => {
      expect(PING_TIMEOUT_MS).toBe(5_000)
    })
  })
})
