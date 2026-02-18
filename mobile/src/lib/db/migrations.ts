import type { SQLiteDatabase } from 'expo-sqlite'

type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>

export function runMigrations(db: Db): void {
  // Enable WAL mode
  db.execSync('PRAGMA journal_mode = WAL')

  db.execSync(`
    CREATE TABLE IF NOT EXISTS transaction_queue (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
      source_location_id TEXT,
      destination_location_id TEXT,
      device_timestamp TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      domain TEXT
    );

    CREATE TABLE IF NOT EXISTS items_cache (
      id TEXT PRIMARY KEY NOT NULL,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      location_id TEXT,
      unit TEXT NOT NULL,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      max_stock REAL,
      barcode TEXT,
      unit_price REAL,
      image_url TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_offline_created INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      domain TEXT
    );

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_edit_queue (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      changes TEXT NOT NULL,
      expected_version INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      device_timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_create_queue (
      id TEXT PRIMARY KEY NOT NULL,
      temp_sku TEXT NOT NULL,
      item_data TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      device_timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_archive_queue (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      action TEXT NOT NULL,
      expected_version INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      device_timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_images (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      is_offline_item INTEGER NOT NULL DEFAULT 0,
      file_uri TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories_cache (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tq_created ON transaction_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_tq_item ON transaction_queue(item_id);
    CREATE INDEX IF NOT EXISTS idx_ic_barcode ON items_cache(barcode);
    CREATE INDEX IF NOT EXISTS idx_ic_domain ON items_cache(domain);
    CREATE INDEX IF NOT EXISTS idx_ieq_item ON item_edit_queue(item_id);
    CREATE INDEX IF NOT EXISTS idx_ieq_status ON item_edit_queue(status);
    CREATE INDEX IF NOT EXISTS idx_ieq_created ON item_edit_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_icq_created ON item_create_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_icq_status ON item_create_queue(status);
    CREATE INDEX IF NOT EXISTS idx_iaq_created ON item_archive_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_iaq_item ON item_archive_queue(item_id);
    CREATE INDEX IF NOT EXISTS idx_iaq_status ON item_archive_queue(status);
    CREATE INDEX IF NOT EXISTS idx_pi_status ON pending_images(status);
    CREATE INDEX IF NOT EXISTS idx_pi_item ON pending_images(item_id)
  `)

  // Record schema version
  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)',
    'schema_version',
    '4',
    new Date().toISOString()
  )
}
