'use server'

import { FG_DOMAIN } from './_shared/item-queries'
import {
  getItemsImpl,
  getItemsPaginatedImpl,
  getItemByIdImpl,
  getItemBySkuImpl,
  getItemByBarcodeImpl,
  getItemByCodeImpl,
  searchItemsImpl,
  getRecentItemsImpl,
  createItemImpl,
  updateItemImpl,
  archiveItemImpl,
  restoreItemImpl,
  type ItemFilters,
  type PaginatedItemFilters,
} from './_shared/item-queries'
import type { Item, ItemInsert, ItemUpdate } from '@/lib/supabase/types'
import type { ActionResult, PaginatedResult } from '@/lib/types/action-result'

export async function getFgItems(filters?: ItemFilters): Promise<ActionResult<Item[]>> {
  return getItemsImpl(FG_DOMAIN, filters)
}

export async function getFgItemsPaginated(filters?: PaginatedItemFilters): Promise<ActionResult<PaginatedResult<Item>>> {
  return getItemsPaginatedImpl(FG_DOMAIN, filters)
}

export async function getFgItemById(id: string): Promise<ActionResult<Item>> {
  return getItemByIdImpl(FG_DOMAIN, id)
}

export async function getFgItemBySku(sku: string): Promise<ActionResult<Item>> {
  return getItemBySkuImpl(FG_DOMAIN, sku)
}

export async function getFgItemByBarcode(barcode: string): Promise<ActionResult<Item>> {
  return getItemByBarcodeImpl(FG_DOMAIN, barcode)
}

export async function getFgItemByCode(code: string): Promise<ActionResult<Item>> {
  return getItemByCodeImpl(FG_DOMAIN, code)
}

export async function searchFgItems(query: string, categoryId?: string): Promise<ActionResult<Item[]>> {
  return searchItemsImpl(FG_DOMAIN, query, categoryId)
}

export async function getRecentFgItems(limit: number = 4): Promise<ActionResult<Item[]>> {
  return getRecentItemsImpl(FG_DOMAIN, limit)
}

export async function createFgItem(itemData: ItemInsert): Promise<ActionResult<Item>> {
  return createItemImpl(FG_DOMAIN, itemData)
}

export async function updateFgItem(id: string, itemData: ItemUpdate, expectedVersion?: number): Promise<ActionResult<Item>> {
  return updateItemImpl(FG_DOMAIN, id, itemData, expectedVersion)
}

export async function archiveFgItem(id: string): Promise<ActionResult<Item>> {
  return archiveItemImpl(FG_DOMAIN, id)
}

export async function restoreFgItem(id: string): Promise<ActionResult<Item>> {
  return restoreItemImpl(FG_DOMAIN, id)
}
