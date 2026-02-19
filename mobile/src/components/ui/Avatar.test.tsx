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

import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Avatar } from './Avatar'
import { lightColors } from '@/theme/tokens'

describe('Avatar', () => {
  it('renders image when imageUri provided', () => {
    const { getByTestId } = render(
      <Avatar imageUri="https://example.com/photo.jpg" size="md" testID="avatar" />
    )
    expect(getByTestId('avatar-image')).toBeTruthy()
  })

  it('shows initials when no imageUri but name provided (first letter of first+last name)', () => {
    const { getByText } = render(
      <Avatar name="John Doe" size="md" testID="avatar" />
    )
    expect(getByText('JD')).toBeTruthy()
  })

  it('shows single initial for single name', () => {
    const { getByText } = render(
      <Avatar name="Alice" size="md" testID="avatar" />
    )
    expect(getByText('A')).toBeTruthy()
  })

  it('shows default icon when neither imageUri nor name', () => {
    const { getByTestId } = render(
      <Avatar size="md" testID="avatar" />
    )
    expect(getByTestId('icon-User')).toBeTruthy()
  })

  it('applies sm size (32)', () => {
    const { getByTestId } = render(
      <Avatar name="AB" size="sm" testID="avatar" />
    )
    const style = StyleSheet.flatten(getByTestId('avatar').props.style)
    expect(style.width).toBe(32)
    expect(style.height).toBe(32)
  })

  it('applies md size (40)', () => {
    const { getByTestId } = render(
      <Avatar name="AB" size="md" testID="avatar" />
    )
    const style = StyleSheet.flatten(getByTestId('avatar').props.style)
    expect(style.width).toBe(40)
    expect(style.height).toBe(40)
  })

  it('applies lg size (56)', () => {
    const { getByTestId } = render(
      <Avatar name="AB" size="lg" testID="avatar" />
    )
    const style = StyleSheet.flatten(getByTestId('avatar').props.style)
    expect(style.width).toBe(56)
    expect(style.height).toBe(56)
  })

  it('uses brandSecondary for fallback background', () => {
    const { getByTestId } = render(
      <Avatar name="AB" size="md" testID="avatar" />
    )
    const style = StyleSheet.flatten(getByTestId('avatar').props.style)
    expect(style.backgroundColor).toBe(lightColors.brandSecondary)
  })
})
