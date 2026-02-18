import type { TransactionType, ItemUpdate, ItemInsert } from '@/lib/supabase/types'

// Domain routing for sync queue
export type TransactionDomain = 'inventory' | 'frozen-goods' | 'commissary'

// Offline transaction queue item
export interface QueuedTransaction {
  id: string
  transactionType: TransactionType
  itemId: string
  quantity: number
  notes?: string
  sourceLocationId?: string
  destinationLocationId?: string
  deviceTimestamp: string
  idempotencyKey: string
  userId: string
  retryCount: number
  lastError?: string
  createdAt: string
  domain?: TransactionDomain
}

// Cached item for offline access
export interface CachedItem {
  id: string
  sku: string
  name: string
  description?: string
  categoryId?: string
  locationId?: string
  unit: string
  currentStock: number
  minStock: number
  maxStock?: number
  barcode?: string
  unitPrice?: number
  imageUrl?: string
  version: number
  isArchived?: boolean
  isOfflineCreated?: boolean
  updatedAt: string
}

// Shared status type for all item operations
export type ItemOperationStatus = 'pending' | 'syncing' | 'failed'

export interface QueuedItemEdit {
  id: string
  itemId: string
  changes: Partial<ItemUpdate>
  expectedVersion: number
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

export interface QueuedItemCreate {
  id: string
  tempSku: string
  itemData: Partial<ItemInsert>
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

export interface QueuedItemArchive {
  id: string
  itemId: string
  action: 'archive' | 'restore'
  expectedVersion: number
  idempotencyKey: string
  userId: string
  status: ItemOperationStatus
  retryCount: number
  lastError?: string
  createdAt: string
  deviceTimestamp: string
}

// Pending image upload (React Native: file URI instead of Blob)
export type PendingImageStatus = 'pending' | 'uploading' | 'failed' | 'waiting_for_item'

export interface PendingImage {
  id: string
  itemId: string
  isOfflineItem: boolean
  fileUri: string
  filename: string
  mimeType: string
  createdAt: string
  status: PendingImageStatus
  retryCount: number
  lastError?: string
}

// Cached category for offline access
export interface CachedCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  createdAt: string
}

// Pending operation types for UI display
export type PendingOperationType = 'offline' | 'pending_edit' | 'pending_archive' | 'pending_restore'

export interface PendingOperationInfo {
  itemId: string
  types: Set<PendingOperationType>
}
