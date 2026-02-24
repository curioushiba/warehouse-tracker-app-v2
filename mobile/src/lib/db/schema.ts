export const CREATE_PENDING_TRANSACTIONS = `
CREATE TABLE IF NOT EXISTS pending_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('check_in','check_out','transfer','adjustment','write_off','return')),
  quantity REAL NOT NULL,
  notes TEXT,
  device_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','failed'))
);`;

export const CREATE_ITEM_CACHE = `
CREATE TABLE IF NOT EXISTS item_cache (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  current_stock REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  max_stock REAL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_price REAL,
  category_id TEXT,
  category_name TEXT,
  quantity_decimals INTEGER NOT NULL DEFAULT 3,
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_commissary INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);`;

export const CREATE_SYNC_METADATA = `
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_item_cache_barcode ON item_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_item_cache_sku ON item_cache(sku);
CREATE INDEX IF NOT EXISTS idx_item_cache_name ON item_cache(name);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_status ON pending_transactions(status);
`;

export const ALL_MIGRATIONS = [
  CREATE_PENDING_TRANSACTIONS,
  CREATE_ITEM_CACHE,
  CREATE_SYNC_METADATA,
  CREATE_INDEXES,
];
