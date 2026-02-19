import React from 'react'
import { View, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  color?: string
  testID?: string
}

export function Divider({
  orientation = 'horizontal',
  color,
  testID,
}: DividerProps) {
  const { colors } = useTheme()
  const resolvedColor = color ?? colors.borderSubtle

  const style: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%', backgroundColor: resolvedColor }
      : { width: 1, height: '100%', backgroundColor: resolvedColor }

  return <View style={style} testID={testID} />
}
