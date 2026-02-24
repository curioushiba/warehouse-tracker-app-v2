import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ItemSearchAutocomplete } from './ItemSearchAutocomplete'
import * as itemActions from '@/lib/actions/items'
import type { Item } from '@/lib/supabase/types'

// Mock the search action
vi.mock('@/lib/actions/items', () => ({
  searchItems: vi.fn(),
}))

const mockSearchItems = vi.mocked(itemActions.searchItems)

// Sample test items
const mockItems: Item[] = [
  {
    id: 'item-1',
    sku: 'SKU-001',
    name: 'Test Item One',
    description: 'Test description',
    category_id: 'cat-1',
    location_id: 'loc-1',
    store_id: null,
    unit: 'pcs',
    current_stock: 10,
    min_stock: 5,
    max_stock: 100,
    unit_price: 9.99,
    barcode: '123456789',
    image_url: null,
    is_archived: false,
    is_commissary: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    sku: 'SKU-002',
    name: 'Test Item Two',
    description: null,
    category_id: null,
    location_id: null,
    store_id: null,
    unit: 'kg',
    current_stock: 25,
    min_stock: 10,
    max_stock: null,
    unit_price: null,
    barcode: null,
    image_url: null,
    is_archived: false,
    is_commissary: false,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('ItemSearchAutocomplete', () => {
  const defaultProps = {
    onItemSelect: vi.fn(),
    isItemInBatch: vi.fn().mockReturnValue(false),
    placeholder: 'Search items...',
    minCharacters: 2,
    debounceMs: 0, // Set to 0 to avoid timing issues in tests
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchItems.mockResolvedValue({ success: true, data: mockItems })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders input with placeholder', () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('does not search with less than minCharacters', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'a' } })

    // Wait a bit for any potential search to trigger
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockSearchItems).not.toHaveBeenCalled()
  })

  it('searches after debounce with enough characters', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(mockSearchItems).toHaveBeenCalledWith('test')
    })
  })

  it('displays search results in dropdown', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Item One')).toBeInTheDocument()
      expect(screen.getByText('Test Item Two')).toBeInTheDocument()
    })
  })

  it('calls onItemSelect when item is clicked', async () => {
    const onItemSelect = vi.fn()
    render(<ItemSearchAutocomplete {...defaultProps} onItemSelect={onItemSelect} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Item One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Test Item One'))

    expect(onItemSelect).toHaveBeenCalledWith(mockItems[0])
  })

  it('shows "In list" badge for items in batch', async () => {
    const isItemInBatch = vi.fn((id) => id === 'item-1')
    render(<ItemSearchAutocomplete {...defaultProps} isItemInBatch={isItemInBatch} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('In list')).toBeInTheDocument()
    })
  })

  it('shows empty state message when no results', async () => {
    mockSearchItems.mockResolvedValue({ success: true, data: [] })
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText(/No items found/)).toBeInTheDocument()
    })
  })

  it('shows error state on search failure', async () => {
    mockSearchItems.mockResolvedValue({ success: false, error: 'Search failed' })
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument()
    })
  })

  it('closes dropdown on Escape key', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Item One')).toBeInTheDocument()
    })

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('Test Item One')).not.toBeInTheDocument()
    })
  })

  it('navigates with arrow keys and selects with Enter', async () => {
    const onItemSelect = vi.fn()
    render(<ItemSearchAutocomplete {...defaultProps} onItemSelect={onItemSelect} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Item One')).toBeInTheDocument()
    })

    // Navigate down twice to get to second item
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    // Select with Enter
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onItemSelect).toHaveBeenCalledWith(mockItems[1])
  })

  it('clears input after item selection', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Item One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Test Item One'))

    expect(input.value).toBe('')
  })

  it('displays item stock and unit', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('10 pcs')).toBeInTheDocument()
      expect(screen.getByText('25 kg')).toBeInTheDocument()
    })
  })

  it('displays item SKU', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument()
      expect(screen.getByText('SKU-002')).toBeInTheDocument()
    })
  })

  it('has proper ARIA attributes', () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    expect(input).toHaveAttribute('role', 'combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('trims whitespace from search query', async () => {
    render(<ItemSearchAutocomplete {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search items...')
    fireEvent.change(input, { target: { value: '  test  ' } })

    await waitFor(() => {
      expect(mockSearchItems).toHaveBeenCalledWith('test')
    })
  })
})
