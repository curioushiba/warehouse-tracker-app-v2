import React from 'react'
import { render } from '@testing-library/react-native'
import { ConnectionStatusBar } from './ConnectionStatusBar'
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
  const { View } = require('react-native')
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      View,
    },
    SlideInDown: { duration: jest.fn().mockReturnThis() },
    SlideOutUp: { duration: jest.fn().mockReturnThis() },
  }
})

describe('ConnectionStatusBar', () => {
  it('returns null when isOnline=true and not syncing', () => {
    const { toJSON } = render(
      <ConnectionStatusBar isOnline={true} testID="conn-bar" />
    )
    expect(toJSON()).toBeNull()
  })

  it('shows error-colored bar with "No internet connection" when isOnline=false', () => {
    const { getByText, getByTestId } = render(
      <ConnectionStatusBar isOnline={false} testID="conn-bar" />
    )
    expect(getByText('No internet connection')).toBeTruthy()
    const bar = getByTestId('conn-bar')
    expect(bar.props.style).toEqual(
      expect.objectContaining({ backgroundColor: lightColors.error })
    )
  })

  it('shows syncing bar with progress when isSyncing=true', () => {
    const { getByTestId } = render(
      <ConnectionStatusBar
        isOnline={true}
        isSyncing={true}
        syncProgress={50}
        testID="conn-bar"
      />
    )
    expect(getByTestId('conn-bar')).toBeTruthy()
    expect(getByTestId('conn-bar-progress')).toBeTruthy()
  })

  it('shows sync progress percentage text', () => {
    const { getByText } = render(
      <ConnectionStatusBar
        isOnline={true}
        isSyncing={true}
        syncProgress={75}
        testID="conn-bar"
      />
    )
    expect(getByText('Syncing... 75%')).toBeTruthy()
  })
})
