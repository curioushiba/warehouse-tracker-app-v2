# Commissary System — Implementation Plan

## Context

PackTrack needs a commissary production tracking system. Commissary is the in-house production unit (bakery, prepared foods, etc.). Staff need to record what they produced, see intelligent daily recommendations, and track production against targets. Admins need a management interface for commissary items, targets, and analytics.

**Key Decisions (from brainstorm):**
- **Separate Expo app** (`commissary/`) — different workflow from warehouse employee app
- **Simple production logging** — no BOM/recipe auto-deduction; just record item + quantity produced
- **Reuse 'employee' role** — no new auth role; same credentials work in both apps
- **Hybrid intelligence** — smart recommendations from consumption data + admin-set manual targets/overrides

---

## Phase 1: Database Foundation

### Migration: `supabase/migrations/026_commissary_system.sql`

#### 1a. Add `is_commissary` flag to `inv_items`

```sql
ALTER TABLE inv_items ADD COLUMN is_commissary BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_inv_items_commissary ON inv_items(is_commissary) WHERE is_commissary = true;
```

Why a boolean, not a tags system: the requirement is binary, no other tags are needed, and it's trivially filterable in all existing queries.

#### 1b. `inv_production_logs` — Production Event Records

Each production event is recorded here. It also auto-creates a `check_in` transaction on the finished item.

```sql
CREATE TABLE inv_production_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES inv_items(id),
  quantity_produced  DECIMAL NOT NULL CHECK (quantity_produced > 0),
  expected_quantity  DECIMAL,              -- from target, if any
  waste_quantity     DECIMAL DEFAULT 0,
  waste_reason       TEXT,
  status             TEXT NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  user_id            UUID NOT NULL REFERENCES profiles(id),
  notes              TEXT,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  device_timestamp   TIMESTAMPTZ NOT NULL,
  event_timestamp    TIMESTAMPTZ NOT NULL,
  server_timestamp   TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key    UUID UNIQUE
);
-- Indexes: item_id, user_id, event_timestamp DESC, status
```

#### 1c. `inv_production_targets` — Daily Production Goals

```sql
CREATE TABLE inv_production_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES inv_items(id),
  target_quantity    DECIMAL NOT NULL CHECK (target_quantity > 0),
  target_date        DATE NOT NULL,
  priority           INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  -- Recurring pattern support
  is_recurring       BOOLEAN NOT NULL DEFAULT false,
  day_of_week        INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  notes              TEXT,
  created_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_id, target_date)
);
-- Indexes: target_date, item_id
```

#### 1d. `submit_production` RPC Function

```
submit_production(p_item_id, p_quantity_produced, p_user_id, p_device_timestamp, p_idempotency_key, p_waste_quantity, p_waste_reason, p_notes, p_started_at):
  1. Idempotency check (return existing if key matches)
  2. Verify user is active
  3. Verify item exists, is_commissary=true, not archived
  4. Clamp event_timestamp (same rules as submit_transaction: ±5min future, -30d past)
  5. Call submit_transaction('check_in', item_id, quantity_produced, ...) — auto-adds stock
  6. Insert production_log record
  7. Return production_log
```

This is `SECURITY DEFINER` so it bypasses RLS for the atomic multi-table operation.

#### 1e. `inv_production_recommendations` View

