import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { useCameraPermissions } from 'expo-camera'
import { BarcodeScanner } from './BarcodeScanner'

describe('BarcodeScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: true },
      jest.fn(),
    ])
  })

  it('renders camera view when permission granted', () => {
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    expect(getByTestId('scanner-camera')).toBeTruthy()
  })

  it('shows permission denied message when permission not granted', () => {
    ;(useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      jest.fn(),
    ])
    const { getByText, queryByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    expect(getByText('Camera permission required')).toBeTruthy()
    expect(queryByTestId('scanner-camera')).toBeNull()
  })

  it('calls onScan with barcode data when barcode detected', () => {
    const onScan = jest.fn()
    const { getByTestId } = render(
      <BarcodeScanner onScan={onScan} testID="scanner" />
    )
    const camera = getByTestId('scanner-camera')
    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(onScan).toHaveBeenCalledWith('PT-00001')
  })

  it('has flash toggle button', () => {
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    expect(getByTestId('scanner-flash-toggle')).toBeTruthy()
  })

  it('has close button that calls onClose', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} onClose={onClose} testID="scanner" />
    )
    fireEvent.press(getByTestId('scanner-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid scans (500ms) - second scan within 500ms is ignored', () => {
    jest.useFakeTimers()
    const onScan = jest.fn()
    const { getByTestId } = render(
      <BarcodeScanner onScan={onScan} testID="scanner" />
    )
    const camera = getByTestId('scanner-camera')

    // First scan should fire
    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(onScan).toHaveBeenCalledTimes(1)

    // Second scan within 500ms should be ignored
    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00002' })
    expect(onScan).toHaveBeenCalledTimes(1)

    // After 500ms, scan should work again
    jest.advanceTimersByTime(500)
    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00003' })
    expect(onScan).toHaveBeenCalledTimes(2)
    expect(onScan).toHaveBeenLastCalledWith('PT-00003')

    jest.useRealTimers()
  })
})
