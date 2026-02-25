import { describe, it, expect, afterEach } from 'vitest';
import { createMockDatabase, type SQLiteDatabase } from '../../test/mocks/expo-sqlite';
import { runMigrations } from './migrations';

describe('runMigrations', () => {
  let db: SQLiteDatabase;

  afterEach(() => {
    db?.close();
  });

  it('creates all expected tables', () => {
    db = createMockDatabase();
    runMigrations(db as any);

    const tables = db
      .getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .map((r) => r.name);

    expect(tables).toContain('pending_productions');
    expect(tables).toContain('item_cache');
    expect(tables).toContain('target_cache');
    expect(tables).toContain('production_cache');
    expect(tables).toContain('sync_metadata');
  });

  it('is idempotent — running twice does not throw', () => {
    db = createMockDatabase();
    runMigrations(db as any);
    expect(() => runMigrations(db as any)).not.toThrow();
  });
});
