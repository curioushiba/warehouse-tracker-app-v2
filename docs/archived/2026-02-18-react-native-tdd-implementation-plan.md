# TDD Implementation Plan: PackTrack React Native (Expo) Migration

## Context

PackTrack serves Commissary (CM) and Frozen Goods (FG) warehouse operations as two separate Next.js PWAs. This plan migrates both into a **single React Native (Expo) Android app** with a domain switcher. The migration plan (`docs/react-native-migration-plan.md`) and refined spec (`docs/plans/2026-02-18-react-native-migration-spec.md`) contain 93 decisions across 4 interview rounds. All open questions are resolved.

**TDD approach**: For each implementation unit, tests are written FIRST (red), then implementation to pass (green), then refactor. Test files are colocated with source files.

**Test runners**: Vitest for pure logic (`lib/`, `hooks/`, `contexts/`), jest-expo + @testing-library/react-native for component tests. E2E via Maestro (written last). Coverage target: 80%+ for `lib/`, `hooks/`, `contexts/`.

**Project root**: `mobile/` directory inside the existing repo.

---

## Phase 1: Foundation (Cycles 1.0-1.6)

### Cycle 1.0: Project Scaffolding (Non-TDD — config only)

**Files to create:**
- `mobile/` — `npx create-expo-app mobile -t tabs` (Expo SDK 52+)
- `mobile/vitest.config.ts` — Resolve `@/` alias, include `src/lib/**`, `src/hooks/**`, `src/contexts/**`
- `mobile/jest.config.js` — Preset `jest-expo`, module mapper for `@/`
- `mobile/app.json` — Android-only, `orientation: 'portrait'`, `scheme: 'packtrack'`, expo-updates config
- `mobile/tailwind.config.js` — NativeWind v4 tokens from web `tailwind.config.ts`
- `mobile/eas.json` — development, preview, production build profiles
- `mobile/src/test/setup-vitest.ts` — Mock expo-sqlite (better-sqlite3), react-native-mmkv (Map), expo-crypto, netinfo
- `mobile/src/test/setup-jest.ts` — jest-expo preset, mock expo-camera/haptics/av/image

**Dependencies to install:**
- Core: `expo-sqlite`, `react-native-mmkv`, `@supabase/supabase-js`, `nativewind@^4.1.0`, `tailwindcss@^3.4.0`
- Native: `expo-camera`, `expo-haptics`, `expo-av`, `expo-crypto`, `expo-file-system`, `expo-background-fetch`, `expo-task-manager`, `expo-status-bar`, `expo-updates`, `expo-font`, `expo-splash-screen`, `expo-image`, `expo-linear-gradient`
- Network: `@react-native-community/netinfo`, `react-native-url-polyfill`
- UI: `lucide-react-native`, `react-native-toast-message`, `react-native-safe-area-context`, `react-native-screens`, `react-native-reanimated`, `react-native-gesture-handler`
- Dev: `vitest`, `better-sqlite3`, `jest-expo`, `@testing-library/react-native`

### Cycle 1.1: Types (Non-TDD — structural declarations)

**Files to create:**
- `src/lib/supabase/types.ts` — Copy from web `src/lib/supabase/types.ts` (Database, Profile, Item, CmItem, FgItem, Transaction, SyncError types)
- `src/types/index.ts` — Copy from web `src/types/index.ts` (Size, ButtonVariant, BadgeColorScheme, StockLevel, SyncStatus, etc.) Remove web-only types (Drawer, Tabs, Tooltip)
- `src/types/offline.ts` — Extract from web `src/lib/offline/db.ts`: QueuedTransaction, CachedItem, QueuedItemEdit, QueuedItemCreate, QueuedItemArchive, PendingImage (replace `Blob` with `{ uri: string; filename: string; mimeType: string }`), CachedCategory, ItemOperationStatus, PendingOperationType
- `src/lib/types/action-result.ts` — Copy ActionResult<T>, success(), failure() helpers from web

### Cycle 1.2: Constants & Validation

**Red:** `src/lib/constants.test.ts`, `src/lib/validation.test.ts`
- `exports DECIMAL_PLACES as 3, MIN_QUANTITY as 0.001, MAX_QUANTITY as 9999.999`
- `roundToDecimalPlaces(1.2345) → 1.235`, `roundToDecimalPlaces(0.0001) → 0`
- `clampQuantity(-1) → 0.001`, `clampQuantity(10000) → 9999.999`, `clampQuantity(1.5) → 1.5`

