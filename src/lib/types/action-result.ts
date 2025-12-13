/**
 * Unified ActionResult type for all server actions
 * Uses a discriminated union for proper TypeScript narrowing
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Helper to create a success result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Helper to create a failure result
 */
export function failure<T>(error: string): ActionResult<T> {
  return { success: false, error }
}
