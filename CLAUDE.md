# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PackTrack - Warehouse inventory tracking system with two frontends:
1. **Web Admin Dashboard** (`src/`) - Next.js 14 (App Router) for admin/desktop use
2. **Mobile Employee App** (`mobile/`) - React Native (Expo SDK 54), Android-only, for warehouse staff

**Shared Backend:** Supabase (PostgreSQL + Auth + RLS). Single-domain: only `inv_*` tables.

## Development Commands

### Web (Next.js) — run from project root
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm test                 # Run Vitest in watch mode
npm run test:run         # Run Vitest once
npm run test:run -- src/lib/actions/items.test.ts  # Single test file
npm run test:coverage    # Tests with coverage
```

### Mobile (Expo) — run from `mobile/`
```bash
npx expo start           # Start Expo dev server
npx expo run:android     # Run on Android device/emulator
npm run test             # Vitest (lib/hooks tests, better-sqlite3 mocks)
npm run test:jest        # Jest (component tests via jest-expo)
npm run test:all         # Run both Vitest + Jest
```

### Environment Setup
- **Web:** Copy `.env.local.example` to `.env.local` with Supabase keys
- **Mobile:** Copy `mobile/.env.example` to `mobile/.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

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

### Authentication & Authorization
- **Supabase Auth** (`auth.users`) stores credentials
- **profiles table** stores app-specific fields (role, active status, name)
- **RLS policies** enforce permissions at database level
- **Web:** Role checks in middleware (`src/middleware.ts`) and `src/contexts/AuthContext.tsx`
- **Mobile:** Auth guard in `mobile/src/app/(app)/_layout.tsx`, AuthProvider in `mobile/src/contexts/AuthContext.tsx`

**Key security rules**:
- Employees can only insert 'in'/'out' transactions (no 'adjustment')
- Inactive users cannot sync transactions (checked server-side)
- User ID always pulled from `auth.uid()`, never client-supplied

## Web App (Next.js)

### Key Directories
- `src/app/admin/` - Admin dashboard routes (desktop/tablet)
- `src/app/employee/` - Employee web interface routes (mobile-optimized)
- `src/lib/actions/` - Server actions for all database operations
- `src/lib/offline/` - IndexedDB queue for offline sync (web PWA)
- `src/contexts/` - AuthContext and SettingsContext
- `supabase/migrations/` - Database migrations (SQL)

### Server Actions Pattern
All database operations use server actions in `src/lib/actions/`:
- Return `ActionResult<T>` type from `@/lib/types/action-result` (discriminated union with `success`/`failure` helpers)
- Call `createClient()` from `@/lib/supabase/server` for server-side operations
- Revalidate paths with `revalidatePath()` after mutations

### Supabase Clients (Web)
- **Server-side:** `createClient()` from `@/lib/supabase/server`
- **Client-side:** `createClient()` from `@/lib/supabase/client` (singleton pattern)

### Optimistic Locking
Items have a `version` field; updates must include expected version. Server rejects mismatches with "Item was modified, please refresh".

### Barcode System
- **Manufacturer barcodes**: Stored as-is in `inv_items.barcode`
- **Custom QR codes**: Server-generated with prefix `PT-` + zero-padded number (legacy `HRG-` codes still valid)
- **Scanner**: `src/components/scanner/BarcodeScanner.tsx` wraps html5-qrcode
- Barcodes are unique and never reused (even for archived items)

### Path Alias (Web)
`@/*` → `src/*` (configured in `tsconfig.json`)

## Mobile App (React Native / Expo)

### Key Architecture
- **Expo SDK 54**, Android-only, `app.json` scheme=`packtrack`, package=`com.packtrack.mobile`
- **expo-router** for file-based routing
- **expo-sqlite** for local database (offline-first)
- **Supabase** for auth and sync

### Key Directories
- `mobile/src/app/` - Expo Router screens (12 files)
  - `(auth)/` - Login screen
  - `(app)/(tabs)/` - 4 tabs: Home (index), Scan, History, Profile
  - `(app)/` - Stack screens: batch-review, transaction/[id], sync-errors
