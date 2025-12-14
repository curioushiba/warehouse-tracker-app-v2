import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScanFeedback } from './useScanFeedback'

describe('useScanFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(() => true),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useScanFeedback())

      expect(result.current.feedbackItem).toBeNull()
      expect(result.current.isVisible).toBe(false)
      expect(result.current.isExiting).toBe(false)
      expect(typeof result.current.triggerFeedback).toBe('function')
      expect(typeof result.current.triggerDuplicateAlert).toBe('function')
    })
  })

  describe('triggerFeedback', () => {
    it('sets feedbackItem and isVisible when triggered', () => {
      const { result } = renderHook(() => useScanFeedback())
      const testItem = { itemName: 'Test Item', itemImageUrl: 'http://example.com/image.jpg' }

      act(() => {
        result.current.triggerFeedback(testItem)
      })

      expect(result.current.feedbackItem).toEqual(testItem)
      expect(result.current.isVisible).toBe(true)
      expect(result.current.isExiting).toBe(false)
    })

    it('handles item without image URL', () => {
      const { result } = renderHook(() => useScanFeedback())
      const testItem = { itemName: 'Test Item', itemImageUrl: null }

      act(() => {
        result.current.triggerFeedback(testItem)
      })

      expect(result.current.feedbackItem).toEqual(testItem)
      expect(result.current.isVisible).toBe(true)
    })

    it('triggers haptic vibration', () => {
      const { result } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerFeedback({ itemName: 'Test' })
      })

      expect(navigator.vibrate).toHaveBeenCalledWith(50)
    })
  })

  describe('animation timing', () => {
    it('starts exit animation at 800ms', () => {
      const { result } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerFeedback({ itemName: 'Test' })
      })

      expect(result.current.isExiting).toBe(false)

      // Advance to just before exit animation starts
      act(() => {
        vi.advanceTimersByTime(799)
      })
      expect(result.current.isExiting).toBe(false)

      // Advance to exit animation start
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.isExiting).toBe(true)
      expect(result.current.isVisible).toBe(true) // Still visible during exit animation
    })

    it('hides overlay at 1000ms', () => {
      const { result } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerFeedback({ itemName: 'Test' })
      })

      // Advance to just before hide
      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(result.current.isVisible).toBe(true)

      // Advance to hide time
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.isVisible).toBe(false)
      expect(result.current.feedbackItem).toBeNull()
      expect(result.current.isExiting).toBe(false)
    })
  })

  describe('rapid scanning', () => {
    it('replaces current feedback when triggered again', () => {
      const { result } = renderHook(() => useScanFeedback())
      const item1 = { itemName: 'Item 1' }
      const item2 = { itemName: 'Item 2' }

      // Trigger first item
      act(() => {
        result.current.triggerFeedback(item1)
      })
      expect(result.current.feedbackItem).toEqual(item1)

      // Advance partway through
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Trigger second item (replaces first)
      act(() => {
        result.current.triggerFeedback(item2)
      })
      expect(result.current.feedbackItem).toEqual(item2)
      expect(result.current.isExiting).toBe(false) // Reset exit state

      // Advance full duration from second trigger
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(result.current.isVisible).toBe(false)
    })

    it('resets exit animation when triggered during exit phase', () => {
      const { result } = renderHook(() => useScanFeedback())

      // Trigger and advance to exit phase
      act(() => {
        result.current.triggerFeedback({ itemName: 'Item 1' })
      })
      act(() => {
        vi.advanceTimersByTime(850) // Past exit start (800ms)
      })
      expect(result.current.isExiting).toBe(true)

      // Trigger new item
      act(() => {
        result.current.triggerFeedback({ itemName: 'Item 2' })
      })
      expect(result.current.isExiting).toBe(false) // Reset
    })
  })

  describe('cleanup', () => {
    it('clears timeouts on unmount', () => {
      const { result, unmount } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerFeedback({ itemName: 'Test' })
      })

      // Unmount before timers complete
      unmount()

      // Advance timers - should not throw or cause issues
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      // If cleanup didn't work, we'd see state updates after unmount warnings
    })
  })

  describe('graceful degradation', () => {
    it('handles missing vibrate API gracefully', () => {
      // Remove vibrate property entirely
      const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
      // @ts-expect-error - deleting for test
      delete navigator.vibrate

      const { result } = renderHook(() => useScanFeedback())

      // Should not throw
      expect(() => {
        act(() => {
          result.current.triggerFeedback({ itemName: 'Test' })
        })
      }).not.toThrow()

      expect(result.current.isVisible).toBe(true)

      // Restore
      if (descriptor) {
        Object.defineProperty(navigator, 'vibrate', descriptor)
      }
    })
  })

  describe('triggerDuplicateAlert', () => {
    it('does not show visual overlay', () => {
      const { result } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerDuplicateAlert()
      })

      // Duplicate alert is audio-only, no visual feedback
      expect(result.current.feedbackItem).toBeNull()
      expect(result.current.isVisible).toBe(false)
      expect(result.current.isExiting).toBe(false)
    })

    it('does not trigger haptic vibration', () => {
      const { result } = renderHook(() => useScanFeedback())

      act(() => {
        result.current.triggerDuplicateAlert()
      })

      // Duplicate alert should not vibrate
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })

    it('does not throw when called multiple times', () => {
      const { result } = renderHook(() => useScanFeedback())

      expect(() => {
        act(() => {
          result.current.triggerDuplicateAlert()
          result.current.triggerDuplicateAlert()
          result.current.triggerDuplicateAlert()
        })
      }).not.toThrow()
    })
  })
})
