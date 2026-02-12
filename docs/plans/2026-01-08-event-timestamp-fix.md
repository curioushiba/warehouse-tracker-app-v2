# Event Timestamp Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix transaction timestamp display so offline-synced transactions show actual event time, not sync time.

**Architecture:** Add `event_timestamp` column to `inv_transactions` table. Server validates/clamps client `device_timestamp` (±5 min future, 30 days past) and stores as `event_timestamp`. All user-facing displays use `event_timestamp` instead of `server_timestamp`.

**Tech Stack:** PostgreSQL (Supabase), Next.js 14, TypeScript, Vitest

---

## Background

**Problem:** Transactions performed offline at 3pm display as 2am the next day (when synced).

**Root Cause:** UI displays `server_timestamp` (database insert time) instead of `device_timestamp` (when transaction actually happened).

**Solution:** Introduce `event_timestamp` - a server-validated timestamp for display/reporting.

| Timestamp | Purpose | Source |
|-----------|---------|--------|
| `device_timestamp` | Raw client time | Client provides |
| `event_timestamp` | Display/reporting | Server validates/clamps device time |
| `server_timestamp` | Audit ordering | Database DEFAULT NOW() |

---

## Task 1: Database Migration - Add Column

**Files:**
- Create: `supabase/migrations/014_add_event_timestamp.sql`

**Step 1: Write the migration DDL**

```sql
-- Migration: Add event_timestamp to inv_transactions
-- This timestamp is server-validated for display/reporting purposes

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.inv_transactions
ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ;

-- Step 2: Create index for queries/reporting
CREATE INDEX IF NOT EXISTS idx_inv_transactions_event_timestamp
ON public.inv_transactions(event_timestamp DESC);

-- Step 3: Backfill existing records using device_timestamp
UPDATE public.inv_transactions
SET event_timestamp = device_timestamp
WHERE event_timestamp IS NULL;

-- Step 4: Make column NOT NULL after backfill
ALTER TABLE public.inv_transactions
ALTER COLUMN event_timestamp SET NOT NULL;
```

**Step 2: Run migration locally**

Use Supabase MCP or run directly against local database.

Expected: Column added, existing records backfilled.

**Step 3: Verify migration**

```sql
SELECT id, device_timestamp, event_timestamp, server_timestamp
FROM inv_transactions
LIMIT 5;
```

Expected: All three timestamp columns populated, `event_timestamp` = `device_timestamp` for existing records.

**Step 4: Commit**

```bash
git add supabase/migrations/014_add_event_timestamp.sql
git commit -m "feat(db): add event_timestamp column to inv_transactions"
```

---

## Task 2: Database Migration - Update RPC Function

**Files:**
- Modify: `supabase/migrations/014_add_event_timestamp.sql` (append to same file)

**Step 1: Add the updated submit_transaction function**

Append to the migration file:

```sql
-- Step 5: Update submit_transaction function to compute event_timestamp
CREATE OR REPLACE FUNCTION public.submit_transaction(
  p_transaction_type TEXT,
  p_item_id UUID,
  p_quantity DECIMAL,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_device_timestamp TIMESTAMPTZ DEFAULT NOW(),
  p_source_location_id UUID DEFAULT NULL,
  p_destination_location_id UUID DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS public.inv_transactions AS $$
DECLARE
  v_item public.inv_items;
  v_stock_before DECIMAL;
  v_stock_after DECIMAL;
  v_transaction public.inv_transactions;
  v_event_timestamp TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Idempotency check: return existing transaction if key matches
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_transaction
    FROM public.inv_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  -- Calculate event_timestamp with clamping
  -- Rule: within 5 minutes future, 30 days past
  v_event_timestamp := p_device_timestamp;

  -- Clamp future timestamps (max 5 minutes ahead)
  IF v_event_timestamp > v_now + INTERVAL '5 minutes' THEN
    v_event_timestamp := v_now;
  END IF;

  -- Clamp past timestamps (max 30 days back)
  IF v_event_timestamp < v_now - INTERVAL '30 days' THEN
    v_event_timestamp := v_now - INTERVAL '30 days';
  END IF;

  -- Lock item row for update
  SELECT * INTO v_item
  FROM public.inv_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;

  IF v_item.is_archived THEN
    RAISE EXCEPTION 'Cannot perform transaction on archived item';
  END IF;

  v_stock_before := v_item.current_stock;

  -- Calculate new stock based on transaction type
  CASE p_transaction_type
    WHEN 'check_in', 'return' THEN
      v_stock_after := v_stock_before + p_quantity;
    WHEN 'check_out', 'write_off' THEN
      IF v_stock_before < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_stock_before, p_quantity;
      END IF;
      v_stock_after := v_stock_before - p_quantity;
    WHEN 'adjustment' THEN
      v_stock_after := p_quantity;
    WHEN 'transfer' THEN
      IF v_stock_before < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for transfer. Available: %, Requested: %', v_stock_before, p_quantity;
      END IF;
      v_stock_after := v_stock_before - p_quantity;
    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END CASE;

  -- Update item stock
  UPDATE public.inv_items
  SET current_stock = v_stock_after
  WHERE id = p_item_id;

  -- Create transaction record with event_timestamp
  INSERT INTO public.inv_transactions (
    transaction_type,
    item_id,
    quantity,
    stock_before,
    stock_after,
    source_location_id,
    destination_location_id,
    user_id,
    notes,
    device_timestamp,
    event_timestamp,
    idempotency_key
  ) VALUES (
    p_transaction_type,
    p_item_id,
    p_quantity,
    v_stock_before,
    v_stock_after,
    p_source_location_id,
    p_destination_location_id,
    p_user_id,
    p_notes,
    p_device_timestamp,
    v_event_timestamp,
    p_idempotency_key
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;
```

