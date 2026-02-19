jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
  SLIDE_DURATION: 250,
}))

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    SlideInUp: { duration: jest.fn().mockReturnThis() },
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
import { StyleSheet } from 'react-native'
import { Alert } from './Alert'
import { lightColors } from '@/theme/tokens'

describe('Alert', () => {
  it('renders title text', () => {
    const { getByText } = render(<Alert title="Success!" status="success" />)
    expect(getByText('Success!')).toBeTruthy()
  })

  it('renders message when provided', () => {
    const { getByText } = render(
      <Alert title="Error" status="error" message="Something went wrong" />
    )
    expect(getByText('Something went wrong')).toBeTruthy()
  })

  it('does not render message when not provided', () => {
    const { queryByTestId } = render(
      <Alert title="Info" status="info" testID="alert" />
    )
    expect(queryByTestId('alert-message')).toBeNull()
  })

  it('shows close button when onClose provided and calls onClose when pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <Alert title="Warning" status="warning" onClose={onClose} testID="alert" />
    )
    const closeBtn = getByTestId('alert-close')
    expect(closeBtn).toBeTruthy()
    fireEvent.press(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides close button when no onClose', () => {
    const { queryByTestId } = render(
      <Alert title="Info" status="info" testID="alert" />
    )
    expect(queryByTestId('alert-close')).toBeNull()
  })

  it('applies info background from theme', () => {
    const { getByTestId } = render(
      <Alert title="Info" status="info" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.infoBg)
  })

  it('applies success background from theme', () => {
    const { getByTestId } = render(
      <Alert title="Done" status="success" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.successBg)
  })

  it('applies warning background from theme', () => {
    const { getByTestId } = render(
      <Alert title="Caution" status="warning" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.warningBg)
  })

  it('applies error background from theme', () => {
    const { getByTestId } = render(
      <Alert title="Error" status="error" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.errorBg)
  })
})
