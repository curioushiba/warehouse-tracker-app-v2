### Employee flow performance audit report (2025-12-15)

### Executive summary
The employee account flow feels slow primarily because the `/employee` experience is **entirely client-rendered** (layout + every route uses `"use client"`), and most steps rely on **client-side data fetching after hydration**. In addition, the global middleware currently performs **Supabase auth + a `profiles` lookup on every navigation**, which adds latency before rendering can even begin.

This document records the key bottlenecks found in the current codebase and a prioritized plan to improve both **actual load time** and **perceived responsiveness**.

### Scope
- Routes: `src/app/employee/*`
- Shared auth/sync infrastructure:
  - `src/contexts/AuthContext.tsx`
  - `src/hooks/useSyncQueue.ts`, `src/hooks/useOnlineStatus.ts`
  - `src/lib/supabase/middleware.ts`, `src/middleware.ts`
  - `src/lib/actions/items.ts`, `src/lib/actions/transactions.ts`

### Key findings
- **All employee pages are Client Components**: every file under `src/app/employee/**` begins with `"use client"` (including `src/app/employee/layout.tsx`). This increases JS/hydration work and pushes data fetching to the client.
- **Client layout blocks UI behind auth loading**:
  - `src/app/employee/layout.tsx` shows a full-screen spinner while `AuthContext` is loading, even though middleware already protects the routes.
- **Middleware adds per-navigation DB work**:
  - `src/lib/supabase/middleware.ts` calls `supabase.auth.getUser()` and then queries `profiles` (`role, is_active`) on every matched request for role-based routing.
  - This can become a meaningful part of perceived “navigation time,” especially on slower networks.
- **Over-fetching items to render transaction display names**:
  - `src/app/employee/page.tsx` and `src/app/employee/history/page.tsx` call `getUserTransactions(user.id)` **and** `getItems()` (which selects `*` for all non-archived items) just to map `transaction.item_id → item.name`.
  - This becomes increasingly expensive as the items table grows.
- **Scan lookups can be two sequential requests per scan**:
  - `src/app/employee/scan/page.tsx` tries `getItemByBarcode(code)` and then `getItemBySku(code)` if not found, which increases latency for common “not found on first query” cases.
- **Batch submit is sequential**:
  - `src/app/employee/batch-review/page.tsx` submits each queued item via `await submitTransaction(...)` in a loop.
  - For larger batches, this makes the “Submit” step feel slow even when the backend is healthy.
- **Heavy scanner dependency on the critical path**:
  - `src/components/scanner/BarcodeScanner.tsx` imports `html5-qrcode` at module load and starts camera/scanning on mount. This can inflate route JS and delay interaction on `/employee/scan`.

### Route-by-route breakdown (what happens today)
#### `/employee/login`
- File: `src/app/employee/login/page.tsx`
- Behavior:
  - Client-only login form calling `signInEmployee(...)`, then `router.push("/employee")`.
- Likely cost:
  - Not the primary issue; the slow-feel tends to show up after login and across subsequent steps.

#### `/employee` (employee home)
- File: `src/app/employee/page.tsx`
- Behavior:
  - Client-only page; after hydration it runs:
    - `refreshProfile()` (extra profile fetch) on mount
    - `getUserTransactions(user.id)` + `getItems()` in parallel
    - Builds an in-memory `Map<itemId, item>` just to show item names for 3 recent transactions
    - Computes today’s transaction count client-side
- Likely cost:
  - Unnecessary large data fetch (`getItems()` returns all items + all columns) for a small UI need.

#### `/employee/scan`
- File: `src/app/employee/scan/page.tsx`
- Behavior:
  - Client-only page; on mount it fetches “recent items” using `getItems({ isArchived: false })` then slices to 4.
  - Camera scan path:
    - `BarcodeScanner` mounts and initializes camera + `html5-qrcode`
    - Each scan can trigger two server action calls: barcode lookup then SKU lookup
  - Manual path:
    - `ItemSearchAutocomplete` uses `searchItems(query)` which already limits to 15 (good)
- Likely cost:
  - Heavy scanner JS + camera init + potentially 2 lookups per scan.

#### `/employee/batch-review`
- File: `src/app/employee/batch-review/page.tsx`
- Behavior:
  - Client-only page; submission loops through items sequentially and awaits each `submitTransaction`.
  - Uses `idempotencyKey` per item (good), but still roundtrips per item.
- Likely cost:
  - N sequential requests (or RPC calls) causes slow “submit” and higher failure surface on weak connections.

#### `/employee/transaction`
- File: `src/app/employee/transaction/page.tsx`
- Behavior:
  - Client-only page using `useSearchParams` and a `Suspense` wrapper.
  - Fetches `getItemById(itemId)` and `getLocations(true)` on mount.
- Likely cost:
  - Another client-only “fetch after hydration” step; may feel like a pause on navigation.

#### `/employee/history`
- File: `src/app/employee/history/page.tsx`
- Behavior:
  - Client-only page; loads:
    - `getUserTransactions(user.id)`
    - `getItems()` (full dataset)
  - Then filters/sorts/groups client-side.
- Likely cost:
  - Potentially very slow as data scales; unnecessary “fan-out” fetching for names.

