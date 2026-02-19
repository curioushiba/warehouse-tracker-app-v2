import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from '@/lib/db/migrations'
import { getAllCachedItems } from '@/lib/db/items-cache'
import { fetchAndCacheItems } from './item-sync'

type TestDb = ReturnType<typeof openDatabaseSync>

// Mock supabase client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

function makeSupabaseItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-' + Math.random().toString(36).slice(2, 8),
    sku: 'SKU-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    name: 'Test Item',
    description: null,
    category_id: null,
    location_id: null,
    unit: 'pcs',
    current_stock: 100,
    min_stock: 10,
    max_stock: null,
    barcode: null,
    unit_price: null,
    image_url: null,
    is_archived: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T12:00:00Z',
    ...overrides,
  }
}

describe('fetchAndCacheItems', () => {
  let db: TestDb

  beforeEach(() => {
    vi.clearAllMocks()
    db = openDatabaseSync('test')
    runMigrations(db)

    // Default chain: from() -> select() -> eq()
    mockEq.mockResolvedValue({ data: [], error: null })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('fetches from cm_items for commissary domain', async () => {
    mockEq.mockResolvedValue({ data: [], error: null })

    await fetchAndCacheItems(db, 'commissary')

    expect(mockFrom).toHaveBeenCalledWith('cm_items')
  })

  it('fetches from fg_items for frozen-goods domain', async () => {
    mockEq.mockResolvedValue({ data: [], error: null })

    await fetchAndCacheItems(db, 'frozen-goods')

    expect(mockFrom).toHaveBeenCalledWith('fg_items')
  })

  it('converts and caches items with domain tag', async () => {
    const items = [
      makeSupabaseItem({ id: 'item-1', name: 'Flour', sku: 'SKU-001' }),
      makeSupabaseItem({ id: 'item-2', name: 'Sugar', sku: 'SKU-002' }),
    ]
    mockEq.mockResolvedValue({ data: items, error: null })

    await fetchAndCacheItems(db, 'commissary')

    const cached = getAllCachedItems(db, 'commissary')
    expect(cached).toHaveLength(2)
    expect(cached[0].domain).toBe('commissary')
    expect(cached[1].domain).toBe('commissary')
  })

  it('returns success with count on successful fetch', async () => {
    const items = [
      makeSupabaseItem({ id: 'item-1' }),
      makeSupabaseItem({ id: 'item-2' }),
      makeSupabaseItem({ id: 'item-3' }),
    ]
    mockEq.mockResolvedValue({ data: items, error: null })

    const result = await fetchAndCacheItems(db, 'commissary')

    expect(result).toEqual({ success: true, count: 3 })
  })

  it('returns failure on Supabase error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'Table not found' } })

    const result = await fetchAndCacheItems(db, 'commissary')

    expect(result).toEqual({ success: false, error: 'Table not found' })
  })

  it('returns failure on network error', async () => {
    mockEq.mockRejectedValue(new Error('Network request failed'))

    const result = await fetchAndCacheItems(db, 'commissary')

    expect(result).toEqual({ success: false, error: 'Network request failed' })
  })

  it('does not cache items on error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'Error' } })

    await fetchAndCacheItems(db, 'commissary')

    const cached = getAllCachedItems(db, 'commissary')
    expect(cached).toHaveLength(0)
  })
})
