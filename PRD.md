# Warehouse Tracking App — Design Document

**Project:** Harvey's Restaurant Group Warehouse Tracker  
**Date:** December 11, 2025  
**Status:** Ready for implementation

---

## Overview

A Progressive Web App (PWA) for tracking warehouse inventory for Harvey's Restaurant Group. The central warehouse supplies five restaurant units: Harvey's Wings, Bakugo Ramen, Wildflower Tea House, Fika Cafe, and Harvey's Chicken.

**Key concept:** Single Next.js application with role-based interfaces — admin dashboard for desktop/tablet, simplified employee interface for mobile/tablet.

### v1 Decisions (Locked In)

- **No destination tracking in v1**: Stock-out transactions do not record which restaurant unit received inventory.
- **Idempotent offline sync**: The client generates `transactions.id` (UUID) before enqueue; server inserts are safe to retry without double-counting.
- **Event time vs processing time**: `event_timestamp` is used for reporting/analytics; `server_timestamp` is used for audit ordering.
- **Secure deactivation**: If a user is inactive, transaction inserts are rejected regardless of device clock/timestamps.
- **Supabase modeling**: Use `auth.users` for authentication and a `public.profiles` table for app roles and status.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Database & Auth | Supabase |
| Styling | Tailwind CSS |
| PWA | next-pwa or @ducanh2912/next-pwa |
| Barcode Scanning | html5-qrcode |
| QR Generation | qrcode or react-qr-code |
| PDF Labels | @react-pdf/renderer or jspdf |
| Offline Storage | idb (IndexedDB wrapper) |
| Date Handling | date-fns |
| Tables | @tanstack/react-table |

---

## Data Model

### profiles (app users; linked to Supabase Auth)

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key; **FK → `auth.users(id)`** |
| email | text | Login email (mirrored for admin UI convenience; kept in sync via trigger) |
| name | text | Display name |
| role | enum | 'admin' or 'employee' |
| is_active | boolean, default true | Account toggle (admin can activate/deactivate) |
| deactivated_at | timestamptz, nullable | When deactivated (cleared on reactivation) |
| created_at | timestamptz | Account creation date |
| updated_at | timestamptz | Last modification |

**Notes:**

- Supabase Auth remains the source of truth for credentials and password resets (`auth.users`).
- `profiles` stores application-specific fields (role, activation status, display name).
- Create/maintain `profiles` rows via DB triggers (recommended) or admin server actions.

### categories

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key |
| name | text | Category name (e.g., "Proteins", "Dry Goods") |
| created_at | timestamptz | Creation date |

### items

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key |
| name | text | Item name |
| description | text, nullable | Optional short description |
| barcode | text, nullable, unique | Manufacturer or custom code |
| category_id | FK → categories | Category reference |
| unit | text | Unit of measurement (kg, pieces, liters, etc.) |
| quantity_decimals | integer, default 3 | Allowed decimal places for quantities (0–3). Example: `0` for pieces, `3` for kg/liters. |
| reorder_point | numeric(12,3), nullable | Manual low stock threshold |
| version | integer | For optimistic locking |
| is_archived | boolean, default false | Soft-delete/retire item (hidden from employee flows) |
| archived_at | timestamptz, nullable | When archived (set when `is_archived=true`) |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modification |

**Notes:**

- `current_stock` is always derived from transactions, never stored directly as a source of truth.
- Barcodes are never re-used. If an item is archived, its barcode remains reserved on the item record.

### transactions

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key; **client-generated** for offline idempotency (may still default server-side for online-only flows) |
| item_id | FK → items | Item reference |
| type | enum | 'in', 'out', or 'adjustment' |
| quantity | numeric(12,3) | Always positive; interpretation depends on `type` |
| adjustment_direction | enum, nullable | Only for `type='adjustment'`: 'increase' or 'decrease' |
| user_id | FK → profiles | Who performed the action |
| device_id | uuid | Device identifier (random UUID stored client-side; helps debug offline and abuse cases) |
| notes | text, nullable | Optional reason/context |
| device_timestamp | timestamptz | When recorded on device (client-provided, UTC; stored for audit only) |
| event_timestamp | timestamptz | **Business/reporting timestamp**; computed/validated by server (see rules below) |
| server_timestamp | timestamptz | When received by server (audit ordering, UTC; default now()) |

