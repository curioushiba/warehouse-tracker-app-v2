# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Progressive Web App (PWA) for Harvey's Restaurant Group warehouse inventory tracking. The app uses role-based interfaces: desktop/tablet admin dashboard and mobile-optimized employee interface for stock operations.

**Tech Stack:** Next.js 14 (App Router), Supabase (database + auth), Tailwind CSS, PWA (next-pwa), Vitest

## Essential Development Commands

### Running the Application
```bash
npm run dev          # Start development server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
```

**Important:** Tests are located alongside source files with `.test.ts` or `.test.tsx` extensions. The test setup file is `src/test/setup.ts`.

### Environment Setup
Copy `.env.local.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

## Architecture Overview

### Database Design Philosophy
- **Transactions are immutable**: Stock changes are recorded as deltas only; never update or delete transactions
- **Current stock is derived**: Always calculated from transaction sum, never stored directly
- **Idempotent offline sync**: Client generates `transaction.id` (UUID) before enqueueing; retries cannot double-count
- **Event time vs processing time**: `event_timestamp` for reporting/analytics, `server_timestamp` for audit ordering

### Core Data Model
- **profiles**: App users (links to `auth.users`), stores `role` ('admin' or 'employee') and `is_active` status
- **categories**: Product categories
- **items**: Inventory items with `current_stock` derived from transactions, soft-delete via `is_archived`
- **transactions**: Immutable ledger with types 'in', 'out', 'adjustment' (admin only)
- **sync_errors**: Failed offline transaction queue for admin review

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

### Application Structure
```
/app
  /admin              # Admin dashboard (desktop/tablet)
    /items            # Item management
    /categories       # Category management
    /transactions     # Transaction history/audit
    /users            # User management
    /sync-errors      # Failed sync review
  /employee           # Employee interface (mobile-optimized)
    /scan             # Barcode scanning
    /transaction      # Stock in/out flow
  /auth               # Authentication pages
  /api
    /transactions/submit  # Transaction submission endpoint

/components
  /ui               # Reusable UI components
  /layout           # Layout components (AdminLayout, MobileLayout)
  /scanner          # Barcode scanner (html5-qrcode wrapper)

/lib
  /supabase         # Supabase client setup (client.ts, server.ts, middleware.ts)
  /offline          # IndexedDB queue (db.ts)
  /actions          # Server actions for data operations
  /types            # Shared TypeScript types

/hooks
  /useAuth.ts           # Auth state management
  /useOnlineStatus.ts   # Online/offline detection
  /useSyncQueue.ts      # Offline queue sync logic

/contexts
  /AuthContext.tsx      # Global auth state provider
  /SettingsContext.tsx  # App settings provider

/supabase/migrations   # Database migrations (SQL)
```

## Working with Database

### Server Actions Pattern
All database operations use server actions in `src/lib/actions/`:
- Return `ActionResult<T>` type (success/failure with data or error)
- Call `createClient()` from `@/lib/supabase/server` for server-side operations
- Revalidate paths with `revalidatePath()` after mutations

Example:
```typescript
export async function getItems(): Promise<ActionResult<Item[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('inv_items').select('*')
  if (error) return failure(error.message)
  return success(data)
}
```

### Client-side Supabase Access
Use singleton pattern from `src/lib/supabase/client.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### Migrations
Database schema in `supabase/migrations/*.sql`:
- `001_initial_schema.sql` - Core tables
- `002_rls_policies.sql` - Row Level Security policies
- `003_seed_data.sql` - Initial data
- `004_auth_restructure.sql` - Auth system updates

Apply migrations using Supabase CLI or dashboard.

### Optimistic Locking
Items use version-based optimistic locking:
- Items have `version` integer field
- Update includes expected version
- Server rejects if version mismatch → "Item was modified, please refresh"

## Key Implementation Patterns

### PWA Configuration
PWA setup in `next.config.mjs`:
- Service worker disabled in development
- Supabase API calls use NetworkFirst strategy
- Static assets use CacheFirst with 30-day expiration

### Barcode System
- **Manufacturer barcodes**: Stored as-is in `items.barcode`
- **Custom QR codes**: Generated with prefix `HRG-` + zero-padded number
- **Scanner component**: `src/components/scanner/BarcodeScanner.tsx` wraps html5-qrcode
- Barcodes are unique and never reused (even for archived items)

### Transaction Validation
Server-side validation enforces:
- Item exists and is not archived
- User is active (`profiles.is_active=true`)
- Quantity > 0 and ≤ 9999.999
- Quantity respects item precision (`items.quantity_decimals`)
- Employee role can only create 'in'/'out' transactions

### Path Aliases
TypeScript configured with `@/*` alias pointing to `src/*`:
```typescript
import { createClient } from '@/lib/supabase/client'
```

## Important Design Decisions

### No Destination Tracking in v1
Stock-out transactions do NOT record which restaurant received inventory. This is a deliberate v1 scope limitation.

### Timestamp Strategy
- `device_timestamp`: Client-provided (audit visibility only)
- `event_timestamp`: Server-validated/clamped (used for reporting)
- `server_timestamp`: Server-assigned (authoritative audit ordering)

### Deactivation Behavior
When employee is deactivated:
- All transaction inserts rejected (regardless of device timestamp)
- PWA forces logout and clears local cache
- Transaction history preserved

### Stock Calculation Performance
For dashboards, use derived `item_stock_summary` view/table instead of re-summing transactions on every request (to be implemented).

## Testing Conventions

- Tests colocated with source files (`.test.ts` or `.test.tsx`)
- Use Vitest with jsdom environment
- Setup file: `src/test/setup.ts`
- Coverage excludes: `node_modules/`, `src/test/`, type definitions, config files

## Common Pitfalls

1. **Never modify transactions**: They are immutable by design. Create new adjustment transactions instead.
2. **Don't store current_stock**: Always derive from transaction sum.
3. **Client UUID generation**: Transaction IDs must be generated client-side before enqueuing for idempotency.
4. **RLS is mandatory**: All database operations must respect Row Level Security policies.
5. **Service role key security**: Never expose service role key to client; only use in server-side code.
6. **IndexedDB can be evicted**: Show last sync time and queue count; encourage frequent syncing.

## Reference Documents

- Full requirements: `PRD.md`
- Supabase migrations: `supabase/migrations/`
- Environment variables: `.env.local.example`
