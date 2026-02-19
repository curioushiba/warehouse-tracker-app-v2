import React from 'react'
import { render } from '@testing-library/react-native'
import { ScanSuccessOverlay } from './ScanSuccessOverlay'

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
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
  }
})

describe('ScanSuccessOverlay', () => {
  it('is not visible when isVisible is false', () => {
    const { queryByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={false}
        testID="overlay"
      />
    )
    expect(queryByTestId('overlay')).toBeNull()
  })

  it('shows item name when isVisible is true', () => {
    const { getByText, getByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(getByTestId('overlay')).toBeTruthy()
    expect(getByText('Widget')).toBeTruthy()
  })

  it('shows image when item has imageUrl', () => {
    const { getByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget', imageUrl: 'https://example.com/img.png' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(getByTestId('overlay-image')).toBeTruthy()
  })

  it('shows placeholder when no imageUrl', () => {
    const { getByTestId, queryByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(queryByTestId('overlay-image')).toBeNull()
    expect(getByTestId('overlay-placeholder')).toBeTruthy()
  })

  it('is hidden when item is null', () => {
    const { queryByTestId } = render(
      <ScanSuccessOverlay item={null} isVisible={true} testID="overlay" />
    )
    expect(queryByTestId('overlay')).toBeNull()
  })

  it('renders as a compact banner (not full-screen)', () => {
    const { getByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={true}
        testID="overlay"
      />
    )
    const overlay = getByTestId('overlay')
    expect(overlay.props.style).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        height: 80,
        flexDirection: 'row',
      })
    )
  })
})
