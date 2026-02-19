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
  SEGMENT_SLIDE: 200,
}))

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn((fn) => fn()),
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
import { StyleSheet } from 'react-native'
import { SegmentedControl } from './SegmentedControl'
import { lightColors, radii } from '@/theme/tokens'

const options = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

describe('SegmentedControl', () => {
  const defaultProps = {
    options,
    value: 'day',
    onValueChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all option labels', () => {
    const { getByText } = render(<SegmentedControl {...defaultProps} />)
    expect(getByText('Day')).toBeTruthy()
    expect(getByText('Week')).toBeTruthy()
    expect(getByText('Month')).toBeTruthy()
  })

  it('calls onValueChange when a segment is pressed', () => {
    const onValueChange = jest.fn()
    const { getByText } = render(
      <SegmentedControl {...defaultProps} onValueChange={onValueChange} />
    )
    fireEvent.press(getByText('Week'))
    expect(onValueChange).toHaveBeenCalledWith('week')
  })

  it('does not call onValueChange when pressing the active segment', () => {
    const onValueChange = jest.fn()
    const { getByText } = render(
      <SegmentedControl {...defaultProps} value="day" onValueChange={onValueChange} />
    )
    fireEvent.press(getByText('Day'))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('renders with testID', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    expect(getByTestId('segmented')).toBeTruthy()
  })

  it('applies surfaceTertiary background to track', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.backgroundColor).toBe(lightColors.surfaceTertiary)
  })

  it('applies border radius lg to track', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.borderRadius).toBe(radii.lg)
  })

  it('defaults to md size (40px height)', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.height).toBe(40)
  })

  it('sm size has 32px height', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} size="sm" testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.height).toBe(32)
  })

  it('active text is bold', () => {
    const { getByText } = render(<SegmentedControl {...defaultProps} value="day" />)
    const style = StyleSheet.flatten(getByText('Day').props.style)
    expect(style.fontWeight).toBe('700')
  })

  it('inactive text uses medium weight', () => {
    const { getByText } = render(<SegmentedControl {...defaultProps} value="day" />)
    const style = StyleSheet.flatten(getByText('Week').props.style)
    expect(style.fontWeight).toBe('500')
  })

  it('inactive text uses textSecondary color', () => {
    const { getByText } = render(<SegmentedControl {...defaultProps} value="day" />)
    const style = StyleSheet.flatten(getByText('Week').props.style)
    expect(style.color).toBe(lightColors.textSecondary)
  })

  it('renders indicator element', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    expect(getByTestId('segmented-indicator')).toBeTruthy()
  })

  it('fullWidth stretches container', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} fullWidth testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.alignSelf).toBe('stretch')
  })

  it('without fullWidth uses auto width', () => {
    const { getByTestId } = render(
      <SegmentedControl {...defaultProps} testID="segmented" />
    )
    const style = StyleSheet.flatten(getByTestId('segmented').props.style)
    expect(style.alignSelf).toBe('auto')
  })

  it('works with two options', () => {
    const twoOptions = [
      { label: 'On', value: 'on' },
      { label: 'Off', value: 'off' },
    ]
    const { getByText } = render(
      <SegmentedControl options={twoOptions} value="on" onValueChange={jest.fn()} />
    )
    expect(getByText('On')).toBeTruthy()
    expect(getByText('Off')).toBeTruthy()
  })
})
