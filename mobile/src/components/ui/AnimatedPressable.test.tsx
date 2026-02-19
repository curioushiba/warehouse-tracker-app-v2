import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AnimatedPressable } from './AnimatedPressable'
import { Text } from 'react-native'
import * as haptics from '@/lib/haptics'

jest.mock('@/lib/haptics', () => ({
  haptic: jest.fn(),
  hapticSelection: jest.fn(),
}))

jest.mock('@/theme/animations', () => ({
  PRESS_SCALE: { toValue: 0.97, duration: 100 },
}))

describe('AnimatedPressable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children', () => {
    const { getByText } = render(
      <AnimatedPressable>
        <Text>Press me</Text>
      </AnimatedPressable>
    )
    expect(getByText('Press me')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <AnimatedPressable onPress={onPress} testID="btn">
        <Text>Press</Text>
      </AnimatedPressable>
    )
    fireEvent.press(getByTestId('btn'))
    expect(onPress).toHaveBeenCalled()
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <AnimatedPressable onPress={onPress} disabled testID="btn">
        <Text>Press</Text>
      </AnimatedPressable>
    )
    fireEvent.press(getByTestId('btn'))
    expect(onPress).not.toHaveBeenCalled()
  })

  describe('hapticPattern prop', () => {
    it('fires haptic on pressIn when hapticPattern is set', () => {
      const { getByTestId } = render(
        <AnimatedPressable hapticPattern="medium" testID="btn">
          <Text>Press</Text>
        </AnimatedPressable>
      )
      fireEvent(getByTestId('btn'), 'pressIn')
      expect(haptics.haptic).toHaveBeenCalledWith('medium')
    })

    it('fires haptic with "success" pattern', () => {
      const { getByTestId } = render(
        <AnimatedPressable hapticPattern="success" testID="btn">
          <Text>Press</Text>
        </AnimatedPressable>
      )
      fireEvent(getByTestId('btn'), 'pressIn')
      expect(haptics.haptic).toHaveBeenCalledWith('success')
    })

    it('does not fire haptic when hapticPattern is not set', () => {
      const { getByTestId } = render(
        <AnimatedPressable testID="btn">
          <Text>Press</Text>
        </AnimatedPressable>
      )
      fireEvent(getByTestId('btn'), 'pressIn')
      expect(haptics.haptic).not.toHaveBeenCalled()
    })

    it('does not fire haptic when disabled', () => {
      const { getByTestId } = render(
        <AnimatedPressable hapticPattern="light" disabled testID="btn">
          <Text>Press</Text>
        </AnimatedPressable>
      )
      fireEvent(getByTestId('btn'), 'pressIn')
      expect(haptics.haptic).not.toHaveBeenCalled()
    })
  })
})
