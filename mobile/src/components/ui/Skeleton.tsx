import React from 'react'
import { View, type ViewStyle } from 'react-native'

export interface SkeletonProps {
  width: number | string
  height: number | string
  borderRadius?: number
  testID?: string
}

export function Skeleton({
  width,
  height,
  borderRadius,
  testID,
}: SkeletonProps) {
  const style: ViewStyle = {
    width: width as number,
    height: height as number,
    backgroundColor: '#E5E7EB',
    ...(borderRadius !== undefined ? { borderRadius } : {}),
  }

  return <View style={style} testID={testID} />
}
