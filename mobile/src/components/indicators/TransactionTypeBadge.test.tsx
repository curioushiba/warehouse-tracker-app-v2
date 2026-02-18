import React from 'react'
import { render } from '@testing-library/react-native'
import { TransactionTypeBadge } from './TransactionTypeBadge'

describe('TransactionTypeBadge', () => {
  it('renders "CHECK IN" for type "in" with green background', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="in" testID="badge" />
    )
    expect(getByText('CHECK IN')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#16a34a' })
    )
  })

  it('renders "CHECK OUT" for type "out" with red background', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="out" testID="badge" />
    )
    expect(getByText('CHECK OUT')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#dc2626' })
    )
  })

  it('renders "ADJUSTMENT" for type "adjustment" with blue background', () => {
    const { getByText, getByTestId } = render(
      <TransactionTypeBadge type="adjustment" testID="badge" />
    )
    expect(getByText('ADJUSTMENT')).toBeTruthy()
    const badge = getByTestId('badge')
    expect(badge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#2563eb' })
    )
  })

  it('renders text in white for all types', () => {
    const { getByText: getByTextIn } = render(
      <TransactionTypeBadge type="in" />
    )
    expect(getByTextIn('CHECK IN').props.style).toEqual(
      expect.objectContaining({ color: '#ffffff' })
    )

    const { getByText: getByTextOut } = render(
      <TransactionTypeBadge type="out" />
    )
    expect(getByTextOut('CHECK OUT').props.style).toEqual(
      expect.objectContaining({ color: '#ffffff' })
    )

    const { getByText: getByTextAdj } = render(
      <TransactionTypeBadge type="adjustment" />
    )
    expect(getByTextAdj('ADJUSTMENT').props.style).toEqual(
      expect.objectContaining({ color: '#ffffff' })
    )
  })
})