```sql
-- Combines: current stock, consumption rates, targets, today's production
SELECT
  i.id, i.name, i.sku, i.current_stock, i.min_stock, i.max_stock, i.unit,
  COALESCE(cr.daily_consumption_rate, 0) as daily_consumption_rate,
  -- Days until stockout
  CASE WHEN cr.daily_consumption_rate > 0
    THEN FLOOR(i.current_stock / cr.daily_consumption_rate)
    ELSE NULL END as days_of_stock,
  -- Deficit below min_stock
  GREATEST(0, COALESCE(i.min_stock, 0) - i.current_stock) as deficit,
  -- Today's target (from admin-set targets)
  COALESCE(pt.target_quantity, 0) as target_today,
  COALESCE(pt.priority, 50) as priority,
  -- Already produced today
  COALESCE(SUM(pl.quantity_produced), 0) as produced_today,
  -- Remaining to target
  GREATEST(0, COALESCE(pt.target_quantity, 0) - COALESCE(SUM(pl.quantity_produced), 0)) as remaining_target
FROM inv_items i
LEFT JOIN inv_item_consumption_rates cr ON cr.item_id = i.id
LEFT JOIN inv_production_targets pt ON pt.item_id = i.id AND pt.target_date = CURRENT_DATE
LEFT JOIN inv_production_logs pl ON pl.item_id = i.id
  AND pl.event_timestamp::date = CURRENT_DATE AND pl.status = 'completed'
WHERE i.is_commissary = true AND i.is_archived = false
GROUP BY i.id, cr.daily_consumption_rate, pt.target_quantity, pt.priority;
```

#### 1f. RLS Policies

- `inv_production_logs`: authenticated users can SELECT all, INSERT with `auth.uid() = user_id`
- `inv_production_targets`: authenticated can SELECT all, admins can INSERT/UPDATE/DELETE
- Production submission goes through `SECURITY DEFINER` function

#### 1g. Update TypeScript types

- **`src/lib/supabase/types.ts`** — add `is_commissary` to inv_items, add new table types
- **`mobile/src/lib/types.ts`** — add `is_commissary` to `Item` type

---

## Phase 2: Web Admin Interface

### 2a. Server Actions — `src/lib/actions/commissary.ts`

Following the `ActionResult<T>` pattern with `success()`/`failure()` helpers:

```
// Production Logs
getProductionLogs(filters?)        → PaginatedResult<ProductionLog>
getProductionLogById(id)           → ProductionLogWithDetails

// Production Targets
getProductionTargets(filters?)     → ProductionTarget[]
setProductionTarget(data)          → ProductionTarget
updateProductionTarget(id, data)   → ProductionTarget
deleteProductionTarget(id)         → void
bulkSetRecurringTargets(data)      → ProductionTarget[]

// Intelligence
getProductionRecommendations()     → ProductionRecommendation[]
getCommissaryDashboardData()       → CommissaryDashboardData

// Item management (extend existing)
toggleCommissaryFlag(itemId, isCommissary) → Item
getCommissaryItems()               → Item[]
```

### 2b. Admin Routes

**Sidebar addition** in `AdminSidebar.tsx` — new item under "Inventory" section:
```
{ label: "Commissary", href: "/admin/commissary", icon: ChefHat }
```

**Page title** in `layout.tsx` pageTitles map.

#### `/admin/commissary` — Commissary Dashboard

Server Component (Pattern C) with client islands:
- **Production Progress Today** — ring/bar showing completed vs target across all items
- **Priority Items** — sorted list of commissary items by urgency (CRITICAL/URGENT/HIGH/NORMAL)
- **Smart Recommendations** — from `inv_production_recommendations` view
- **Today's Production Log** — timeline of production events
- **Quick stat cards**: Total commissary items, items below target, total produced today

#### `/admin/commissary/targets` — Production Targets Management

Client Component (Pattern A — self-contained CRUD):
- Table of targets with columns: Item, Target Qty, Date, Priority, Status (met/unmet)
- Create/Edit modal: select commissary item, quantity, date, priority slider
- Bulk create recurring targets (item + quantity + weekday checkboxes)
- Calendar-style view toggle for visual overview

#### `/admin/commissary/production` — Production History

Client Component (Pattern A):
- Paginated table: Date, Item, Quantity, Waste, User, Status
- Filters: date range, item, user
- Drill-down to production detail

#### `/admin/commissary/analytics` — Production Analytics

- **Production volume** — bar chart by day/week/month
- **Target completion rate** — % of targets met over time
- **Waste tracking** — by item, by reason
- **Top producers** — by staff member
- **Stock days forecast** — how many days of stock remain per commissary item

### 2c. Items Page Enhancement

Add an `is_commissary` toggle/badge to the existing items list and detail pages:
- Filter option on items list: "Commissary items only"
- Toggle switch on item edit form
- Badge on item cards/rows for commissary items