**Notes:**

- Quantity conventions:
  - `type='in'` adds `quantity`
  - `type='out'` subtracts `quantity`
  - `type='adjustment'` is a delta correction (admin-only) and uses:
    - `adjustment_direction='increase'` to add `quantity`
    - `adjustment_direction='decrease'` to subtract `quantity`
- Timestamps:
  - Store all timestamps as UTC `timestamptz`.
  - `server_timestamp` is authoritative for **audit ordering**.
  - `event_timestamp` is authoritative for **reporting/analytics** (daily/weekly usage, trends).
  - Recommended server rule on insert:
    - Compute `server_timestamp = now()` (DB/server controlled).
    - If `device_timestamp` is within an acceptable window (e.g., not > 5 minutes in the future and not older than 30 days), set `event_timestamp = device_timestamp`.
    - Otherwise set `event_timestamp = server_timestamp` and keep the raw `device_timestamp` for audit visibility.
- Idempotency:
  - The client generates `transactions.id` before enqueueing offline.
  - Sync uses `insert` with the same `id`; retries cannot double-count because the PK will conflict.
  - Server/client should treat a duplicate insert as success (already synced).

### sync_errors

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key |
| transaction_id | uuid, nullable | The client-generated `transactions.id` that failed to apply (if available) |
| user_id | FK → profiles, nullable | Who attempted the transaction |
| item_id | FK → items, nullable | Item involved (if parseable) |
| device_id | uuid, nullable | Device that attempted the transaction (if available) |
| transaction_data | jsonb | Original transaction payload |
| error_reason | text | Why it failed |
| status | enum | 'pending', 'resolved', 'dismissed' |
| first_seen_at | timestamptz | When the error was first recorded |
| last_seen_at | timestamptz | When it was last attempted/seen (optional) |
| attempt_count | integer | How many times it has failed (optional) |
| resolved_by | FK → profiles, nullable | Admin who resolved/dismissed it |
| resolved_at | timestamptz, nullable | When it was resolved/dismissed |
| resolution_notes | text, nullable | Optional admin notes on what was done |

### barcode_history

| Field | Type | Description |
|-------|------|-------------|
| id | uuid, PK | Primary key |
| barcode | text | The barcode value |
| item_name | text | Item name at time of deletion |
| deleted_at | timestamptz | When item was deleted/purged |

**Notes:**

- Used only if a record is ever *permanently purged* (not expected in v1). In normal operation, items are archived (soft-delete) and keep their barcode.
- If someone tries to assign a barcode that exists in `barcode_history`, show: "This barcode was previously used by [item_name] (deleted [date])"

### Recommended DB constraints & indexes (implementation notes)

- Constraints:
  - `transactions.quantity > 0` (for `in`/`out`)
  - Enforce `type` enum and restrict `adjustment` inserts to admin only
  - If `type='adjustment'`, then `adjustment_direction IS NOT NULL`
  - If `type!='adjustment'`, then `adjustment_direction IS NULL`
  - Transactions are immutable: deny UPDATE/DELETE (even for admin); corrections are new transactions
  - `items.version` increments on update (trigger or application logic)
  - `items.is_archived=true` implies `archived_at IS NOT NULL`
- Indexes:
  - `transactions (server_timestamp desc)`
  - `transactions (event_timestamp desc)` (optional; helps reporting)
  - `transactions (item_id, server_timestamp desc)`
  - `transactions (user_id, server_timestamp desc)`
  - `items (barcode)` unique (already implied)
  - `items (category_id)`
  - `sync_errors (status, first_seen_at desc)`

---

## User Flows

### Admin (Desktop/Tablet)

**Pages:**

1. **Dashboard**
   - Overview stats: total items, low stock count, negative stock count
   - Low stock alerts section (items with positive stock below reorder point)
   - Negative stock warnings section (items needing investigation)
   - Recent transactions feed

