import React from 'react'
import { ActivityIndicator } from 'react-native'

export interface SpinnerProps {
  size?: 'small' | 'large'
  color?: string
  testID?: string
}

export function Spinner({
  size = 'small',
  color = '#01722f',
  testID,
}: SpinnerProps) {
  return (
    <ActivityIndicator
      size={size}
      color={color}
      testID={testID}
    />
  )
}
