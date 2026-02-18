import { describe, it, expect } from 'vitest'
import { applyPendingOperationsToItems } from './apply-pending-ops'
import type { QueuedItemCreate, QueuedItemEdit, QueuedItemArchive } from '@/types/offline'

// Minimal server-format item for testing
interface TestItem {
  id: string
  sku: string
  name: string
  is_archived: boolean
  [key: string]: unknown
}

function makeServerItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    id: 'item-' + Math.random().toString(36).slice(2, 8),
    sku: 'SKU-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    name: 'Server Item',
    description: null,
    category_id: null,
    location_id: null,
    unit: 'pcs',
    current_stock: 100,
    min_stock: 10,
    max_stock: 500,
    unit_price: 9.99,
    barcode: null,
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

function makeCreate(overrides: Partial<QueuedItemCreate> = {}): QueuedItemCreate {
  const id = overrides.id || 'create-' + Math.random().toString(36).slice(2, 8)
  return {
    id,
    tempSku: 'TEMP-ABCD1234',
    itemData: {
      id,
      name: 'Offline Created Item',
      description: 'Created offline',
      unit: 'pcs',
      min_stock: 5,
      current_stock: 0,
    },
    idempotencyKey: 'idem-' + Math.random().toString(36).slice(2, 8),
    userId: 'user-1',
    status: 'pending',
    retryCount: 0,
    createdAt: '2024-06-15T12:00:00Z',
    deviceTimestamp: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

function makeEdit(overrides: Partial<QueuedItemEdit> = {}): QueuedItemEdit {
  return {
    id: 'edit-' + Math.random().toString(36).slice(2, 8),
    itemId: 'item-1',
    changes: { name: 'Edited Name' },
    expectedVersion: 1,
    idempotencyKey: 'idem-' + Math.random().toString(36).slice(2, 8),
    userId: 'user-1',
    status: 'pending',
    retryCount: 0,
    createdAt: '2024-06-15T12:00:00Z',
    deviceTimestamp: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

function makeArchive(overrides: Partial<QueuedItemArchive> = {}): QueuedItemArchive {
  return {
    id: 'archive-' + Math.random().toString(36).slice(2, 8),
    itemId: 'item-1',
    action: 'archive',
    expectedVersion: 1,
    idempotencyKey: 'idem-' + Math.random().toString(36).slice(2, 8),
    userId: 'user-1',
    status: 'pending',
    retryCount: 0,
    createdAt: '2024-06-15T12:00:00Z',
    deviceTimestamp: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

describe('applyPendingOperationsToItems', () => {
  // ---- No pending ops ----

  it('returns original non-archived items when no pending ops', () => {
    const items = [
      makeServerItem({ id: 'item-1', name: 'Item 1' }),
      makeServerItem({ id: 'item-2', name: 'Item 2' }),
    ]

    const result = applyPendingOperationsToItems(items, [], [], [])

    expect(result.items).toHaveLength(2)
    expect(result.items[0].name).toBe('Item 1')
    expect(result.items[1].name).toBe('Item 2')
    expect(result.pendingOperations.size).toBe(0)
    expect(result.offlineItemIds.size).toBe(0)
  })

  it('filters out archived server items when no pending ops', () => {
    const items = [
      makeServerItem({ id: 'item-1', name: 'Active', is_archived: false }),
      makeServerItem({ id: 'item-2', name: 'Archived', is_archived: true }),
    ]

    const result = applyPendingOperationsToItems(items, [], [], [])

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Active')
  })

  // ---- Pending creates ----

  it('prepends offline-created items before server items', () => {
    const serverItems = [makeServerItem({ id: 'server-1', name: 'Server Item' })]
    const creates = [makeCreate({ id: 'offline-1' })]

    const result = applyPendingOperationsToItems(serverItems, creates, [], [])

    expect(result.items).toHaveLength(2)
    // Offline items come first
    expect(result.items[0].id).toBe('offline-1')
    expect(result.items[1].id).toBe('server-1')
  })

  it('builds offline items with tempSku and correct defaults', () => {
    const creates = [
      makeCreate({
        id: 'offline-1',
        tempSku: 'TEMP-XY123456',
        itemData: {
          id: 'offline-1',
          name: 'My Offline Item',
          description: 'Offline desc',
          unit: 'kg',
          min_stock: 10,
          current_stock: 25,
          category_id: 'cat-1',
        },
      }),
    ]

    const result = applyPendingOperationsToItems([], creates, [], [])

    expect(result.items).toHaveLength(1)
    const item = result.items[0] as TestItem
    expect(item.id).toBe('offline-1')
    expect(item.sku).toBe('TEMP-XY123456')
    expect(item.name).toBe('My Offline Item')
    expect(item.description).toBe('Offline desc')
    expect(item.unit).toBe('kg')
    expect(item.min_stock).toBe(10)
    expect(item.current_stock).toBe(25)
    expect(item.is_archived).toBe(false)
    expect(item.version).toBe(0)
  })

  it('populates offlineItemIds for created items', () => {
    const creates = [
      makeCreate({ id: 'offline-a' }),
      makeCreate({ id: 'offline-b' }),
    ]

    const result = applyPendingOperationsToItems([], creates, [], [])

    expect(result.offlineItemIds.size).toBe(2)
    expect(result.offlineItemIds.has('offline-a')).toBe(true)
    expect(result.offlineItemIds.has('offline-b')).toBe(true)
  })

  it('marks offline items with "offline" pending operation type', () => {
    const creates = [makeCreate({ id: 'offline-1' })]

    const result = applyPendingOperationsToItems([], creates, [], [])

    const ops = result.pendingOperations.get('offline-1')
    expect(ops).toBeDefined()
    expect(ops!.has('offline')).toBe(true)
  })

  // ---- Pending edits ----

  it('applies pending edits to matching items', () => {
    const items = [makeServerItem({ id: 'item-1', name: 'Original Name' })]
    const edits = [makeEdit({ itemId: 'item-1', changes: { name: 'Edited Name' } })]

    const result = applyPendingOperationsToItems(items, [], edits, [])

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Edited Name')
  })

  it('applies multiple edits to the same item in order (last wins)', () => {
    const items = [makeServerItem({ id: 'item-1', name: 'Original' })]
    const edits = [
      makeEdit({ itemId: 'item-1', changes: { name: 'First Edit' } }),
      makeEdit({ itemId: 'item-1', changes: { name: 'Second Edit' } }),
      makeEdit({ itemId: 'item-1', changes: { name: 'Final Edit' } }),
    ]

    const result = applyPendingOperationsToItems(items, [], edits, [])

    expect(result.items[0].name).toBe('Final Edit')
  })

  it('edits only affect the targeted item', () => {
    const items = [
      makeServerItem({ id: 'item-1', name: 'Item 1' }),
      makeServerItem({ id: 'item-2', name: 'Item 2' }),
    ]
    const edits = [makeEdit({ itemId: 'item-1', changes: { name: 'Edited Item 1' } })]

    const result = applyPendingOperationsToItems(items, [], edits, [])

    expect(result.items[0].name).toBe('Edited Item 1')
    expect(result.items[1].name).toBe('Item 2')
  })

  it('marks edited items with "pending_edit" operation type', () => {
    const items = [makeServerItem({ id: 'item-1' })]
    const edits = [makeEdit({ itemId: 'item-1' })]

    const result = applyPendingOperationsToItems(items, [], edits, [])

    const ops = result.pendingOperations.get('item-1')
    expect(ops).toBeDefined()
    expect(ops!.has('pending_edit')).toBe(true)
  })

  // ---- Pending archives ----

  it('filters out items with pending archive action', () => {
    const items = [
      makeServerItem({ id: 'item-1', name: 'Will Be Archived' }),
      makeServerItem({ id: 'item-2', name: 'Stays Visible' }),
    ]
    const archives = [makeArchive({ itemId: 'item-1', action: 'archive' })]

    const result = applyPendingOperationsToItems(items, [], [], archives)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Stays Visible')
  })

  it('shows items with pending restore action', () => {
    const items = [
      makeServerItem({ id: 'item-1', name: 'Active' }),
      makeServerItem({ id: 'item-2', name: 'Archived On Server', is_archived: true }),
    ]
    const archives = [makeArchive({ itemId: 'item-2', action: 'restore' })]

    const result = applyPendingOperationsToItems(items, [], [], archives)

    expect(result.items).toHaveLength(2)
    const names = result.items.map((i) => i.name)
    expect(names).toContain('Active')
    expect(names).toContain('Archived On Server')
  })

  it('marks archived items with "pending_archive" operation type', () => {
    const items = [makeServerItem({ id: 'item-1' })]
    const archives = [makeArchive({ itemId: 'item-1', action: 'archive' })]

    const result = applyPendingOperationsToItems(items, [], [], archives)

    const ops = result.pendingOperations.get('item-1')
    expect(ops).toBeDefined()
    expect(ops!.has('pending_archive')).toBe(true)
  })

  it('marks restored items with "pending_restore" operation type', () => {
    const items = [makeServerItem({ id: 'item-1', is_archived: true })]
    const archives = [makeArchive({ itemId: 'item-1', action: 'restore' })]

    const result = applyPendingOperationsToItems(items, [], [], archives)

    const ops = result.pendingOperations.get('item-1')
    expect(ops).toBeDefined()
    expect(ops!.has('pending_restore')).toBe(true)
  })

  // ---- Combined operations ----

  it('combines creates, edits, and archives correctly', () => {
    const serverItems = [
      makeServerItem({ id: 'srv-1', name: 'Server Item 1' }),
      makeServerItem({ id: 'srv-2', name: 'Server Item 2' }),
      makeServerItem({ id: 'srv-3', name: 'Server Item 3' }),
    ]
    const creates = [makeCreate({ id: 'offline-1' })]
    const edits = [makeEdit({ itemId: 'srv-1', changes: { name: 'Edited Server 1' } })]
    const archives = [makeArchive({ itemId: 'srv-2', action: 'archive' })]

    const result = applyPendingOperationsToItems(serverItems, creates, edits, archives)

    // offline-1 + srv-1 (edited) + srv-3 (srv-2 archived)
    expect(result.items).toHaveLength(3)

    const ids = result.items.map((i) => i.id)
    expect(ids).toContain('offline-1')
    expect(ids).toContain('srv-1')
    expect(ids).toContain('srv-3')
    expect(ids).not.toContain('srv-2')

    // Verify edit was applied
    const editedItem = result.items.find((i) => i.id === 'srv-1')
    expect(editedItem!.name).toBe('Edited Server 1')

    // Verify pending operations map
    expect(result.pendingOperations.get('offline-1')!.has('offline')).toBe(true)
    expect(result.pendingOperations.get('srv-1')!.has('pending_edit')).toBe(true)
    expect(result.pendingOperations.get('srv-2')!.has('pending_archive')).toBe(true)

    // Verify offline item IDs
    expect(result.offlineItemIds.has('offline-1')).toBe(true)
    expect(result.offlineItemIds.has('srv-1')).toBe(false)
  })

  it('applies edits to offline-created items', () => {
    const creates = [
      makeCreate({
        id: 'offline-1',
        itemData: { id: 'offline-1', name: 'Original Offline Name' },
      }),
    ]
    const edits = [makeEdit({ itemId: 'offline-1', changes: { name: 'Edited Offline Name' } })]

    const result = applyPendingOperationsToItems([], creates, edits, [])

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Edited Offline Name')
  })

  it('handles empty serverItems with only pending operations', () => {
    const creates = [makeCreate({ id: 'offline-1' })]

    const result = applyPendingOperationsToItems([], creates, [], [])

    expect(result.items).toHaveLength(1)
    expect(result.offlineItemIds.has('offline-1')).toBe(true)
  })

  it('returns empty result when all inputs are empty', () => {
    const result = applyPendingOperationsToItems([], [], [], [])

    expect(result.items).toEqual([])
    expect(result.pendingOperations.size).toBe(0)
    expect(result.offlineItemIds.size).toBe(0)
  })

  it('uses latest archive action when multiple exist for same item', () => {
    const items = [makeServerItem({ id: 'item-1', is_archived: false })]
    const archives = [
      makeArchive({ itemId: 'item-1', action: 'archive' }),
      makeArchive({ itemId: 'item-1', action: 'restore' }),
    ]

    const result = applyPendingOperationsToItems(items, [], [], archives)

    // Last archive for item-1 is 'restore', so item should be visible
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('item-1')
  })
})
