import React from 'react'
import { render } from '@testing-library/react-native'
import { StockLevelBadge } from './StockLevelBadge'
import { lightColors } from '@/theme/tokens'

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

describe('StockLevelBadge', () => {
  it('shows "Critical" with error color for "critical"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="critical" testID="stock-badge" />
    )
    expect(getByText('Critical')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.error })
    )
  })

  it('shows "Low" with warning color for "low"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="low" testID="stock-badge" />
    )
    expect(getByText('Low')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.warning })
    )
  })

  it('shows "Normal" with success color for "normal"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="normal" testID="stock-badge" />
    )
    expect(getByText('Normal')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.success })
    )
  })

  it('shows "Overstocked" with info color for "overstocked"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="overstocked" testID="stock-badge" />
    )
    expect(getByText('Overstocked')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.info })
    )
  })
})
