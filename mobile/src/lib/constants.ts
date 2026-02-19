// Quantity validation constants
export const DECIMAL_PLACES = 3
export const MIN_QUANTITY = 0.001
export const MAX_QUANTITY = 9999.999

// Sync constants
export const MAX_RETRY_COUNT = 3
export const SYNC_INTERVAL_MS = 30_000 // 30 seconds
export const PING_INTERVAL_MS = 60_000 // 60 seconds
export const PING_TIMEOUT_MS = 5_000 // 5 seconds
export const TRANSACTION_TIMEOUT_MS = 60_000 // 60 seconds per transaction
export const BACKGROUND_FETCH_INTERVAL = 900 // 15 minutes (Android minimum)

// UI constants
export const TABLET_BREAKPOINT = 600 // dp
export const SCAN_DEBOUNCE_MS = 300
export const SEARCH_DEBOUNCE_MS = 300
export const FEEDBACK_DURATION_MS = 600
export const FEEDBACK_EXIT_MS = 400

// Barcode prefixes
export const PT_CODE_PREFIX = 'PT-'
export const HRG_CODE_PREFIX = 'HRG-'
export const TEMP_SKU_PREFIX = 'TEMP-'

/** Round to DECIMAL_PLACES (3) */
export function roundToDecimalPlaces(value: number): number {
  const factor = Math.pow(10, DECIMAL_PLACES)
  return Math.round(value * factor) / factor
}

/** Clamp and round a quantity to valid range */
export function clampQuantity(value: number): number {
  return roundToDecimalPlaces(Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, value)))
}
