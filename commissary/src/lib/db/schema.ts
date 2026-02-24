export const CREATE_PENDING_PRODUCTIONS = `
CREATE TABLE IF NOT EXISTS pending_productions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  quantity_produced REAL NOT NULL,
  waste_quantity REAL NOT NULL DEFAULT 0,
  waste_reason TEXT,
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
  category_name TEXT,
  is_commissary INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);`;

export const CREATE_TARGET_CACHE = `
CREATE TABLE IF NOT EXISTS target_cache (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  target_quantity REAL NOT NULL,
  target_date TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  notes TEXT
);`;

export const CREATE_PRODUCTION_CACHE = `
CREATE TABLE IF NOT EXISTS production_cache (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  quantity_produced REAL NOT NULL,
  event_timestamp TEXT NOT NULL,
  status TEXT NOT NULL
);`;

export const CREATE_SYNC_METADATA = `
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_item_cache_name ON item_cache(name);
CREATE INDEX IF NOT EXISTS idx_item_cache_sku ON item_cache(sku);
CREATE INDEX IF NOT EXISTS idx_pending_productions_status ON pending_productions(status);
CREATE INDEX IF NOT EXISTS idx_target_cache_date ON target_cache(target_date);
CREATE INDEX IF NOT EXISTS idx_production_cache_item ON production_cache(item_id);
`;

export const ALL_MIGRATIONS = [
  CREATE_PENDING_PRODUCTIONS,
  CREATE_ITEM_CACHE,
  CREATE_TARGET_CACHE,
  CREATE_PRODUCTION_CACHE,
  CREATE_SYNC_METADATA,
  CREATE_INDEXES,
];
