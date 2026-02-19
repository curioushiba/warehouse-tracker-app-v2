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

import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { DateGroupHeader } from './DateGroupHeader'
import { lightColors, spacing, typography } from '@/theme/tokens'

describe('DateGroupHeader', () => {
  it('renders the date text', () => {
    const { getByText } = render(<DateGroupHeader date="Today" />)
    expect(getByText('Today')).toBeTruthy()
  })

  it('renders the count when provided', () => {
    const { getByText } = render(<DateGroupHeader date="Today" count={5} />)
    expect(getByText('5')).toBeTruthy()
  })

  it('does not render count when not provided', () => {
    const { queryByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    expect(queryByTestId('dgh-count')).toBeNull()
  })

  it('applies bgSecondary background', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh').props.style)
    expect(style.backgroundColor).toBe(lightColors.bgSecondary)
  })

  it('applies textSecondary color to date text', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh-date').props.style)
    expect(style.color).toBe(lightColors.textSecondary)
  })

  it('applies textTertiary color to count', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" count={3} testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh-count').props.style)
    expect(style.color).toBe(lightColors.textTertiary)
  })

  it('applies uppercase text transform to date', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh-date').props.style)
    expect(style.textTransform).toBe('uppercase')
  })

  it('applies correct padding', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh').props.style)
    expect(style.paddingHorizontal).toBe(spacing[4])
    expect(style.paddingVertical).toBe(spacing[2])
  })

  it('uses row layout with space-between', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh').props.style)
    expect(style.flexDirection).toBe('row')
    expect(style.justifyContent).toBe('space-between')
  })

  it('applies semibold font weight to date', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh-date').props.style)
    expect(style.fontWeight).toBe(typography.weight.semibold)
  })

  it('applies sm typography to date', () => {
    const { getByTestId } = render(
      <DateGroupHeader date="Today" testID="dgh" />
    )
    const style = StyleSheet.flatten(getByTestId('dgh-date').props.style)
    expect(style.fontSize).toBe(typography.sm.fontSize)
  })
})
