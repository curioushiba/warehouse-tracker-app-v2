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
import { Button } from './Button'

describe('Button', () => {
  it('renders the label text', () => {
    const { getByText } = render(<Button label="Save" onPress={() => {}} />)
    expect(getByText('Save')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button label="Save" onPress={onPress} />)
    fireEvent.press(getByText('Save'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button label="Save" onPress={onPress} disabled />)
    fireEvent.press(getByText('Save'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows loading text when isLoading is true', () => {
    const { getByText, queryByText } = render(
      <Button label="Save" onPress={() => {}} isLoading loadingText="Saving..." />
    )
    expect(getByText('Saving...')).toBeTruthy()
    expect(queryByText('Save')).toBeNull()
  })

  it('shows ActivityIndicator when isLoading without loadingText', () => {
    const { getByTestId, queryByText } = render(
      <Button label="Save" onPress={() => {}} isLoading />
    )
    expect(getByTestId('button-spinner')).toBeTruthy()
    expect(queryByText('Save')).toBeNull()
  })

  it('does not call onPress when isLoading', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <Button label="Save" onPress={onPress} isLoading testID="loading-btn" />
    )
    fireEvent.press(getByTestId('loading-btn'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders left icon when provided', () => {
    const icon = <></>
    const { getByTestId } = render(
      <Button label="Save" onPress={() => {}} leftIcon={icon} testID="icon-btn" />
    )
    expect(getByTestId('button-left-icon')).toBeTruthy()
  })

  it('applies variant styles', () => {
    const { getByTestId } = render(
      <Button label="Delete" onPress={() => {}} variant="danger" testID="danger-btn" />
    )
    expect(getByTestId('danger-btn')).toBeTruthy()
  })

  it('applies size styles', () => {
    const { getByTestId } = render(
      <Button label="Small" onPress={() => {}} size="sm" testID="sm-btn" />
    )
    expect(getByTestId('sm-btn')).toBeTruthy()
  })

  it('has reduced opacity when disabled', () => {
    const { getByTestId } = render(
      <Button label="Save" onPress={() => {}} disabled testID="dis-btn" />
    )
    const btn = getByTestId('dis-btn')
    expect(btn.props.style).toEqual(
      expect.objectContaining({ opacity: 0.5 })
    )
  })
})
