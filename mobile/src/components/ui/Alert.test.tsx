import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Alert } from './Alert'

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

  it('applies blue background for info status', () => {
    const { getByTestId } = render(
      <Alert title="Info" status="info" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe('#DBEAFE')
  })

  it('applies green background for success status', () => {
    const { getByTestId } = render(
      <Alert title="Done" status="success" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe('#DCFCE7')
  })

  it('applies yellow background for warning status', () => {
    const { getByTestId } = render(
      <Alert title="Caution" status="warning" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe('#FEF9C3')
  })

  it('applies red background for error status', () => {
    const { getByTestId } = render(
      <Alert title="Error" status="error" testID="alert" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('alert').props.style).backgroundColor
    expect(bgColor).toBe('#FEE2E2')
  })
})
