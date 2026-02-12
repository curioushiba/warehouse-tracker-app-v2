'use server'

import { FG_DOMAIN } from './_shared/item-queries'
import {
  getEmployeeTransactionsWithItemsImpl,
  getEmployeeTransactionsWithItemsPaginatedImpl,
  type EmployeeTransactionWithItem,
  type GetEmployeeTransactionsOptions,
  type EmployeeTransactionsPaginatedResult,
} from './_shared/transaction-queries'
import type { ActionResult } from '@/lib/types/action-result'

export type { EmployeeTransactionWithItem, GetEmployeeTransactionsOptions, EmployeeTransactionsPaginatedResult }

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
