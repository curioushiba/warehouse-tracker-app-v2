/**
 * Unified ActionResult type for all server actions
 * Uses a discriminated union for proper TypeScript narrowing
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Paginated result wrapper for list queries
 */
export interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

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

/**
 * Helper to create a paginated success result
 */
export function paginatedSuccess<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): ActionResult<PaginatedResult<T>> {
  return {
    success: true,
    data: {
      data,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  }
}
