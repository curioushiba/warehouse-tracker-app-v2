import { describe, it, expect } from 'vitest'
import {
  DECIMAL_PLACES,
  MIN_QUANTITY,
  MAX_QUANTITY,
  roundToDecimalPlaces,
  clampQuantity,
} from './constants'

describe('constants', () => {
  it('exports DECIMAL_PLACES as 3', () => {
    expect(DECIMAL_PLACES).toBe(3)
  })

  it('exports MIN_QUANTITY as 0.001', () => {
    expect(MIN_QUANTITY).toBe(0.001)
  })

  it('exports MAX_QUANTITY as 9999.999', () => {
    expect(MAX_QUANTITY).toBe(9999.999)
  })
})

describe('roundToDecimalPlaces', () => {
  it('rounds 1.2345 to 1.235', () => {
    expect(roundToDecimalPlaces(1.2345)).toBe(1.235)
  })

  it('rounds 0.0001 to 0', () => {
    expect(roundToDecimalPlaces(0.0001)).toBe(0)
  })

  it('keeps 1.5 as 1.5', () => {
    expect(roundToDecimalPlaces(1.5)).toBe(1.5)
  })

  it('rounds 9999.9999 to 10000', () => {
    expect(roundToDecimalPlaces(9999.9999)).toBe(10000)
  })

  it('handles 0', () => {
    expect(roundToDecimalPlaces(0)).toBe(0)
  })

  it('handles negative numbers', () => {
    expect(roundToDecimalPlaces(-1.2345)).toBe(-1.234)
  })
})

describe('clampQuantity', () => {
  it('clamps -1 to MIN_QUANTITY', () => {
    expect(clampQuantity(-1)).toBe(MIN_QUANTITY)
  })

  it('clamps 0 to MIN_QUANTITY', () => {
    expect(clampQuantity(0)).toBe(MIN_QUANTITY)
  })

  it('clamps 10000 to MAX_QUANTITY', () => {
    expect(clampQuantity(10000)).toBe(MAX_QUANTITY)
  })

  it('keeps 1.5 as 1.5', () => {
    expect(clampQuantity(1.5)).toBe(1.5)
  })

  it('clamps and rounds 1.23456 to 1.235', () => {
    expect(clampQuantity(1.23456)).toBe(1.235)
  })
})
