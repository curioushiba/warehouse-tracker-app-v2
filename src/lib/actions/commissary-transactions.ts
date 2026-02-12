'use server'

import { CM_DOMAIN } from './_shared/item-queries'
import {
  getEmployeeTransactionsWithItemsImpl,
  getEmployeeTransactionsWithItemsPaginatedImpl,
  type EmployeeTransactionWithItem,
  type GetEmployeeTransactionsOptions,
  type EmployeeTransactionsPaginatedResult,
} from './_shared/transaction-queries'
import type { ActionResult } from '@/lib/types/action-result'

export type { EmployeeTransactionWithItem, GetEmployeeTransactionsOptions, EmployeeTransactionsPaginatedResult }

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
