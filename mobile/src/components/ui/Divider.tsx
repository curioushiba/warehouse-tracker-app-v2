import React from 'react'
import { View, type ViewStyle } from 'react-native'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  color?: string
  testID?: string
}

export function Divider({
  orientation = 'horizontal',
  color = '#E5E7EB',
  testID,
}: DividerProps) {
  const style: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%', backgroundColor: color }
      : { width: 1, height: '100%', backgroundColor: color }

  return <View style={style} testID={testID} />
}
