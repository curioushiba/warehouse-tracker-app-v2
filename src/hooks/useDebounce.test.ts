import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('returns debounced value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change the value
    rerender({ value: 'updated', delay: 500 })

    // Value should still be initial before delay
    expect(result.current).toBe('initial')

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now it should be updated
    expect(result.current).toBe('updated')
  })

  it('cancels pending update on value change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    )

    // Change value
    rerender({ value: 'second', delay: 500 })

    // Wait 250ms (half the delay)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Change value again before first timeout
    rerender({ value: 'third', delay: 500 })

    // Wait another 250ms (first timeout would have fired if not cancelled)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Should still be 'first' because second was cancelled
    expect(result.current).toBe('first')

    // Wait remaining 250ms for third to resolve
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Now should be 'third'
    expect(result.current).toBe('third')
  })

  it('cleans up timeout on unmount', () => {
    const { result, unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change value to trigger a pending timeout
    rerender({ value: 'updated', delay: 500 })

    // Unmount before timeout fires
    unmount()

    // Advance timers - this should not cause any errors
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // If cleanup worked properly, no state update error will occur
    // The value before unmount was still 'initial'
    expect(result.current).toBe('initial')
  })

  it('works with different types', () => {
    // Test with number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 300 } }
    )

    rerenderNumber({ value: 100, delay: 300 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(numberResult.current).toBe(100)

    // Test with object
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { name: 'test' }, delay: 300 } }
    )

    const newObj = { name: 'updated' }
    rerenderObject({ value: newObj, delay: 300 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(objectResult.current).toEqual({ name: 'updated' })
  })

  it('respects different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )

    rerender({ value: 'updated', delay: 1000 })

    // Wait 500ms - should not be updated yet
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    // Wait another 500ms - now should be updated
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })
})
