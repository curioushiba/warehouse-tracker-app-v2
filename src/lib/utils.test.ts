import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, getStockLevel } from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
    })
  })

  describe('formatCurrency', () => {
    it('formats numbers as plain decimal when no currency', () => {
      const result = formatCurrency(1234.56)
      expect(result).toBe('1,234.56')
    })

    it('formats numbers with currency symbol when currency is provided', () => {
      const result = formatCurrency(1234.56, 'USD')
      expect(result).toBe('$1,234.56')
    })
  })

  describe('getStockLevel', () => {
    it('returns critical when stock is 0', () => {
      expect(getStockLevel(0, 10, 100)).toBe('critical')
    })

    it('returns low when stock is below minimum', () => {
      expect(getStockLevel(5, 10, 100)).toBe('low')
    })

    it('returns normal when stock is adequate', () => {
      expect(getStockLevel(50, 10, 100)).toBe('normal')
    })

    it('returns overstocked when max is exceeded', () => {
      expect(getStockLevel(150, 10, 100)).toBe('overstocked')
    })
  })
})
