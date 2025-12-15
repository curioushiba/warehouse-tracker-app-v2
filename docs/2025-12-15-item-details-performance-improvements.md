### Item details performance report (2025-12-15)

### Context
The **admin item details page** (`/admin/items/[id]`) was reported as “somewhat slow” on initial load.

### Goal
Improve **time-to-first-content** and reduce “blank/skeleton time” by:
- Eliminating client-only data fetching on initial render
- Reducing the number/size of initial queries
- Reducing initial JavaScript shipped for the route

### Key findings (before)
- **Client-only rendering**: `src/app/admin/items/[id]/page.tsx` was a `"use client"` page that loaded data via `useEffect`.
- **Multiple roundtrips**: initial load did several server actions:
  - `getItemById`
  - `getCategories` (full table)
  - `getLocations` (full table)
  - `getUsers` (full table)
  - `getItemTransactions` (all rows for item)
- **Over-fetching for simple display needs**:
  - Category/location names can be fetched by ID instead of pulling full lists
  - Transaction user display can be embedded via join instead of fetching all users
- **Heavy component on the critical path**: the “Manage Codes” section (`ManageCodesCard`) brings in barcode scanner + image generation libs which are not needed for the first paint.
- **Bundle size signal**: prior audit noted `/admin/items/[id]` at ~**311 kB First Load JS** (see `docs/2025-12-15-admin-performance-audit.md`).

### Changes implemented
#### 1) Server-render `/admin/items/[id]` initial content
- **File**: `src/app/admin/items/[id]/page.tsx`
- **Change**:
  - Converted to an **async server component** (removed `"use client"` + `useEffect` fetching).
  - Fetches:
    - item via `getItemById(itemId)`
    - category via `getCategoryById(item.category_id)` (only if present)
    - location via `getLocationById(item.location_id)` (only if present)
    - transactions via `getTransactionsWithDetails({ itemId }, { limit: 11 })`
  - Renders the page content in the initial HTML response.

#### 2) Reduce transaction history payload + avoid `getUsers()`
- **Files**:
  - `src/lib/actions/transactions.ts`
  - `src/app/admin/items/[id]/page.tsx`
- **Change**:
  - Reused `getTransactionsWithDetails` (already joins embedded `user` fields).
  - Added an **optional `limit`** to `getTransactionsWithDetails` so the details page only fetches what it needs.
  - The UI shows **latest 10** transactions (fetches 11 to detect “has more”).

#### 3) Remove heavy Manage Codes from initial JS via lazy-loading
- **Files**:
  - `src/app/admin/items/[id]/ManageCodesLazy.tsx` (new)
  - `src/app/admin/items/[id]/page.tsx`
- **Change**:
  - `ManageCodesCard` is loaded with `next/dynamic` (`ssr: false`) so barcode scanning + label rendering libraries do not inflate initial route JS.
  - When codes update the item, we call `router.refresh()` to keep server-rendered content consistent.

#### 4) Keep actions interactive with a small client “island”
- **File**: `src/app/admin/items/[id]/ItemDetailActions.tsx` (new)
- **Change**:
  - Provides Refresh/Edit/Archive/Restore UI as a client component.
  - Uses `archiveItem`/`restoreItem` server actions and then `router.refresh()` to reflect updated state.

#### 5) Add route-level skeleton
- **File**: `src/app/admin/items/[id]/loading.tsx` (new)
- **Change**:
  - Provides a consistent loading skeleton for server-rendered navigation into item details.

### Files touched
- `src/app/admin/items/[id]/page.tsx`
- `src/app/admin/items/[id]/loading.tsx` (new)
- `src/app/admin/items/[id]/ItemDetailActions.tsx` (new)
- `src/app/admin/items/[id]/ManageCodesLazy.tsx` (new)
- `src/lib/actions/transactions.ts`

### Build validation / measurable outcome
- **Command**: `npm run build`
- **Result**: Successful build + typecheck.
- **Route size improvement**:
  - Before (from audit): `/admin/items/[id]` ~**311 kB First Load JS**
  - After (current build): `/admin/items/[id]` **~187 kB First Load JS**

### Risk / behavior notes
- **Manage Codes is client-only** (`ssr: false`). This is intentional to reduce the initial bundle; it should load immediately after the page becomes interactive.
- The details page now shows **server-rendered data** by default; “Refresh” uses `router.refresh()` to re-run server fetches.

### Recommended follow-ups (optional)
- Convert `ItemImage` to use `next/image` (and configure remote image domains) for better image loading, caching, and layout stability.
- Consider adding pagination / “View all transactions” link if full history is needed, rather than loading many rows on the details page.
- Evaluate caching strategy (e.g., `unstable_cache` / `revalidate`) for reference data if needed elsewhere.


