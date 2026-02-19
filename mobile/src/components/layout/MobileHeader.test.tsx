import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MobileHeader } from './MobileHeader'

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
    withSpring: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
    SlideInDown: { duration: jest.fn().mockReturnThis() },
    SlideOutUp: { duration: jest.fn().mockReturnThis() },
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { Pressable } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      React.createElement(Pressable, props, children),
  }
})

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

  it('calls onDomainLongPress when domain badge pressed', () => {
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
    fireEvent.press(getByTestId('header-domain-badge-touchable'))
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
