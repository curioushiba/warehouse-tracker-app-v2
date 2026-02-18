import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Input } from './Input'

describe('Input', () => {
  it('renders placeholder text', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter name" onChangeText={() => {}} value="" />
    )
    expect(getByPlaceholderText('Enter name')).toBeTruthy()
  })

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn()
    const { getByTestId } = render(
      <Input
        placeholder="Enter name"
        onChangeText={onChangeText}
        value=""
        testID="input"
      />
    )
    fireEvent.changeText(getByTestId('input'), 'hello')
    expect(onChangeText).toHaveBeenCalledWith('hello')
  })

  it('shows error text when error prop provided', () => {
    const { getByText } = render(
      <Input
        placeholder="Email"
        onChangeText={() => {}}
        value=""
        error="Invalid email"
      />
    )
    expect(getByText('Invalid email')).toBeTruthy()
  })

  it('does not show error text when error is not provided', () => {
    const { queryByTestId } = render(
      <Input
        placeholder="Email"
        onChangeText={() => {}}
        value=""
        testID="input"
      />
    )
    expect(queryByTestId('input-error')).toBeNull()
  })

  it('renders left icon', () => {
    const icon = <Text testID="my-icon">icon</Text>
    const { getByTestId } = render(
      <Input
        placeholder="Search"
        onChangeText={() => {}}
        value=""
        leftIcon={icon}
        testID="input"
      />
    )
    expect(getByTestId('my-icon')).toBeTruthy()
  })

  it('disabled prevents editing', () => {
    const { getByTestId } = render(
      <Input
        placeholder="Name"
        onChangeText={() => {}}
        value=""
        disabled
        testID="input"
      />
    )
    expect(getByTestId('input').props.editable).toBe(false)
  })

  it('secureTextEntry masks input', () => {
    const { getByTestId } = render(
      <Input
        placeholder="Password"
        onChangeText={() => {}}
        value=""
        secureTextEntry
        testID="input"
      />
    )
    expect(getByTestId('input').props.secureTextEntry).toBe(true)
  })
})
