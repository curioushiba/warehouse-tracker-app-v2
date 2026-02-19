jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
  CARD_PRESS: { toValue: 0.98, duration: 80 },
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

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { TouchableOpacity } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      React.createElement(TouchableOpacity, props, children),
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text, StyleSheet } from 'react-native'
import { Card } from './Card'
import { spacing } from '@/theme/tokens'

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>
    )
    expect(getByText('Card content')).toBeTruthy()
  })

  it('elevated variant has shadow styles', () => {
    const { getByTestId } = render(
      <Card variant="elevated" testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.shadowColor).toBeDefined()
    expect(style.shadowOpacity).toBeGreaterThan(0)
    expect(style.elevation).toBeGreaterThan(0)
  })

  it('outline variant has border', () => {
    const { getByTestId } = render(
      <Card variant="outline" testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.borderWidth).toBe(1)
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <Card onPress={onPress} testID="card">
        <Text>Press me</Text>
      </Card>
    )
    fireEvent.press(getByTestId('card'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders as View (not touchable) when no onPress', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>Static</Text>
      </Card>
    )
    expect(getByTestId('card')).toBeTruthy()
  })

  it('default variant is elevated', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.shadowColor).toBeDefined()
    expect(style.elevation).toBeGreaterThan(0)
  })

  it('compact uses spacing[3] padding', () => {
    const { getByTestId } = render(
      <Card compact testID="card">
        <Text>Compact</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.padding).toBe(spacing[3])
  })

  it('noPadding removes all padding', () => {
    const { getByTestId } = render(
      <Card noPadding testID="card">
        <Text>No padding</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.padding).toBe(0)
  })

  it('default uses spacing[4] padding', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>Default</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.padding).toBe(spacing[4])
  })
})
