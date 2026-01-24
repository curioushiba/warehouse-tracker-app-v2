'use client'

import { useState, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useItemEditQueue } from './useItemEditQueue'
import { updateItem } from '@/lib/actions/items'
import type { Item, ItemUpdate } from '@/lib/supabase/types'

interface UseOfflineItemEditOptions {
  onSuccess?: (item: Item) => void
  onError?: (error: string) => void
}

interface UseOfflineItemEditReturn {
  submitEdit: (
    itemId: string,
    changes: Partial<ItemUpdate>,
    expectedVersion: number
  ) => Promise<{ success: boolean; data?: Item; queued?: boolean; error?: string }>
  isSubmitting: boolean
  error: string | null
  isOnline: boolean
}

export function useOfflineItemEdit(options: UseOfflineItemEditOptions = {}): UseOfflineItemEditReturn {
  const { onSuccess, onError } = options
  const { isOnline } = useOnlineStatus()
  const { queueItemEdit } = useItemEditQueue()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEdit = useCallback(async (
    itemId: string,
    changes: Partial<ItemUpdate>,
    expectedVersion: number
  ): Promise<{ success: boolean; data?: Item; queued?: boolean; error?: string }> => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (isOnline) {
        // Try direct server action
        const result = await updateItem(itemId, changes, expectedVersion)

        if (result.success) {
          onSuccess?.(result.data)
          return { success: true, data: result.data }
        } else {
          setError(result.error)
          onError?.(result.error)
          return { success: false, error: result.error }
        }
      } else {
        // Queue for offline sync
        await queueItemEdit(itemId, changes, expectedVersion)

        // Create an optimistic item for UI update
        const optimisticItem = {
          id: itemId,
          version: expectedVersion + 1,
          ...changes,
        } as Item

        onSuccess?.(optimisticItem)
        return { success: true, queued: true, data: optimisticItem }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      setError(errorMessage)
      onError?.(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsSubmitting(false)
    }
  }, [isOnline, queueItemEdit, onSuccess, onError])

  return {
    submitEdit,
    isSubmitting,
    error,
    isOnline,
  }
}
