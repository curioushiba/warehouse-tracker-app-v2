import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createItemCacheManager } from './useItemCache'
import type { CachedItem } from '@/types/offline'
import type { DomainId } from '@/lib/domain-config'

// Mock fetchAndCacheItems
const mockFetchAndCacheItems = vi.fn()
vi.mock('@/lib/sync/item-sync', () => ({
  fetchAndCacheItems: (...args: unknown[]) => mockFetchAndCacheItems(...args),
}))

// Mock getAllCachedItems
const mockGetAllCachedItems = vi.fn()
vi.mock('@/lib/db/items-cache', () => ({
  getAllCachedItems: (...args: unknown[]) => mockGetAllCachedItems(...args),
}))

function makeCachedItem(overrides: Partial<CachedItem> = {}): CachedItem {
  return {
    id: 'item-' + Math.random().toString(36).slice(2, 8),
    sku: 'SKU-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    name: 'Test Item',
    unit: 'pcs',
    currentStock: 100,
    minStock: 10,
    version: 1,
    updatedAt: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

describe('createItemCacheManager', () => {
  const mockDb = {} as unknown
  let setState: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    setState = vi.fn()
    mockFetchAndCacheItems.mockResolvedValue({ success: true, count: 0 })
    mockGetAllCachedItems.mockReturnValue([])
  })

  it('loadItems calls fetchAndCacheItems then getAllCachedItems with domain', async () => {
    const cachedItems = [makeCachedItem({ id: 'item-1', domain: 'commissary' })]
    mockFetchAndCacheItems.mockResolvedValue({ success: true, count: 1 })
    mockGetAllCachedItems.mockReturnValue(cachedItems)

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    await manager.loadItems()

    expect(mockFetchAndCacheItems).toHaveBeenCalledWith(mockDb, 'commissary')
    expect(mockGetAllCachedItems).toHaveBeenCalledWith(mockDb, 'commissary')
  })

  it('sets isLoading true during fetch', async () => {
    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)

    const loadPromise = manager.loadItems()

    // First call should set isLoading: true
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }))

    await loadPromise
  })

  it('sets items and isLoading false after successful fetch', async () => {
    const cachedItems = [
      makeCachedItem({ id: 'item-1', name: 'Flour' }),
      makeCachedItem({ id: 'item-2', name: 'Sugar' }),
    ]
    mockFetchAndCacheItems.mockResolvedValue({ success: true, count: 2 })
    mockGetAllCachedItems.mockReturnValue(cachedItems)

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    await manager.loadItems()

    expect(setState).toHaveBeenCalledWith({
      items: cachedItems,
      isLoading: false,
      error: null,
    })
  })

  it('falls back to cached items and propagates error when fetch fails', async () => {
    const cachedItems = [makeCachedItem({ id: 'item-cached', name: 'Cached Flour' })]
    mockFetchAndCacheItems.mockResolvedValue({ success: false, error: 'Network error' })
    mockGetAllCachedItems.mockReturnValue(cachedItems)

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    await manager.loadItems()

    // Should still read from cache and set items
    expect(mockGetAllCachedItems).toHaveBeenCalledWith(mockDb, 'commissary')
    expect(setState).toHaveBeenCalledWith({
      items: cachedItems,
      isLoading: false,
      error: null,
    })
    // Should also propagate the error
    expect(setState).toHaveBeenCalledWith({ error: 'Network error' })
  })

  it('uses default error message when fetch fails without error string', async () => {
    mockFetchAndCacheItems.mockResolvedValue({ success: false })
    mockGetAllCachedItems.mockReturnValue([])

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    await manager.loadItems()

    expect(setState).toHaveBeenCalledWith({ error: 'Failed to load items' })
  })

  it('clears error on successful refresh after previous failure', async () => {
    // First: fail
    mockFetchAndCacheItems.mockResolvedValue({ success: false, error: 'Network error' })
    mockGetAllCachedItems.mockReturnValue([])

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    await manager.loadItems()

    expect(setState).toHaveBeenCalledWith({ error: 'Network error' })

    // Second: succeed
    setState.mockClear()
    const cachedItems = [makeCachedItem({ id: 'item-1', name: 'Flour' })]
    mockFetchAndCacheItems.mockResolvedValue({ success: true, count: 1 })
    mockGetAllCachedItems.mockReturnValue(cachedItems)

    await manager.loadItems()

    // refreshFromCache sets error: null on success path
    expect(setState).toHaveBeenCalledWith({
      items: cachedItems,
      isLoading: false,
      error: null,
    })
    // Should NOT have set an error
    expect(setState).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })

  it('does nothing when domainId is null', async () => {
    const manager = createItemCacheManager(mockDb, null, setState)
    await manager.loadItems()

    expect(mockFetchAndCacheItems).not.toHaveBeenCalled()
    expect(mockGetAllCachedItems).not.toHaveBeenCalled()
  })

  it('refreshFromCache reads from cache without server fetch', async () => {
    const cachedItems = [makeCachedItem({ id: 'item-refresh', name: 'Refreshed' })]
    mockGetAllCachedItems.mockReturnValue(cachedItems)

    const manager = createItemCacheManager(mockDb, 'commissary' as DomainId, setState)
    manager.refreshFromCache()

    expect(mockFetchAndCacheItems).not.toHaveBeenCalled()
    expect(mockGetAllCachedItems).toHaveBeenCalledWith(mockDb, 'commissary')
    expect(setState).toHaveBeenCalledWith({
      items: cachedItems,
      isLoading: false,
      error: null,
    })
  })
})
