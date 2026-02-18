import { useState, useCallback, useEffect, useRef } from 'react'
import { randomUUID } from 'expo-crypto'
import { createClient } from '@/lib/supabase/client'
import { DOMAIN_CONFIGS, type DomainId } from '@/lib/domain-config'
import {
  addToQueue,
  getQueuedTransactions,
  getQueueCount,
  removeFromQueue,
  incrementRetryCount,
} from '@/lib/db/transaction-queue'
import { MAX_RETRY_COUNT, SYNC_INTERVAL_MS, TRANSACTION_TIMEOUT_MS } from '@/lib/constants'
import type { QueuedTransaction } from '@/types/offline'

// --- Types ---

export interface SyncQueueState {
  queueCount: number
  isSyncing: boolean
  lastSyncTime: Date | null
  lastError: string | null
}

export interface SyncQueueManager {
  queueTransaction: (params: QueueTransactionParams) => string
  syncQueue: () => Promise<void>
  refreshCount: () => void
}

export interface QueueTransactionParams {
  transactionType: 'in' | 'out' | 'adjustment'
  itemId: string
  quantity: number
  notes?: string
  sourceLocationId?: string
  destinationLocationId?: string
}

export interface UseSyncQueueReturn extends SyncQueueState {
  queueTransaction: (params: QueueTransactionParams) => string
  syncQueue: () => Promise<void>
}

// --- Pure logic (testable) ---

export function createSyncQueueManager(
  db: unknown,
  userId: string | null,
  domainId: DomainId | null,
  isOnline: boolean,
  setState: (partial: Partial<SyncQueueState>) => void,
  getState: () => SyncQueueState
): SyncQueueManager {
  const supabase = createClient()
  let syncLock = false

  function refreshCount() {
    try {
      const count = getQueueCount(db as never)
      setState({ queueCount: count })
    } catch {
      // Ignore errors
    }
  }

  function queueTransaction(params: QueueTransactionParams): string {
    if (!userId) throw new Error('User not authenticated')
    if (!domainId) throw new Error('No domain selected')

    const id = randomUUID()
    const idempotencyKey = randomUUID()
    const now = new Date().toISOString()

    addToQueue(db as never, {
      id,
      transactionType: params.transactionType,
      itemId: params.itemId,
      quantity: params.quantity,
      notes: params.notes ?? '',
      sourceLocationId: params.sourceLocationId ?? '',
      destinationLocationId: params.destinationLocationId ?? '',
      deviceTimestamp: now,
      idempotencyKey,
      userId,
      retryCount: 0,
      lastError: null,
      createdAt: now,
      domain: domainId,
    })

    refreshCount()

    // Trigger immediate sync if online
    if (isOnline) {
      syncQueue().catch(() => {})
    }

    return id
  }

  async function syncQueue(): Promise<void> {
    if (syncLock) return
    if (!isOnline || !userId) return

    syncLock = true
    setState({ isSyncing: true })

    try {
      const transactions = getQueuedTransactions(db as never)
      if (transactions.length === 0) {
        setState({ isSyncing: false, lastSyncTime: new Date() })
        return
      }

      for (const tx of transactions) {
        await processTransaction(tx)
      }

      refreshCount()
      setState({ isSyncing: false, lastSyncTime: new Date(), lastError: null })
    } catch (err) {
      setState({
        isSyncing: false,
        lastError: err instanceof Error ? err.message : 'Sync failed',
      })
    } finally {
      syncLock = false
    }
  }

  async function processTransaction(tx: QueuedTransaction): Promise<void> {
    const domain = tx.domain as DomainId
    const config = DOMAIN_CONFIGS[domain]
    if (!config) return

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TRANSACTION_TIMEOUT_MS)

      const { error } = await supabase.rpc(config.rpcSubmitTransaction, {
        p_id: tx.id,
        p_item_id: tx.itemId,
        p_transaction_type: tx.transactionType,
        p_quantity: tx.quantity,
        p_notes: tx.notes,
        p_idempotency_key: tx.idempotencyKey,
        p_device_timestamp: tx.deviceTimestamp,
      }, { signal: controller.signal })

      clearTimeout(timeout)

      if (error) {
        await handleTransactionError(tx, error.message)
      } else {
        removeFromQueue(db as never, tx.id)
      }
    } catch (err) {
      await handleTransactionError(
        tx,
        err instanceof Error ? err.message : 'Unknown error'
      )
    }
  }

  async function handleTransactionError(tx: QueuedTransaction, errorMsg: string): Promise<void> {
    const newRetryCount = tx.retryCount + 1
    if (newRetryCount >= MAX_RETRY_COUNT) {
      // Move to sync_errors table
      try {
        await supabase.from('inv_sync_errors').insert({
          transaction_data: tx,
          error_message: errorMsg,
          user_id: userId,
        })
      } catch {
        // Ignore insert error
      }
      removeFromQueue(db as never, tx.id)
    } else {
      incrementRetryCount(db as never, tx.id, errorMsg)
    }
  }

  return { queueTransaction, syncQueue, refreshCount }
}

// --- React hook ---

export function useSyncQueue(
  db: unknown,
  userId: string | null,
  domainId: DomainId | null,
  isOnline: boolean
): UseSyncQueueReturn {
  const [state, setSyncState] = useState<SyncQueueState>({
    queueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const managerRef = useRef<SyncQueueManager | null>(null)

  // Recreate manager when dependencies change
  useEffect(() => {
    managerRef.current = createSyncQueueManager(
      db,
      userId,
      domainId,
      isOnline,
      (partial) => setSyncState(prev => ({ ...prev, ...partial })),
      () => stateRef.current
    )
    managerRef.current.refreshCount()
  }, [db, userId, domainId, isOnline])

  // Periodic sync
  useEffect(() => {
    if (!isOnline || !userId || state.queueCount === 0) return
    const interval = setInterval(() => {
      managerRef.current?.syncQueue()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isOnline, userId, state.queueCount])

  // Sync on reconnect
  const wasOfflineRef = useRef(!isOnline)
  useEffect(() => {
    if (isOnline && wasOfflineRef.current && state.queueCount > 0) {
      managerRef.current?.syncQueue()
    }
    wasOfflineRef.current = !isOnline
  }, [isOnline, state.queueCount])

  const queueTransaction = useCallback(
    (params: QueueTransactionParams) => managerRef.current!.queueTransaction(params),
    []
  )

  const syncQueue = useCallback(
    () => managerRef.current!.syncQueue(),
    []
  )

  return {
    ...state,
    queueTransaction,
    syncQueue,
  }
}
