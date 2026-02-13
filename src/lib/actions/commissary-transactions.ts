'use server'

import { CM_DOMAIN } from './_shared/item-queries'
import {
  getEmployeeTransactionsWithItemsImpl,
  getEmployeeTransactionsWithItemsPaginatedImpl,
  getTransactionsWithDetailsPaginatedImpl,
  type EmployeeTransactionWithItem,
  type GetEmployeeTransactionsOptions,
  type EmployeeTransactionsPaginatedResult,
  type TransactionWithDetails,
  type AdminTransactionFilters,
} from './_shared/transaction-queries'
import type { ActionResult, PaginatedResult } from '@/lib/types/action-result'

export type { EmployeeTransactionWithItem, GetEmployeeTransactionsOptions, EmployeeTransactionsPaginatedResult, TransactionWithDetails, AdminTransactionFilters }

export async function getCmEmployeeTransactionsWithItems(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionWithItem[]>> {
  return getEmployeeTransactionsWithItemsImpl(CM_DOMAIN, userId, options)
}

export async function getCmEmployeeTransactionsWithItemsPaginated(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionsPaginatedResult>> {
  return getEmployeeTransactionsWithItemsPaginatedImpl(CM_DOMAIN, userId, options)
}

export async function getCmTransactionsWithDetailsPaginated(
  filters?: AdminTransactionFilters
): Promise<ActionResult<PaginatedResult<TransactionWithDetails>>> {
  return getTransactionsWithDetailsPaginatedImpl(CM_DOMAIN, filters)
}