**Step 2: Run updated migration**

Apply the updated function via Supabase MCP.

**Step 3: Test the clamping logic manually**

```sql
-- Test: Normal timestamp (should be preserved)
SELECT submit_transaction(
  'check_in',
  (SELECT id FROM inv_items LIMIT 1),
  1,
  (SELECT id FROM profiles LIMIT 1),
  'Test normal timestamp'
);

-- Verify event_timestamp matches device_timestamp
SELECT device_timestamp, event_timestamp, server_timestamp
FROM inv_transactions
ORDER BY server_timestamp DESC
LIMIT 1;
```

Expected: `event_timestamp` ≈ `device_timestamp` (within seconds).

**Step 4: Commit**

```bash
git add supabase/migrations/014_add_event_timestamp.sql
git commit -m "feat(db): add event_timestamp clamping to submit_transaction RPC"
```

---

## Task 3: TypeScript Types Update

**Files:**
- Modify: `src/lib/supabase/types.ts`

**Step 1: Read the current types file**

Locate the `inv_transactions` table definition in `src/lib/supabase/types.ts`.

**Step 2: Add event_timestamp to Row type**

Find the `inv_transactions` Row type and add `event_timestamp`:

```typescript
// In Tables > inv_transactions > Row
event_timestamp: string
```

Add after `device_timestamp: string` line.

**Step 3: Add event_timestamp to submit_transaction Returns**

Find the `submit_transaction` function Returns type and add:

```typescript
// In Functions > submit_transaction > Returns
event_timestamp: string
```

