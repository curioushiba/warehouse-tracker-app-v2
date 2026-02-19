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
import { StyleSheet, Text } from 'react-native'
import { Badge } from './Badge'
import { lightColors } from '@/theme/tokens'

describe('Badge', () => {
  it('renders label text', () => {
    const { getByText } = render(<Badge label="New" />)
    expect(getByText('New')).toBeTruthy()
  })

  it('applies success colorScheme (green background)', () => {
    const { getByTestId } = render(
      <Badge label="Active" colorScheme="success" testID="badge" />
    )
    const badge = getByTestId('badge')
    const bgColor = StyleSheet.flatten(badge.props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeSuccessBg)
  })

  it('applies error colorScheme (red background)', () => {
    const { getByTestId } = render(
      <Badge label="Failed" colorScheme="error" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeErrorBg)
  })

  it('applies warning colorScheme (yellow background)', () => {
    const { getByTestId } = render(
      <Badge label="Pending" colorScheme="warning" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeWarningBg)
  })

  it('applies info colorScheme (blue background)', () => {
    const { getByTestId } = render(
      <Badge label="Info" colorScheme="info" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeInfoBg)
  })

  it('applies primary colorScheme (green background)', () => {
    const { getByTestId } = render(
      <Badge label="Primary" colorScheme="primary" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgePrimaryBg)
  })

  it('applies neutral colorScheme (gray background)', () => {
    const { getByTestId } = render(
      <Badge label="Neutral" colorScheme="neutral" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeNeutralBg)
  })

  it('applies subtle variant (light background)', () => {
    const { getByTestId } = render(
      <Badge label="Subtle" colorScheme="success" variant="subtle" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeSuccessSubtleBg)
  })

  it('applies outline variant (border only, transparent bg)', () => {
    const { getByTestId } = render(
      <Badge label="Outline" colorScheme="success" variant="outline" testID="badge" />
    )
    const style = StyleSheet.flatten(getByTestId('badge').props.style)
    expect(style.backgroundColor).toBe('transparent')
    expect(style.borderWidth).toBe(1)
  })

  it('defaults to solid variant and neutral colorScheme', () => {
    const { getByTestId } = render(<Badge label="Default" testID="badge" />)
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe(lightColors.badgeNeutralBg)
  })

  it('renders leftIcon when provided', () => {
    const { getByTestId } = render(
      <Badge label="Tagged" leftIcon={<Text testID="badge-icon">*</Text>} testID="badge" />
    )
    expect(getByTestId('badge-icon')).toBeTruthy()
  })
})
