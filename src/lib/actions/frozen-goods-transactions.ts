'use server'

import { FG_DOMAIN } from './_shared/item-queries'
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

export async function getFgEmployeeTransactionsWithItems(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionWithItem[]>> {
  return getEmployeeTransactionsWithItemsImpl(FG_DOMAIN, userId, options)
}

export async function getFgEmployeeTransactionsWithItemsPaginated(
  userId: string,
  options?: GetEmployeeTransactionsOptions
): Promise<ActionResult<EmployeeTransactionsPaginatedResult>> {
  return getEmployeeTransactionsWithItemsPaginatedImpl(FG_DOMAIN, userId, options)
}

export async function getFgTransactionsWithDetailsPaginated(
  filters?: AdminTransactionFilters
): Promise<ActionResult<PaginatedResult<TransactionWithDetails>>> {
  return getTransactionsWithDetailsPaginatedImpl(FG_DOMAIN, filters)
}
