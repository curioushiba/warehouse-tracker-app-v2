# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PackTrack - A Progressive Web App (PWA) for warehouse inventory tracking. Role-based interfaces: admin dashboard (desktop/tablet) and employee interface (mobile-optimized) for stock operations.

**Tech Stack:** Next.js 14 (App Router), Supabase (database + auth), Tailwind CSS, PWA (next-pwa), Vitest

## Development Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # Run ESLint
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:run -- src/lib/actions/items.test.ts  # Run single test file
npm run test:coverage    # Run tests with coverage
```

Tests are colocated with source files (`.test.ts`/`.test.tsx`). Setup file: `src/test/setup.ts`.

### Environment Setup
Copy `.env.local.example` to `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

## Architecture Overview

### Database Design Philosophy
- **Transactions are immutable**: Stock changes are recorded as deltas only; never update or delete transactions
- **Current stock is derived**: Always calculated from transaction sum, never stored directly
- **Idempotent offline sync**: Client generates `transaction.id` (UUID) before enqueueing; retries cannot double-count
- **Event time vs processing time**: `event_timestamp` for reporting/analytics, `server_timestamp` for audit ordering

### Core Data Model
All application tables use the `inv_` prefix (e.g., `inv_items`, `inv_transactions`).

- **profiles**: App users (links to `auth.users`), stores `role` ('admin' or 'employee') and `is_active` status
- **inv_categories**: Product categories
- **inv_items**: Inventory items with `current_stock` derived from transactions, soft-delete via `is_archived`
- **inv_transactions**: Immutable ledger with types 'in', 'out', 'adjustment' (admin only)
- **inv_sync_errors**: Failed offline transaction queue for admin review

### Offline-First Architecture
**Client-side queue** (IndexedDB via `idb`):
- Queued transactions stored in `src/lib/offline/db.ts`
- Each transaction gets client-generated UUID for idempotency
- Sync hook in `src/hooks/useSyncQueue.ts` manages automatic sync

**Transaction submission flow**:
1. Transaction attempted → if online, submit immediately; if offline, enqueue to IndexedDB
2. On reconnect: refresh item cache, process queue in order
3. Submit via `/api/transactions/submit` which calls `submit_transaction` RPC function
4. Success → remove from queue; Failure → record to `sync_errors` table

### Authentication & Authorization
- **Supabase Auth** (`auth.users`) stores credentials
- **profiles table** stores app-specific fields (role, active status, name)
- **RLS policies** enforce permissions at database level
- **Role checks** in middleware (`src/middleware.ts`) and contexts (`src/contexts/AuthContext.tsx`)

**Key security rules**:
- Employees can only insert 'in'/'out' transactions (no 'adjustment')
- Inactive users cannot sync transactions (checked server-side)
- User ID always pulled from `auth.uid()`, never client-supplied

### Key Directories
- `src/app/admin/` - Admin dashboard routes (desktop/tablet)
- `src/app/employee/` - Employee interface routes (mobile-optimized)
- `src/lib/actions/` - Server actions for all database operations
- `src/lib/offline/` - IndexedDB queue for offline sync
- `src/contexts/` - AuthContext and SettingsContext (currency-agnostic settings)
- `supabase/migrations/` - Database migrations (SQL)

## Working with Database

### Server Actions Pattern
All database operations use server actions in `src/lib/actions/`:
- Return `ActionResult<T>` type from `@/lib/types/action-result` (discriminated union with `success`/`failure` helpers)
- Call `createClient()` from `@/lib/supabase/server` for server-side operations
- Revalidate paths with `revalidatePath()` after mutations
- Tables use `inv_` prefix: `inv_items`, `inv_transactions`, `inv_categories`

### Supabase Clients
- **Server-side:** `createClient()` from `@/lib/supabase/server`
- **Client-side:** `createClient()` from `@/lib/supabase/client` (singleton pattern)

### Optimistic Locking
Items have a `version` field; updates must include expected version. Server rejects mismatches with "Item was modified, please refresh".

## Key Implementation Patterns

### PWA Configuration (`next.config.mjs`)
- Service worker disabled in development
- Supabase API calls: NetworkFirst strategy
- Static assets: CacheFirst with 30-day expiration

### Barcode System
- **Manufacturer barcodes**: Stored as-is in `inv_items.barcode`
- **Custom QR codes**: Server-generated with prefix `PT-` + zero-padded number (legacy `HRG-` codes still valid)
- **Scanner**: `src/components/scanner/BarcodeScanner.tsx` wraps html5-qrcode
- Barcodes are unique and never reused (even for archived items)

### Transaction Validation (server-side)
- Item exists and is not archived
- User is active (`profiles.is_active=true`)
- Quantity > 0 and ≤ 9999.999, respects `items.quantity_decimals`
- Employee role: only 'in'/'out' transactions (no 'adjustment')

### Path Alias
`@/*` → `src/*` (configured in `tsconfig.json`)

## Important Design Decisions

### No Destination Tracking in v1
Stock-out transactions do NOT record which restaurant received inventory. Deliberate v1 scope limitation.

### Timestamp Strategy
- `device_timestamp`: Client-provided (audit visibility only)
- `event_timestamp`: Server-validated/clamped (used for reporting)
- `server_timestamp`: Server-assigned (authoritative audit ordering)

### Deactivation Behavior
When employee is deactivated: all transaction inserts rejected (regardless of device timestamp), PWA forces logout and clears local cache, transaction history preserved.

### Currency-Agnostic Design
App supports multiple currencies via settings (SettingsContext). Currency is user-selectable, not hardcoded.

## Common Pitfalls

1. **Never modify transactions**: They are immutable. Create new adjustment transactions instead.
2. **Don't store current_stock directly**: Always derive from transaction sum.
3. **Client UUID generation**: Transaction IDs must be generated client-side before enqueuing for idempotency.
4. **RLS is mandatory**: All database operations must respect Row Level Security policies.
5. **Table prefix**: Use `inv_` prefix for application tables (e.g., `inv_items` not `items`).
6. **Service role key security**: Never expose to client; only use in server-side code.