**Green:** `src/lib/constants.ts` (all app constants), `src/lib/validation.ts` (roundToDecimalPlaces, clampQuantity)

### Cycle 1.3: Display Name Utility

**Red:** `src/lib/display-name.test.ts`
- Fallback chain: `name > "first last" > first_name > last_name > username > email prefix > "User"`
- Trims whitespace, treats whitespace-only as empty

**Green:** `src/lib/display-name.ts` — Port `getDisplayName` from web home page

### Cycle 1.4: Format Utilities

**Red:** `src/lib/utils.test.ts`
- `formatCurrency`, `formatDate`, `formatDateTime`, `formatRelativeTime` (just now / N minutes / N hours / N days / formatted date)
- `truncate`, `getStockLevel` (critical/low/normal/overstocked), `escapeLikePattern` (escapes %, _, \)

**Green:** `src/lib/utils.ts` — Port from web `src/lib/utils.ts` + `escapeLikePattern` from web item-queries

### Cycle 1.5: MMKV Storage Helpers

**Red:** `src/lib/storage/mmkv.test.ts`
- Generic: `setString/getString`, `setObject/getObject` (JSON serialize), `setBoolean/getBoolean`, `remove`, `clearAll`
- Typed: `getSessionToken/setSessionToken/clearSession`, `getSelectedDomain/setSelectedDomain`, `getDarkMode/setDarkMode` (defaults to "system"), `getSettings/setSettings`

**Green:** `src/lib/storage/mmkv.ts` — MMKV instance ID `packtrack-storage`, typed getters/setters. Mock with Map in tests.

### Cycle 1.6: Domain Config

**Red:** `src/lib/domain-config.test.ts`
- Commissary: tables `cm_items`/`cm_transactions`, RPC `submit_cm_transaction`, brand `#E07A2F`, letter `C`
- Frozen Goods: tables `fg_items`/`fg_transactions`, RPC `submit_fg_transaction`, brand `#2563EB`, letter `F`

**Green:** `src/lib/domain-config.ts` — `DomainId = 'commissary' | 'frozen-goods'`, `DomainConfig` interface, `DOMAIN_CONFIGS` record

**Non-TDD:** `src/lib/supabase/client.ts` — Supabase singleton with MMKV storage adapter, `detectSessionInUrl: false`

---

## Phase 2: Data Layer (Cycles 2.1-2.7)

Source of truth: web `src/lib/offline/db.ts` (59 exported functions, 8 stores). All SQLite functions receive `db: SQLiteDatabase` as parameter for testability.

### Cycle 2.1: SQLite Schema & Migrations

**Red:** `src/lib/db/migrations.test.ts`
- Creates all 8 tables (transaction_queue, items_cache, metadata, item_edit_queue, item_create_queue, item_archive_queue, pending_images, categories_cache)
- Enables WAL mode, records schema version in metadata, is idempotent
- Creates all indexes (idx_tq_created, idx_tq_item, idx_ic_barcode, idx_ieq_item/status/created, etc.)

**Green:** `src/lib/db/migrations.ts` — `runMigrations(db)`, `CREATE TABLE IF NOT EXISTS` + `PRAGMA journal_mode=WAL`

**SQL Schema (8 tables):**

