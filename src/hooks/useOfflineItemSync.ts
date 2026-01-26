'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  // Create queue
  getQueuedItemCreates,
  getItemCreateQueueCount,
  removeItemCreateFromQueue,
  addItemCreateToQueue,
  updateItemCreateStatus,
  updateItemCreateData,
  getQueuedItemCreateById,
  // Edit queue
  getQueuedItemEdits,
  getItemEditQueueCount,
  removeItemEditFromQueue,
  addItemEditToQueue,
  updateItemEditStatus,
  // Archive queue
  getQueuedItemArchives,
  getItemArchiveQueueCount,
  removeItemArchiveFromQueue,
  addItemArchiveToQueue,
  updateItemArchiveStatus,
  // Images
  getPendingImages,
  getPendingImageCount,
  removePendingImage,
  updatePendingImageStatus,
  addPendingImage,
  transitionWaitingImagesToReady,
  // Cache
  updateCachedItem,
  cacheItem,
  // Types
  type QueuedItemCreate,
  type QueuedItemEdit,
  type QueuedItemArchive,
  type PendingImage,
  type CachedItem,
} from '@/lib/offline/db'
import type { ItemUpdate, ItemInsert } from '@/lib/supabase/types'

const MAX_RETRIES = 3
const SYNC_INTERVAL = 30000 // 30 seconds

// Extract error message from unknown error
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

// Helper to log failed sync to server
async function logSyncError(operationType: string, data: Record<string, unknown>, errorMessage: string): Promise<void> {
  try {
    await fetch('/api/sync-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionData: { type: operationType, ...data },
        errorMessage,
      }),
    })
  } catch {
    // Silently fail - sync error logging is best-effort
  }
}

interface OfflineItemSyncState {
  createQueueCount: number
  editQueueCount: number
  archiveQueueCount: number
  imageQueueCount: number
  isSyncing: boolean
  lastSyncTime: string | null
  lastError: string | null
}

interface CreateSyncResult {
  success: boolean
  item?: Record<string, unknown>
  wasIdempotent?: boolean
  message?: string
  permanent?: boolean
}

interface EditSyncResult {
  conflict?: boolean
  serverVersion?: number
  serverValues?: Record<string, unknown>
  item?: Record<string, unknown>
  message?: string
}

interface ArchiveSyncResult {
  success?: boolean
  conflict?: boolean
  serverVersion?: number
  serverIsArchived?: boolean
  item?: Record<string, unknown>
  wasIdempotent?: boolean
  message?: string
  permanent?: boolean
}

