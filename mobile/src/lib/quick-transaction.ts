import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { enqueueTransaction } from '@/lib/db/operations';
import type { PendingTransaction } from '@/lib/db/types';
import type { TransactionType } from '@/lib/types';

/**
 * Create a quick stock transaction and enqueue it for sync.
 * Quantity defaults to 1 if not specified.
 */
export function createQuickTransaction(
  db: SQLiteDatabase,
  opts: { itemId: string; type: 'check_in' | 'check_out'; quantity?: number },
): PendingTransaction {
  const qty = opts.quantity ?? 1;
  const now = new Date().toISOString();
  const sign = opts.type === 'check_in' ? '+' : '-';
  const notes = `Quick ${sign}${qty}`;

  const tx: PendingTransaction = {
    id: randomUUID(),
    item_id: opts.itemId,
    transaction_type: opts.type as TransactionType,
    quantity: qty,
    notes,
    device_timestamp: now,
    created_at: now,
    status: 'pending',
  };

  enqueueTransaction(db, tx);
  return tx;
}