```sql
-- transaction_queue
CREATE TABLE IF NOT EXISTS transaction_queue (
  id TEXT PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  source_location_id TEXT,
  destination_location_id TEXT,
  device_timestamp TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  domain TEXT
);

-- items_cache
CREATE TABLE IF NOT EXISTS items_cache (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  location_id TEXT,
  unit TEXT DEFAULT 'pcs',
  current_stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  max_stock REAL,
  barcode TEXT,
  unit_price REAL,
  image_url TEXT,
  version INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  is_offline_created INTEGER DEFAULT 0,
  updated_at TEXT,
  domain TEXT
);

-- metadata
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

-- item_edit_queue
CREATE TABLE IF NOT EXISTS item_edit_queue (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  changes TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);

-- item_create_queue
CREATE TABLE IF NOT EXISTS item_create_queue (
  id TEXT PRIMARY KEY,
  temp_sku TEXT NOT NULL,
  item_data TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);

-- item_archive_queue
CREATE TABLE IF NOT EXISTS item_archive_queue (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);

-- pending_images
CREATE TABLE IF NOT EXISTS pending_images (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  is_offline_item INTEGER DEFAULT 0,
  file_uri TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- categories_cache
CREATE TABLE IF NOT EXISTS categories_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  created_at TEXT
);
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_tq_created ON transaction_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_tq_item ON transaction_queue(item_id);
CREATE INDEX IF NOT EXISTS idx_ic_barcode ON items_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_ic_domain ON items_cache(domain);
CREATE INDEX IF NOT EXISTS idx_ieq_item ON item_edit_queue(item_id);
CREATE INDEX IF NOT EXISTS idx_ieq_status ON item_edit_queue(status);
CREATE INDEX IF NOT EXISTS idx_ieq_created ON item_edit_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_icq_status ON item_create_queue(status);
CREATE INDEX IF NOT EXISTS idx_icq_created ON item_create_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_iaq_item ON item_archive_queue(item_id);
CREATE INDEX IF NOT EXISTS idx_iaq_status ON item_archive_queue(status);
CREATE INDEX IF NOT EXISTS idx_iaq_created ON item_archive_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_pi_status ON pending_images(status);
CREATE INDEX IF NOT EXISTS idx_pi_item ON pending_images(item_id);
```

### Cycle 2.2: Transaction Queue CRUD

**Red:** `src/lib/db/transaction-queue.test.ts`
- `addToQueue` — inserts with retryCount=0, createdAt timestamp, stores domain field
- `getQueuedTransactions` — returns ordered by created_at ASC, empty array when empty
- `getQueueCount` — correct count, 0 when empty
- `removeFromQueue` — deletes by id, no-op for non-existent
- `incrementRetryCount` — increments and stores error message
- `clearQueue` — removes all
- `getTransactionsByDomain` — filters by domain

**Green:** `src/lib/db/transaction-queue.ts` — Port from web db.ts lines 275-322, parameterized SQL

### Cycle 2.3: Items Cache CRUD

**Red:** `src/lib/db/items-cache.test.ts`
- `cacheItems` — batch upsert (INSERT OR REPLACE), handles empty array
- `getCachedItem/BySku/ByBarcode` — returns item or undefined
- `getAllCachedItems` — all items, empty array when empty
- `clearItemsCache`, `updateCachedItem` — merges partial updates
- `searchCachedItems` — LIKE pattern matching, escapes special chars

**Green:** `src/lib/db/items-cache.ts` — Port from web lines 324-567 + add `searchCachedItems`

### Cycle 2.4: Metadata + Edit/Create/Archive Queues

**Red:** 4 test files:
- `src/lib/db/metadata.test.ts` — get/set string/number/boolean, getLastSyncTime, getDeviceId (generates on first call)
- `src/lib/db/item-edit-queue.test.ts` — add (generates id, JSON-serializes changes), get all/by-item/by-status, count, updateStatus (increment retry on failed), remove, clear
- `src/lib/db/item-create-queue.test.ts` — add (generates TEMP-{8char} sku), get all/by-id/by-status, count, updateStatus, updateData (merges into existing), remove, clear
- `src/lib/db/item-archive-queue.test.ts` — add (archive/restore actions), get all/by-item/by-status, count, updateStatus, remove, clear

**Green:** 4 implementation files porting from web db.ts. JSON.stringify for TEXT columns, JSON.parse on read.

**Refactor:** Extract shared `updateStatusWithRetry` helper used by all 3 operation queues.

### Cycle 2.5: Pending Images & Categories Cache

**Red:**
- `src/lib/db/pending-images.test.ts` — Stores file URI (not Blob), sets status `waiting_for_item` when isOfflineItem, `transitionWaitingImagesToReady` changes to pending
- `src/lib/db/categories-cache.test.ts` — `cacheCategories` clears then inserts, get all, clear

**Green:** `src/lib/db/pending-images.ts` (replace Blob with file_uri), `src/lib/db/categories-cache.ts`

### Cycle 2.6: Conversion Helpers & applyPendingOperationsToItems