2. **Items**
   - Table view with search and category filter
   - Columns: name, category, current stock, unit, reorder point, status
   - Add/edit items
   - Archive items (soft-delete) with warning: "This item has X transactions. Archiving prevents new transactions but preserves history."
   - (Optional, admin-only) Purge item record is out of scope for v1; if ever implemented, barcode must be written to `barcode_history` and all historical reporting implications must be handled.
   - Generate barcode labels

3. **Categories**
   - Simple list with create/edit/delete

4. **Transactions**
   - Full audit log with filters (date, item, user, type)
   - Shows both device timestamp and server timestamp for audit trail

5. **Users**
   - List users with roles and active status
   - Create employee accounts
   - Toggle activate/deactivate (with confirmation)
   - Deactivation sets `deactivated_at` timestamp

6. **Sync Errors** (if any pending)
   - Review failed offline transactions
   - Retry, manually apply, or dismiss

### Employee (Mobile/Tablet)

**Flow:**

1. **Login** → Email + password

2. **Home** → Two buttons: "Stock In" / "Stock Out"

3. **Choose Input Method** → "Scan Barcode" / "Manual Input"

4. **Scan or Search:**
   - Camera scanner with torch toggle
   - "Enter Manually" fallback (search by name or type code)

5. **Confirm Item:**
   - Shows: name, description, current stock, "Last updated: X"
   - Enter: quantity, optional note
   - Submit

6. **Confirmation** → "Added 10kg Chicken Breast ✓" → Back to Home

---

## Authentication & Roles

**Method:** Supabase Auth with email/password

### Auth model (recommended)

- **Auth**: Supabase `auth.users` stores credentials (email/password, password resets, sessions).
- **App identity**: `public.profiles` stores app-specific fields (`role`, `is_active`, `name`).
- **Linking**: `profiles.id` is a FK to `auth.users(id)`.
- **Profile creation**:
  - Recommended: DB trigger that inserts a `profiles` row when a new `auth.users` row is created.
  - Keep `profiles.email` in sync via trigger (or set it at creation time and update on email change if you support it).

**Roles:**

| Role | Access |
|------|--------|
| Admin | Full access to all pages and functions |
| Employee | Stock in/out only, no admin pages |

**Implementation:**

- Role stored in `profiles` table
- Row Level Security (RLS) enforces permissions
- Only admins can modify items, categories, and profiles (user management)
- Prevent role/status escalation even if UI is bypassed:
  - Employees cannot update `profiles.role` or `profiles.is_active`
  - Prefer DB-level privileges/column grants in addition to RLS where practical

### RLS permission matrix (v1)

**Legend:** R=read, I=insert, U=update, D=delete

| Table | Admin | Employee |
|------|-------|----------|
| profiles | R/I/U (manage), no D | R/U (self profile only; optional), no role/status changes |
| categories | R/I/U/D | R |
| items | R/I/U (including archive), no D in v1 | R (only non-archived) |
| transactions | R/I, no U/D | I (only `in`/`out`), R (own recent only; limited) |
| sync_errors | R/I/U/D (resolve/dismiss) | none |
| barcode_history | R (admin) | none |

### Server-side validation rules (must be enforced even if UI hides options)

- Transaction insert:
  - Item exists and is not archived
  - User exists and is active (`profiles.is_active=true`) at insert time (do not trust device clock)
  - `user_id` is always the authenticated user (`auth.uid()`); ignore/deny client-supplied user IDs
  - `type` is permitted for role (employees: `in`/`out` only)
  - Quantity is valid and within allowed bounds:
    - Must be \(> 0\)
    - **Global cap:** \( \le 9999.999 \) (matches `numeric(12,3)` and prevents abuse/typos)
    - Must respect item precision: quantity must match `items.quantity_decimals` (e.g., pieces cannot be fractional)
  - `server_timestamp` assigned by DB/server; client cannot override
- Item update:
  - Optimistic locking using `items.version` (reject mismatches)
  - Barcode uniqueness and barcode reuse prevention (see barcode section)

### Employee transaction history (read access)

- Employees may view **their own recent transactions** for verification and troubleshooting.
- Limit results (e.g., last **50** records) and order by `server_timestamp desc`.
- Employees cannot view other users' transactions.

**Account management:**

