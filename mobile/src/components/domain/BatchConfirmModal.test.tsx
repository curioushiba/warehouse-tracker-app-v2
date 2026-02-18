import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BatchConfirmModal } from './BatchConfirmModal'

const baseProps = {
  isOpen: true,
  transactionType: 'in' as const,
  itemCount: 3,
  totalUnits: 15,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

describe('BatchConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('is not visible when isOpen is false', () => {
    const { queryByTestId } = render(
      <BatchConfirmModal {...baseProps} isOpen={false} testID="modal" />
    )
    expect(queryByTestId('modal')).toBeNull()
  })

  it('shows "CHECK IN" label for type "in"', () => {
    const { getByText } = render(
      <BatchConfirmModal {...baseProps} transactionType="in" testID="modal" />
    )
    expect(getByText('CHECK IN')).toBeTruthy()
  })

  it('shows "CHECK OUT" label for type "out"', () => {
    const { getByText } = render(
      <BatchConfirmModal {...baseProps} transactionType="out" testID="modal" />
    )
    expect(getByText('CHECK OUT')).toBeTruthy()
  })

  it('shows item count and total units', () => {
    const { getByText } = render(
      <BatchConfirmModal {...baseProps} testID="modal" />
    )
    expect(getByText('3 items')).toBeTruthy()
    expect(getByText('15 total units')).toBeTruthy()
  })

  it('confirm button calls onConfirm', () => {
    const onConfirm = jest.fn()
    const { getByTestId } = render(
      <BatchConfirmModal {...baseProps} onConfirm={onConfirm} testID="modal" />
    )
    fireEvent.press(getByTestId('modal-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancel button calls onCancel', () => {
    const onCancel = jest.fn()
    const { getByTestId } = render(
      <BatchConfirmModal {...baseProps} onCancel={onCancel} testID="modal" />
    )
    fireEvent.press(getByTestId('modal-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isSubmitting is true (confirm button disabled)', () => {
    const { getByText } = render(
      <BatchConfirmModal {...baseProps} isSubmitting={true} testID="modal" />
    )
    expect(getByText('Submitting...')).toBeTruthy()
  })

  it('confirm button is disabled when isSubmitting', () => {
    const onConfirm = jest.fn()
    const { getByTestId } = render(
      <BatchConfirmModal
        {...baseProps}
        onConfirm={onConfirm}
        isSubmitting={true}
        testID="modal"
      />
    )
    fireEvent.press(getByTestId('modal-confirm'))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