**Red:**
- `src/lib/db/conversions.test.ts` — camelCase↔snake_case roundtrip for Item, CachedItem, Category, CachedCategory
- `src/lib/db/apply-pending-ops.test.ts` — **Critical function** (~90 lines):
  - Returns original items when no pending ops
  - Prepends offline-created items with tempSku and is_offline_created=true
  - Applies pending edits (multiple edits to same item in order, last wins)
  - Filters archived items, shows restored items
  - Combines creates+edits+archives correctly
  - Populates `pendingOperations` Map and `offlineItemIds` Set

**Green:**
- `src/lib/db/conversions.ts` — Port from web db.ts lines 916-978
- `src/lib/db/apply-pending-ops.ts` — Port from web db.ts lines 800-891. **Key design**: Accept queue arrays as parameters (dependency injection) instead of reading DB internally, for pure-function testing.

### Cycle 2.7: Aggregate Counts & Backup/Restore

**Red:**
- `src/lib/db/queue-counts.test.ts` — Returns counts for all 5 queues, zeros when empty
- `src/lib/db/backup.test.ts` — Export serializes all queue tables to JSON with schemaVersion, import restores, rejects invalid JSON / schema mismatch, roundtrip preserves data

**Green:** `src/lib/db/queue-counts.ts`, `src/lib/db/backup.ts` (JSON to documentDirectory, version stamp)

**Refactor:** Create `src/lib/db/index.ts` barrel export for all DB functions.

---

## Phase 3: Hooks & Contexts (Cycles 3.1-3.10)

### Cycle 3.1: useDebounce

**Red:** `src/hooks/useDebounce.test.ts` — Returns initial value, delays updates, resets on value change, cleans up on unmount

**Green:** `src/hooks/useDebounce.ts` — Direct port (identical React hook, no web APIs)

### Cycle 3.2: useOnlineStatus

**Red:** `src/hooks/useOnlineStatus.test.ts`
- NetInfo listener for connect/disconnect state changes
- Sets `wasOffline=true` on offline→online transition, `clearWasOffline()` resets
- Periodic Supabase ping every 60s when online, 5s timeout sets offline
- Cleans up listener + interval on unmount

**Green:** `src/hooks/useOnlineStatus.ts` — Replace `navigator.onLine` + window events with `@react-native-community/netinfo` addEventListener + Supabase `profiles` table ping

### Cycle 3.3: useDeviceType

**Red:** `src/hooks/useDeviceType.test.ts` — Returns phone/tablet at 600dp breakpoint, updates on dimension change

**Green:** `src/hooks/useDeviceType.ts` — `useWindowDimensions()`, `TABLET_BREAKPOINT = 600`

### Cycle 3.4: AuthContext

**Red:** `src/contexts/AuthContext.test.tsx`
- Initial loading state, null user when unauthenticated
- Sets user/profile after session restore from MMKV
- Derives isAuthenticated, isAdmin, isEmployee, isActive
- `signOut` clears user/profile/session, MMKV session, SQLite queues (but keeps items_cache)
- `refreshProfile` re-fetches from Supabase
- 10-second safety timeout stops loading spinner
- Throws when used outside provider

**Green:** `src/contexts/AuthContext.tsx` — Port from web `src/contexts/AuthContext.tsx`. Replace cookies with MMKV, add offline session restore, SQLite queue clearing on signOut

### Cycle 3.5: DomainContext

**Red:** `src/contexts/DomainContext.test.tsx`
- Null domain before selection, setDomain stores in context + MMKV
- Correct DomainConfig for each domain (tables, RPC, brand color, letter)
- Restores from MMKV on mount, clearDomain resets
- Throws outside provider

**Green:** `src/contexts/DomainContext.tsx` — New context using `src/lib/domain-config.ts`

### Cycle 3.6: SettingsContext

**Red:** `src/contexts/SettingsContext.test.tsx`
- Default settings, loads from MMKV on mount
- `updateSettings` merges partials, `resetSettings` reverts to defaults
- Three-state darkMode: `'light' | 'dark' | 'system'`

**Green:** `src/contexts/SettingsContext.tsx` — Port from web, replace localStorage with MMKV, three-state dark mode via `Appearance.setColorScheme`

### Cycle 3.7: BatchScanContext

**Red:** `src/contexts/BatchScanContext.test.tsx`
- Initializes empty with type "in"
- `addItem` adds with quantity=1 + generated idempotencyKey, returns false for duplicate
- `incrementItem` +1, rounds to 3 decimals
- `updateQuantity` clamps to [0.001, 9999.999], rounds to 3 decimals
- `removeItem`, `removeItems`, `clearBatch`, `setTransactionType`, `hasItem`
- `totalItems` count, `totalUnits` sum rounded to 3 decimals

