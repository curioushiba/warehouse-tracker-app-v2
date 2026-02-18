import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
  getStockLevel,
  escapeLikePattern,
} from './utils'

describe('formatCurrency', () => {
  it('formats with USD currency', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('formats with no currency as plain decimal', () => {
    const result = formatCurrency(1234.56)
    expect(result).toBe('1,234.56')
  })

  it('formats 0 with no currency', () => {
    expect(formatCurrency(0)).toBe('0.00')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-06-15T12:00:00Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2024/)
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-01-01'))
    expect(result).toMatch(/2024/)
  })
})

describe('formatDateTime', () => {
  it('includes time components', () => {
    const result = formatDateTime('2024-06-15T14:30:00Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jun/)
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for < 60 seconds', () => {
    expect(formatRelativeTime('2024-06-15T11:59:30Z')).toBe('just now')
  })

  it('returns minutes ago', () => {
    expect(formatRelativeTime('2024-06-15T11:55:00Z')).toBe('5 minutes ago')
  })

  it('returns "1 minute ago" (singular)', () => {
    expect(formatRelativeTime('2024-06-15T11:59:00Z')).toBe('1 minute ago')
  })

  it('returns hours ago', () => {
    expect(formatRelativeTime('2024-06-15T09:00:00Z')).toBe('3 hours ago')
  })

  it('returns "1 hour ago" (singular)', () => {
    expect(formatRelativeTime('2024-06-15T11:00:00Z')).toBe('1 hour ago')
  })

  it('returns days ago', () => {
    expect(formatRelativeTime('2024-06-13T12:00:00Z')).toBe('2 days ago')
  })

  it('returns formatted date for > 7 days', () => {
    const result = formatRelativeTime('2024-06-01T12:00:00Z')
    expect(result).toMatch(/Jun/)
  })
})

describe('truncate', () => {
  it('returns text unchanged if shorter than maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('truncates with ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...')
  })

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})

describe('getStockLevel', () => {
  it('returns "critical" when stock is 0', () => {
    expect(getStockLevel(0, 10, 100)).toBe('critical')
  })

  it('returns "critical" when stock is negative', () => {
    expect(getStockLevel(-5, 10, 100)).toBe('critical')
  })

  it('returns "low" when stock equals minStock', () => {
    expect(getStockLevel(10, 10, 100)).toBe('low')
  })

  it('returns "low" when stock < minStock', () => {
    expect(getStockLevel(5, 10, 100)).toBe('low')
  })

  it('returns "normal" when between min and max', () => {
    expect(getStockLevel(50, 10, 100)).toBe('normal')
  })

  it('returns "overstocked" when stock >= maxStock', () => {
    expect(getStockLevel(100, 10, 100)).toBe('overstocked')
  })

  it('returns "overstocked" when stock exceeds maxStock', () => {
    expect(getStockLevel(150, 10, 100)).toBe('overstocked')
  })
})

describe('escapeLikePattern', () => {
  it('escapes % character', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
  })

  it('escapes _ character', () => {
    expect(escapeLikePattern('foo_bar')).toBe('foo\\_bar')
  })

  it('escapes \\ character', () => {
    expect(escapeLikePattern('foo\\bar')).toBe('foo\\\\bar')
  })

  it('passes through normal text', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world')
  })

  it('escapes multiple special characters', () => {
    expect(escapeLikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })
})
