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
import { ScreenHeader } from './ScreenHeader'
import { lightColors, spacing, typography } from '@/theme/tokens'

describe('ScreenHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<ScreenHeader title="Batch Review" />)
    expect(getByText('Batch Review')).toBeTruthy()
  })

  it('shows back arrow when onBack is provided', () => {
    const onBack = jest.fn()
    const { getByTestId } = render(
      <ScreenHeader title="Details" onBack={onBack} testID="sh" />
    )
    expect(getByTestId('sh-back')).toBeTruthy()
  })

  it('does not show back arrow when onBack is not provided', () => {
    const { queryByTestId } = render(
      <ScreenHeader title="Home" testID="sh" />
    )
    expect(queryByTestId('sh-back')).toBeNull()
  })

  it('calls onBack when back arrow is pressed', () => {
    const onBack = jest.fn()
    const { getByTestId } = render(
      <ScreenHeader title="Details" onBack={onBack} testID="sh" />
    )
    fireEvent.press(getByTestId('sh-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders rightContent when provided', () => {
    const rightContent = <Text testID="right-btn">Action</Text>
    const { getByTestId } = render(
      <ScreenHeader title="Page" rightContent={rightContent} testID="sh" />
    )
    expect(getByTestId('right-btn')).toBeTruthy()
  })

  it('applies surfacePrimary background', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh').props.style)
    expect(style.backgroundColor).toBe(lightColors.surfacePrimary)
  })

  it('applies bottom border', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh').props.style)
    expect(style.borderBottomWidth).toBe(1)
    expect(style.borderBottomColor).toBe(lightColors.borderSubtle)
  })

  it('applies row layout with center alignment', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh').props.style)
    expect(style.flexDirection).toBe('row')
    expect(style.alignItems).toBe('center')
  })

  it('applies correct padding', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh').props.style)
    expect(style.paddingHorizontal).toBe(spacing[4])
    expect(style.paddingVertical).toBe(spacing[3])
  })

  it('applies textPrimary color and bold weight to title', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh-title').props.style)
    expect(style.color).toBe(lightColors.textPrimary)
    expect(style.fontWeight).toBe(typography.weight.bold)
  })

  it('applies xl typography to title', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh-title').props.style)
    expect(style.fontSize).toBe(typography.xl.fontSize)
  })

  it('title has flex 1 to fill space', () => {
    const { getByTestId } = render(
      <ScreenHeader title="Page" testID="sh" />
    )
    const style = StyleSheet.flatten(getByTestId('sh-title').props.style)
    expect(style.flex).toBe(1)
  })
})
