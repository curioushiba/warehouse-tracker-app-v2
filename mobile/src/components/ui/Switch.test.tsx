import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders RN Switch with correct value', () => {
    const { getByTestId } = render(
      <Switch value={true} onValueChange={() => {}} testID="switch" />
    )
    const switchEl = getByTestId('switch')
    expect(switchEl.props.value).toBe(true)
  })

  it('calls onValueChange when toggled', () => {
    const onValueChange = jest.fn()
    const { getByTestId } = render(
      <Switch value={false} onValueChange={onValueChange} testID="switch" />
    )
    fireEvent(getByTestId('switch'), 'valueChange', true)
    expect(onValueChange).toHaveBeenCalledWith(true)
  })

  it('renders label text when provided', () => {
    const { getByText } = render(
      <Switch value={false} onValueChange={() => {}} label="Enable notifications" />
    )
    expect(getByText('Enable notifications')).toBeTruthy()
  })

  it('does not render label when not provided', () => {
    const { queryByTestId } = render(
      <Switch value={false} onValueChange={() => {}} testID="switch" />
    )
    expect(queryByTestId('switch-label')).toBeNull()
  })

  it('disabled prevents toggling', () => {
    const { getByTestId } = render(
      <Switch value={false} onValueChange={() => {}} disabled testID="switch" />
    )
    expect(getByTestId('switch').props.disabled).toBe(true)
  })
})
