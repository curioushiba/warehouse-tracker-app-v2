import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the server action
vi.mock('@/lib/actions/dashboard', () => ({
  getStoreItemsBreakdown: vi.fn(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { StoresPanel } from './StoresPanel'
import { getStoreItemsBreakdown } from '@/lib/actions/dashboard'
import type { StoreBreakdown, ProblematicItem } from '@/lib/actions/dashboard'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ProblematicItem> = {}): ProblematicItem {
  return {
    id: 'item-1',
    name: 'Test Item',
    sku: 'SKU-001',
    currentStock: 0,
    minStock: 10,
    unit: 'pcs',
    level: 'critical',
    ...overrides,
  }
}

function makeStore(overrides: Partial<StoreBreakdown> = {}): StoreBreakdown {
  return {
    id: 'store-1',
    name: 'Main Warehouse',
    count: 10,
    lowStockCount: 0,
    criticalStockCount: 0,
    problematicItems: [],
    ...overrides,
  }
}

function mockStores(stores: StoreBreakdown[]) {
  const totalActiveCount = stores.reduce((sum, s) => sum + s.count, 0)
  vi.mocked(getStoreItemsBreakdown).mockResolvedValue({
    success: true as const,
    data: { stores, totalActiveCount },
  })
}

// Helper: get the detail pane container
function getDetailPane() {
  return document.querySelector('[data-testid="store-detail-pane"]') as HTMLElement
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoresPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton initially', () => {
    // Never resolves — stays in loading state
    vi.mocked(getStoreItemsBreakdown).mockReturnValue(new Promise(() => {}))
    render(<StoresPanel />)

    // Skeletons should be present
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [data-testid="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders all store names in the store list', async () => {
    mockStores([
      makeStore({ id: 'store-1', name: 'Alpha Warehouse' }),
      makeStore({ id: 'store-2', name: 'Beta Warehouse' }),
      makeStore({ id: 'store-3', name: 'Gamma Warehouse' }),
    ])

    render(<StoresPanel />)

    // Store names appear in both desktop list and mobile pills (jsdom renders both)
    // Use getAllByText since names appear multiple times
    expect((await screen.findAllByText('Alpha Warehouse')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Beta Warehouse').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gamma Warehouse').length).toBeGreaterThan(0)
  })

  it('auto-selects first problem store on load', async () => {
    mockStores([
      makeStore({ id: 'store-1', name: 'Healthy Store', criticalStockCount: 0, lowStockCount: 0 }),
      makeStore({
        id: 'store-2',
        name: 'Problem Store',
        criticalStockCount: 2,
        problematicItems: [
          makeItem({ id: 'i1', name: 'Out of Stock Item' }),
          makeItem({ id: 'i2', name: 'Another OOS Item' }),
        ],
      }),
    ])

    render(<StoresPanel />)

    // The detail pane should show items from the problem store (auto-selected)
    expect(await screen.findByText('Out of Stock Item')).toBeInTheDocument()
    expect(screen.getByText('Another OOS Item')).toBeInTheDocument()
  })

  it('shows detail pane items when store is selected', async () => {
    const user = userEvent.setup()

    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Store A',
        criticalStockCount: 1,
        problematicItems: [makeItem({ id: 'i1', name: 'Item A' })],
      }),
      makeStore({
        id: 'store-2',
        name: 'Store B',
        lowStockCount: 1,
        problematicItems: [makeItem({ id: 'i2', name: 'Item B', level: 'low', currentStock: 3 })],
      }),
    ])

    render(<StoresPanel />)

    // Wait for data to load — find any element with store name
    await screen.findAllByText('Store A')

    // Click Store B in the desktop list (first match)
    const storeBButtons = screen.getAllByText('Store B')
    await user.click(storeBButtons[0])

    // Detail pane should show Store B's items
    expect(screen.getByText('Item B')).toBeInTheDocument()
  })

  it('switches detail content on store click (single-select)', async () => {
    const user = userEvent.setup()

    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Store A',
        criticalStockCount: 1,
        problematicItems: [makeItem({ id: 'i1', name: 'Item A' })],
      }),
      makeStore({
        id: 'store-2',
        name: 'Store B',
        lowStockCount: 1,
        problematicItems: [makeItem({ id: 'i2', name: 'Item B', level: 'low', currentStock: 3 })],
      }),
    ])

    render(<StoresPanel />)

    // Auto-selects Store A (first with problems) — item shows in detail pane
    expect(await screen.findByText('Item A')).toBeInTheDocument()

    // Click Store B — should switch, not multi-expand
    const storeBButtons = screen.getAllByText('Store B')
    await user.click(storeBButtons[0])
    expect(screen.getByText('Item B')).toBeInTheDocument()
    expect(screen.queryByText('Item A')).not.toBeInTheDocument()
  })

  it('shows ALL items (no 5-item cap, no "+N more")', async () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        name: `Item ${i + 1}`,
        level: 'low',
        currentStock: 2,
      })
    )

    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Big Store',
        lowStockCount: 8,
        problematicItems: items,
      }),
    ])

    render(<StoresPanel />)

    // All 8 items should be visible
    for (let i = 1; i <= 8; i++) {
      expect(await screen.findByText(`Item ${i}`)).toBeInTheDocument()
    }

    // No "+N more" link
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument()
  })

  it('shows healthy message for stores with no problems', async () => {
    const user = userEvent.setup()

    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Problem Store',
        criticalStockCount: 1,
        problematicItems: [makeItem()],
      }),
      makeStore({ id: 'store-2', name: 'Healthy Store', criticalStockCount: 0, lowStockCount: 0 }),
    ])

    render(<StoresPanel />)

    // Wait for data to load
    await screen.findAllByText('Problem Store')

    // Select the healthy store
    const healthyButtons = screen.getAllByText('Healthy Store')
    await user.click(healthyButtons[0])

    // Detail pane should show healthy message
    const detailPane = getDetailPane()
    expect(within(detailPane!).getByText('Store is healthy')).toBeInTheDocument()
  })

  it('renders critical items before low items', async () => {
    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Mixed Store',
        criticalStockCount: 1,
        lowStockCount: 1,
        problematicItems: [
          makeItem({ id: 'i1', name: 'Low Item', level: 'low', currentStock: 3 }),
          makeItem({ id: 'i2', name: 'Critical Item', level: 'critical', currentStock: 0 }),
        ],
      }),
    ])

    render(<StoresPanel />)

    const criticalSection = await screen.findByText(/out of stock/i)
    const lowSection = screen.getByText(/low stock/i)

    // Critical section should appear before low section in DOM
    expect(criticalSection.compareDocumentPosition(lowSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('links items to /admin/items/[id]', async () => {
    mockStores([
      makeStore({
        id: 'store-1',
        name: 'Test Store',
        criticalStockCount: 1,
        problematicItems: [makeItem({ id: 'item-42', name: 'Linked Item' })],
      }),
    ])

    render(<StoresPanel />)

    const itemLink = await screen.findByText('Linked Item')
    expect(itemLink.closest('a')).toHaveAttribute('href', '/admin/items/item-42')
  })

  it('has "Manage Stores" footer link', async () => {
    mockStores([makeStore()])
    render(<StoresPanel />)

    const link = await screen.findByText(/manage stores/i)
    expect(link.closest('a')).toHaveAttribute('href', '/admin/stores')
  })
})
