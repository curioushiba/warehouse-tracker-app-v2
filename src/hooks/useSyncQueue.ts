'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  getQueuedTransactions,
  getQueueCount,
  removeFromQueue,
  incrementRetryCount,
  addToQueue,
  type QueuedTransaction,
} from '@/lib/offline/db'

const MAX_RETRIES = 3
const SYNC_INTERVAL = 30000 // 30 seconds

interface SyncState {
  queueCount: number
  isSyncing: boolean
  lastSyncTime: string | null
  lastError: string | null
}

export function useSyncQueue() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus()
  const { user, isAuthenticated } = useAuthContext()
  const [state, setState] = useState<SyncState>({
    queueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  })

  const syncInProgressRef = useRef(false)

  // Load queue count on mount
  useEffect(() => {
    const loadQueueCount = async () => {
      try {
        const count = await getQueueCount()
        setState(prev => ({ ...prev, queueCount: count }))
      } catch (error) {
        console.error('Error loading queue count:', error)
        // Continue with count of 0 if IndexedDB fails
      }
    }
    loadQueueCount()
  }, [])

  // Process a single transaction
  const processTransaction = useCallback(async (transaction: QueuedTransaction): Promise<boolean> => {
    try {
      const response = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: transaction.transactionType,
          itemId: transaction.itemId,
          quantity: transaction.quantity,
          notes: transaction.notes,
          sourceLocationId: transaction.sourceLocationId,
          destinationLocationId: transaction.destinationLocationId,
          deviceTimestamp: transaction.deviceTimestamp,
          idempotencyKey: transaction.idempotencyKey,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit transaction')
      }

      // Success - remove from queue
      await removeFromQueue(transaction.id)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (transaction.retryCount >= MAX_RETRIES - 1) {
        // Max retries reached - log as sync error
        await fetch('/api/sync-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionData: transaction,
            errorMessage,
          }),
        })
        await removeFromQueue(transaction.id)
      } else {
        // Increment retry count
        await incrementRetryCount(transaction.id, errorMessage)
      }

      return false
    }
  }, [])

  // Sync all queued transactions
  const syncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || !isAuthenticated) {
      return
    }

    syncInProgressRef.current = true
    setState(prev => ({ ...prev, isSyncing: true, lastError: null }))

    try {
      const transactions = await getQueuedTransactions()

      for (const transaction of transactions) {
        if (!isOnline) break // Stop if we go offline
        await processTransaction(transaction)
      }

      const remainingCount = await getQueueCount()
      setState(prev => ({
        ...prev,
        queueCount: remainingCount,
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
  }, [isOnline, isAuthenticated, processTransaction])

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
      if (state.queueCount > 0) {
        syncQueue()
      }
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [isOnline, isAuthenticated, state.queueCount, syncQueue])

  // Add transaction to queue
  const queueTransaction = useCallback(async (
    transaction: Omit<QueuedTransaction, 'id' | 'retryCount' | 'createdAt' | 'userId' | 'idempotencyKey'>
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const id = crypto.randomUUID()
    const idempotencyKey = crypto.randomUUID()

    await addToQueue({
      ...transaction,
      id,
      idempotencyKey,
      userId: user.id,
      deviceTimestamp: transaction.deviceTimestamp || new Date().toISOString(),
    })

    const count = await getQueueCount()
    setState(prev => ({ ...prev, queueCount: count }))

    // Try to sync immediately if online
    if (isOnline) {
      syncQueue()
    }

    return { id, idempotencyKey }
  }, [user, isOnline, syncQueue])

  return {
    ...state,
    queueTransaction,
    syncQueue,
    isOnline,
  }
}
