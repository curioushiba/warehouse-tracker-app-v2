jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').getShadows(false),
    radii: require('@/theme/tokens').radii,
    zIndex: require('@/theme/tokens').zIndex,
    touchTarget: require('@/theme/tokens').touchTarget,
    typePresets: require('@/theme/tokens').typePresets,
    fontFamily: require('@/theme/tokens').fontFamily,
    isDark: false,
  }),
}))

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    FadeInDown: {
      delay: jest.fn(() => ({
        springify: jest.fn(() => 'mocked-entering'),
      })),
    },
  }
})

import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { StaggeredFadeIn } from './StaggeredFadeIn'

describe('StaggeredFadeIn', () => {
  it('renders children', () => {
    const { getByText } = render(
      <StaggeredFadeIn index={0}>
        <Text>Hello</Text>
      </StaggeredFadeIn>
    )
    expect(getByText('Hello')).toBeTruthy()
  })

  it('renders with testID', () => {
    const { getByTestId } = render(
      <StaggeredFadeIn index={0} testID="stagger-item">
        <Text>Item</Text>
      </StaggeredFadeIn>
    )
    expect(getByTestId('stagger-item')).toBeTruthy()
  })

  it('renders multiple children', () => {
    const { getByText } = render(
      <StaggeredFadeIn index={1}>
        <Text>First</Text>
        <Text>Second</Text>
      </StaggeredFadeIn>
    )
    expect(getByText('First')).toBeTruthy()
    expect(getByText('Second')).toBeTruthy()
  })

  it('calculates delay based on index with cap', () => {
    const { FadeInDown } = require('react-native-reanimated')

    render(
      <StaggeredFadeIn index={3}>
        <Text>Item</Text>
      </StaggeredFadeIn>
    )

    // index 3 * 50ms = 150ms, which is under the 300ms cap
    expect(FadeInDown.delay).toHaveBeenCalledWith(150)
  })

  it('caps delay at STAGGER_MAX_DELAY', () => {
    const { FadeInDown } = require('react-native-reanimated')

    // Clear previous calls
    FadeInDown.delay.mockClear()

    render(
      <StaggeredFadeIn index={10}>
        <Text>Item</Text>
      </StaggeredFadeIn>
    )

    // index 10 * 50ms = 500ms, capped at 300ms
    expect(FadeInDown.delay).toHaveBeenCalledWith(300)
  })
})