**Green:** `src/contexts/BatchScanContext.tsx` — Direct port, replace `crypto.randomUUID()` with `expo-crypto` `randomUUID()`

### Cycle 3.8: useSyncQueue

**Red:** `src/hooks/useSyncQueue.test.ts` — **Most complex hook**
- Initial state: queueCount=0, isSyncing=false, lastSyncTime=null
- Loads count from SQLite on mount, handles SQLite error gracefully
- `queueTransaction` generates UUID + idempotencyKey, includes userId/domain, triggers immediate sync when online, throws when unauthenticated
- `syncQueue` processes FIFO, uses correct Supabase RPC per domain, removes on success, increments retry on failure, moves to sync_errors after 3 retries
- Does not sync when offline or unauthenticated, prevents concurrent sync (reentrant guard)
- Auto-syncs on offline→online transition, periodic 30s when queue>0
- Per-transaction 60s timeout

**Green:** `src/hooks/useSyncQueue.ts` — Port from web. Replace `fetch('/api/...')` with `supabase.rpc(config.rpcSubmitTransaction, {...})`. Replace `fetch('/api/sync-errors')` with direct Supabase insert. Use SQLite functions.

### Cycle 3.9: useSyncErrorCount

**Red:** `src/hooks/useSyncErrorCount.test.ts` — Returns 0 when unauthenticated, fetches from Supabase, refetch re-queries, isLoading states

**Green:** `src/hooks/useSyncErrorCount.ts` — Direct Supabase query on `inv_sync_errors` table

### Cycle 3.10: useScanFeedback

**Red:** `src/hooks/useScanFeedback.test.ts`
- `triggerFeedback` sets item, calls expo-haptics impactAsync, plays beep via expo-av
- isExiting at 800ms, hides at 1000ms, resets for rapid re-trigger
- `triggerDuplicateAlert` plays double-beep only (no visual/haptic)
- `clearFeedback` hides immediately, cleans up timeouts on unmount

**Green:** `src/hooks/useScanFeedback.ts` — Replace Web Audio API with expo-av preloaded sounds, replace `navigator.vibrate` with expo-haptics. Respects device silent/vibrate mode.

---

## Phase 4: Component Library (Cycles 4.1-4.5)

All tests use jest-expo + @testing-library/react-native.

### Cycle 4.1: Core UI Primitives Part 1

**Red + Green:** 5 components

| Test File | Component | Key Test Cases |
|-----------|-----------|----------------|
| `Button.test.tsx` | `Button.tsx` | renders text, onPress, disabled, isLoading/loadingText, leftIcon, variant styles |
| `Input.test.tsx` | `Input.tsx` | placeholder, onChangeText, error state, left icon, disabled |
| `Badge.test.tsx` | `Badge.tsx` | label text, colorScheme bg, variant styles (solid/subtle/outline) |
| `Alert.test.tsx` | `Alert.tsx` | title+message, status icons, close button |
| `Spinner.test.tsx` | `Spinner.tsx` | ActivityIndicator wrapper, size prop |

### Cycle 4.2: Core UI Primitives Part 2

**Red + Green:** 10 components

| Test File | Component | Key Test Cases |
|-----------|-----------|----------------|
| `Card.test.tsx` | `Card.tsx` | children, elevated shadow, onPress |
| `Modal.test.tsx` | `Modal.tsx` | isOpen visibility, onClose overlay, ModalHeader/Body/Footer |
| `Switch.test.tsx` | `Switch.tsx` | initial value, onValueChange |
| `Select.test.tsx` | `Select.tsx` | placeholder, shows options, onValueChange, displays selected |
| `SearchInput.test.tsx` | `SearchInput.tsx` | search icon, onChangeText, clear button |
| `Toast.test.tsx` | `Toast.tsx` | message, status icon, auto-dismiss |
| `Skeleton.test.tsx` | `Skeleton.tsx` | correct dimensions |
| `Divider.test.tsx` | `Divider.tsx` | horizontal separator |
| `Progress.test.tsx` | `Progress.tsx` | renders at 0%/50%/100% |
| `Avatar.test.tsx` | `Avatar.tsx` | image, initials fallback, default icon |

