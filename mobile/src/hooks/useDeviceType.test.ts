import { describe, it, expect } from 'vitest'
import { TABLET_BREAKPOINT } from '@/lib/constants'
import { getDeviceType, type DeviceType } from './useDeviceType.logic'

/**
 * useDeviceType is a thin React wrapper around useWindowDimensions.
 * We test the pure function getDeviceType() that computes the device type
 * from a width value.
 */
describe('getDeviceType', () => {
  it('returns "phone" for width below TABLET_BREAKPOINT', () => {
    expect(getDeviceType(360)).toBe('phone')
    expect(getDeviceType(414)).toBe('phone')
    expect(getDeviceType(599)).toBe('phone')
  })

  it('returns "tablet" for width at TABLET_BREAKPOINT', () => {
    expect(getDeviceType(TABLET_BREAKPOINT)).toBe('tablet')
    expect(getDeviceType(600)).toBe('tablet')
  })

  it('returns "tablet" for width above TABLET_BREAKPOINT', () => {
    expect(getDeviceType(768)).toBe('tablet')
    expect(getDeviceType(1024)).toBe('tablet')
    expect(getDeviceType(1366)).toBe('tablet')
  })

  it('returns "phone" for width of 0', () => {
    expect(getDeviceType(0)).toBe('phone')
  })

  it('returns "phone" for width of 1', () => {
    expect(getDeviceType(1)).toBe('phone')
  })

  it('uses TABLET_BREAKPOINT constant of 600', () => {
    expect(TABLET_BREAKPOINT).toBe(600)
    // Just below threshold
    expect(getDeviceType(599)).toBe('phone')
    // Exactly at threshold
    expect(getDeviceType(600)).toBe('tablet')
  })

  it('type is correctly typed as DeviceType', () => {
    const result: DeviceType = getDeviceType(500)
    expect(['phone', 'tablet']).toContain(result)
  })
})
