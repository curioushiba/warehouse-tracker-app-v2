import 'react-native-url-polyfill/auto'
import { createClient } from '@/lib/supabase/client'
import { getSessionToken } from '@/lib/storage/storage'
import { DOMAIN_CONFIGS, type DomainId } from '@/lib/domain-config'
import {
  getQueuedTransactions,
  removeFromQueue,
  incrementRetryCount,
} from '@/lib/db/transaction-queue'
export const BACKGROUND_SYNC_TASK = 'background-sync'

export type BackgroundSyncResult = 'NewData' | 'NoData' | 'Failed'

export async function processBackgroundSync(db: unknown): Promise<BackgroundSyncResult> {
  try {
    const token = await getSessionToken()
    if (!token) return 'NoData'

    const transactions = getQueuedTransactions(db as never)
    if (transactions.length === 0) return 'NoData'

    const supabase = createClient()
    let hasSuccess = false
    let hasFailure = false

    for (const tx of transactions) {
      const domain = tx.domain as DomainId
      const config = DOMAIN_CONFIGS[domain]
      if (!config) continue

      try {
        const { error } = await supabase.rpc(config.rpcSubmitTransaction, {
          p_id: tx.id,
          p_item_id: tx.itemId,
          p_transaction_type: tx.transactionType,
          p_quantity: tx.quantity,
          p_notes: tx.notes,
          p_idempotency_key: tx.idempotencyKey,
          p_device_timestamp: tx.deviceTimestamp,
        })

        if (error) {
          incrementRetryCount(db as never, tx.id, error.message)
          hasFailure = true
        } else {
          removeFromQueue(db as never, tx.id)
          hasSuccess = true
        }
      } catch (err) {
        incrementRetryCount(
          db as never,
          tx.id,
          err instanceof Error ? err.message : 'Unknown error'
        )
        hasFailure = true
      }
    }

    if (hasSuccess) return 'NewData'
    if (hasFailure) return 'Failed'
    return 'NoData'
  } catch {
    return 'Failed'
  }
}
