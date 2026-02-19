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
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('renders placeholder', () => {
    const { getByPlaceholderText } = render(
      <SearchInput
        onChangeText={() => {}}
        value=""
        placeholder="Search items..."
        testID="search"
      />
    )
    expect(getByPlaceholderText('Search items...')).toBeTruthy()
  })

  it('calls onChangeText on input', () => {
    const onChangeText = jest.fn()
    const { getByTestId } = render(
      <SearchInput
        onChangeText={onChangeText}
        value=""
        placeholder="Search"
        testID="search"
      />
    )
    fireEvent.changeText(getByTestId('search-input'), 'rice')
    expect(onChangeText).toHaveBeenCalledWith('rice')
  })

  it('shows clear button when value is non-empty', () => {
    const { getByTestId } = render(
      <SearchInput
        onChangeText={() => {}}
        value="hello"
        placeholder="Search"
        testID="search"
      />
    )
    expect(getByTestId('search-clear')).toBeTruthy()
  })

  it('hides clear button when value is empty', () => {
    const { queryByTestId } = render(
      <SearchInput
        onChangeText={() => {}}
        value=""
        placeholder="Search"
        testID="search"
      />
    )
    expect(queryByTestId('search-clear')).toBeNull()
  })

  it('calls onClear when clear pressed', () => {
    const onClear = jest.fn()
    const { getByTestId } = render(
      <SearchInput
        onChangeText={() => {}}
        value="text"
        placeholder="Search"
        onClear={onClear}
        testID="search"
      />
    )
    fireEvent.press(getByTestId('search-clear'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('calls onChangeText with empty string when clear pressed and no onClear', () => {
    const onChangeText = jest.fn()
    const { getByTestId } = render(
      <SearchInput
        onChangeText={onChangeText}
        value="text"
        placeholder="Search"
        testID="search"
      />
    )
    fireEvent.press(getByTestId('search-clear'))
    expect(onChangeText).toHaveBeenCalledWith('')
  })

  it('has search icon', () => {
    const { getByTestId } = render(
      <SearchInput
        onChangeText={() => {}}
        value=""
        placeholder="Search"
        testID="search"
      />
    )
    expect(getByTestId('icon-Search')).toBeTruthy()
  })
})