**Step 4: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat(types): add event_timestamp to Transaction types"
```

---

## Task 4: Write Failing Test for Server Action Ordering

**Files:**
- Modify: `src/lib/actions/transactions.test.ts`

**Step 1: Write failing test for event_timestamp ordering**

Add test to verify transactions are ordered by `event_timestamp`:

```typescript
describe('getTransactionsWithDetails', () => {
  it('should order transactions by event_timestamp descending', async () => {
    const result = await getTransactionsWithDetails()

    if (!result.success) {
      throw new Error('Failed to get transactions')
    }

    // Verify ordering: each transaction's event_timestamp should be
    // >= the next one (descending order)
    const transactions = result.data
    for (let i = 0; i < transactions.length - 1; i++) {
      const current = new Date(transactions[i].event_timestamp).getTime()
      const next = new Date(transactions[i + 1].event_timestamp).getTime()
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/actions/transactions.test.ts
```

Expected: FAIL - `event_timestamp` property doesn't exist or ordering is wrong.

**Step 3: Commit failing test**

```bash
git add src/lib/actions/transactions.test.ts
git commit -m "test(transactions): add failing test for event_timestamp ordering"
```

---

## Task 5: Update Server Actions to Use event_timestamp

**Files:**
- Modify: `src/lib/actions/transactions.ts`

**Step 1: Update getTransactionsWithDetails ordering**

Find `.order('server_timestamp', { ascending: false })` and change to:

```typescript
.order('event_timestamp', { ascending: false })
```

**Step 2: Update getTransactionsWithDetailsPaginated ordering**

Same change: `server_timestamp` → `event_timestamp`

**Step 3: Update date filter queries**

Find any `.gte('server_timestamp', ...)` or `.lte('server_timestamp', ...)` for date filtering and change to `event_timestamp`.

**Step 4: Update all other transaction queries**

Apply same pattern to:
- `getTransactions`
- `getItemTransactions`
- `getUserTransactions`
- `getEmployeeTransactionsWithItems`
- `getEmployeeTransactionsWithItemsPaginated`
- `getRecentTransactions`

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/lib/actions/transactions.test.ts
```

Expected: PASS

**Step 6: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/lib/actions/transactions.ts
git commit -m "feat(actions): use event_timestamp for ordering and filtering"
```

---

## Task 6: Update Admin Transactions Page Display

**Files:**
- Modify: `src/app/admin/transactions/page.tsx`

**Step 1: Update table cell display**

Find `formatDateTime(tx.server_timestamp)` and change to:

```typescript
formatDateTime(tx.event_timestamp)
```

**Step 2: Update modal detail display**

Find `formatDateTime(selectedTransaction.server_timestamp)` and change to:

```typescript
formatDateTime(selectedTransaction.event_timestamp)
```

**Step 3: Update CSV export**

Find the CSV export rows mapping with `formatDateTime(tx.server_timestamp)` and change to:

```typescript
formatDateTime(tx.event_timestamp)
```

**Step 4: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds.

**Step 5: Manual verification**

```bash
npm run dev
```

Open http://localhost:3000/admin/transactions and verify:
- Table shows transaction times
- Modal detail shows transaction time
- Times should reflect actual event time, not sync time

**Step 6: Commit**

```bash
git add src/app/admin/transactions/page.tsx
git commit -m "feat(admin): display event_timestamp in transactions page"
```

---

## Task 7: Update Employee History Page Display

**Files:**
- Modify: `src/app/employee/history/page.tsx`

**Step 1: Update date filter comparison**

Find `new Date(t.server_timestamp)` in filtering logic and change to:

```typescript
new Date(t.event_timestamp)
```

**Step 2: Update sorting logic**

Find sorting by `server_timestamp` and change to:

```typescript
b.event_timestamp.localeCompare(a.event_timestamp) // for descending
// or
new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
```

**Step 3: Update group key date**

Find `new Date(transaction.server_timestamp)` in grouping logic and change to:

```typescript
new Date(transaction.event_timestamp)
```

**Step 4: Update relative time display**

Find `formatRelativeTime(transaction.server_timestamp)` and change to:

```typescript
formatRelativeTime(transaction.event_timestamp)
```

**Step 5: Update modal detail display**

Find `formatDateTime(selectedTransaction.server_timestamp)` and change to:

```typescript
formatDateTime(selectedTransaction.event_timestamp)
```

**Step 6: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds.

**Step 7: Manual verification**

Open http://localhost:3000/employee/history and verify:
- Transaction list shows correct times
- Date grouping (Today, Yesterday, etc.) works correctly
- Modal shows correct time

**Step 8: Commit**

```bash
git add src/app/employee/history/page.tsx
git commit -m "feat(employee): display event_timestamp in history page"
```

---

## Task 8: Update Item Detail Page Display

**Files:**
- Modify: `src/app/admin/items/[id]/page.tsx`

**Step 1: Update transaction history table**

Find `formatDateTime(tx.server_timestamp)` and change to:

```typescript
formatDateTime(tx.event_timestamp)
```

**Step 2: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/admin/items/[id]/page.tsx
git commit -m "feat(admin): display event_timestamp in item detail page"
```

---

## Task 9: Update Dashboard Recent Transactions

**Files:**
- Modify: `src/app/admin/page.tsx`

**Step 1: Update relative time display**

Find `formatRelativeTime(transaction.server_timestamp)` and change to:

```typescript
formatRelativeTime(transaction.event_timestamp)
```

**Step 2: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): display event_timestamp in dashboard"
```

---

## Task 10: Final Verification

**Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: End-to-end manual test**

1. Start dev server: `npm run dev`
2. Log in as employee
3. Go to stock operations
4. Note the current time
5. Perform a stock-in transaction
6. Check employee history - time should match when you did it
7. Log in as admin
8. Check admin transactions page - same transaction should show same time
9. Check item detail page - transaction should show correct time

**Step 4: Test offline sync scenario (if possible)**

1. Create a transaction entry in IndexedDB with a `deviceTimestamp` from yesterday
2. Trigger sync
3. Verify the displayed `event_timestamp` shows yesterday's time, not today's sync time

**Step 5: Final commit (if any cleanup needed)**

```bash
git status
# If any uncommitted changes
git add -A
git commit -m "chore: cleanup after event_timestamp implementation"
```

---

## Verification Checklist

- [ ] Migration runs successfully
- [ ] TypeScript types include `event_timestamp`
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] Admin transactions page shows `event_timestamp`
- [ ] Employee history page shows `event_timestamp`
- [ ] Item detail page shows `event_timestamp`
- [ ] Dashboard shows `event_timestamp`
- [ ] Offline-synced transactions show actual event time, not sync time

---

## Rollback Strategy

If issues arise:

1. **UI Rollback** (instant): Change `event_timestamp` back to `server_timestamp` in display components
2. **Database Rollback**: Make `event_timestamp` nullable, revert RPC function
3. **Data Safe**: Original `device_timestamp` and `server_timestamp` are never modified
