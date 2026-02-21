# PackTrack Major Refactor Plan

**Date:** 2026-02-21
**Objective:** Simplify the PackTrack system by removing Commissary and Frozen Goods domains, eliminating the PWA and legacy mobile app, and creating a streamlined React Native (Expo) application dedicated solely to the core "Original Items" inventory.

---

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Remove CM/FG from Web App | **DONE** | 25 files deleted, 7 files edited |
| Phase 2: Database Migration | **DONE** | Created `022_drop_domain_tables.sql` (kept 019-021 in place) |
| Phase 3: Remove PWA Infrastructure | **DONE** | 27 files deleted, 3 files edited, `next-pwa` removed |
| Phase 4: Cleanup & Verification | **DONE** | Sync code simplified, grep sweep clean, build passes |
| Phase 4b: Delete Legacy Mobile App | **DONE** | Entire mobile/ directory deleted, root config clean |
| Phase 5: Build New React Native App | **DONE** | 60+ source files, 79 tests (66 vitest + 13 jest), all modules built |

### Phase 4 Verification Results (2026-02-21)
- **Build**: Passes (`npm run build`)
- **Lint**: Passes (`npm run lint`, only pre-existing warnings)
- **Tests**: 63 pre-existing failures (unrelated to refactor)
- **Grep sweep**: Zero stale references to commissary, frozen goods, FG/CM domains, PWA, or next-pwa in `src/`
- **Additional fixes**: Excluded `mobile/` from root `tsconfig.json` (pre-existing build issue), fixed stale comment in `ItemsListView.tsx`

---

## Background & Motivation

The codebase currently maintains three nearly-parallel inventory domain stacks:

| Domain | DB Prefix | Admin Routes | API Routes | PWA | Server Actions |
|--------|-----------|-------------|------------|-----|----------------|
| Original Items | `inv_` | `/admin/items`, `/admin/categories` | `/api/transactions` | Employee PWA (main) | `items.ts`, `transactions.ts` |
| Frozen Goods | `fg_` | `/admin/frozengoods` | `/api/frozen-goods` | `/PWA/frozengoodspwa` | `frozen-goods-items.ts`, `frozen-goods-transactions.ts` |
| Commissary | `cm_` | `/admin/commissary` | `/api/commissary` | `/PWA/commissarypwa` | `commissary-items.ts`, `commissary-transactions.ts` |

This triplication creates significant maintenance overhead with minimal differentiation between domains. The existing mobile app (`/mobile`) also carries domain-picker logic and multi-domain complexity. This refactor collapses everything down to the core Original Items inventory with a single, focused native mobile app.

---

## Phase 1: Remove Commissary & Frozen Goods from Web App -- DONE

### 1.1 Delete Admin Routes (15 files)

```
src/app/admin/commissary/                          # 8 files
  items/page.tsx
  items/loading.tsx
  items/new/page.tsx
  items/[id]/page.tsx
  items/[id]/loading.tsx
  items/[id]/edit/page.tsx
  transactions/page.tsx
  transactions/loading.tsx

src/app/admin/frozengoods/                         # 7 files
  items/page.tsx
  items/loading.tsx
  items/new/page.tsx
  items/[id]/page.tsx
  items/[id]/edit/page.tsx
  transactions/page.tsx
  transactions/loading.tsx
```

### 1.2 Delete API Routes (2 files)

```
src/app/api/commissary/transactions/submit/route.ts
src/app/api/frozen-goods/transactions/submit/route.ts
```

### 1.3 Delete Server Actions & Tests (8 files)

```
src/lib/actions/commissary-items.ts
src/lib/actions/commissary-items.test.ts
src/lib/actions/commissary-transactions.ts
src/lib/actions/commissary-transactions.test.ts
src/lib/actions/frozen-goods-items.ts
src/lib/actions/frozen-goods-items.test.ts
src/lib/actions/frozen-goods-transactions.ts
src/lib/actions/frozen-goods-transactions.test.ts
```

### 1.4 Modify AdminSidebar.tsx

**File:** `src/components/layout/AdminSidebar.tsx`

Remove from `navSections`:
- **"Frozen Goods"** section (lines ~57-62): links to `/admin/frozengoods/items` and `/admin/frozengoods/transactions`
- **"Commissary"** section (lines ~63-69): links to `/admin/commissary/items` and `/admin/commissary/transactions`
- **"Applications"** section (~line 78-82): PWA Hub link at `/PWA`