### Cycle 4.3: Indicator Components

**Red + Green:** 5 components

| Test File | Component | Key Test Cases |
|-----------|-----------|----------------|
| `TransactionTypeBadge.test.tsx` | `TransactionTypeBadge.tsx` | "CHECK IN"/"CHECK OUT"/"ADJUSTMENT" with green/red colors |
| `SyncStatusIndicator.test.tsx` | `SyncStatusIndicator.tsx` | green/spinning/orange/red dots with status text + count |
| `StockLevelBadge.test.tsx` | `StockLevelBadge.tsx` | Critical(red)/Low(orange)/Normal(green)/Over(blue) badges |
| `ConnectionStatusBar.test.tsx` | `ConnectionStatusBar.tsx` | hidden online, red bar offline, sync progress |
| `FailedSyncBanner.test.tsx` | `FailedSyncBanner.tsx` | tappable red bar "N failed — Tap to view", links to sync-errors |

### Cycle 4.4: Domain Components

**Red + Green:** 7 components

| Test File | Component | Key Test Cases |
|-----------|-----------|----------------|
| `BarcodeScanner.test.tsx` | `BarcodeScanner.tsx` | camera permission, CameraView, onScan, debounce, flash toggle, "Camera unavailable" on denied |
| `ScanSuccessOverlay.test.tsx` | `ScanSuccessOverlay.tsx` | item name, image, enter/exit animations, hidden when !isVisible |
| `BatchMiniList.test.tsx` | `BatchMiniList.tsx` | item count header, renders rows, empty state, maxVisibleItems=4 |
| `BatchItemRow.test.tsx` | `BatchItemRow.tsx` | name+quantity, stepper (300ms debounce, light haptic), onRemove, "Exceeds stock" |
| `BatchConfirmModal.test.tsx` | `BatchConfirmModal.tsx` | CHECK IN/OUT label, count+units, onConfirm, progress |
| `ItemImage.test.tsx` | `ItemImage.tsx` | expo-image URL, placeholder fallback, local file URI |
| `ItemSearchAutocomplete.test.tsx` | `ItemSearchAutocomplete.tsx` | search input, debounced SQLite LIKE results, onSelect, "No results" |

### Cycle 4.5: Layout Components

**Red + Green:** 3 components

| Test File | Component | Key Test Cases |
|-----------|-----------|----------------|
| `MobileHeader.test.tsx` | `MobileHeader.tsx` | title, domain letter+color, sync indicator, offline indicator, long-press domain switch, failed sync banner |
| `TabBar.test.tsx` | `TabBar.tsx` | nav items, active tab, badge count on scan tab |
| `StatusBarTheme.test.tsx` | — | `style='light'` on dark screens (camera), `style='dark'` on light screens |

---

## Phase 5: Screens & Integration (Cycles 5.1-5.10)

### Cycle 5.1: Login Screen — `src/app/(auth)/login.tsx`

**Tests:** renders inputs, validation errors for empty fields, calls signInWithPassword, error toast on invalid credentials, navigates to domain-picker on success, loading state, auto-redirect if session exists

### Cycle 5.2: Domain Picker — `src/app/domain-picker.tsx`

**Tests:** renders CM/FG cards with brand colors, sets domain in context, navigates to home, highlights last-selected, shows sign-out button

### Cycle 5.3: Home Screen — `src/app/(app)/(tabs)/index.tsx`

**Tests:** user display name, Check In/Out action buttons (navigate to scan), recent transactions, sync status + pending count, failed sync link, manual sync button, offline banner, **2-column grid on tablet**, batch success toast from URL param

### Cycle 5.4: Scan Screen — `src/app/(app)/(tabs)/scan.tsx`

**Tests:** renders scanner, looks up barcode in SQLite then Supabase, adds to batch, triggers feedback, duplicate alert modal, "Item not found" toast, batch mini-list, "Review Batch" navigation, transaction type toggle, manual search tab, **auto-switch to manual when camera denied**

### Cycle 5.5: Batch Review — `src/app/(app)/batch-review.tsx`

**Tests:** renders all items with quantities, stepper +/-, remove, confirm modal, queues via useSyncQueue on confirm, partial failure (red ring on failed items, "Retry Failed" button), navigates home with ?batchSuccess=N, empty state, **stock exceeded validation for check-out**

### Cycle 5.6: History — `src/app/(app)/(tabs)/history.tsx`

