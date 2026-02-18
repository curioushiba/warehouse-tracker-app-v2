import { useState, useEffect } from 'react'

/**
 * Debounces a value by the specified delay.
 * Returns the debounced value which updates only after the delay has passed
 * since the last change to the input value.
 *
 * Direct port from web - identical React hook, no web APIs.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
