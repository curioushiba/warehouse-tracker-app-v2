import React from 'react'
import { render } from '@testing-library/react-native'
import { ItemImage } from './ItemImage'

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
  SHIMMER_DURATION: 1000,
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
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
  }
})

describe('ItemImage', () => {
  it('renders image when uri provided', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" testID="item-img" />
    )
    expect(getByTestId('item-img-image')).toBeTruthy()
  })

  it('shows skeleton while image is loading', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" testID="item-img" />
    )
    expect(getByTestId('item-img-skeleton')).toBeTruthy()
  })

  it('shows placeholder when uri is null', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage uri={null} testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })

  it('shows placeholder when uri is undefined', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })

  it('applies size prop to dimensions (default 64)', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" testID="item-img" />
    )
    const image = getByTestId('item-img-image')
    expect(image.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 64, height: 64 }),
      ])
    )
  })

  it('applies custom size prop', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" size={100} testID="item-img" />
    )
    const image = getByTestId('item-img-image')
    expect(image.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 100, height: 100 }),
      ])
    )
  })

  it('shows placeholder for empty string uri', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage uri="" testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })
})
