import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text, StyleSheet } from 'react-native'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>
    )
    expect(getByText('Card content')).toBeTruthy()
  })

  it('elevated variant has shadow styles', () => {
    const { getByTestId } = render(
      <Card variant="elevated" testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    // Shadow properties exist on elevated cards
    expect(style.shadowColor).toBeDefined()
    expect(style.shadowOpacity).toBeGreaterThan(0)
    expect(style.elevation).toBeGreaterThan(0)
  })

  it('outline variant has border', () => {
    const { getByTestId } = render(
      <Card variant="outline" testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.borderWidth).toBe(1)
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <Card onPress={onPress} testID="card">
        <Text>Press me</Text>
      </Card>
    )
    fireEvent.press(getByTestId('card'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders as View (not touchable) when no onPress', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>Static</Text>
      </Card>
    )
    // The View is rendered; we verify it exists and renders children
    expect(getByTestId('card')).toBeTruthy()
  })

  it('default variant is elevated', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>Content</Text>
      </Card>
    )
    const style = StyleSheet.flatten(getByTestId('card').props.style)
    expect(style.shadowColor).toBeDefined()
    expect(style.elevation).toBeGreaterThan(0)
  })
})
