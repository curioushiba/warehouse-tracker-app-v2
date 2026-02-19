import React from 'react'
import { ActivityIndicator } from 'react-native'
import { useTheme } from '@/theme'

export interface SpinnerProps {
  size?: 'small' | 'large'
  color?: string
  testID?: string
}

export function Spinner({
  size = 'small',
  color,
  testID,
}: SpinnerProps) {
  const { colors } = useTheme()

  return (
    <ActivityIndicator
      size={size}
      color={color ?? colors.brandPrimary}
      testID={testID}
    />
  )
}
