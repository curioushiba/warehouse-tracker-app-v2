import { describe, it, expect } from 'vitest';
import {
  mergeTransactions,
  transactionBadgeVariant,
  transactionBadgeLabel,
  formatQuantityDelta,
  type UnifiedTransaction,
} from './transactions';
import type { PendingTransaction } from '@/lib/db/types';
import type { CompletedTransaction } from '@/lib/sync/sync';

function makePending(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    id: 'p1',
    item_id: 'item-1',
    transaction_type: 'check_in',
    quantity: 5,
    notes: null,
    device_timestamp: '2026-02-22T10:00:00Z',
    created_at: '2026-02-22T10:00:00Z',
    status: 'pending',
    ...overrides,
  };
}

function makeCompleted(overrides: Partial<CompletedTransaction> = {}): CompletedTransaction {
  return {
    id: 'c1',
    item_id: 'item-2',
    transaction_type: 'check_out',
    quantity: 3,
    notes: null,
    timestamp: '2026-02-22T09:00:00Z',
    status: 'completed',
    ...overrides,
  };
}

describe('mergeTransactions', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeTransactions([], [])).toEqual([]);
  });

  it('returns only pending when completed is empty', () => {
    const result = mergeTransactions([makePending()], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].status).toBe('pending');
  });

  it('returns only completed when pending is empty', () => {
    const result = mergeTransactions([], [makeCompleted()]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].status).toBe('completed');
  });

  it('maps pending fields correctly', () => {
    const pending = makePending({
      id: 'tx-1',
      item_id: 'item-A',
      transaction_type: 'check_in',
      quantity: 10,
      notes: 'delivery',
      device_timestamp: '2026-02-22T12:00:00Z',
      status: 'syncing',
    });
    const result = mergeTransactions([pending], []);
    expect(result[0]).toEqual({
      id: 'tx-1',
      item_id: 'item-A',
      transaction_type: 'check_in',
      quantity: 10,
      notes: 'delivery',
      timestamp: '2026-02-22T12:00:00Z',
      status: 'syncing',
    });
  });

  it('maps completed fields correctly', () => {
    const completed = makeCompleted({
      id: 'tx-2',
      item_id: 'item-B',
      transaction_type: 'check_out',
      quantity: 7,
      notes: 'shipped',
      timestamp: '2026-02-22T11:00:00Z',
    });
    const result = mergeTransactions([], [completed]);
    expect(result[0]).toEqual({
      id: 'tx-2',
      item_id: 'item-B',
      transaction_type: 'check_out',
      quantity: 7,
      notes: 'shipped',
      timestamp: '2026-02-22T11:00:00Z',
      status: 'completed',
    });
  });

  it('deduplicates by ID — pending wins over completed', () => {
    const pending = makePending({ id: 'dup-1', status: 'syncing' });
    const completed = makeCompleted({ id: 'dup-1' });
    const result = mergeTransactions([pending], [completed]);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('syncing');
  });

  it('sorts newest-first by timestamp', () => {
    const older = makePending({ id: 'old', device_timestamp: '2026-02-20T10:00:00Z' });
    const newer = makeCompleted({ id: 'new', timestamp: '2026-02-22T10:00:00Z' });
    const result = mergeTransactions([older], [newer]);
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('old');
  });

  it('preserves all fields for mixed list', () => {
    const p = makePending({ id: 'p1', notes: 'pending-note' });
    const c = makeCompleted({ id: 'c1', notes: 'completed-note' });
    const result = mergeTransactions([p], [c]);
    expect(result.find((t) => t.id === 'p1')?.notes).toBe('pending-note');
    expect(result.find((t) => t.id === 'c1')?.notes).toBe('completed-note');
  });

  it('handles multiple duplicates correctly', () => {
    const pending = [
      makePending({ id: 'dup-1', device_timestamp: '2026-02-22T10:00:00Z' }),
      makePending({ id: 'dup-2', device_timestamp: '2026-02-22T09:00:00Z' }),
    ];
    const completed = [
      makeCompleted({ id: 'dup-1', timestamp: '2026-02-22T10:00:00Z' }),
      makeCompleted({ id: 'dup-2', timestamp: '2026-02-22T09:00:00Z' }),
      makeCompleted({ id: 'unique-c', timestamp: '2026-02-22T08:00:00Z' }),
    ];
    const result = mergeTransactions(pending, completed);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.id)).toEqual(['dup-1', 'dup-2', 'unique-c']);
    expect(result[0].status).toBe('pending');
    expect(result[1].status).toBe('pending');
    expect(result[2].status).toBe('completed');
  });
});

describe('transactionBadgeVariant', () => {
  it('returns success for completed', () => {
    expect(transactionBadgeVariant('completed')).toBe('success');
  });

  it('returns error for failed', () => {
    expect(transactionBadgeVariant('failed')).toBe('error');
  });

  it('returns info for syncing', () => {
    expect(transactionBadgeVariant('syncing')).toBe('info');
  });

  it('returns default for pending', () => {
    expect(transactionBadgeVariant('pending')).toBe('default');
  });
});

describe('transactionBadgeLabel', () => {
  it('returns Synced for completed', () => {
    expect(transactionBadgeLabel('completed')).toBe('Synced');
  });

  it('passes through non-completed statuses', () => {
    expect(transactionBadgeLabel('pending')).toBe('pending');
    expect(transactionBadgeLabel('syncing')).toBe('syncing');
    expect(transactionBadgeLabel('failed')).toBe('failed');
  });
});

describe('formatQuantityDelta', () => {
  it('returns positive delta for check_in', () => {
    expect(formatQuantityDelta(500, 'check_in')).toBe('+500');
  });

  it('returns positive delta for return', () => {
    expect(formatQuantityDelta(10, 'return')).toBe('+10');
  });

  it('returns negative delta for check_out', () => {
    expect(formatQuantityDelta(20, 'check_out')).toBe('-20');
  });

  it('returns negative delta for write_off', () => {
    expect(formatQuantityDelta(3, 'write_off')).toBe('-3');
  });

  it('handles decimal quantities for stock-in', () => {
    expect(formatQuantityDelta(5.5, 'check_in')).toBe('+5.5');
  });

  it('handles decimal quantities for stock-out', () => {
    expect(formatQuantityDelta(2.75, 'check_out')).toBe('-2.75');
  });

  it('handles zero quantity', () => {
    expect(formatQuantityDelta(0, 'check_in')).toBe('+0');
    expect(formatQuantityDelta(0, 'check_out')).toBe('-0');
  });
});