#### `/employee/profile`
- File: `src/app/employee/profile/page.tsx`
- Behavior:
  - Client-only, mostly local UI.
  - Reads sync queue state; shows last sync time formatting.
- Likely cost:
  - Not a primary bottleneck.

### Supporting infrastructure findings
#### Employee layout (`/employee/layout.tsx`)
- File: `src/app/employee/layout.tsx`
- Behavior:
  - Client-only layout that:
    - redirects with `router.push` based on `AuthContext` state
    - mounts `BatchScanProvider`
    - mounts `useSyncQueue` and `useOnlineStatus`
    - blocks the entire UI on `isLoading` (auth)
- Note:
  - Layout persists across nested routes, so some hook work runs once per employee session, but initial entry still pays the full cost.

#### Auth context
- File: `src/contexts/AuthContext.tsx`
- Behavior:
  - Uses browser Supabase client + `onAuthStateChange` and fetches the `profiles` row.
  - Has safety timeouts (8s profile fetch timeout; 10s auth safety timeout).
- Performance implication:
  - If profile fetch is slow, the employee layout currently shows a full-screen spinner (blocking perceived progress).

#### Sync queue / IndexedDB
- File: `src/hooks/useSyncQueue.ts`
- Behavior:
  - Loads queue count on mount using IndexedDB (`getQueueCount()` → opens DB).
  - Sets up periodic sync and online-triggered sync.
- Performance implication:
  - Not necessarily “slow,” but it adds startup work; worth deferring until after first paint if possible.

#### Middleware
- Files: `src/middleware.ts`, `src/lib/supabase/middleware.ts`
- Behavior:
  - Runs on most routes; refreshes session and queries `profiles` for role/is_active; performs role-based redirects.
- Performance implication:
  - Adds latency to every navigation and is especially noticeable on mobile/slow connections.

### Proposed improvements (prioritized)
#### Priority 0: Measure and confirm bottlenecks (before changing architecture)
- Capture for a typical employee session:
  - **TTFB / server time** (middleware impact)
  - **First Load JS per route** (especially `/employee/scan`)
  - **Network calls per step** (home load, scan lookup, batch submit)
- Use Chrome DevTools:
  - **Network**: request waterfall and total bytes for `/employee`, `/employee/history`, `/employee/scan`
  - **Performance**: navigation to see where time goes (JS/hydration vs network vs camera init)

#### Priority 1: Cut the biggest “unnecessary work” first
- **Stop fetching all items just to show item names**
  - Replace `getUserTransactions + getItems` on `/employee` and `/employee/history` with a joined query:
    - Reuse `getTransactionsWithDetails(...)` (already exists for admin) or create an employee-optimized variant returning `transaction + item(name, sku, unit)` only.
  - Paginate history rather than loading everything into the browser.
- **Reduce scan lookup to a single request**
  - Add a `getItemByCode(code)` action/query using `barcode = code OR sku = code`.
- **Make scan “recent items” cheap**
  - Add a dedicated `getRecentItems(limit)` query that returns only required fields (and is actually “recent” by updated time or by recent transactions), instead of `getItems().slice(0, 4)`.
- **Batch submit: reduce sequential waits**
  - Add a bulk submit endpoint/RPC (single request), or submit with limited concurrency (e.g., 3–5 at a time) + progress UI.

#### Priority 2: Reduce perceived slowness on navigation
- **Add route-level skeletons**:
  - Add `src/app/employee/loading.tsx` and (optionally) more granular loading UIs for subroutes.
- **Prefetch likely-next steps**:
  - From home, prefetch `/employee/scan`
  - From scan, prefetch `/employee/batch-review`

#### Priority 3: Reduce JS/hydration overhead (bigger refactor, best long-term win)
- Convert employee routes that are mostly “read + render” into **Server Components**:
  - `/employee` and `/employee/history` are good candidates.
- Keep interactivity as small **client islands**:
  - Buttons/modals can be client; data rendering can be server.
- **Lazy-load heavy scanner code**:
  - Dynamically import `BarcodeScanner` / `html5-qrcode` so `/employee/scan` can render UI immediately, then initialize camera as a second step.

#### Priority 4: Reduce middleware overhead
- Avoid querying `profiles` on every request in middleware by:
  - storing role/is_active in JWT `app_metadata` (preferred), or
  - caching role/is_active in a short-lived cookie and refreshing occasionally.
- Narrow middleware matcher to only the routes that actually need it (`/employee/*`, `/admin/*`, `/auth/*`).

### Risks / behavior notes
- Removing client-side auth gating assumes middleware remains enabled and correct for `/employee/*`.
- Moving to server components can require restructuring some components that currently assume browser-only APIs.
- Any change to role/is_active enforcement must preserve existing security guarantees (RLS + routing protections).

### Success criteria (what “fixed” looks like)
- **Home and history**:
  - fewer network requests
  - no full-table `getItems()` download
  - meaningful content appears faster on initial load
- **Scan**:
  - scan page becomes interactive quickly (UI renders even if camera init is still spinning)
  - scan lookup is 1 request per code (not 2)
- **Batch submit**:
  - large batches submit noticeably faster or show progress smoothly
- **Navigation**:
  - transitions between employee steps feel “instant” or at least consistently skeleton’d, not blank/spinner-blocked


