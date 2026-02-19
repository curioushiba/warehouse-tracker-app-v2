jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').getShadows(false),
    radii: require('@/theme/tokens').radii,
    zIndex: require('@/theme/tokens').zIndex,
    touchTarget: require('@/theme/tokens').touchTarget,
    typePresets: require('@/theme/tokens').typePresets,
    fontFamily: require('@/theme/tokens').fontFamily,
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
  const { Pressable } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, testID, onPress, ...props }: any) =>
      React.createElement(Pressable, { testID, onPress, ...props }, children),
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text, StyleSheet } from 'react-native'
import { StatCard } from './StatCard'
import { lightColors, typography, spacing, radii } from '@/theme/tokens'

const mockIcon = <Text testID="stat-icon">icon</Text>

describe('StatCard', () => {
  it('renders value and label', () => {
    const { getByText } = render(
      <StatCard icon={mockIcon} value={42} label="Items Scanned" />
    )
    expect(getByText('42')).toBeTruthy()
    expect(getByText('Items Scanned')).toBeTruthy()
  })

  it('renders string values', () => {
    const { getByText } = render(
      <StatCard icon={mockIcon} value="N/A" label="Pending" />
    )
    expect(getByText('N/A')).toBeTruthy()
  })

  it('renders icon', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" />
    )
    expect(getByTestId('stat-icon')).toBeTruthy()
  })

  it('applies surfacePrimary background', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    const style = StyleSheet.flatten(getByTestId('stat').props.style)
    expect(style.backgroundColor).toBe(lightColors.surfacePrimary)
  })

  it('applies radii.lg border radius', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    const style = StyleSheet.flatten(getByTestId('stat').props.style)
    expect(style.borderRadius).toBe(radii.lg)
  })

  it('applies spacing[4] padding', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    const style = StyleSheet.flatten(getByTestId('stat').props.style)
    expect(style.padding).toBe(spacing[4])
  })

  it('value text uses 2xl size and bold weight', () => {
    const { getByText } = render(
      <StatCard icon={mockIcon} value={42} label="Count" />
    )
    const style = StyleSheet.flatten(getByText('42').props.style)
    expect(style.fontSize).toBe(typography['2xl'].fontSize)
    expect(style.fontWeight).toBe(typography.weight.bold)
  })

  it('value text uses textPrimary color', () => {
    const { getByText } = render(
      <StatCard icon={mockIcon} value={42} label="Count" />
    )
    const style = StyleSheet.flatten(getByText('42').props.style)
    expect(style.color).toBe(lightColors.textPrimary)
  })

  it('label text uses sm size and textSecondary color', () => {
    const { getByText } = render(
      <StatCard icon={mockIcon} value={42} label="Items" />
    )
    const style = StyleSheet.flatten(getByText('Items').props.style)
    expect(style.fontSize).toBe(typography.sm.fontSize)
    expect(style.color).toBe(lightColors.textSecondary)
  })

  it('icon circle has 40px dimensions and default brandSecondary bg', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    const circle = getByTestId('stat-icon-circle')
    const style = StyleSheet.flatten(circle.props.style)
    expect(style.width).toBe(40)
    expect(style.height).toBe(40)
    expect(style.borderRadius).toBe(20)
    expect(style.backgroundColor).toBe(lightColors.brandSecondary)
  })

  it('applies custom iconBgColor', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" iconBgColor="#FF0000" testID="stat" />
    )
    const circle = getByTestId('stat-icon-circle')
    const style = StyleSheet.flatten(circle.props.style)
    expect(style.backgroundColor).toBe('#FF0000')
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" onPress={onPress} testID="stat" />
    )
    fireEvent.press(getByTestId('stat'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders as View (not pressable) when no onPress', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    expect(getByTestId('stat')).toBeTruthy()
  })

  it('renders with testID', () => {
    const { getByTestId } = render(
      <StatCard icon={mockIcon} value={10} label="Count" testID="stat" />
    )
    expect(getByTestId('stat')).toBeTruthy()
  })
})
