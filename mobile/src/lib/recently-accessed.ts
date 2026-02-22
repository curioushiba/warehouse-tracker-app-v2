import type { SQLiteDatabase } from 'expo-sqlite';
import { getCachedItem } from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import type { UnifiedTransaction } from '@/lib/transactions';

/**
 * Derive a list of recently accessed items from merged transactions.
 * Transactions are assumed to be sorted newest-first (from mergeTransactions).
 * Returns unique items in recency order, capped to `limit`.
 */
export function getRecentlyAccessedItems(
  db: SQLiteDatabase,
  transactions: UnifiedTransaction[],
  limit = 10,
): CachedItem[] {
  const seen = new Set<string>();
  const items: CachedItem[] = [];

  for (const tx of transactions) {
    if (seen.has(tx.item_id)) continue;
    seen.add(tx.item_id);

    const item = getCachedItem(db, tx.item_id);
    if (item) items.push(item);

    if (items.length >= limit) break;
  }

  return items;
}
