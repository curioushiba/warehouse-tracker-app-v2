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
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
  }
})

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native')
  const React = require('react')
  return {
    LinearGradient: (props: any) =>
      React.createElement(View, { testID: props.testID, style: props.style }),
  }
})

import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Skeleton } from './Skeleton'
import { lightColors } from '@/theme/tokens'

describe('Skeleton', () => {
  it('renders with correct width and height', () => {
    const { getByTestId } = render(
      <Skeleton width={200} height={20} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.width).toBe(200)
    expect(style.height).toBe(20)
  })

  it('applies borderRadius when provided', () => {
    const { getByTestId } = render(
      <Skeleton width={100} height={100} borderRadius={50} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.borderRadius).toBe(50)
  })

  it('uses theme surfaceSecondary as base color', () => {
    const { getByTestId } = render(
      <Skeleton width={120} height={16} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.backgroundColor).toBe(lightColors.surfaceSecondary)
  })

  it('renders LinearGradient for shimmer effect', () => {
    const { getByTestId } = render(
      <Skeleton width={120} height={16} testID="skeleton" />
    )
    expect(getByTestId('skeleton-gradient')).toBeTruthy()
  })

  it('has overflow hidden for gradient clipping', () => {
    const { getByTestId } = render(
      <Skeleton width={120} height={16} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.overflow).toBe('hidden')
  })
})
