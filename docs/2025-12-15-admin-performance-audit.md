### Admin performance/stability audit report (2025-12-15)

### Executive summary
Users reported **slow loading times on admin dashboards**. The biggest contributors were **client-only rendering patterns** (auth-gated layout + data fetched in `useEffect`) causing extra roundtrips and “blank spinner” time, plus **unnecessary/large data fetches** on some admin pages.

This change set focuses on **reducing time-to-first-content** and **removing redundant work** without changing product behavior.

### Key findings
- **Admin shell was blocked behind client auth loading**: `src/app/admin/layout.tsx` waited for `AuthContext` to finish client-side profile fetching before rendering.
- **Admin dashboard data was fetched only after hydration**: `src/app/admin/page.tsx` was a client component calling server actions in `useEffect`.
- **Count queries selected more than needed**: `src/lib/actions/dashboard.ts` used `select('*', { head: true, count: 'exact' })` for count-only requests.
- **Redundant auth/profile work in sync logic**: `useSyncQueue` used its own `useAuth()` hook (which fetches profile) even though `AuthContext` already exists.
- **Admin transactions page fetched entire tables**: `/admin/transactions` fetched all transactions plus full `items`, `users`, and `locations` lists to render names.
- **Admin items page fetched unused data**: `/admin/items` fetched locations but didn’t use them.

### Changes implemented
#### 1) Stop blocking admin render on client auth
- **File**: `src/app/admin/layout.tsx`
- **Change**:
  - Removed client-side redirect logic and `isLoading` gating spinner.
  - Kept the layout rendering immediately (middleware already enforces `/admin` access).
  - Left notification count fetching as-is (still runs after hydration when authenticated).
- **Why**: Eliminates “blank admin shell” time caused by waiting on a client-only profile fetch.

#### 2) Server-render the admin dashboard (remove `useEffect` fetch)
- **File**: `src/app/admin/page.tsx`
- **Change**:
  - Converted the dashboard to an **async server component** (removed `"use client"`).
  - Fetches `getDashboardData()` and `getRecentActivity(5)` on the server with `Promise.all`.
  - Returns a simple error UI if the server action fails.
- **Why**: Removes a full client-side roundtrip and shows real content in the initial HTML response.

#### 3) Optimize dashboard count-only queries
- **File**: `src/lib/actions/dashboard.ts`
- **Change**:
  - Switched count-only queries to `select('id', { count: 'exact', head: true })`.
- **Why**: Reduces payload and server work for count-only requests.

#### 4) Remove redundant auth hook usage in sync queue
- **Files**:
  - `src/hooks/useSyncQueue.ts`
  - `src/hooks/useSyncQueue.test.ts`
- **Change**:
  - `useSyncQueue` now reads `user`/`isAuthenticated` from `useAuthContext()` instead of `useAuth()`.
  - Updated tests to mock `@/contexts/AuthContext` accordingly.
- **Why**: Avoids a second profile fetch path during initial admin hydration and improves stability/consistency.

#### 5) Reduce admin transactions “fan-out” data fetching
- **Files**:
  - `src/lib/actions/transactions.ts`
  - `src/app/admin/transactions/page.tsx`
- **Change**:
  - Added `getTransactionsWithDetails()` returning transactions with embedded:
    - `item:inv_items(name, sku, unit)`
    - `user:profiles(first_name, last_name, email)`
    - `source_location` / `destination_location` via explicit FK relationship names
  - Updated the admin transactions UI to use these embedded fields instead of fetching full items/locations tables.
- **Why**: Prevents scaling problems where the page must download large reference datasets just to render display names.

#### 6) Remove unused locations fetch on admin items page
- **File**: `src/app/admin/items/page.tsx`
- **Change**:
  - Removed locations state, `locationMap`, and `getLocations()` call.
- **Why**: Avoids an unnecessary network request and client state work.

### Build validation
- **Command**: `npm run build`
- **Result**: Successful build + typecheck.
- **Notable route sizes (First Load JS)**:
  - `/admin` ~120 kB
  - `/admin/items` ~187 kB
  - `/admin/items/[id]` ~311 kB
  - `/admin/transactions` ~117 kB

While bundle sizes are still significant on some admin pages, the **dashboard now server-renders data** and the **admin layout no longer blocks on client auth loading**, improving perceived performance.

### Risk / behavior notes
- **Auth/role enforcement** is still handled by middleware (`src/lib/supabase/middleware.ts`). Removing client redirects/spinner assumes middleware remains enabled for `/admin`.
- `getTransactionsWithDetails()` depends on the FK relationship names used in the PostgREST select:
  - `locations!inv_transactions_source_location_id_fkey`
  - `locations!inv_transactions_destination_location_id_fkey`
  If these differ in your schema, the query will need to be adjusted.

### Recommended follow-ups (next highest ROI)
- **Server-side pagination + filtering** for `/admin/items` and `/admin/transactions` (avoid loading entire datasets into the browser).
- Convert other admin pages from **client-fetch-in-`useEffect`** to **server rendering** + `loading.tsx` skeletons.
- **Reduce client components** in admin UI where possible to lower First Load JS.
