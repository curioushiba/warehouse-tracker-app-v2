import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { enqueueTransaction } from '@/lib/db/operations';
import type { PendingTransaction } from '@/lib/db/types';
import type { TransactionType } from '@/lib/types';

/**
 * Create a quick +1/-1 stock transaction and enqueue it for sync.
 */
export function createQuickTransaction(
  db: SQLiteDatabase,
  opts: { itemId: string; type: 'check_in' | 'check_out' },
): PendingTransaction {
  const now = new Date().toISOString();
  const notes = opts.type === 'check_in' ? 'Quick +1' : 'Quick -1';

  const tx: PendingTransaction = {
    id: randomUUID(),
    item_id: opts.itemId,
    transaction_type: opts.type as TransactionType,
    quantity: 1,
    notes,
    device_timestamp: now,
    created_at: now,
    status: 'pending',
  };

  enqueueTransaction(db, tx);
  return tx;
}
