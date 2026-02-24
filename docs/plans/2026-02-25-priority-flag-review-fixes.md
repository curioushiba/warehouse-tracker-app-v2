# Priority Flag Code Review Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 4 issues identified in the commissary priority pin/star code review.

**Architecture:** Straightforward fixes — add missing fields to test mocks, add `isPriority` to the offline cache interface + conversions, add error feedback on toggle failure, and add a commissary guard to the server action.

**Tech Stack:** TypeScript, Vitest, Next.js server actions, Supabase

---

### Task 1: Fix test mocks — add `is_priority` to Item literals

**Files:**
- Modify: `src/lib/actions/items.test.ts:6-43` (two mock Item objects missing `store_id`, `is_commissary`, `is_priority`)
- Modify: `src/components/search/ItemSearchAutocomplete.test.tsx:16-57` (two mock Item objects missing `is_priority`)
- Modify: `src/contexts/BatchScanContext.test.tsx:13-33` (`createMockItem` factory missing `is_priority`)

**Step 1: Fix `items.test.ts` mock items**

Both mock items at lines 6 and 25 are missing `store_id`, `is_commissary`, and `is_priority`. Add all three fields to each:

```typescript
// Item at line 6 — add after is_archived: false (line 20):
    store_id: null,
    is_commissary: false,
    is_priority: false,

// Item at line 25 — add after is_archived: false (line 39):
    store_id: null,
    is_commissary: false,
    is_priority: false,
```

**Step 2: Fix `ItemSearchAutocomplete.test.tsx` mock items**

Both mock items at lines 16 and 37 already have `is_commissary` but are missing `is_priority`. Add after each `is_commissary: false`:

```typescript
    is_priority: false,
```

**Step 3: Fix `BatchScanContext.test.tsx` factory**

The `createMockItem` factory at line 13 already has `is_commissary` but is missing `is_priority`. Add after `is_commissary: false` (line 29):

```typescript
  is_priority: false,
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run`
Expected: All tests pass with zero type errors.

---

### Task 2: Add `isPriority` to `CachedItem` interface and conversions

**Files:**
- Modify: `src/lib/offline/db.ts:22-42` (CachedItem interface)
- Modify: `src/lib/offline/db.ts:973` (cachedItemToItem — already has `is_priority: false`, update to use `cached.isPriority`)
- Modify: `src/lib/offline/db.ts:980-1001` (itemToCachedItem — add `isPriority` mapping)

**Step 1: Add `isPriority` to `CachedItem` interface**

In `src/lib/offline/db.ts`, after line 39 (`isCommissary?: boolean`), add:

```typescript
  isPriority?: boolean
```

**Step 2: Update `cachedItemToItem` to use cached value**

Change line 973 from:
```typescript
    is_priority: false,
```
to:
```typescript
    is_priority: cached.isPriority ?? false,
```

**Step 3: Add `isPriority` mapping in `itemToCachedItem`**

After line 998 (`isCommissary: item.is_commissary,`), add:

```typescript
    isPriority: item.is_priority,
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Zero TypeScript errors.

---

### Task 3: Add error feedback for failed priority toggles

**Files:**
- Modify: `src/app/admin/commissary/page.tsx:268-280` (handleTogglePriority function)

**Step 1: Add error feedback in the failure branch**

The existing `error` state and `setError` are already available in the component. Update `handleTogglePriority` to show the error:

```typescript
  const handleTogglePriority = async (itemId: string, currentValue: boolean) => {
    setTogglingPriority(prev => new Set(prev).add(itemId));
    try {
      const result = await togglePriorityFlag(itemId, !currentValue);
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error || "Failed to update priority");
      }
    } finally {
      setTogglingPriority(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };
```

This reuses the existing `error` state which already renders as an `<Alert status="error">` at the top of the page (line 300-303).

---

### Task 4: Add commissary guard to `togglePriorityFlag`

**Files:**
- Modify: `src/lib/actions/commissary.ts:716-740` (togglePriorityFlag function)

**Step 1: Add `.eq('is_commissary', true)` filter to the update query**

This is the cleanest approach — if the item is not a commissary item, the update affects zero rows and Supabase returns a "not found" error from `.single()`, which maps to a failure result.

Change the query from:
```typescript
    const { data, error } = await (supabase.from('inv_items') as any)
      .update({ is_priority: isPriority })
      .eq('id', itemId)
      .select()
      .single()
```
to:
```typescript
    const { data, error } = await (supabase.from('inv_items') as any)
      .update({ is_priority: isPriority })
      .eq('id', itemId)
      .eq('is_commissary', true)
      .select()
      .single()
```

If a non-commissary item ID is passed, `.single()` returns an error because the update matched zero rows.

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Zero TypeScript errors.

---

### Task 5: Final verification

**Step 1:** Run `npm run test:run` — all tests pass
**Step 2:** Run `npm run build` — zero errors
