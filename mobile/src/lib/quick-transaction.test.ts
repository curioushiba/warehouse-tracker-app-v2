import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '@/test/mocks/expo-sqlite';
import { runMigrations } from '@/lib/db/migrations';
import { getPendingTransactions } from '@/lib/db/operations';
import { createQuickTransaction } from './quick-transaction';

describe('createQuickTransaction', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    runMigrations(db as unknown as import('expo-sqlite').SQLiteDatabase);
  });

  afterEach(() => {
    db.close();
  });

  it('should enqueue a check_in transaction with quantity 1', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_in' });

    expect(tx.transaction_type).toBe('check_in');
    expect(tx.quantity).toBe(1);

    const pending = getPendingTransactions(db as never);
    expect(pending).toHaveLength(1);
    expect(pending[0].quantity).toBe(1);
    expect(pending[0].transaction_type).toBe('check_in');
  });

  it('should enqueue a check_out transaction with quantity 1', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-2', type: 'check_out' });

    expect(tx.transaction_type).toBe('check_out');
    expect(tx.quantity).toBe(1);

    const pending = getPendingTransactions(db as never);
    expect(pending).toHaveLength(1);
    expect(pending[0].item_id).toBe('item-2');
    expect(pending[0].transaction_type).toBe('check_out');
  });

  it('should set notes to "Quick +1" for check_in', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_in' });
    expect(tx.notes).toBe('Quick +1');
  });

  it('should set notes to "Quick -1" for check_out', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_out' });
    expect(tx.notes).toBe('Quick -1');
  });

  it('should set status to pending', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_in' });
    expect(tx.status).toBe('pending');
  });

  it('should generate a valid UUID', () => {
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_in' });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(tx.id).toMatch(uuidRegex);
  });

  it('should set device_timestamp and created_at to ISO strings', () => {
    const before = new Date().toISOString();
    const tx = createQuickTransaction(db as never, { itemId: 'item-1', type: 'check_in' });
    const after = new Date().toISOString();

    expect(tx.device_timestamp).toBeTruthy();
    expect(tx.created_at).toBeTruthy();
    expect(tx.device_timestamp >= before).toBe(true);
    expect(tx.created_at <= after).toBe(true);
  });
});
