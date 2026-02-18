import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders with correct width and height', () => {
    const { getByTestId } = render(
      <Skeleton width={200} height={20} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.width).toBe(200)
    expect(style.height).toBe(20)
  })

  it('applies borderRadius when provided', () => {
    const { getByTestId } = render(
      <Skeleton width={100} height={100} borderRadius={50} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.borderRadius).toBe(50)
  })

  it('has gray background color (#E5E7EB)', () => {
    const { getByTestId } = render(
      <Skeleton width={120} height={16} testID="skeleton" />
    )
    const style = StyleSheet.flatten(getByTestId('skeleton').props.style)
    expect(style.backgroundColor).toBe('#E5E7EB')
  })
})
