import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ItemSearchAutocomplete } from './ItemSearchAutocomplete'

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
}))

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native')
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      View,
    },
    FadeIn: { duration: jest.fn().mockReturnThis() },
  }
})

const items = [
  { id: '1', name: 'Widget Alpha', sku: 'WA-001', barcode: 'PT-00001' },
  { id: '2', name: 'Widget Beta', sku: 'WB-002', barcode: 'PT-00002' },
  { id: '3', name: 'Gadget Gamma', sku: 'GG-003' },
]

describe('ItemSearchAutocomplete', () => {
  it('renders search input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        placeholder="Search items..."
        testID="search"
      />
    )
    expect(getByPlaceholderText('Search items...')).toBeTruthy()
  })

  it('shows no results initially (before typing)', () => {
    const { queryByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    expect(queryByText('Widget Alpha')).toBeNull()
    expect(queryByText('Widget Beta')).toBeNull()
    expect(queryByText('Gadget Gamma')).toBeNull()
  })

  it('filters items by name when text entered', () => {
    const { getByTestId, getByText, queryByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'Widget')
    expect(getByText('Widget Alpha')).toBeTruthy()
    expect(getByText('Widget Beta')).toBeTruthy()
    expect(queryByText('Gadget Gamma')).toBeNull()
  })

  it('filters items by SKU when text entered', () => {
    const { getByTestId, getByText, queryByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'GG-003')
    expect(getByText('Gadget Gamma')).toBeTruthy()
    expect(queryByText('Widget Alpha')).toBeNull()
  })

  it('calls onSelect with item when result pressed', () => {
    const onSelect = jest.fn()
    const { getByTestId, getByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={onSelect}
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'Alpha')
    fireEvent.press(getByText('Widget Alpha'))
    expect(onSelect).toHaveBeenCalledWith({
      id: '1',
      name: 'Widget Alpha',
      sku: 'WA-001',
    })
  })

  it('shows "No results" when search matches nothing', () => {
    const { getByTestId, getByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'zzz-no-match')
    expect(getByText('No results')).toBeTruthy()
  })

  it('clears input after selection', () => {
    const { getByTestId, getByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    const input = getByTestId('search-input')
    fireEvent.changeText(input, 'Alpha')
    fireEvent.press(getByText('Widget Alpha'))
    expect(input.props.value).toBe('')
  })

  it('performs case-insensitive search', () => {
    const { getByTestId, getByText } = render(
      <ItemSearchAutocomplete
        items={items}
        onSelect={jest.fn()}
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'widget')
    expect(getByText('Widget Alpha')).toBeTruthy()
    expect(getByText('Widget Beta')).toBeTruthy()
  })
})