- Admin creates employee accounts (see recommended approach below)
- Admin can toggle employee active/inactive status
- Employee can change own password
- Transaction history preserved regardless of employee status

### Admin account creation (recommended approach)

- Do **not** create Supabase Auth users from the client (service role key must never ship to browsers).
- Use one of:
  - **Next.js server action / API route** that calls the Supabase Admin API with the service role key (stored server-side), or
  - **Supabase Edge Function** that performs user creation with a service role client.
- The server endpoint/function must verify the caller is an admin (e.g., check `profiles.role='admin'` for `auth.uid()`).
- Creation flow options:
  - Create user with a temporary password and force password reset on first login, or
  - Invite user by email (preferred) and let them set a password.

**Employee deactivation behavior:**

- `is_active` set to false, `deactivated_at` timestamp recorded
- Reactivation clears `deactivated_at`
- On sync/insert while deactivated:
  - All transaction inserts are rejected (regardless of `device_timestamp`)
  - Employee sees: "Your account is inactive. You cannot sync queued transactions. Contact an admin."
  - PWA forces logout and clears local cache (and clears the per-user offline queue after user confirmation/export if needed)

---

## Offline Queue & Sync

### Protection Mechanisms

1. **Transactions are immutable**
   - Stock changes recorded as deltas only
   - `current_stock` calculated from transaction sum
   - No direct stock overwrites

2. **Field-level sync for item edits**
   - Only changed fields are synced
   - Concurrent edits to different fields both survive

3. **Server timestamp authority**
   - Device sends `device_timestamp` for audit visibility only
   - Server assigns `server_timestamp` for authoritative audit ordering
   - Server computes `event_timestamp` for reporting (validated/clamped to prevent device clock abuse)

4. **Optimistic locking (item edits)**
   - Items have `version` number
   - Edit submission includes expected version
   - Server rejects if version mismatch → "Item was modified, please refresh"

5. **Validation with error queue**
   - Server validates: item exists, user active, quantity valid
   - Failed transactions go to error queue for admin review

6. **Cache refresh on reconnect**
   - Fetch latest item list before syncing outgoing transactions
   - Confirm connectivity via a lightweight server call (do not rely solely on `navigator.onLine`)

7. **Idempotent queue processing**
   - Client generates `transactions.id` (UUID) when the transaction is created (online or offline)
   - Sync inserts with that same `id`; retries are safe and must not double-count

8. **Centralized server validation (recommended)**
   - For consistent validation + error logging, submit transactions through a server-side function:
     - **Option A (DB/RPC)**: a Postgres function like `submit_transaction(...)` that validates, computes timestamps, inserts idempotently, and records `sync_errors` on failure.
     - **Option B (Edge Function)**: an HTTP endpoint that performs the same behavior with service-role access.
   - This is the simplest way to ensure `sync_errors` is populated when a queued transaction fails server validation.

### Sync Flow

1. Transaction attempted
2. Online? → Submit to server (RPC/Edge Function recommended; direct table insert is acceptable only if you don’t need server-side error logging)
3. Offline? → Save to IndexedDB queue
4. On reconnect:
   - If auth session expired, prompt for re-login before syncing
   - Refresh local item cache
   - Process queue in enqueue order (or `device_timestamp` order for nicer UX; correctness is unaffected)
   - Validate each transaction
   - Success → remove from queue
   - Failure → remove from queue and surface as a sync error (server should record to `sync_errors` if using RPC/Edge Function; client should also show the user what failed)

### Offline/PWA operational edge cases (approved)

- **Queue is per-user**
  - If a different user logs in on the same device, do not sync another user's queue; clear or keep it isolated.
  - On logout, clear the active user's queue (or require explicit confirmation/export).
- **Token expiry while offline**
  - If the Supabase session cannot be refreshed, queued transactions remain local until the user signs in again.
- **Storage eviction risk**
  - Mobile OS/browser can evict IndexedDB. Show last sync time and queued count; keep queues small and encourage frequent sync.
- **Online detection**
  - Treat online/offline as “best effort”; use a simple server health check before declaring online/syncing.

### UI Indicators

- **Online:** Green indicator
- **Offline:** Yellow indicator + "Saved offline"
- **Syncing:** "Syncing 3 transactions..."
- **Complete:** "All synced ✓"
- **Errors:** Red badge on admin nav if pending errors

