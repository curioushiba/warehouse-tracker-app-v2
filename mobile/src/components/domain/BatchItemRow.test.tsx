import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BatchItemRow } from './BatchItemRow'

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
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
  }
})

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native')
  return {
    Swipeable: ({ children }: any) =>
      require('react').createElement(View, null, children),
    GestureHandlerRootView: View,
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { Pressable } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, style, ...props }: any) =>
      React.createElement(Pressable, { ...props, style }, children),
  }
})

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

  it('has stepper buttons with 48x48 touch targets', () => {
    const { getByTestId } = render(
      <BatchItemRow
        item={baseItem}
        onQuantityChange={jest.fn()}
        onRemove={jest.fn()}
        testID="row"
      />
    )
    const plus = getByTestId('row-plus')
    expect(plus.props.style).toEqual(
      expect.objectContaining({ width: 48, height: 48 })
    )
    const minus = getByTestId('row-minus')
    expect(minus.props.style).toEqual(
      expect.objectContaining({ width: 48, height: 48 })
    )
  })
})
