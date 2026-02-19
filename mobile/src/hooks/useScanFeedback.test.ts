import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FEEDBACK_DURATION_MS, FEEDBACK_EXIT_MS } from '@/lib/constants'
import {
  createScanFeedbackManager,
  type ScanFeedbackItem,
  type ScanFeedbackState,
  type ScanFeedbackManager,
} from './useScanFeedback'

/**
 * useScanFeedback is a React hook that manages scan overlay state + native feedback.
 * We test the pure state management logic via createScanFeedbackManager().
 * Audio (expo-av) and haptics (expo-haptics) are mocked to verify they are called.
 */

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}))

// Mock expo-av
vi.mock('expo-av', () => {
  const mockSound = {
    loadAsync: vi.fn().mockResolvedValue(undefined),
    playAsync: vi.fn().mockResolvedValue(undefined),
    unloadAsync: vi.fn().mockResolvedValue(undefined),
    setPositionAsync: vi.fn().mockResolvedValue(undefined),
    setVolumeAsync: vi.fn().mockResolvedValue(undefined),
  }
  return {
    Audio: {
      Sound: {
        createAsync: vi.fn().mockResolvedValue({ sound: mockSound }),
      },
      setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
    },
  }
})

describe('createScanFeedbackManager', () => {
  let state: ScanFeedbackState
  let setState: (partial: Partial<ScanFeedbackState>) => void
  let manager: ScanFeedbackManager
  let mockPlayBeep: ReturnType<typeof vi.fn>
  let mockPlayDuplicateBeep: ReturnType<typeof vi.fn>
  let mockVibrate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    state = {
      feedbackItem: null,
      isVisible: false,
      isExiting: false,
    }
    setState = (partial) => {
      state = { ...state, ...partial }
    }
    mockPlayBeep = vi.fn()
    mockPlayDuplicateBeep = vi.fn()
    mockVibrate = vi.fn()

    manager = createScanFeedbackManager(setState, {
      playBeep: mockPlayBeep,
      playDuplicateBeep: mockPlayDuplicateBeep,
      vibrate: mockVibrate,
    })
  })

  afterEach(() => {
    manager.cleanup()
    vi.useRealTimers()
  })

  describe('triggerFeedback', () => {
    const testItem: ScanFeedbackItem = {
      itemName: 'Test Item',
      itemImageUrl: 'https://example.com/img.jpg',
    }

    it('sets feedbackItem and isVisible', () => {
      manager.triggerFeedback(testItem)
      expect(state.feedbackItem).toEqual(testItem)
      expect(state.isVisible).toBe(true)
      expect(state.isExiting).toBe(false)
    })

    it('calls playBeep', () => {
      manager.triggerFeedback(testItem)
      expect(mockPlayBeep).toHaveBeenCalledTimes(1)
    })

    it('calls vibrate (haptics)', () => {
      manager.triggerFeedback(testItem)
      expect(mockVibrate).toHaveBeenCalledTimes(1)
    })

    it('sets isExiting at FEEDBACK_EXIT_MS (400ms)', () => {
      manager.triggerFeedback(testItem)

      vi.advanceTimersByTime(FEEDBACK_EXIT_MS - 1)
      expect(state.isExiting).toBe(false)

      vi.advanceTimersByTime(1)
      expect(state.isExiting).toBe(true)
    })

    it('hides feedback at FEEDBACK_DURATION_MS (600ms)', () => {
      manager.triggerFeedback(testItem)

      vi.advanceTimersByTime(FEEDBACK_DURATION_MS - 1)
      expect(state.isVisible).toBe(true)

      vi.advanceTimersByTime(1)
      expect(state.isVisible).toBe(false)
      expect(state.feedbackItem).toBeNull()
      expect(state.isExiting).toBe(false)
    })

    it('resets for rapid re-trigger', () => {
      const item1: ScanFeedbackItem = { itemName: 'Item 1' }
      const item2: ScanFeedbackItem = { itemName: 'Item 2' }

      manager.triggerFeedback(item1)
      vi.advanceTimersByTime(500)

      // Re-trigger before first completes
      manager.triggerFeedback(item2)
      expect(state.feedbackItem).toEqual(item2)
      expect(state.isVisible).toBe(true)
      expect(state.isExiting).toBe(false)

      // Beep/vibrate called again for second trigger
      expect(mockPlayBeep).toHaveBeenCalledTimes(2)
      expect(mockVibrate).toHaveBeenCalledTimes(2)

      // Original timers should have been cleared, new timers active
      vi.advanceTimersByTime(FEEDBACK_EXIT_MS)
      expect(state.isExiting).toBe(true)

      vi.advanceTimersByTime(FEEDBACK_DURATION_MS - FEEDBACK_EXIT_MS)
      expect(state.isVisible).toBe(false)
    })
  })

  describe('triggerDuplicateAlert', () => {
    it('calls playDuplicateBeep only', () => {
      manager.triggerDuplicateAlert()
      expect(mockPlayDuplicateBeep).toHaveBeenCalledTimes(1)
      expect(mockPlayBeep).not.toHaveBeenCalled()
      expect(mockVibrate).not.toHaveBeenCalled()
    })

    it('does not change visual state', () => {
      manager.triggerDuplicateAlert()
      expect(state.feedbackItem).toBeNull()
      expect(state.isVisible).toBe(false)
      expect(state.isExiting).toBe(false)
    })
  })

  describe('clearFeedback', () => {
    it('hides feedback immediately', () => {
      manager.triggerFeedback({ itemName: 'Test' })
      expect(state.isVisible).toBe(true)

      manager.clearFeedback()
      expect(state.isVisible).toBe(false)
      expect(state.feedbackItem).toBeNull()
      expect(state.isExiting).toBe(false)
    })

    it('clears pending timers', () => {
      manager.triggerFeedback({ itemName: 'Test' })
      manager.clearFeedback()

      // Advance past all timers - state should remain cleared
      vi.advanceTimersByTime(FEEDBACK_DURATION_MS + 1000)
      expect(state.isVisible).toBe(false)
      expect(state.isExiting).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('clears all timers on cleanup', () => {
      manager.triggerFeedback({ itemName: 'Test' })
      manager.cleanup()

      // Advance past all timers
      vi.advanceTimersByTime(FEEDBACK_DURATION_MS + 1000)
      // State should still show the item (cleanup doesn't reset state, just timers)
      // But no timer-based state changes should occur
      expect(state.isExiting).toBe(false) // Exit timer was cleared
    })
  })

  describe('constants', () => {
    it('FEEDBACK_EXIT_MS is 400', () => {
      expect(FEEDBACK_EXIT_MS).toBe(400)
    })

    it('FEEDBACK_DURATION_MS is 600', () => {
      expect(FEEDBACK_DURATION_MS).toBe(600)
    })
  })
})
