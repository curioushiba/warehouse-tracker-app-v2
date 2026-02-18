import React from 'react'
import { render } from '@testing-library/react-native'
import { SyncStatusIndicator } from './SyncStatusIndicator'

describe('SyncStatusIndicator', () => {
  it('shows green dot and "Synced" for status "synced"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="synced" testID="sync" />
    )
    expect(getByText('Synced')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#16a34a' })
    )
  })

  it('shows "Syncing..." for status "syncing"', () => {
    const { getByText } = render(
      <SyncStatusIndicator status="syncing" testID="sync" />
    )
    expect(getByText('Syncing...')).toBeTruthy()
  })

  it('shows orange dot and "N pending" for status "pending" with pendingCount', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="pending" pendingCount={3} testID="sync" />
    )
    expect(getByText('3 pending')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#f97316' })
    )
  })

  it('shows red dot and "Offline" for status "offline"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="offline" testID="sync" />
    )
    expect(getByText('Offline')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#dc2626' })
    )
  })

  it('shows red dot and "Error" for status "error"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="error" testID="sync" />
    )
    expect(getByText('Error')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#dc2626' })
    )
  })

  it('shows count when pendingCount > 0', () => {
    const { getByText } = render(
      <SyncStatusIndicator status="pending" pendingCount={7} testID="sync" />
    )
    expect(getByText('7 pending')).toBeTruthy()
  })
})
