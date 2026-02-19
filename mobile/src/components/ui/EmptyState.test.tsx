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
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { TouchableOpacity } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      React.createElement(TouchableOpacity, props, children),
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text, StyleSheet } from 'react-native'
import { EmptyState } from './EmptyState'
import { lightColors, spacing, typography } from '@/theme/tokens'

describe('EmptyState', () => {
  const defaultIcon = <Text testID="empty-icon">icon</Text>

  it('renders the icon', () => {
    const { getByTestId } = render(
      <EmptyState icon={defaultIcon} title="No items" message="Nothing here" />
    )
    expect(getByTestId('empty-icon')).toBeTruthy()
  })

  it('renders the title', () => {
    const { getByText } = render(
      <EmptyState icon={defaultIcon} title="No items" message="Nothing here" />
    )
    expect(getByText('No items')).toBeTruthy()
  })

  it('renders the message', () => {
    const { getByText } = render(
      <EmptyState icon={defaultIcon} title="No items" message="Nothing here" />
    )
    expect(getByText('Nothing here')).toBeTruthy()
  })

  it('renders action button when action is provided', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        action={{ label: 'Add Item', onPress }}
      />
    )
    expect(getByText('Add Item')).toBeTruthy()
  })

  it('calls action onPress when button is pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        action={{ label: 'Add Item', onPress }}
      />
    )
    fireEvent.press(getByText('Add Item'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when action is not provided', () => {
    const { queryByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    expect(queryByTestId('es-action')).toBeNull()
  })

  it('applies centered layout', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es').props.style)
    expect(style.alignItems).toBe('center')
    expect(style.justifyContent).toBe('center')
    expect(style.padding).toBe(spacing[6])
  })

  it('applies textSecondary color to title', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es-title').props.style)
    expect(style.color).toBe(lightColors.textSecondary)
  })

  it('applies textTertiary color to message', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es-message').props.style)
    expect(style.color).toBe(lightColors.textTertiary)
  })

  it('applies center text alignment to message', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es-message').props.style)
    expect(style.textAlign).toBe('center')
  })

  it('applies xl typography to title', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es-title').props.style)
    expect(style.fontSize).toBe(typography.xl.fontSize)
    expect(style.fontWeight).toBe(typography.weight.semibold)
  })

  it('applies base typography to message', () => {
    const { getByTestId } = render(
      <EmptyState
        icon={defaultIcon}
        title="No items"
        message="Nothing here"
        testID="es"
      />
    )
    const style = StyleSheet.flatten(getByTestId('es-message').props.style)
    expect(style.fontSize).toBe(typography.base.fontSize)
  })
})
