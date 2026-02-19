jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
  TIMING_CONFIG: { duration: 200 },
}))

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((val) => val),
  }
})

import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Progress } from './Progress'
import { lightColors } from '@/theme/tokens'

describe('Progress', () => {
  it('renders at 0% (no fill width)', () => {
    const { getByTestId } = render(<Progress value={0} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.width).toBe('0%')
  })

  it('renders at 50% (half fill width)', () => {
    const { getByTestId } = render(<Progress value={50} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.width).toBe('50%')
  })

  it('renders at 100% (full fill width)', () => {
    const { getByTestId } = render(<Progress value={100} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.width).toBe('100%')
  })

  it('clamps values above 100', () => {
    const { getByTestId } = render(<Progress value={150} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.width).toBe('100%')
  })

  it('clamps values below 0', () => {
    const { getByTestId } = render(<Progress value={-10} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.width).toBe('0%')
  })

  it('default color is brandPrimary from theme', () => {
    const { getByTestId } = render(<Progress value={50} testID="progress" />)
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.backgroundColor).toBe(lightColors.brandPrimary)
  })

  it('applies custom color', () => {
    const { getByTestId } = render(
      <Progress value={50} color="#FF0000" testID="progress" />
    )
    const fill = getByTestId('progress-fill')
    const style = StyleSheet.flatten(fill.props.style)
    expect(style.backgroundColor).toBe('#FF0000')
  })

  it('applies custom track color', () => {
    const { getByTestId } = render(
      <Progress value={50} trackColor="#333333" testID="progress" />
    )
    const track = getByTestId('progress')
    const style = StyleSheet.flatten(track.props.style)
    expect(style.backgroundColor).toBe('#333333')
  })
})
