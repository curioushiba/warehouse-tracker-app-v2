import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { FailedSyncBanner } from './FailedSyncBanner'

describe('FailedSyncBanner', () => {
  it('returns null when count=0', () => {
    const onPress = jest.fn()
    const { toJSON } = render(
      <FailedSyncBanner count={0} onPress={onPress} testID="failed-banner" />
    )
    expect(toJSON()).toBeNull()
  })

  it('shows "1 failed transaction - Tap to view" for count=1', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <FailedSyncBanner count={1} onPress={onPress} testID="failed-banner" />
    )
    expect(getByText('1 failed transaction - Tap to view')).toBeTruthy()
  })

  it('shows "5 failed transactions - Tap to view" for count=5 (plural)', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <FailedSyncBanner count={5} onPress={onPress} testID="failed-banner" />
    )
    expect(getByText('5 failed transactions - Tap to view')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <FailedSyncBanner count={3} onPress={onPress} testID="failed-banner" />
    )
    fireEvent.press(getByTestId('failed-banner'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