Remove unused icon imports: `Snowflake`, `ChefHat` (and any PWA-related icons).

### 1.5 Update Barrel Export

**File:** `src/lib/actions/index.ts`

Remove any re-exports referencing commissary or frozen-goods action modules.

---

## Phase 2: Remove Database Migrations -- DONE

### 2.1 Migration Strategy (UPDATED)

Migration files 019, 020, 021 are **kept in place** — Supabase tracks applied migrations by filename, so deleting them would break `supabase db reset`. Instead, a new reverse migration was created:

### 2.2 Reverse Migration Created: `022_drop_domain_tables.sql`

This migration drops all FG/CM objects in correct dependency order:

**Frozen Goods:**
- Tables: `fg_items`, `fg_transactions`
- Sequences: `fg_sku_sequence`
- Functions: `generate_fg_sku()`, `submit_fg_transaction()`, `handle_fg_item_update()`, `check_fg_low_stock()`
- View: `fg_low_stock_items`

**Commissary:**
- Tables: `cm_items`, `cm_transactions`
- Sequences: `cm_sku_sequence`
- Functions: `generate_cm_sku()`, `submit_cm_transaction()`, `handle_cm_item_update()`, `check_cm_low_stock()`
- View: `cm_low_stock_items`

**Category cleanup:**
- Remove the "Frozen Goods" category row inserted by migration 019 (if no original items reference it).

---

## Phase 3: Remove PWA Infrastructure -- DONE

### 3.1 Delete PWA App Directory (21 files)

```
src/app/PWA/                                       # Entire directory
  layout.tsx                                       # Root PWA layout
  (hub)/layout.tsx                                 # Hub layout
  (hub)/page.tsx                                   # Hub page
  commissarypwa/                                   # 9 files (layout, client layout, manifest, pages)
  frozengoodspwa/                                  # 9 files (layout, client layout, manifest, pages)
```

### 3.2 Delete PWA Icons (4 files)

```
public/icons/commissary/icon-192x192.png
public/icons/commissary/icon-512x512.png
public/icons/frozen-goods/icon-192x192.png
public/icons/frozen-goods/icon-512x512.png
```

### 3.3 Remove PWA Configuration

**Evaluate** whether the main admin site still requires PWA/offline support:

- **If NO** (recommended — admin is desktop/tablet, always online):
  - Remove `next-pwa` from `next.config.mjs`
  - Delete `public/sw.js`
  - Delete `public/manifest.json`
  - Remove `next-pwa` from `package.json` dependencies
  - Clean up any PWA-related `<meta>` tags or `<link>` tags in root `layout.tsx`

- **If YES** (keep admin as PWA):
  - Keep `next-pwa` config and `sw.js` but audit the precache list to remove commissary/frozen-goods chunks

---

## Phase 4: Remove Legacy Mobile App -- NOT STARTED

### 4.1 Delete Entire Mobile Directory

```
mobile/                                            # Entire directory (~1,000+ files)
```

This removes:
- **8 screens** (Login, Domain Picker, Home, Scan, Batch Review, History, Profile, Sync Errors)
- **37 components** across `ui/`, `indicators/`, `domain/`, `layout/`
- **Theme system** (`tokens.ts`, `ThemeContext.tsx`, `animations.ts`)
- **Offline sync engine** (SQLite queue, background tasks, backup)
- **427 Jest tests + 579 Vitest tests**
- **Domain Picker** (`domain-picker.tsx`, `DomainContext`) — the multi-domain complexity

### 4.2 Clean Up Root Configuration

- Remove mobile-related scripts from root `package.json` (if any)
- Remove mobile workspace references (if using workspaces)
- Update `.gitignore` if it has mobile-specific entries

---

## Phase 5: Build New React Native (Expo) App -- NOT STARTED

### 5.1 Project Initialization

Create a fresh Expo project at `/mobile`:

```bash
npx create-expo-app@latest mobile --template blank-typescript
```

**Stack:**
- **Expo SDK 54** (latest stable)
- **Expo Router** (file-based navigation)
- **expo-sqlite** (offline transaction queue)
- **@supabase/supabase-js** (backend)
- **expo-camera** (barcode/QR scanner)
- **react-native-reanimated** (animations)
- **AsyncStorage** (settings/session persistence)
- **Android-only** (matches current target)

### 5.2 Navigation Structure

