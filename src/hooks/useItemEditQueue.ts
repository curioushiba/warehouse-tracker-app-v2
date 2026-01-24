'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  getQueuedItemEdits,
  getItemEditQueueCount,
  removeItemEditFromQueue,
  addItemEditToQueue,
  updateItemEditStatus,
  getPendingImages,
  getPendingImageCount,
  removePendingImage,
  updatePendingImageStatus,
  addPendingImage,
  updateCachedItem,
  type QueuedItemEdit,
  type PendingImage,
} from '@/lib/offline/db'
import type { ItemUpdate } from '@/lib/supabase/types'

const MAX_RETRIES = 3
const SYNC_INTERVAL = 30000 // 30 seconds

// Helper to log failed sync to server
async function logSyncError(transactionData: Record<string, unknown>, errorMessage: string): Promise<void> {
  try {
    await fetch('/api/sync-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionData, errorMessage }),
    })
  } catch {
    // Silently fail - sync error logging is best-effort
  }
}

interface ItemEditSyncState {
  editQueueCount: number
  imageQueueCount: number
  isSyncing: boolean
  lastSyncTime: string | null
  lastError: string | null
}

interface ItemEditConflictResult {
  conflict: true
  serverVersion: number
  serverValues: Record<string, unknown>
}

interface ItemEditSuccessResult {
  conflict: false
  item: Record<string, unknown>
}

type ItemEditResult = ItemEditConflictResult | ItemEditSuccessResult

export function useItemEditQueue() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus()
  const { user, isAuthenticated } = useAuthContext()
  const [state, setState] = useState<ItemEditSyncState>({
    editQueueCount: 0,
    imageQueueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  })

  const syncInProgressRef = useRef(false)

  // Load queue counts on mount
  useEffect(() => {
    const loadQueueCounts = async () => {
      try {
        const [editCount, imageCount] = await Promise.all([
          getItemEditQueueCount(),
          getPendingImageCount(),
        ])
        setState(prev => ({ ...prev, editQueueCount: editCount, imageQueueCount: imageCount }))
      } catch (error) {
        console.error('Error loading queue counts:', error)
      }
    }
    loadQueueCounts()
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

      const result: ItemEditResult = await response.json()

      if (!response.ok) {
        throw new Error((result as { message?: string }).message || 'Failed to submit edit')
      }

      if (result.conflict) {
        // Last-write-wins: retry with new server version
        const conflictResult = result as ItemEditConflictResult
        const retryResponse = await fetch('/api/items/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: edit.itemId,
            changes: edit.changes,
            expectedVersion: conflictResult.serverVersion,
            idempotencyKey: `${edit.idempotencyKey}-retry`,
          }),
        })

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          throw new Error(retryError.message || 'Failed to submit edit after conflict resolution')
        }

        // Check if retry also resulted in a conflict (concurrent modification)
        const retryResult: ItemEditResult = await retryResponse.json()
        if (retryResult.conflict) {
          throw new Error('Concurrent modification detected - item will be re-synced on next attempt')
        }
      }

      // Success - remove from queue
      await removeItemEditFromQueue(edit.id)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (edit.retryCount >= MAX_RETRIES - 1) {
        await logSyncError({ type: 'item_edit', ...edit }, errorMessage)
        await removeItemEditFromQueue(edit.id)
      } else {
        await updateItemEditStatus(edit.id, 'failed', errorMessage)
      }

      return false
    }
  }, [])

  // Process a single pending image
  const processPendingImage = useCallback(async (image: PendingImage): Promise<boolean> => {
    try {
      await updatePendingImageStatus(image.itemId, 'uploading')

      // Create FormData for upload
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

      // Success - remove from queue
      await removePendingImage(image.itemId)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (image.retryCount >= MAX_RETRIES - 1) {
        await logSyncError({ type: 'image_upload', itemId: image.itemId, filename: image.filename }, errorMessage)
        await removePendingImage(image.itemId)
      } else {
        await updatePendingImageStatus(image.itemId, 'failed', errorMessage)
      }

      return false
    }
  }, [])

  // Sync all queued edits
  const syncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || !isAuthenticated) {
      return
    }

    syncInProgressRef.current = true
    setState(prev => ({ ...prev, isSyncing: true, lastError: null }))

    try {
      // Process item edits first
      const edits = await getQueuedItemEdits()
      for (const edit of edits) {
        if (!isOnline) break
        await processItemEdit(edit)
      }

      // Then process pending images
      const images = await getPendingImages()
      for (const image of images) {
        if (!isOnline) break
        await processPendingImage(image)
      }

      const [remainingEditCount, remainingImageCount] = await Promise.all([
        getItemEditQueueCount(),
        getPendingImageCount(),
      ])

      setState(prev => ({
        ...prev,
        editQueueCount: remainingEditCount,
        imageQueueCount: remainingImageCount,
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
  }, [isOnline, isAuthenticated, processItemEdit, processPendingImage])

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && isAuthenticated) {
      syncQueue()
      clearWasOffline()
    }
  }, [wasOffline, isOnline, isAuthenticated, syncQueue, clearWasOffline])

  // Periodic sync
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return

    const interval = setInterval(() => {
      if (state.editQueueCount > 0 || state.imageQueueCount > 0) {
        syncQueue()
      }
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [isOnline, isAuthenticated, state.editQueueCount, state.imageQueueCount, syncQueue])

  // Queue an item edit
  const queueItemEdit = useCallback(async (
    itemId: string,
    changes: Partial<ItemUpdate>,
    expectedVersion: number
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const queuedEdit = await addItemEditToQueue({
      itemId,
      changes,
      expectedVersion,
      userId: user.id,
      deviceTimestamp: new Date().toISOString(),
    })

    // Update local cache optimistically (including version increment)
    // Map snake_case server fields to camelCase cache fields
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

    // Try to sync immediately if online
    if (isOnline) {
      syncQueue()
    }

    return queuedEdit
  }, [user, isOnline, syncQueue])

  // Queue an image for upload
  const queueImage = useCallback(async (
    itemId: string,
    blob: Blob,
    filename: string
  ) => {
    const pendingImage = await addPendingImage(itemId, blob, filename)

    // Create a local object URL for optimistic display
    // Note: URL will be revoked when the image is synced and replaced with real URL
    const localUrl = URL.createObjectURL(blob)
    await updateCachedItem(itemId, { imageUrl: localUrl })

    const count = await getPendingImageCount()
    setState(prev => ({ ...prev, imageQueueCount: count }))

    // Try to sync immediately if online
    if (isOnline) {
      syncQueue()
    }

    return { ...pendingImage, localUrl }
  }, [isOnline, syncQueue])

  return {
    ...state,
    totalQueueCount: state.editQueueCount + state.imageQueueCount,
    queueItemEdit,
    queueImage,
    syncQueue,
    isOnline,
  }
}
