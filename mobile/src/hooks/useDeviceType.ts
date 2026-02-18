import { useWindowDimensions } from 'react-native'
import { getDeviceType, type DeviceType } from './useDeviceType.logic'

export type { DeviceType }
export { getDeviceType }

/**
 * Returns whether the device is a phone or tablet based on screen width.
 * Uses react-native's useWindowDimensions() so it updates on rotation/resize.
 *
 * TABLET_BREAKPOINT = 600dp (consistent with Material Design guidelines).
 */
export function useDeviceType(): DeviceType {
  const { width } = useWindowDimensions()
  return getDeviceType(width)
}