**Tests:** fetches from Supabase for current domain, renders with type badges + relative time, empty state, loading skeleton, pull-to-refresh, **pending items prepended with yellow "Pending" badge** from SQLite transaction_queue, stock_before/stock_after in detail modal, sync_status badge per row

### Cycle 5.7: Profile — `src/app/(app)/(tabs)/profile.tsx`

**Tests:** avatar/name/role, 3-state dark mode selector, queue counts, failed sync link, Switch Domain button, sign-out button, **logout warning when queue>0** (attempt sync first if online, "N transactions will be discarded" modal)

### Cycle 5.8: Sync Errors — `src/app/(app)/sync-errors.tsx`

**Tests:** fetches errors for current user, renders list with error messages, **employee retry button** per item, dismiss button, updates status on retry/dismiss, empty state

### Cycle 5.9: Navigation Layout & Background Sync

**Tests for `src/app/(app)/_layout.tsx`:**
- Redirects to login when unauthenticated, to domain-picker when no domain
- Phone: tab layout, Tablet: sidebar layout (600dp breakpoint)
- Wraps in BatchScanProvider
- Registers/unregisters background fetch

**Tests for `src/lib/sync/backgroundTask.ts`:**
- Exports task name, processes queued transactions, returns NewData/NoData/Failed
- URL polyfill imported FIRST
- `minimumInterval: 900` (15 min Android minimum)

### Cycle 5.10: E2E Tests (Maestro — written last)

**Flows in `mobile/maestro/`:**
1. `login-flow.yaml` — credentials → domain picker → home
2. `domain-selection.yaml` — select CM → verify orange branding
3. `scan-and-batch.yaml` — manual scan → add → review → submit → success
4. `offline-queue.yaml` — airplane on → scan → verify pending → airplane off → verify sync
5. `switch-domain.yaml` — profile → switch → verify FG branding
6. `sync-errors.yaml` — navigate → verify list → retry an error

---

## Dependency Graph

```
Phase 1 (Foundation) → Phase 2 (Data Layer) → Phase 3 (Hooks/Contexts) → Phase 4 (Components) → Phase 5 (Screens)
```

Phase 3 internal dependencies:
```
useDebounce, useDeviceType, useScanFeedback — independent
useOnlineStatus — depends on Supabase client (1.6)
AuthContext — depends on MMKV (1.5), Supabase (1.6), SQLite queue clear (Phase 2)
DomainContext — depends on MMKV (1.5), domain-config (1.6)
SettingsContext — depends on MMKV (1.5)
BatchScanContext — depends on types (1.1), constants (1.2)
useSyncQueue — depends on AuthContext, DomainContext, useOnlineStatus, all SQLite functions
useSyncErrorCount — depends on AuthContext, Supabase client
```

---

## Critical Source Files to Port

| Web Source | Mobile Target | Priority |
|-----------|--------------|----------|
| `src/lib/offline/db.ts` (59 functions, 978 lines) | `src/lib/db/*.ts` (8 module files) | **Highest** |
| `src/hooks/useSyncQueue.ts` | `src/hooks/useSyncQueue.ts` | **Highest** |
| `src/contexts/BatchScanContext.tsx` | `src/contexts/BatchScanContext.tsx` | High |
| `src/contexts/AuthContext.tsx` | `src/contexts/AuthContext.tsx` | High |
| `src/hooks/useOnlineStatus.ts` | `src/hooks/useOnlineStatus.ts` | High |
| `src/hooks/useScanFeedback.ts` | `src/hooks/useScanFeedback.ts` | Medium |
| `src/lib/actions/_shared/item-queries.ts` | `src/lib/domain-config.ts` + `src/lib/domain/queries.ts` | Medium |

---

## Verification

After each phase:
1. **Phase 1**: `npx vitest run` passes all util/constant/storage tests
2. **Phase 2**: All 59 SQLite functions tested, `applyPendingOperationsToItems` matches web behavior
3. **Phase 3**: All hooks/contexts pass with mocked dependencies, coverage >=80%
4. **Phase 4**: `npx jest` passes all component render/interaction tests
5. **Phase 5**: All screens render, E2E Maestro flows pass on emulator

Final: `npx vitest run --coverage` + `npx jest --coverage` show >=80% on `lib/`, `hooks/`, `contexts/`.
