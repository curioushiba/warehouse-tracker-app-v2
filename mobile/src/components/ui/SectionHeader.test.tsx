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
import { Text, StyleSheet } from 'react-native'
import { SectionHeader } from './SectionHeader'
import { lightColors, typography, spacing } from '@/theme/tokens'

describe('SectionHeader', () => {
  it('renders label text in uppercase', () => {
    const { getByText } = render(<SectionHeader label="recent items" />)
    expect(getByText('recent items')).toBeTruthy()
    const style = StyleSheet.flatten(getByText('recent items').props.style)
    expect(style.textTransform).toBe('uppercase')
  })

  it('applies xs font size', () => {
    const { getByText } = render(<SectionHeader label="section" />)
    const style = StyleSheet.flatten(getByText('section').props.style)
    expect(style.fontSize).toBe(typography.xs.fontSize)
  })

  it('applies semibold font weight', () => {
    const { getByText } = render(<SectionHeader label="section" />)
    const style = StyleSheet.flatten(getByText('section').props.style)
    expect(style.fontWeight).toBe(typography.weight.semibold)
  })

  it('applies textTertiary color', () => {
    const { getByText } = render(<SectionHeader label="section" />)
    const style = StyleSheet.flatten(getByText('section').props.style)
    expect(style.color).toBe(lightColors.textTertiary)
  })

  it('applies letter spacing of 1.5', () => {
    const { getByText } = render(<SectionHeader label="section" />)
    const style = StyleSheet.flatten(getByText('section').props.style)
    expect(style.letterSpacing).toBe(1.5)
  })

  it('renders rightContent when provided', () => {
    const { getByTestId } = render(
      <SectionHeader label="section" rightContent={<Text testID="right">See All</Text>} />
    )
    expect(getByTestId('right')).toBeTruthy()
  })

  it('does not render rightContent area when not provided', () => {
    const { queryByTestId } = render(
      <SectionHeader label="section" testID="header" />
    )
    expect(queryByTestId('header-right')).toBeNull()
  })

  it('renders with testID', () => {
    const { getByTestId } = render(<SectionHeader label="section" testID="header" />)
    expect(getByTestId('header')).toBeTruthy()
  })

  it('has row layout with space between', () => {
    const { getByTestId } = render(<SectionHeader label="section" testID="header" />)
    const style = StyleSheet.flatten(getByTestId('header').props.style)
    expect(style.flexDirection).toBe('row')
    expect(style.justifyContent).toBe('space-between')
    expect(style.alignItems).toBe('center')
  })

  it('has correct vertical margins', () => {
    const { getByTestId } = render(<SectionHeader label="section" testID="header" />)
    const style = StyleSheet.flatten(getByTestId('header').props.style)
    expect(style.marginBottom).toBe(spacing[2])
    expect(style.marginTop).toBe(spacing[4])
  })
})