---

## Barcode & Label System

### Strategy

| Item Type | Approach |
|-----------|----------|
| Has manufacturer barcode | Scan and save to `items.barcode` |
| No barcode | Generate custom QR code |

### Custom Code Format

- Prefix: `HRG-` (Harvey's Restaurant Group)
- ID: Auto-incremented number, zero-padded
- Example: `HRG-00142`

### Barcode normalization rules (recommended)

- Treat barcodes as **text**, never numbers (preserve leading zeros).
- Always `trim()` whitespace.
- For HRG-generated codes, store as **uppercase** (e.g., `HRG-00142`).
- Consider enforcing canonicalization server-side (e.g., uppercasing HRG codes on write) to prevent near-duplicates.

### HRG code generation (concurrency-safe)

- Generation must be done server-side (Supabase Postgres) to prevent collisions.
- Recommended approach:
  - A dedicated Postgres **sequence** (or single-row counter table with locking) generates the next integer.
  - Expose an RPC like `generate_hrg_code()` that returns the formatted code `HRG-` + zero-padded number.
  - On assignment, the update must be atomic: generate code → attempt to set `items.barcode` → if conflict, retry.

### Label Generation

1. Admin creates item without barcode
2. Click "Generate Label"
3. System creates `HRG-XXXXX`, saves to item
4. Preview shows: QR code + item name + code text
5. Print options: single label or sheet

### Unknown barcode behavior (employee scan)

- If scanned barcode does not match any active item:
  - Show: "Item not found"
  - Provide actions: "Try again", "Search manually"
  - Do not allow employees to create items in v1 (admin-only)

### Barcode Reuse Prevention

- Barcodes are unique per item
- When item is archived, barcode remains reserved on the item record
- If a record is ever purged (not expected in v1), barcode must be copied to `barcode_history`
- If someone tries to use a previously-used barcode:
  - Error: "This barcode was previously used by [item_name] (deleted [date])"
- Prevents confusion from old labels still in the warehouse

### Label Specs

- Format: QR code (better scan reliability at any angle)
- Sizes: 50x30mm or 70x40mm (common sticker sheets)
- Output: PDF for printing

---

## Low Stock & Negative Stock Alerts

### Low Stock Alerts

- Admin sets `reorder_point` per item
- Alert triggered when `current_stock` ≤ `reorder_point` AND `current_stock` > 0
- Dashboard shows list sorted by urgency (how far below threshold)
- Click to view item detail

### Negative Stock Warnings

- Separate dashboard section for items with `current_stock` < 0
- Indicates data discrepancy needing investigation
- Admin can view transaction history to diagnose
- Admin can create 'adjustment' transaction to correct

**Note:** Negative stock is allowed by design. Multiple offline employees may sync conflicting transactions. The audit trail allows admin to investigate and correct.

---

## Stock Calculation & Performance

### Source of truth

- Transactions are the source of truth; stock is derived as the sum of deltas.

### Performance approach (recommended for v1+)

- For dashboards and item lists, avoid re-summing the entire transaction table on every request.
- Recommended approach:
  - Maintain an `item_stock_summary` view/table keyed by `item_id` with current derived stock and last movement timestamp.
  - Update it incrementally on each transaction insert (trigger or server-side function).
  - Rebuild capability exists for audits (recompute from raw transactions).

---

## Acceptance Criteria (v1)

- **Derived stock correctness**: For a given item, current stock equals sum(in) − sum(out) ± sum(adjustments) per the chosen adjustment convention.
- **Offline queue**: When offline, a transaction is persisted locally and visibly queued; on reconnect, each queued transaction is submitted at most once and removed on success.
- **Idempotent sync**: Retrying a queued transaction insert (network timeouts, app restarts) cannot double-count stock.
- **Deactivation rule (secure)**: If an employee is inactive, transaction inserts are rejected regardless of `device_timestamp` (no device clock bypass), and the employee is forced to re-authenticate/contact admin.
- **Event vs server time**: Reporting uses `event_timestamp` (server-validated/clamped); audit ordering uses `server_timestamp`.
- **Barcode uniqueness**: A barcode cannot be assigned to more than one item. A barcode found in `barcode_history` cannot be reused and shows the specified message.
- **Archiving**: Archiving an item prevents new transactions against it but preserves all historical transactions and reports.

## Responsive Design

### Breakpoints (Tailwind)

| Name | Width | Use Case |
|------|-------|----------|
| sm | 640px+ | Large phones / small tablets |
| md | 768px+ | Tablets |
| lg | 1024px+ | Desktop |
| xl | 1280px+ | Large desktop |

### Admin Pages

- **Desktop (1024px+):** Full layout, sidebars visible
- **Tablet (768px-1023px):** Collapsible sidebar, condensed tables
- Touch-friendly: 44px minimum tap targets

### Employee Pages

- **Mobile (up to 479px):** Single column, large buttons
- **Tablet (480px-1023px):** More info visible, still touch-optimized
- All interactive elements: 44px minimum tap target

### Shared Patterns

- Tables: horizontal scroll or card view on narrow screens
- Forms: stacked on mobile/tablet, side-by-side on desktop
- Dashboard cards: responsive grid (3 → 2 → 1 columns)
- No hover-dependent interactions

---

## Project Structure

```text
/app
  /dashboard            → Admin dashboard home
  /items                → Items list
  /items/[id]           → Item detail/edit
  /items/new            → Create item
  /categories           → Categories management
  /transactions         → Transaction history
  /users                → User management
  /sync-errors          → Failed sync review
  /employee             → Mobile employee UI
    /stock-in           → Stock in flow
    /stock-out          → Stock out flow
  /login                → Auth page

/components
  /ui                   → Shared UI components
  /admin                → Admin-specific components
  /employee             → Employee-specific components
  /scanner              → Barcode scanner component
  /labels               → Label preview/print components

/lib
  /supabase.ts          → Supabase client setup
  /sync.ts              → Offline queue & sync logic
  /stock.ts             → Stock calculation helpers
  /labels.ts            → QR/label generation
  /validators.ts        → Input validation

/hooks
  /useAuth.ts           → Auth state management
  /useOnlineStatus.ts   → Online/offline detection
  /useSyncQueue.ts      → Queue management
  /useStock.ts          → Stock calculations
```

---

## Implementation Phases

### Phase 1: Foundation

- [ ] Initialize Next.js + Supabase + Tailwind
- [ ] Set up Supabase tables and RLS
- [ ] Implement auth (login, roles)
- [ ] Build admin layout and navigation
- [ ] Items CRUD
- [ ] Categories CRUD

### Phase 2: Core Functionality

- [ ] Employee UI layout
- [ ] Barcode scanner component
- [ ] Stock In flow
- [ ] Stock Out flow
- [ ] Transaction recording
- [ ] Transaction history (admin)

### Phase 3: Offline & PWA

- [ ] PWA manifest and service worker
- [ ] IndexedDB queue setup
- [ ] Sync logic with protections
- [ ] Online/offline indicators
- [ ] Sync error queue and admin review

### Phase 4: Alerts & Labels

- [ ] Stock calculation from transactions
- [ ] Low stock alerts dashboard section
- [ ] Negative stock warnings dashboard section
- [ ] QR code generation
- [ ] Label preview and printing

### Phase 5: Polish

- [ ] Responsive refinements
- [ ] Loading states and error handling
- [ ] User management (admin) with activate/deactivate toggle
- [ ] Testing and bug fixes

---

## Future Considerations (Out of Scope for v1)

- Push notifications for low stock
- Multi-warehouse support
- Supplier management
- Purchase order generation
- Integration with Loyverse POS
- Inventory valuation / cost tracking
- Batch/lot tracking with expiration dates
- Smart reorder suggestions (auto-calculated from usage history)
- CSV export for transactions
- Stale cache mitigation (eager refresh, optimistic local calculation)

---

## References

- Supabase Docs: <https://supabase.com/docs>
- Next.js App Router: <https://nextjs.org/docs/app>
- html5-qrcode: <https://github.com/mebjas/html5-qrcode>
- PWA with Next.js: <https://github.com/shadowwalker/next-pwa>
