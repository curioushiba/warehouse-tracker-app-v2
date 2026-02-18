import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MobileHeader } from './MobileHeader'

describe('MobileHeader', () => {
  it('renders title text', () => {
    const { getByText } = render(
      <MobileHeader title="Inventory" testID="header" />
    )
    expect(getByText('Inventory')).toBeTruthy()
  })

  it('renders domain letter with domain color background', () => {
    const { getByText, getByTestId } = render(
      <MobileHeader
        title="Inventory"
        domainLetter="C"
        domainColor="#E07A2F"
        testID="header"
      />
    )
    expect(getByText('C')).toBeTruthy()
    const domainBadge = getByTestId('header-domain-badge')
    expect(domainBadge.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#E07A2F' })
    )
  })

  it('shows SyncStatusIndicator with given status', () => {
    const { getByText } = render(
      <MobileHeader
        title="Inventory"
        syncStatus="synced"
        testID="header"
      />
    )
    expect(getByText('Synced')).toBeTruthy()
  })

  it('shows ConnectionStatusBar when offline', () => {
    const { getByText } = render(
      <MobileHeader
        title="Inventory"
        isOnline={false}
        testID="header"
      />
    )
    expect(getByText('No internet connection')).toBeTruthy()
  })

  it('calls onDomainLongPress on long press of domain badge', () => {
    const onDomainLongPress = jest.fn()
    const { getByTestId } = render(
      <MobileHeader
        title="Inventory"
        domainLetter="C"
        domainColor="#E07A2F"
        onDomainLongPress={onDomainLongPress}
        testID="header"
      />
    )
    fireEvent(getByTestId('header-domain-badge-touchable'), 'longPress')
    expect(onDomainLongPress).toHaveBeenCalledTimes(1)
  })

  it('shows FailedSyncBanner when failedSyncCount > 0', () => {
    const onFailedSyncPress = jest.fn()
    const { getByText } = render(
      <MobileHeader
        title="Inventory"
        failedSyncCount={3}
        onFailedSyncPress={onFailedSyncPress}
        testID="header"
      />
    )
    expect(getByText('3 failed transactions - Tap to view')).toBeTruthy()
  })
})
