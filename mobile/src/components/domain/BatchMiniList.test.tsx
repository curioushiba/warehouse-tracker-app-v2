import React from 'react'
import { render } from '@testing-library/react-native'
import { BatchMiniList } from './BatchMiniList'

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
    quantity: (i + 1) * 2,
  }))

describe('BatchMiniList', () => {
  it('shows item count header (e.g., "3 items")', () => {
    const { getByText } = render(
      <BatchMiniList items={makeItems(3)} testID="batch-list" />
    )
    expect(getByText('3 items')).toBeTruthy()
  })

  it('renders each item with name and quantity', () => {
    const items = makeItems(3)
    const { getByText } = render(
      <BatchMiniList items={items} testID="batch-list" />
    )
    expect(getByText('Item 1')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(getByText('Item 2')).toBeTruthy()
    expect(getByText('4')).toBeTruthy()
    expect(getByText('Item 3')).toBeTruthy()
    expect(getByText('6')).toBeTruthy()
  })

  it('shows "1 item" (singular) for single item', () => {
    const { getByText } = render(
      <BatchMiniList items={makeItems(1)} testID="batch-list" />
    )
    expect(getByText('1 item')).toBeTruthy()
  })

  it('shows empty state message when items is empty', () => {
    const { getByText } = render(
      <BatchMiniList items={[]} testID="batch-list" />
    )
    expect(getByText('No items added')).toBeTruthy()
  })

  it('limits visible items to maxVisibleItems (default 4), shows "+N more" text', () => {
    const items = makeItems(6)
    const { getByText, queryByText } = render(
      <BatchMiniList items={items} testID="batch-list" />
    )
    // First 4 should be visible
    expect(getByText('Item 1')).toBeTruthy()
    expect(getByText('Item 4')).toBeTruthy()
    // 5th and 6th should not be rendered
    expect(queryByText('Item 5')).toBeNull()
    expect(queryByText('Item 6')).toBeNull()
    // Should show overflow text
    expect(getByText('+2 more')).toBeTruthy()
  })

  it('shows "+2 more" when 6 items with maxVisibleItems=4', () => {
    const items = makeItems(6)
    const { getByText } = render(
      <BatchMiniList items={items} maxVisibleItems={4} testID="batch-list" />
    )
    expect(getByText('+2 more')).toBeTruthy()
  })
})
