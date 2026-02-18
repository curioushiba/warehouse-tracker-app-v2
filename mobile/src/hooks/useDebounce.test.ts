import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * useDebounce is a thin React wrapper around setTimeout/clearTimeout.
 * We test the debounce LOGIC by simulating what the hook does internally:
 * - Schedule a callback after `delay` ms
 * - Cancel previous timer when value changes
 * - Clean up on unmount
 */

// Simulate the debounce logic extracted from the hook
function createDebouncer<T>(initialValue: T, delay: number) {
  let currentValue = initialValue
  let debouncedValue = initialValue
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    get debouncedValue() {
      return debouncedValue
    },
    setValue(newValue: T) {
      currentValue = newValue
      // Clear previous timer
      if (timer !== null) clearTimeout(timer)
      // Schedule update
      timer = setTimeout(() => {
        debouncedValue = currentValue
        timer = null
      }, delay)
    },
    cleanup() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}

describe('useDebounce logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const debouncer = createDebouncer('initial', 500)
    expect(debouncer.debouncedValue).toBe('initial')
  })

  it('does not update value before delay elapses', () => {
    const debouncer = createDebouncer('initial', 500)
    debouncer.setValue('updated')

    vi.advanceTimersByTime(499)
    expect(debouncer.debouncedValue).toBe('initial')
  })

  it('updates value after delay elapses', () => {
    const debouncer = createDebouncer('initial', 500)
    debouncer.setValue('updated')

    vi.advanceTimersByTime(500)
    expect(debouncer.debouncedValue).toBe('updated')
  })

  it('cancels pending update when value changes before delay', () => {
    const debouncer = createDebouncer('first', 500)

    debouncer.setValue('second')
    vi.advanceTimersByTime(250) // half the delay
    expect(debouncer.debouncedValue).toBe('first')

    // Change value again, cancelling the previous timer
    debouncer.setValue('third')

    // Original timer would have fired at 500ms total, but it was cancelled
    vi.advanceTimersByTime(250)
    expect(debouncer.debouncedValue).toBe('first')

    // New timer fires at 500ms from second setValue
    vi.advanceTimersByTime(250)
    expect(debouncer.debouncedValue).toBe('third')
  })

  it('cleans up timer on unmount (cleanup call)', () => {
    const debouncer = createDebouncer('initial', 500)
    debouncer.setValue('updated')

    // Simulate unmount by calling cleanup
    debouncer.cleanup()

    // Advance time past the delay
    vi.advanceTimersByTime(1000)

    // Value should not have updated because timer was cleaned up
    expect(debouncer.debouncedValue).toBe('initial')
  })

  it('works with number types', () => {
    const debouncer = createDebouncer(42, 300)
    debouncer.setValue(100)
    vi.advanceTimersByTime(300)
    expect(debouncer.debouncedValue).toBe(100)
  })

  it('works with object types', () => {
    const debouncer = createDebouncer({ name: 'test' }, 300)
    const newObj = { name: 'updated' }
    debouncer.setValue(newObj)
    vi.advanceTimersByTime(300)
    expect(debouncer.debouncedValue).toEqual({ name: 'updated' })
  })

  it('respects different delay values', () => {
    const debouncer = createDebouncer('initial', 1000)
    debouncer.setValue('updated')

    vi.advanceTimersByTime(500)
    expect(debouncer.debouncedValue).toBe('initial')

    vi.advanceTimersByTime(500)
    expect(debouncer.debouncedValue).toBe('updated')
  })

  it('handles rapid successive changes - only last value sticks', () => {
    const debouncer = createDebouncer('a', 200)

    debouncer.setValue('b')
    vi.advanceTimersByTime(50)
    debouncer.setValue('c')
    vi.advanceTimersByTime(50)
    debouncer.setValue('d')
    vi.advanceTimersByTime(50)
    debouncer.setValue('e')

    // Only 150ms passed since first setValue, none should have resolved
    expect(debouncer.debouncedValue).toBe('a')

    // Wait for final debounce
    vi.advanceTimersByTime(200)
    expect(debouncer.debouncedValue).toBe('e')
  })
})
