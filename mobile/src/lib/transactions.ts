import type { PendingTransaction } from '@/lib/db/types';
import type { CompletedTransaction } from '@/lib/sync';
import type { TransactionType } from '@/lib/types';
import { isStockInType } from '@/lib/types';
import type { BadgeVariant } from '@/components/ui/Badge';

export interface UnifiedTransaction {
  id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  notes: string | null;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

/**
 * Merge local pending transactions with completed ones from Supabase.
 * Deduplicates by ID (pending wins), sorts newest-first.
 */
export function mergeTransactions(
  pending: PendingTransaction[],
  completed: CompletedTransaction[],
): UnifiedTransaction[] {
  const pendingIds = new Set(pending.map((tx) => tx.id));

  const localTxs: UnifiedTransaction[] = pending.map((tx) => ({
    id: tx.id,
    item_id: tx.item_id,
    transaction_type: tx.transaction_type,
    quantity: tx.quantity,
    notes: tx.notes,
    timestamp: tx.device_timestamp,
    status: tx.status,
  }));

  const remoteTxs: UnifiedTransaction[] = completed
    .filter((tx) => !pendingIds.has(tx.id))
    .map((tx) => ({
      id: tx.id,
      item_id: tx.item_id,
      transaction_type: tx.transaction_type,
      quantity: tx.quantity,
      notes: tx.notes,
      timestamp: tx.timestamp,
      status: 'completed' as const,
    }));

  const all = [...localTxs, ...remoteTxs];
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return all;
}

export function transactionBadgeVariant(status: UnifiedTransaction['status']): BadgeVariant {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'syncing':
      return 'info';
    default:
      return 'default';
  }
}

export function transactionBadgeLabel(status: UnifiedTransaction['status']): string {
  return status === 'completed' ? 'Synced' : status;
}

export function formatQuantityDelta(
  quantity: number,
  transactionType: TransactionType,
): string {
  const sign = isStockInType(transactionType) ? '+' : '-';
  return `${sign}${quantity}`;
}
