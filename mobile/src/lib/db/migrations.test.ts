import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('runMigrations', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
  })

  // ---- Table creation ----

  it('creates the transaction_queue table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_queue'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('transaction_queue')
  })

  it('creates the items_cache table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='items_cache'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('items_cache')
  })

  it('creates the metadata table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='metadata'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('metadata')
  })

  it('creates the item_edit_queue table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='item_edit_queue'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('item_edit_queue')
  })

  it('creates the item_create_queue table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='item_create_queue'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('item_create_queue')
  })

  it('creates the item_archive_queue table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='item_archive_queue'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('item_archive_queue')
  })

  it('creates the pending_images table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pending_images'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('pending_images')
  })

  it('creates the categories_cache table', () => {
    runMigrations(db)
    const table = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories_cache'"
    )
    expect(table).not.toBeNull()
    expect(table!.name).toBe('categories_cache')
  })

  it('creates all 8 tables', () => {
    runMigrations(db)
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    const tableNames = tables.map((t) => t.name).sort()
    expect(tableNames).toEqual([
      'categories_cache',
      'item_archive_queue',
      'item_create_queue',
      'item_edit_queue',
      'items_cache',
      'metadata',
      'pending_images',
      'transaction_queue',
    ])
  })

  // ---- WAL mode ----

  it('enables WAL journal mode', () => {
    runMigrations(db)
    const result = db.getFirstSync<{ journal_mode: string }>(
      'PRAGMA journal_mode'
    )
    // In-memory databases return 'memory'; on-disk returns 'wal'
    expect(['wal', 'memory']).toContain(result!.journal_mode)
  })

  // ---- Schema version ----

  it('records schema version 4 in the metadata table', () => {
    runMigrations(db)
    const row = db.getFirstSync<{ value: string }>(
      "SELECT value FROM metadata WHERE key = 'schema_version'"
    )
    expect(row).not.toBeNull()
    expect(row!.value).toBe('4')
  })

  // ---- Idempotency ----

  it('is idempotent - running twice does not error', () => {
    runMigrations(db)
    expect(() => runMigrations(db)).not.toThrow()
  })

  it('is idempotent - running twice still has exactly 8 tables', () => {
    runMigrations(db)
    runMigrations(db)
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    expect(tables).toHaveLength(8)
  })

  // ---- Indexes ----

  describe('indexes', () => {
    const expectedIndexes = [
      'idx_tq_created',
      'idx_tq_item',
      'idx_ic_barcode',
      'idx_ic_domain',
      'idx_ieq_item',
      'idx_ieq_status',
      'idx_ieq_created',
      'idx_icq_created',
      'idx_icq_status',
      'idx_iaq_created',
      'idx_iaq_item',
      'idx_iaq_status',
      'idx_pi_status',
      'idx_pi_item',
    ]

    beforeEach(() => {
      runMigrations(db)
    })

    it.each(expectedIndexes)('creates index %s', (indexName) => {
      const index = db.getFirstSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
        indexName
      )
      expect(index).not.toBeNull()
      expect(index!.name).toBe(indexName)
    })

    it('creates all expected indexes', () => {
      const indexes = db.getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
      )
      const indexNames = indexes.map((i) => i.name).sort()
      expect(indexNames).toEqual([...expectedIndexes].sort())
    })
  })

  // ---- Table structure spot checks ----

  describe('table structure', () => {
    beforeEach(() => {
      runMigrations(db)
    })

    it('transaction_queue has the required columns', () => {
      // Insert a full row to verify schema
      db.runSync(
        `INSERT INTO transaction_queue
          (id, transaction_type, item_id, quantity, notes, source_location_id,
           destination_location_id, device_timestamp, idempotency_key, user_id,
           retry_count, last_error, created_at, domain)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'tx-1', 'check_in', 'item-1', 10.5, 'test note', 'loc-1',
        'loc-2', '2024-01-01T00:00:00Z', 'idem-1', 'user-1',
        0, null, '2024-01-01T00:00:00Z', 'commissary'
      )
      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT * FROM transaction_queue WHERE id = ?',
        'tx-1'
      )
      expect(row).not.toBeNull()
      expect(row!.id).toBe('tx-1')
      expect(row!.transaction_type).toBe('check_in')
      expect(row!.item_id).toBe('item-1')
      expect(row!.quantity).toBe(10.5)
      expect(row!.domain).toBe('commissary')
    })

    it('items_cache has the required columns', () => {
      db.runSync(
        `INSERT INTO items_cache
          (id, sku, name, description, category_id, location_id, unit,
           current_stock, min_stock, max_stock, barcode, unit_price,
           image_url, version, is_archived, is_offline_created, updated_at, domain)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'item-1', 'SKU-001', 'Test Item', 'A test item', 'cat-1', 'loc-1',
        'pcs', 100.5, 10, 200, 'BC-001', 9.99,
        'https://img.test/1.png', 1, 0, 0, '2024-01-01T00:00:00Z', 'commissary'
      )
      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT * FROM items_cache WHERE id = ?',
        'item-1'
      )
      expect(row).not.toBeNull()
      expect(row!.sku).toBe('SKU-001')
      expect(row!.name).toBe('Test Item')
      expect(row!.is_archived).toBe(0)
      expect(row!.is_offline_created).toBe(0)
    })

    it('metadata has key, value, updated_at columns', () => {
      db.runSync(
        'INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)',
        'test_key', 'test_value', '2024-01-01T00:00:00Z'
      )
      const row = db.getFirstSync<Record<string, unknown>>(
        "SELECT * FROM metadata WHERE key = 'test_key'"
      )
      expect(row).not.toBeNull()
      expect(row!.value).toBe('test_value')
      expect(row!.updated_at).toBe('2024-01-01T00:00:00Z')
    })
  })
})
