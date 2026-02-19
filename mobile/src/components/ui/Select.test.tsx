jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    zIndex: require('@/theme/tokens').zIndex,
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
  const { Pressable } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, style, disabled, ...props }: any) =>
      React.createElement(Pressable, { ...props, style, disabled }, children),
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Select } from './Select'

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
]

describe('Select', () => {
  it('shows placeholder when no value selected', () => {
    const { getByText } = render(
      <Select
        placeholder="Choose fruit"
        options={options}
        value=""
        onValueChange={() => {}}
        testID="select"
      />
    )
    expect(getByText('Choose fruit')).toBeTruthy()
  })

  it('shows selected option label', () => {
    const { getByText } = render(
      <Select
        placeholder="Choose fruit"
        options={options}
        value="banana"
        onValueChange={() => {}}
        testID="select"
      />
    )
    expect(getByText('Banana')).toBeTruthy()
  })

  it('opens option list on press', () => {
    const { getByTestId, getByText } = render(
      <Select
        placeholder="Choose fruit"
        options={options}
        value=""
        onValueChange={() => {}}
        testID="select"
      />
    )
    fireEvent.press(getByTestId('select'))
    expect(getByText('Apple')).toBeTruthy()
    expect(getByText('Banana')).toBeTruthy()
    expect(getByText('Cherry')).toBeTruthy()
  })

  it('calls onValueChange with option value when option pressed', () => {
    const onValueChange = jest.fn()
    const { getByTestId, getByText } = render(
      <Select
        placeholder="Choose fruit"
        options={options}
        value=""
        onValueChange={onValueChange}
        testID="select"
      />
    )
    fireEvent.press(getByTestId('select'))
    fireEvent.press(getByText('Cherry'))
    expect(onValueChange).toHaveBeenCalledWith('cherry')
  })

  it('disabled prevents opening', () => {
    const { getByTestId, queryByTestId } = render(
      <Select
        placeholder="Choose fruit"
        options={options}
        value=""
        onValueChange={() => {}}
        disabled
        testID="select"
      />
    )
    fireEvent.press(getByTestId('select'))
    expect(queryByTestId('select-options')).toBeNull()
  })
})
