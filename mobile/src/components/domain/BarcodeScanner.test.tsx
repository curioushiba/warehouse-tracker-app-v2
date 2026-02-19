import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { useCameraPermissions } from 'expo-camera'
import { BarcodeScanner } from './BarcodeScanner'

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
  const { View } = require('react-native')
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      View,
    },
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { Pressable } = require('react-native')
  const React = require('react')
  return {
    AnimatedPressable: ({ children, style, ...props }: any) =>
      React.createElement(Pressable, { ...props, style }, children),
  }
})

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

  it('shows Open Settings button when permission denied', () => {
    ;(useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      jest.fn(),
    ])
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    expect(getByTestId('scanner-open-settings')).toBeTruthy()
  })

  it('calls Linking.openSettings when Open Settings is pressed', () => {
    ;(useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      jest.fn(),
    ])
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as any)
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    fireEvent.press(getByTestId('scanner-open-settings'))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('renders scan reticle overlay when camera is shown', () => {
    const { getByTestId } = render(
      <BarcodeScanner onScan={jest.fn()} testID="scanner" />
    )
    expect(getByTestId('scanner-reticle')).toBeTruthy()
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

    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00001' })
    expect(onScan).toHaveBeenCalledTimes(1)

    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00002' })
    expect(onScan).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(500)
    fireEvent(camera, 'onBarcodeScanned', { data: 'PT-00003' })
    expect(onScan).toHaveBeenCalledTimes(2)
    expect(onScan).toHaveBeenLastCalledWith('PT-00003')

    jest.useRealTimers()
  })
})
