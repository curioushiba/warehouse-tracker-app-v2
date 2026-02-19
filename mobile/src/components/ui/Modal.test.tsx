jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
  MODAL_SPRING: { damping: 20, stiffness: 200 },
  FADE_DURATION: 200,
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
import { Text } from 'react-native'
import { Modal } from './Modal'

describe('Modal', () => {
  it('is visible when isOpen=true', () => {
    const { getByTestId } = render(
      <Modal isOpen={true} onClose={() => {}} testID="modal">
        <Text>Content</Text>
      </Modal>
    )
    const modal = getByTestId('modal')
    expect(modal.props.visible).toBe(true)
  })

  it('is not visible when isOpen=false', () => {
    const { queryByText } = render(
      <Modal isOpen={false} onClose={() => {}} testID="modal">
        <Text>Hidden content</Text>
      </Modal>
    )
    expect(queryByText('Hidden content')).toBeNull()
  })

  it('renders title when provided', () => {
    const { getByText } = render(
      <Modal isOpen={true} onClose={() => {}} title="My Modal">
        <Text>Content</Text>
      </Modal>
    )
    expect(getByText('My Modal')).toBeTruthy()
  })

  it('renders children content', () => {
    const { getByText } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <Text>Modal body</Text>
      </Modal>
    )
    expect(getByText('Modal body')).toBeTruthy()
  })

  it('calls onClose when overlay/backdrop pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <Modal isOpen={true} onClose={onClose} testID="modal">
        <Text>Content</Text>
      </Modal>
    )
    fireEvent.press(getByTestId('modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has a close button that calls onClose', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <Modal isOpen={true} onClose={onClose} title="Test" testID="modal">
        <Text>Content</Text>
      </Modal>
    )
    fireEvent.press(getByTestId('modal-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses animationType="none" for custom spring animation', () => {
    const { getByTestId } = render(
      <Modal isOpen={true} onClose={() => {}} testID="modal">
        <Text>Content</Text>
      </Modal>
    )
    expect(getByTestId('modal').props.animationType).toBe('none')
  })
})
