import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { FailedSyncBanner } from './FailedSyncBanner'

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
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSequence: jest.fn((...vals) => vals[vals.length - 1]),
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { TouchableOpacity } = require('react-native')
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      require('react').createElement(TouchableOpacity, props, children),
  }
})

describe('FailedSyncBanner', () => {
  it('returns null when count=0', () => {
    const onPress = jest.fn()
    const { toJSON } = render(
      <FailedSyncBanner count={0} onPress={onPress} testID="failed-banner" />
    )
    expect(toJSON()).toBeNull()
  })

  it('shows "1 failed transaction - Tap to view" for count=1', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <FailedSyncBanner count={1} onPress={onPress} testID="failed-banner" />
    )
    expect(getByText('1 failed transaction - Tap to view')).toBeTruthy()
  })

  it('shows "5 failed transactions - Tap to view" for count=5 (plural)', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <FailedSyncBanner count={5} onPress={onPress} testID="failed-banner" />
    )
    expect(getByText('5 failed transactions - Tap to view')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <FailedSyncBanner count={3} onPress={onPress} testID="failed-banner" />
    )
    fireEvent.press(getByTestId('failed-banner'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
