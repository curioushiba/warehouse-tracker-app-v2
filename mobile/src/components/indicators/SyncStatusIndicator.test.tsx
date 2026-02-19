import React from 'react'
import { render } from '@testing-library/react-native'
import { SyncStatusIndicator } from './SyncStatusIndicator'
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

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
  }
})

describe('SyncStatusIndicator', () => {
  it('shows green dot and "Synced" for status "synced"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="synced" testID="sync" />
    )
    expect(getByText('Synced')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: lightColors.success }),
      ])
    )
  })

  it('shows "Syncing..." for status "syncing"', () => {
    const { getByText } = render(
      <SyncStatusIndicator status="syncing" testID="sync" />
    )
    expect(getByText('Syncing...')).toBeTruthy()
  })

  it('shows warning dot and "N pending" for status "pending" with pendingCount', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="pending" pendingCount={3} testID="sync" />
    )
    expect(getByText('3 pending')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: lightColors.warning }),
      ])
    )
  })

  it('shows error dot and "Offline" for status "offline"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="offline" testID="sync" />
    )
    expect(getByText('Offline')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: lightColors.error }),
      ])
    )
  })

  it('shows error dot and "Error" for status "error"', () => {
    const { getByText, getByTestId } = render(
      <SyncStatusIndicator status="error" testID="sync" />
    )
    expect(getByText('Error')).toBeTruthy()
    const dot = getByTestId('sync-dot')
    expect(dot.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: lightColors.error }),
      ])
    )
  })

  it('shows count when pendingCount > 0', () => {
    const { getByText } = render(
      <SyncStatusIndicator status="pending" pendingCount={7} testID="sync" />
    )
    expect(getByText('7 pending')).toBeTruthy()
  })
})