---

## Phase 3: Commissary Mobile App (`commissary/`)

### 3a. Project Scaffolding

New Expo SDK 54 project following exact same patterns as `mobile/`:

```
commissary/
  app.json              # scheme='packtrack-commissary', package='com.packtrack.commissary'
  package.json          # Same deps as mobile/ (expo 54, expo-router, expo-sqlite, etc.)
  tsconfig.json         # @/* → src/*
  src/
    app/                # Expo Router
    components/         # UI components (port from mobile/)
    contexts/           # AuthContext, SettingsContext, ThemeContext
    hooks/              # useSyncQueue, useProductionQueue
    lib/                # db/, sync/, supabase, types
    theme/              # tokens (amber/warm accent), ThemeContext, animations
```

**Theme differentiation**: Different accent color palette (warm amber/orange vs the warehouse app's blue/green) so staff instantly know which app they're in.

### 3b. Auth — Same Supabase, Same Role

- Same `supabase.ts` client singleton pattern with AsyncStorage
- Same `AuthContext.tsx` pattern (user + profile fetch)
- No role check — any active employee can use the commissary app
- Username-to-email convention: `${username}@employee.internal`

### 3c. Screens (Expo Router)

```
src/app/
  _layout.tsx                    # Root: providers (same stack as mobile/)
  (auth)/
    _layout.tsx
    login.tsx
  (app)/
    _layout.tsx                  # Auth guard
    (tabs)/
      _layout.tsx                # 3-4 tabs
      index.tsx                  # Dashboard
      produce.tsx                # Log production
      queue.tsx                  # Today's queue / targets
      profile.tsx                # Profile & sync
    production/[id].tsx          # Production detail
```

#### Dashboard Tab (index.tsx)
- Today's production progress (produced vs targets)
- Priority items list sorted by urgency
- Smart recommendations section
- Quick-produce buttons for top priority items

#### Produce Tab (produce.tsx)
- Search/browse commissary items
- For each item: show current stock, target, already produced today
- Tap to log production → form: quantity, waste (optional), notes (optional)
- Confirm → calls `submit_production` RPC via sync queue

#### Queue Tab (queue.tsx)
- Today's target checklist: each commissary item with target vs actual
- Sort by priority (CRITICAL first)
- Visual progress (progress bar per item)
- Toggle: show completed / show remaining only

#### Profile Tab (profile.tsx)
- Same as mobile/: user info, sync status, settings, sign out

### 3d. Local SQLite Schema

```sql
-- Offline production queue
pending_productions (
  id TEXT PRIMARY KEY,           -- Client-generated UUID (idempotency key)
  item_id TEXT NOT NULL,
  quantity_produced REAL NOT NULL,
  waste_quantity REAL DEFAULT 0,
  waste_reason TEXT,
  notes TEXT,
  device_timestamp TEXT NOT NULL,
  started_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending'  -- pending | syncing | failed
)

-- Local cache of commissary items
item_cache (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  current_stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  max_stock REAL,
  unit TEXT DEFAULT 'pcs',
  is_commissary INTEGER DEFAULT 0,
  category_name TEXT,
  updated_at TEXT NOT NULL
)

-- Cached targets for today
target_cache (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  target_quantity REAL NOT NULL,
  target_date TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  notes TEXT
)

-- Cached production logs for today (for progress display)
production_cache (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  quantity_produced REAL NOT NULL,
  event_timestamp TEXT NOT NULL,
  status TEXT NOT NULL
)

-- Key-value metadata
sync_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)
```

### 3e. Sync Mechanism

Same pattern as `mobile/src/lib/sync/`:

```
processQueue(db, supabase, userId):
  1. Get all pending_productions
  2. For each: mark 'syncing', call supabase.rpc('submit_production', {...})
  3. On success (including 23505 duplicate): remove from queue
  4. On failure: mark 'failed'

refreshCache(db, supabase):
  1. Fetch commissary items (inv_items WHERE is_commissary=true, is_archived=false)
  2. Fetch today's targets (inv_production_targets WHERE target_date=today)
  3. Fetch today's production logs
  4. Fetch recommendations view data
  5. Update SQLite caches
```

### 3f. Smart Recommendations on Device

The recommendations view data is cached locally. The app displays:

| Priority | Criteria | Badge Color |
|----------|----------|-------------|
| CRITICAL | Stock = 0 AND has consumption | Red |
| URGENT | Days-of-stock ≤ 1 OR admin priority ≥ 80 | Orange |
| HIGH | Days-of-stock ≤ 3 OR deficit > 0 OR target unmet | Yellow |
| NORMAL | Active commissary item, no urgency | Default |

Sort order: CRITICAL → URGENT → HIGH → NORMAL, then by admin priority within each level.

**Hybrid logic**: When admin targets exist for today, those take precedence in the queue display. Smart recommendations fill in for items without explicit targets.

---

## Phase 4: Integration Points

### 4a. Production → Inventory

Production logs auto-create `check_in` transactions via the `submit_production` RPC. This means:
- Main inventory dashboard sees stock increases
- Consumption rate views remain accurate
- Transaction history shows production check-ins (with `[Production]` in notes)

### 4b. Alerts

Add alert type `production_target_unmet` to existing alerts table CHECK constraint. Optionally run an end-of-day check comparing targets vs actuals.

### 4c. Main Dashboard Widget

Add a "Commissary" stat card to the admin dashboard (`DashboardClient.tsx`) showing:
- Active commissary items count
- Today's production: X units / Y target
- Target completion %

---

## Implementation Order

1. **Migration** (`026_commissary_system.sql`) — tables, RPC, views, RLS, indexes
2. **TypeScript types** — update `types.ts` in web and mobile
3. **Server actions** (`commissary.ts`) — all CRUD + intelligence queries
4. **Admin UI** — commissary dashboard, targets, production history, analytics pages + sidebar nav
5. **Items page update** — is_commissary toggle, filter
6. **Commissary app scaffolding** — project setup, providers, theme, auth
7. **Commissary app screens** — dashboard, produce, queue, profile
8. **Commissary app offline sync** — SQLite schema, queue, cache refresh
9. **Main dashboard widget** — commissary stat card

---

## Files to Create/Modify

### New Files
- `supabase/migrations/026_commissary_system.sql`
- `src/lib/actions/commissary.ts`
- `src/app/admin/commissary/page.tsx` (dashboard)
- `src/app/admin/commissary/targets/page.tsx`
- `src/app/admin/commissary/production/page.tsx`
- `src/app/admin/commissary/analytics/page.tsx`
- `src/app/admin/commissary/loading.tsx`
- `commissary/` — entire new Expo project (~30-40 source files)

### Modified Files
- `src/lib/supabase/types.ts` — new table types, is_commissary on inv_items
- `src/components/layout/AdminSidebar.tsx` — add Commissary nav item
- `src/app/admin/layout.tsx` — add pageTitles entry
- `src/app/admin/DashboardClient.tsx` — add commissary stat card
- `src/app/admin/items/` — is_commissary toggle/filter
- `mobile/src/lib/types.ts` — add is_commissary to Item
- `mobile/src/lib/db/schema.ts` — add is_commissary to item_cache
- `mobile/src/lib/db/operations.ts` — include is_commissary in cache operations

---

## Verification Plan

1. **Migration**: Run `supabase db reset` or apply migration, verify tables/views/functions exist
2. **Server actions**: Run `npm run test:run -- src/lib/actions/commissary.test.ts`
3. **Web admin**: `npm run dev`, navigate to `/admin/commissary`, verify all pages render
4. **Admin flow**: Create commissary items → set targets → verify recommendations appear
5. **Commissary app**: `cd commissary && npx expo start`, test on Android emulator
6. **Offline flow**: Enable airplane mode → log production → go online → verify sync
7. **Integration**: Verify production check-in appears in main inventory transaction history
8. **E2E**: Set target → log production in commissary app → verify dashboard shows progress
