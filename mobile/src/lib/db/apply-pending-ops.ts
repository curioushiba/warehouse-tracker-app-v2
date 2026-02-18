import type { QueuedItemCreate, QueuedItemEdit, QueuedItemArchive, PendingOperationType } from '@/types/offline'

/**
 * Apply all pending offline operations to server-fetched items.
 * This is a pure function - it receives queue arrays as parameters and does NOT read from DB.
 *
 * Returns items with offline-created items merged in and edits/archives applied,
 * plus metadata about which items have pending operations.
 */
export function applyPendingOperationsToItems<T extends { id: string; is_archived?: boolean }>(
  serverItems: T[],
  pendingCreates: QueuedItemCreate[],
  pendingEdits: QueuedItemEdit[],
  pendingArchives: QueuedItemArchive[]
): {
  items: T[]
  pendingOperations: Map<string, Set<PendingOperationType>>
  offlineItemIds: Set<string>
} {
  const pendingOperations = new Map<string, Set<PendingOperationType>>()
  const offlineItemIds = new Set<string>()

  // Helper to add operation type
  const addOp = (itemId: string, type: PendingOperationType) => {
    const ops = pendingOperations.get(itemId) || new Set()
    ops.add(type)
    pendingOperations.set(itemId, ops)
  }

  // Convert offline-created items to server format for display
  const offlineCreatedItems: T[] = pendingCreates.map((create) => {
    offlineItemIds.add(create.id)
    addOp(create.id, 'offline')
    return {
      id: create.id,
      sku: create.tempSku,
      name: (create.itemData.name as string) || 'New Item',
      description: create.itemData.description ?? null,
      category_id: create.itemData.category_id ?? null,
      location_id: create.itemData.location_id ?? null,
      unit: create.itemData.unit || 'pcs',
      current_stock: create.itemData.current_stock ?? 0,
      min_stock: create.itemData.min_stock ?? 0,
      max_stock: create.itemData.max_stock ?? null,
      unit_price: create.itemData.unit_price ?? 0,
      barcode: create.itemData.barcode ?? null,
      image_url: create.itemData.image_url ?? null,
      is_archived: false,
      version: 0,
      created_at: create.createdAt,
      updated_at: create.createdAt,
    } as unknown as T
  })

  // Group edits by itemId
  const editsByItem = new Map<string, QueuedItemEdit[]>()
  for (const edit of pendingEdits) {
    const existing = editsByItem.get(edit.itemId) || []
    existing.push(edit)
    editsByItem.set(edit.itemId, existing)
    addOp(edit.itemId, 'pending_edit')
  }

  // Track archive operations - keep only the latest for each item
  const archivesByItem = new Map<string, QueuedItemArchive>()
  for (const archive of pendingArchives) {
    archivesByItem.set(archive.itemId, archive)
    addOp(archive.itemId, archive.action === 'archive' ? 'pending_archive' : 'pending_restore')
  }

  // Combine: offline items first, then server items
  let allItems = [...offlineCreatedItems, ...serverItems]

  // Apply edits
  allItems = allItems.map((item) => {
    const edits = editsByItem.get(item.id)
    if (!edits) return item

    let modified = { ...item }
    for (const edit of edits) {
      modified = { ...modified, ...edit.changes }
    }
    return modified
  })

  // Apply archive status changes
  allItems = allItems.filter((item) => {
    const archive = archivesByItem.get(item.id)
    if (!archive) return !item.is_archived
    return archive.action === 'restore'
  })

  return { items: allItems, pendingOperations, offlineItemIds }
}
