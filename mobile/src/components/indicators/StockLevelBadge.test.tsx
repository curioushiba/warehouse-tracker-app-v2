import React from 'react'
import { render } from '@testing-library/react-native'
import { StockLevelBadge } from './StockLevelBadge'

describe('StockLevelBadge', () => {
  it('shows "Critical" with red background for "critical"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="critical" testID="stock-badge" />
    )
    expect(getByText('Critical')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#dc2626' })
    )
  })

  it('shows "Low" with orange/warning background for "low"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="low" testID="stock-badge" />
    )
    expect(getByText('Low')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#f97316' })
    )
  })

  it('shows "Normal" with green background for "normal"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="normal" testID="stock-badge" />
    )
    expect(getByText('Normal')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#16a34a' })
    )
  })

  it('shows "Overstocked" with blue background for "overstocked"', () => {
    const { getByText, getByTestId } = render(
      <StockLevelBadge level="overstocked" testID="stock-badge" />
    )
    expect(getByText('Overstocked')).toBeTruthy()
    const badge = getByTestId('stock-badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#2563eb' })
    )
  })
})
