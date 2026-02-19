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

import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Divider } from './Divider'
import { lightColors } from '@/theme/tokens'

describe('Divider', () => {
  it('renders horizontal divider by default (height=1, full width)', () => {
    const { getByTestId } = render(<Divider testID="divider" />)
    const style = StyleSheet.flatten(getByTestId('divider').props.style)
    expect(style.height).toBe(1)
    expect(style.width).toBe('100%')
  })

  it('renders vertical divider (width=1, full height) when orientation=vertical', () => {
    const { getByTestId } = render(
      <Divider orientation="vertical" testID="divider" />
    )
    const style = StyleSheet.flatten(getByTestId('divider').props.style)
    expect(style.width).toBe(1)
    expect(style.height).toBe('100%')
  })

  it('applies custom color', () => {
    const { getByTestId } = render(
      <Divider color="#FF0000" testID="divider" />
    )
    const style = StyleSheet.flatten(getByTestId('divider').props.style)
    expect(style.backgroundColor).toBe('#FF0000')
  })

  it('uses theme borderSubtle color when not specified', () => {
    const { getByTestId } = render(<Divider testID="divider" />)
    const style = StyleSheet.flatten(getByTestId('divider').props.style)
    expect(style.backgroundColor).toBe(lightColors.borderSubtle)
  })
})
