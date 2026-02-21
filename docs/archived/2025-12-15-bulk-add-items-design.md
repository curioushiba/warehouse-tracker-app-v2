# Bulk Add Items Feature - Implementation Plan

**Date:** 2025-12-15
**Status:** Ready for Implementation

## Summary

Add a "Bulk Add" button to the admin Items page that opens a modal for quickly adding multiple items by name only. Items get default values (auto-SKU, unit="pcs", stock=0). Admins can edit item details later.

## UX Flow

1. Admin clicks "Bulk Add" button (next to existing "Add Item")
2. Modal opens with one empty name input + "Add Another Item" button
3. Admin enters names, adds/removes rows as needed
4. Real-time validation highlights errors (empty names, duplicates)
5. Submit button shows count: "Add N Items"
6. On success: toast message, modal closes, list refreshes
7. On error: show error message, admin can fix and retry

## Files to Modify/Create

### 1. Create `src/components/items/BulkAddModal.tsx` (NEW)

Client component with:
- **Props:** `isOpen`, `onClose`, `onSuccess`
- **State:** `rows: string[]`, `errors: Map<number, string>`, `isSubmitting`
- Dynamic form rows with add/remove functionality
- Client-side validation (no empty names, no duplicates within form)
- Calls `bulkCreateItems` server action on submit

**Component Structure:**
```
┌─────────────────────────────────────┐
│  Bulk Add Items              [X]    │
├─────────────────────────────────────┤
│  Item Name                          │
│  ┌─────────────────────────┐ [−]    │
│  │ (input)                 │        │
│  └─────────────────────────┘        │
│  ┌─────────────────────────┐ [−]    │
│  │ (input)                 │        │
│  └─────────────────────────┘        │
│                                     │
│  [+ Add Another Item]               │
│                                     │
├─────────────────────────────────────┤
│            [Cancel]  [Add 2 Items]  │
└─────────────────────────────────────┘
```

### 2. Modify `src/lib/actions/items.ts`

Add new server action:

```typescript
export async function bulkCreateItems(names: string[]): Promise<ActionResult<Item[]>>
```

**Logic:**
1. Validate input (non-empty array, all strings non-empty after trim)
2. Generate SKU for each item using existing pattern
3. Build array of `ItemInsert` objects with defaults:
   - `name`: from input
   - `sku`: auto-generated
   - `unit`: "pcs"
   - `current_stock`: 0
   - `min_stock`: 0
4. Single Supabase insert with array (atomic operation)
5. `revalidatePath('/admin/items')`
6. Return `success(createdItems)` or `failure(error)`

### 3. Modify `src/app/admin/items/page.tsx`

- Import `BulkAddModal`
- Add state: `isBulkAddOpen`
- Add "Bulk Add" button next to existing "Add Item" button
- Render `BulkAddModal` with open/close handlers
- Show success toast on completion

## Validation Rules

### Client-side (BulkAddModal)

| Validation | UX Feedback |
|------------|-------------|
| Empty row (after trim) | Red border + "Name required" under the row |
| Duplicate within form (case-insensitive) | Red border on both + "Duplicate name" message |
| All rows empty | Submit button disabled |
| At least 1 valid row | Submit button enabled |

### Server-side (bulkCreateItems)

| Error | Response |
|-------|----------|
| Empty array | `failure("At least one item name required")` |
| Any empty string | `failure("All item names must be non-empty")` |
| Auth failure | `failure("Not authorized")` |
| DB error | `failure(error.message)` |

## Dependencies

Use existing UI components:
- `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` from `@/components/ui/Modal`
- `Button`, `IconButton` from `@/components/ui/Button`
- `Input` from `@/components/ui/Input`
- `FormControl`, `FormLabel`, `FormErrorMessage` from `@/components/ui/Form`
- `Plus`, `Trash2` icons from `lucide-react`

## SKU Generation

Copy existing pattern from `src/app/admin/items/new/page.tsx`:

```typescript
const generateSku = (): string => {
  const prefix = "SKU";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};
```

## Item Defaults

When bulk creating, each item gets these defaults:
- `sku`: Auto-generated (unique per item)
- `unit`: "pcs"
- `current_stock`: 0
- `min_stock`: 0
- `unit_price`: null
- `category_id`: null
- `location_id`: null
- `barcode`: null
- `description`: null
- `image_url`: null
- `is_archived`: false

## Testing Considerations

- Unit test `bulkCreateItems` server action
- Test validation logic (empty names, duplicates)
- Test modal open/close behavior
- Test dynamic row add/remove
- Test submit button state (disabled when invalid)
- Test success/error flows