```
src/app/
  _layout.tsx                          # Root: SQLiteProvider, AuthProvider, ThemeProvider
  (auth)/
    _layout.tsx                        # Auth stack
    login.tsx                          # Email/password login
  (app)/
    _layout.tsx                        # Authenticated stack with tab navigator
    (tabs)/
      _layout.tsx                      # Tab bar: Home, Scan, History, Profile
      index.tsx                        # Home — dashboard with Stock In/Out quick actions
      scan.tsx                         # Barcode/QR scanner for item lookup
      history.tsx                      # Recent transaction history for employee
      profile.tsx                      # Employee info, manual sync trigger, settings
    batch-review.tsx                   # Review queued transactions before sync
    transaction/[id].tsx               # Confirm quantity + type (in/out) and submit
    sync-errors.tsx                    # View failed sync items (admin only)
```

### 5.3 Core Architecture (Simplified)

**No Domain Context.** The app directly queries `inv_items`, `inv_categories`, and `inv_transactions` — no domain picker, no domain filtering, no `fg_*` or `cm_*` tables.

**Key modules to implement:**

| Module | Purpose | Reuse from Legacy? |
|--------|---------|-------------------|
| `lib/supabase.ts` | Supabase client singleton | Adapt pattern |
| `lib/db/` | SQLite offline queue (schema, operations) | Fresh implementation, simpler schema |
| `lib/sync/` | Online/offline detection, queue processing | Adapt core logic, remove domain awareness |
| `contexts/AuthContext.tsx` | Auth state, login/logout | Adapt, remove domain references |
| `contexts/SettingsContext.tsx` | Currency, dark mode | Adapt from legacy |
| `hooks/useSyncQueue.ts` | Sync queue management | Adapt, single-domain only |
| `components/ui/` | Button, Card, Input, etc. | Rebuild fresh (simpler) |
| `components/BarcodeScanner.tsx` | expo-camera barcode scanner | Rebuild (no domain dispatch) |
| `theme/` | Colors, typography, spacing | Rebuild (simpler, no domain theming) |

### 5.4 Simplification Benefits

1. **No Domain Context** — direct table queries, no prefix routing
2. **Single codebase** — one app replaces three PWAs + one mobile app
3. **Native camera** — barcode scanner uses expo-camera, not browser-based html5-qrcode
4. **Simpler offline sync** — one queue for one set of tables
5. **Easier maintenance** — ~60% less code surface area
6. **Better UX** — native animations, haptics, push notifications (future)

### 5.5 Test Strategy

- **Vitest** for pure logic (lib, hooks, contexts) using `better-sqlite3` mocks
- **jest-expo** for component and screen tests
- **Maestro** (future) for E2E flows

---

## Execution Order & Dependencies

```
Phase 1 (Web cleanup)     ──┐
Phase 2 (DB migrations)   ──┤── Can be done in parallel
Phase 3 (PWA removal)     ──┘
         │
         ▼
Phase 4 (Delete legacy mobile)
         │
         ▼
Phase 5 (Build new mobile app)  ── Sequential; depends on clean state
```

**Phases 1-3** are independent and can be executed in parallel or any order.
**Phase 4** should follow Phases 1-3 to ensure no cross-references remain.
**Phase 5** starts fresh after Phase 4, with a clean codebase as foundation.

---

## Risk Considerations

| Risk | Mitigation |
|------|-----------|
| Database has production data in `fg_*`/`cm_*` tables | Create reverse migration (022) with `IF EXISTS` guards; back up data first |
| References to deleted paths in other files | Run full `grep` for `commissary`, `frozen`, `frozengoods`, `fg_`, `cm_`, `/PWA` across codebase after deletion |
| Breaking admin build after removal | Run `npm run build` after each phase to catch missing imports/references |
| Loss of tested mobile patterns | Document reusable patterns (sync engine, auth flow) before deleting `/mobile` |
| Service worker caching stale routes | Force `sw.js` update or remove PWA config entirely |

---

## File Count Summary

| Phase | Action | Files Affected |
|-------|--------|---------------|
| Phase 1 | Delete admin/API/actions | ~25 files deleted, 2 files modified |
| Phase 2 | Drop migrations | 3 files deleted, 1 new migration created |
| Phase 3 | Remove PWA | ~25 files deleted, 2-3 config files modified |
| Phase 4 | Delete mobile | ~1,000+ files deleted |
| Phase 5 | New mobile app | ~50-80 new files created |
| **Total** | **Net reduction** | **~1,000+ files removed** |
