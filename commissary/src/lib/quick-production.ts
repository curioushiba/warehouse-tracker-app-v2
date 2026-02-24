import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { enqueueProduction } from '@/lib/db/operations';
import type { PendingProduction } from '@/lib/db/types';

/**
 * Create a quick production entry and enqueue it for sync.
 * Positive quantity for production, negative for correction.
 */
export function createQuickProduction(
  db: SQLiteDatabase,
  opts: { itemId: string; direction: 'produce' | 'correct'; quantity: number },
): PendingProduction {
  const sign = opts.direction === 'produce' ? '+' : '-';
  const signedQty = opts.direction === 'produce' ? opts.quantity : -opts.quantity;
  const notes = `Quick ${sign}${opts.quantity}`;
  const now = new Date().toISOString();

  const production: PendingProduction = {
    id: randomUUID(),
    item_id: opts.itemId,
    quantity_produced: signedQty,
    waste_quantity: 0,
    waste_reason: null,
    notes,
    device_timestamp: now,
    created_at: now,
    status: 'pending',
  };

  enqueueProduction(db, production);
  return production;
}
