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
import { Spinner } from './Spinner'
import { lightColors } from '@/theme/tokens'

describe('Spinner', () => {
  it('renders ActivityIndicator', () => {
    const { getByTestId } = render(<Spinner testID="spinner" />)
    expect(getByTestId('spinner')).toBeTruthy()
  })

  it('passes size prop', () => {
    const { getByTestId } = render(<Spinner size="large" testID="spinner" />)
    expect(getByTestId('spinner').props.size).toBe('large')
  })

  it('passes color prop', () => {
    const { getByTestId } = render(<Spinner color="#FF0000" testID="spinner" />)
    expect(getByTestId('spinner').props.color).toBe('#FF0000')
  })

  it('default size is small', () => {
    const { getByTestId } = render(<Spinner testID="spinner" />)
    expect(getByTestId('spinner').props.size).toBe('small')
  })

  it('default color is brandPrimary from theme', () => {
    const { getByTestId } = render(<Spinner testID="spinner" />)
    expect(getByTestId('spinner').props.color).toBe(lightColors.brandPrimary)
  })
})
