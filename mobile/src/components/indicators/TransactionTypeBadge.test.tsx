import React from 'react'
import { render } from '@testing-library/react-native'
import { TransactionTypeBadge } from './TransactionTypeBadge'
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

describe('TransactionTypeBadge', () => {
  it('renders "CHECK IN" for type "in" with checkIn color', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="in" testID="badge" />
    )
    expect(getByText('CHECK IN')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.checkIn })
    )
  })

  it('renders "CHECK OUT" for type "out" with checkOut color', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="out" testID="badge" />
    )
    expect(getByText('CHECK OUT')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.checkOut })
    )
  })

  it('renders "ADJUSTMENT" for type "adjustment" with adjustment color', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="adjustment" testID="badge" />
    )
    expect(getByText('ADJUSTMENT')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.adjustment })
    )
  })

  it('renders text in inverse color for all types', () => {
    const { getByText: getByTextIn } = render(
      <TransactionTypeBadge type="in" />
    )
    expect(getByTextIn('CHECK IN').props.style).toEqual(
      expect.objectContaining({ color: lightColors.textInverse })
    )

    const { getByText: getByTextOut } = render(
      <TransactionTypeBadge type="out" />
    )
    expect(getByTextOut('CHECK OUT').props.style).toEqual(
      expect.objectContaining({ color: lightColors.textInverse })
    )

    const { getByText: getByTextAdj } = render(
      <TransactionTypeBadge type="adjustment" />
    )
    expect(getByTextAdj('ADJUSTMENT').props.style).toEqual(
      expect.objectContaining({ color: lightColors.textInverse })
    )
  })
})