- `mobile/src/components/` - UI components (ui/, layout/, indicators/, cart/, inventory/)
- `mobile/src/contexts/` - AuthContext, SettingsContext, ThemeContext
- `mobile/src/lib/` - Core logic: db/, sync/, supabase, types, haptics, cart, format, quick-transaction, recently-accessed, transactions
- `mobile/src/hooks/` - useSyncQueue, usePendingDelta
- `mobile/src/theme/` - tokens.ts (palette, SemanticColors, spacing, radii, typePresets, shadows, etc.), animations.ts

### Mobile Conventions
- **SQLite columns**: snake_case; **JS objects**: camelCase; conversion helpers in `lib/db/conversions.ts`
- Booleans stored as 0/1 integers in SQLite
- All SQLite functions take `db` as first parameter for testability
- Hooks/contexts use `createXxxManager()` pure-logic pattern + thin React wrapper
- `expo-crypto` `randomUUID()` for UUID generation
- AsyncStorage for key-value storage (session, settings, dark mode)
- Screen components use `export default function` (expo-router requirement)
- All colors via `useTheme().colors.*` — never hardcoded hex in components/screens
- Dynamic styles inside components (not StyleSheet.create) since colors come from useTheme hook
- AnimatedPressable replaces TouchableOpacity for press animations
- Haptic feedback: AnimatedPressable `hapticPattern` prop, `hapticSelection()` for tabs

### Mobile Supabase Client
- `mobile/src/lib/supabase.ts` — client singleton with AsyncStorage auth persistence
- RPC: `submit_transaction` with `p_idempotency_key` = client-generated UUID

### Mobile Offline Sync
- Local SQLite database with schema/migrations in `lib/db/`
- Transaction queue: enqueue → process on reconnect via `lib/sync/`
- Online status detection in `lib/sync/online-status.ts`
- Background sync via `lib/sync/background-task.ts`
- `useSyncQueue` hook: pendingCount, isSyncing, lastSyncTime, syncNow, refreshCache

### Mobile Test Stack
- **Vitest** for lib/hooks tests (better-sqlite3 mocks expo-sqlite) — 43+ tests
- **Jest** (jest-expo) for component tests
- Tests colocated with source files

### Path Alias (Mobile)
`@/*` → `src/*` (configured in `mobile/tsconfig.json`)

## Important Design Decisions

### No Destination Tracking in v1
Stock-out transactions do NOT record which restaurant received inventory. Deliberate v1 scope limitation.

### Timestamp Strategy
- `device_timestamp`: Client-provided (audit visibility only)
- `event_timestamp`: Server-validated/clamped (used for reporting)
- `server_timestamp`: Server-assigned (authoritative audit ordering)

### Deactivation Behavior
When employee is deactivated: all transaction inserts rejected, app forces logout and clears local cache, transaction history preserved.

### Currency-Agnostic Design
App supports multiple currencies via settings (SettingsContext). Currency is user-selectable, not hardcoded.

### Transaction Validation (server-side)
- Item exists and is not archived
- User is active (`profiles.is_active=true`)
- Quantity > 0 and ≤ 9999.999, respects `items.quantity_decimals`
- Employee role: only 'in'/'out' transactions (no 'adjustment')

## Common Pitfalls

1. **Never modify transactions**: They are immutable. Create new adjustment transactions instead.
2. **Don't store current_stock directly**: Always derive from transaction sum.
3. **Client UUID generation**: Transaction IDs must be generated client-side before enqueuing for idempotency.
4. **RLS is mandatory**: All database operations must respect Row Level Security policies.
5. **Table prefix**: Use `inv_` prefix for application tables (e.g., `inv_items` not `items`).
6. **Service role key security**: Never expose to client; only use in server-side code.
7. **Mobile colors**: Never hardcode hex values in mobile components — always use `useTheme().colors.*`.
8. **Mobile SQLite testability**: All DB functions take `db` as first parameter; never import a global db instance in lib code.
