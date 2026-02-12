'use server'

import { CM_DOMAIN } from './_shared/item-queries'
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

export async function getCmItems(filters?: ItemFilters): Promise<ActionResult<Item[]>> {
  return getItemsImpl(CM_DOMAIN, filters)
}

export async function getCmItemsPaginated(filters?: PaginatedItemFilters): Promise<ActionResult<PaginatedResult<Item>>> {
  return getItemsPaginatedImpl(CM_DOMAIN, filters)
}

export async function getCmItemById(id: string): Promise<ActionResult<Item>> {
  return getItemByIdImpl(CM_DOMAIN, id)
}

export async function getCmItemBySku(sku: string): Promise<ActionResult<Item>> {
  return getItemBySkuImpl(CM_DOMAIN, sku)
}

export async function getCmItemByBarcode(barcode: string): Promise<ActionResult<Item>> {
  return getItemByBarcodeImpl(CM_DOMAIN, barcode)
}

export async function getCmItemByCode(code: string): Promise<ActionResult<Item>> {
  return getItemByCodeImpl(CM_DOMAIN, code)
}

export async function searchCmItems(query: string, categoryId?: string): Promise<ActionResult<Item[]>> {
  return searchItemsImpl(CM_DOMAIN, query, categoryId)
}

export async function getRecentCmItems(limit: number = 4): Promise<ActionResult<Item[]>> {
  return getRecentItemsImpl(CM_DOMAIN, limit)
}

export async function createCmItem(itemData: ItemInsert): Promise<ActionResult<Item>> {
  return createItemImpl(CM_DOMAIN, itemData)
}

export async function updateCmItem(id: string, itemData: ItemUpdate, expectedVersion?: number): Promise<ActionResult<Item>> {
  return updateItemImpl(CM_DOMAIN, id, itemData, expectedVersion)
}

export async function archiveCmItem(id: string): Promise<ActionResult<Item>> {
  return archiveItemImpl(CM_DOMAIN, id)
}

export async function restoreCmItem(id: string): Promise<ActionResult<Item>> {
  return restoreItemImpl(CM_DOMAIN, id)
}
