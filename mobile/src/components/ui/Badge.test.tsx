import React from 'react'
import { render } from '@testing-library/react-native'
import { Badge } from './Badge'

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
    expect(bgColor).toContain('#')
    // success solid = green bg
    expect(bgColor).toBe('#16A34A')
  })

  it('applies error colorScheme (red background)', () => {
    const { getByTestId } = render(
      <Badge label="Failed" colorScheme="error" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#EF4444')
  })

  it('applies warning colorScheme (yellow background)', () => {
    const { getByTestId } = render(
      <Badge label="Pending" colorScheme="warning" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#EAB308')
  })

  it('applies info colorScheme (blue background)', () => {
    const { getByTestId } = render(
      <Badge label="Info" colorScheme="info" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#3B82F6')
  })

  it('applies primary colorScheme (green background)', () => {
    const { getByTestId } = render(
      <Badge label="Primary" colorScheme="primary" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#01722f')
  })

  it('applies neutral colorScheme (gray background)', () => {
    const { getByTestId } = render(
      <Badge label="Neutral" colorScheme="neutral" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#6B7280')
  })

  it('applies subtle variant (light background)', () => {
    const { getByTestId } = render(
      <Badge label="Subtle" colorScheme="success" variant="subtle" testID="badge" />
    )
    const bgColor = StyleSheet.flatten(getByTestId('badge').props.style).backgroundColor
    expect(bgColor).toBe('#DCFCE7')
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
    expect(bgColor).toBe('#6B7280')
  })
})

// Helper to flatten styles
import { StyleSheet } from 'react-native'
