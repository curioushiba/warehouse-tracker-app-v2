import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BatchItemRow } from './BatchItemRow'

const baseItem = {
  id: 'item-1',
  name: 'Widget A',
  quantity: 5,
}

describe('BatchItemRow', () => {
  it('renders item name', () => {
    const { getByText } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    expect(getByText('Widget A')).toBeTruthy()
  })

  it('renders current quantity', () => {
    const { getByText } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('plus button calls onQuantityChange with quantity+1', () => {
    const onQuantityChange = jest.fn()
    const { getByTestId } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={onQuantityChange}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    fireEvent.press(getByTestId('row-plus'))
    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 6)
  })

  it('minus button calls onQuantityChange with quantity-1 (minimum via clamp)', () => {
    const onQuantityChange = jest.fn()
    const { getByTestId } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={onQuantityChange}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    fireEvent.press(getByTestId('row-minus'))
    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 4)
  })

  it('minus button clamps to MIN_QUANTITY when quantity is 1', () => {
    const onQuantityChange = jest.fn()
    const { getByTestId } = render(
      <BatchItemRow
        item={{ ...baseItem, quantity: 1 }}
        onQuantityChange={onQuantityChange}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    fireEvent.press(getByTestId('row-minus'))
    // clampQuantity(1 - 1 = 0) => MIN_QUANTITY = 0.001
    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 0.001)
  })

  it('remove button calls onRemove with item id', () => {
    const onRemove = jest.fn()
    const { getByTestId } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={onRemove}
        testID="row"
      />
    )
    fireEvent.press(getByTestId('row-remove'))
    expect(onRemove).toHaveBeenCalledWith('item-1')
  })

  it('shows "Exceeds stock" error when showStockError is true', () => {
    const { getByText } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        showStockError={true}
        testID="row"
      />
    )
    expect(getByText('Exceeds stock')).toBeTruthy()
  })

  it('hides error when showStockError is false or undefined', () => {
    const { queryByText: q1 } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        showStockError={false}
        testID="row"
      />
    )
    expect(q1('Exceeds stock')).toBeNull()

    const { queryByText: q2 } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    expect(q2('Exceeds stock')).toBeNull()
  })

  it('shows unit text when provided (e.g., "5 pcs")', () => {
    const { getByText } = render(
      <BatchItemRow
        item={{ ...baseItem, unit: 'pcs' }}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    expect(getByText('5 pcs')).toBeTruthy()
  })
})