export function useOfflineItemSync() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus()
  const { user, isAuthenticated } = useAuthContext()
  const [state, setState] = useState<OfflineItemSyncState>({
    createQueueCount: 0,
    editQueueCount: 0,
    archiveQueueCount: 0,
    imageQueueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  })

  const syncInProgressRef = useRef(false)
  const initialSyncAttemptedRef = useRef(false)
  const pendingImageBlobUrlsRef = useRef<Map<string, string>>(new Map())

  // Load all queue counts on mount
  useEffect(() => {
    const loadQueueCounts = async () => {
      try {
        const [createCount, editCount, archiveCount, imageCount] = await Promise.all([
          getItemCreateQueueCount(),
          getItemEditQueueCount(),
          getItemArchiveQueueCount(),
          getPendingImageCount(),
        ])
        setState(prev => ({
          ...prev,
          createQueueCount: createCount,
          editQueueCount: editCount,
          archiveQueueCount: archiveCount,
          imageQueueCount: imageCount,
        }))
      } catch (error) {
        console.error('Error loading queue counts:', error)
      }
    }
    loadQueueCounts()
  }, [])

  // Process a single item create
  const processItemCreate = useCallback(async (create: QueuedItemCreate): Promise<boolean> => {
    try {
      await updateItemCreateStatus(create.id, 'syncing')

      const response = await fetch('/api/items/create-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: create.id,
          itemData: create.itemData,
          idempotencyKey: create.idempotencyKey,
          deviceTimestamp: create.deviceTimestamp,
        }),
      })

      const result: CreateSyncResult = await response.json()

      if (!response.ok) {
        if (result.permanent) {
          // Permanent error - don't retry
          await logSyncError('item_create', create as unknown as Record<string, unknown>, result.message || 'Unknown error')
          await removeItemCreateFromQueue(create.id)
          return false
        }
        throw new Error(result.message || 'Failed to create item')
      }

      // Success - transition waiting images and remove from queue
      await transitionWaitingImagesToReady(create.id)
      await removeItemCreateFromQueue(create.id)

      // Update cache with server-assigned SKU
      if (result.item) {
        await updateCachedItem(create.id, {
          sku: (result.item as { sku: string }).sku,
          isOfflineCreated: false,
        })
      }

      return true
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      if (create.retryCount >= MAX_RETRIES - 1) {
        await logSyncError('item_create', create as unknown as Record<string, unknown>, errorMessage)
        await removeItemCreateFromQueue(create.id)
      } else {
        await updateItemCreateStatus(create.id, 'failed', errorMessage)
      }

      return false
    }
  }, [])

  // Process a single item edit
  const processItemEdit = useCallback(async (edit: QueuedItemEdit): Promise<boolean> => {
    try {
      await updateItemEditStatus(edit.id, 'syncing')

      const response = await fetch('/api/items/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: edit.itemId,
          changes: edit.changes,
          expectedVersion: edit.expectedVersion,
          idempotencyKey: edit.idempotencyKey,
        }),
      })

      const result: EditSyncResult = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit edit')
      }

      if (result.conflict) {
        // Last-write-wins: retry with new server version
        const retryResponse = await fetch('/api/items/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: edit.itemId,
            changes: edit.changes,
            expectedVersion: result.serverVersion,
            idempotencyKey: `${edit.idempotencyKey}-retry`,
          }),
        })

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          throw new Error(retryError.message || 'Failed after conflict resolution')
        }

        const retryResult: EditSyncResult = await retryResponse.json()
        if (retryResult.conflict) {
          throw new Error('Concurrent modification - will retry')
        }
      }

      await removeItemEditFromQueue(edit.id)
      return true
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      if (edit.retryCount >= MAX_RETRIES - 1) {
        await logSyncError('item_edit', edit as unknown as Record<string, unknown>, errorMessage)
        await removeItemEditFromQueue(edit.id)
      } else {
        await updateItemEditStatus(edit.id, 'failed', errorMessage)
      }

      return false
    }
  }, [])

  // Process a single item archive/restore
  const processItemArchive = useCallback(async (archive: QueuedItemArchive): Promise<boolean> => {
    try {
      await updateItemArchiveStatus(archive.id, 'syncing')

      const response = await fetch('/api/items/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: archive.itemId,
          action: archive.action,
          expectedVersion: archive.expectedVersion,
          idempotencyKey: archive.idempotencyKey,
          deviceTimestamp: archive.deviceTimestamp,
        }),
      })

      const result: ArchiveSyncResult = await response.json()

      if (!response.ok) {
        if (result.permanent) {
          await logSyncError('item_archive', archive as unknown as Record<string, unknown>, result.message || 'Unknown error')
          await removeItemArchiveFromQueue(archive.id)
          return false
        }
        throw new Error(result.message || 'Failed to archive/restore item')
      }

      if (result.conflict) {
        // Retry with new server version
        const retryResponse = await fetch('/api/items/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: archive.itemId,
            action: archive.action,
            expectedVersion: result.serverVersion,
            idempotencyKey: `${archive.idempotencyKey}-retry`,
            deviceTimestamp: archive.deviceTimestamp,
          }),
        })

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          throw new Error(retryError.message || 'Failed after conflict resolution')
        }

        const retryResult: ArchiveSyncResult = await retryResponse.json()
        if (retryResult.conflict) {
          throw new Error('Concurrent modification - will retry')
        }
      }

      await removeItemArchiveFromQueue(archive.id)
      return true
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      if (archive.retryCount >= MAX_RETRIES - 1) {
        await logSyncError('item_archive', archive as unknown as Record<string, unknown>, errorMessage)
        await removeItemArchiveFromQueue(archive.id)
      } else {
        await updateItemArchiveStatus(archive.id, 'failed', errorMessage)
      }

      return false
    }
  }, [])

  // Helper to revoke blob URL and remove from tracking
  const cleanupBlobUrl = useCallback((imageId: string) => {
    const blobUrl = pendingImageBlobUrlsRef.current.get(imageId)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      pendingImageBlobUrlsRef.current.delete(imageId)
    }
  }, [])

  // Process a single pending image
  const processPendingImage = useCallback(async (image: PendingImage): Promise<boolean> => {
    // Skip images waiting for their item to be created
    if (image.status === 'waiting_for_item') {
      return true // Not an error, just skip
    }

    try {
      await updatePendingImageStatus(image.id, 'uploading')

      const formData = new FormData()
      formData.append('file', image.blob, image.filename)
      formData.append('itemId', image.itemId)

      const response = await fetch('/api/items/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upload image')
      }

      await removePendingImage(image.id)
      cleanupBlobUrl(image.id)
      return true
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      if (image.retryCount >= MAX_RETRIES - 1) {
        await logSyncError('image_upload', { itemId: image.itemId, filename: image.filename }, errorMessage)
        await removePendingImage(image.id)
        cleanupBlobUrl(image.id)
      } else {
        await updatePendingImageStatus(image.id, 'failed', errorMessage)
      }

      return false
    }
  }, [cleanupBlobUrl])

  // Main sync queue function - processes all queues in correct order
  const syncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || !isAuthenticated) {
      return
    }

    syncInProgressRef.current = true
    setState(prev => ({ ...prev, isSyncing: true, lastError: null }))

    try {
      // Phase 1: Creates (must complete first so items exist)
      const creates = await getQueuedItemCreates()
      for (const create of creates) {
        if (!isOnline) break
        await processItemCreate(create)
      }

      // Phase 2: Edits (can reference newly created items)
      const edits = await getQueuedItemEdits()
      for (const edit of edits) {
        if (!isOnline) break
        await processItemEdit(edit)
      }

      // Phase 3: Archives (can archive created/edited items)
      const archives = await getQueuedItemArchives()
      for (const archive of archives) {
        if (!isOnline) break
        await processItemArchive(archive)
      }

      // Phase 4: Images (only for synced items - not waiting_for_item)
      const images = await getPendingImages()
      for (const image of images) {
        if (!isOnline) break
        await processPendingImage(image)
      }

      // Update counts
      const [createCount, editCount, archiveCount, imageCount] = await Promise.all([
        getItemCreateQueueCount(),
        getItemEditQueueCount(),
        getItemArchiveQueueCount(),
        getPendingImageCount(),
      ])

      setState(prev => ({
        ...prev,
        createQueueCount: createCount,
        editQueueCount: editCount,
        archiveQueueCount: archiveCount,
        imageQueueCount: imageCount,
        lastSyncTime: new Date().toISOString(),
        isSyncing: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Sync failed',
        isSyncing: false,
      }))
    } finally {
      syncInProgressRef.current = false
    }
  }, [isOnline, isAuthenticated, processItemCreate, processItemEdit, processItemArchive, processPendingImage])

  // Memoized total queue count to avoid recalculating in multiple places
  const totalQueueCount = useMemo(
    () => state.createQueueCount + state.editQueueCount + state.archiveQueueCount + state.imageQueueCount,
    [state.createQueueCount, state.editQueueCount, state.archiveQueueCount, state.imageQueueCount]
  )

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && isAuthenticated) {
      syncQueue()
      clearWasOffline()
    }
  }, [wasOffline, isOnline, isAuthenticated, syncQueue, clearWasOffline])

  // Initial sync on mount if there are pending items
  useEffect(() => {
    if (
      isAuthenticated &&
      isOnline &&
      !initialSyncAttemptedRef.current &&
      totalQueueCount > 0
    ) {
      initialSyncAttemptedRef.current = true
      if (!syncInProgressRef.current) {
        syncQueue()
      }
    }
  }, [isAuthenticated, isOnline, totalQueueCount, syncQueue])

  // Periodic sync
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return

    const interval = setInterval(() => {
      if (totalQueueCount > 0) {
        syncQueue()
      }
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [isOnline, isAuthenticated, totalQueueCount, syncQueue])

  // Queue a new item creation
  const queueItemCreate = useCallback(async (
    itemData: Partial<ItemInsert>,
    imageBlob?: Blob,
    imageFilename?: string
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const queuedCreate = await addItemCreateToQueue(itemData, user.id)

    // Add to local cache for optimistic UI
    const cachedItem: CachedItem = {
      id: queuedCreate.id,
      sku: queuedCreate.tempSku,
      name: (itemData.name as string) || 'New Item',
      description: itemData.description ?? undefined,
      categoryId: itemData.category_id ?? undefined,
      locationId: itemData.location_id ?? undefined,
      unit: itemData.unit || 'pcs',
      currentStock: itemData.current_stock ?? 0,
      minStock: itemData.min_stock ?? 0,
      maxStock: itemData.max_stock ?? undefined,
      barcode: itemData.barcode ?? undefined,
      unitPrice: itemData.unit_price ?? undefined,
      imageUrl: itemData.image_url ?? undefined,
      version: 0,
      isArchived: false,
      isOfflineCreated: true,
      updatedAt: new Date().toISOString(),
    }
    await cacheItem(cachedItem)

    // Queue image if provided - use pendingImage.id as key for blob URL tracking
    if (imageBlob && imageFilename) {
      const pendingImage = await addPendingImage(queuedCreate.id, imageBlob, imageFilename, true)
      const localUrl = URL.createObjectURL(imageBlob)
      pendingImageBlobUrlsRef.current.set(pendingImage.id, localUrl)
      await updateCachedItem(queuedCreate.id, { imageUrl: localUrl })
    }

    // Update count
    const count = await getItemCreateQueueCount()
    setState(prev => ({ ...prev, createQueueCount: count }))

    // Try to sync immediately if online
    if (isOnline) {
      syncQueue()
    }

    return { id: queuedCreate.id, tempSku: queuedCreate.tempSku }
  }, [user, isOnline, syncQueue])

  // Queue an item edit (handles editing offline-created items)
  const queueItemEdit = useCallback(async (
    itemId: string,
    changes: Partial<ItemUpdate>,
    expectedVersion: number
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if this is a pending create (editing before sync)
    const pendingCreate = await getQueuedItemCreateById(itemId)

    if (pendingCreate) {
      // Merge changes into create queue instead of separate edit
      await updateItemCreateData(itemId, changes as Partial<ItemInsert>)
      await updateCachedItem(itemId, changes as Partial<CachedItem>)
      return { merged: true }
    }

    // Otherwise, queue as normal edit
    const queuedEdit = await addItemEditToQueue({
      itemId,
      changes,
      expectedVersion,
      userId: user.id,
      deviceTimestamp: new Date().toISOString(),
    })

    // Update local cache optimistically
    const fieldMap: Record<string, string> = {
      category_id: 'categoryId',
      min_stock: 'minStock',
      max_stock: 'maxStock',
      unit_price: 'unitPrice',
      image_url: 'imageUrl',
      is_archived: 'isArchived',
    }

    const cacheChanges: Record<string, unknown> = {
      version: expectedVersion + 1,
    }
    for (const [serverKey, value] of Object.entries(changes)) {
      if (value !== undefined) {
        const cacheKey = fieldMap[serverKey] ?? serverKey
        cacheChanges[cacheKey] = value
      }
    }

    await updateCachedItem(itemId, cacheChanges as Parameters<typeof updateCachedItem>[1])

    const count = await getItemEditQueueCount()
    setState(prev => ({ ...prev, editQueueCount: count }))

    if (isOnline) {
      syncQueue()
    }

    return { merged: false, edit: queuedEdit }
  }, [user, isOnline, syncQueue])

  // Queue an item archive/restore
  const queueItemArchive = useCallback(async (
    itemId: string,
    action: 'archive' | 'restore',
    expectedVersion: number
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const queuedArchive = await addItemArchiveToQueue(itemId, action, expectedVersion, user.id)

    // Update local cache optimistically
    await updateCachedItem(itemId, {
      isArchived: action === 'archive',
      version: expectedVersion + 1,
    })

    const count = await getItemArchiveQueueCount()
    setState(prev => ({ ...prev, archiveQueueCount: count }))

    if (isOnline) {
      syncQueue()
    }

    return queuedArchive
  }, [user, isOnline, syncQueue])

  // Queue an image for upload
  const queueImage = useCallback(async (
    itemId: string,
    blob: Blob,
    filename: string
  ) => {
    // Check if this is an offline-created item
    const pendingCreate = await getQueuedItemCreateById(itemId)
    const isOfflineItem = !!pendingCreate

    const pendingImage = await addPendingImage(itemId, blob, filename, isOfflineItem)

    // Create local URL for optimistic display - use image.id as key (not itemId)
    const localUrl = URL.createObjectURL(blob)
    pendingImageBlobUrlsRef.current.set(pendingImage.id, localUrl)

    await updateCachedItem(itemId, { imageUrl: localUrl })

    const count = await getPendingImageCount()
    setState(prev => ({ ...prev, imageQueueCount: count }))

    if (isOnline && !isOfflineItem) {
      syncQueue()
    }

    return { ...pendingImage, localUrl }
  }, [isOnline, syncQueue])

  return {
    ...state,
    totalQueueCount,
    queueItemCreate,
    queueItemEdit,
    queueItemArchive,
    queueImage,
    syncQueue,
    isOnline,
  }
}
