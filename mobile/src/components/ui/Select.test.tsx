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
    // All options should be visible after opening
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
    // Open the dropdown
    fireEvent.press(getByTestId('select'))
    // Select an option
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
    // Option list should not appear
    expect(queryByTestId('select-options')).toBeNull()
  })
})
