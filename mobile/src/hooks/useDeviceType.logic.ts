import { TABLET_BREAKPOINT } from '@/lib/constants'

export type DeviceType = 'phone' | 'tablet'

/**
 * Pure function to determine device type from screen width.
 * Separated from the hook to allow testing without react-native import.
 */
export function getDeviceType(width: number): DeviceType {
  return width >= TABLET_BREAKPOINT ? 'tablet' : 'phone'
}
