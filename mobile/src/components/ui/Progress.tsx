import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'

export interface ProgressProps {
  value: number
  color?: string
  trackColor?: string
  testID?: string
}

export function Progress({
  value,
  color = '#01722f',
  trackColor = '#E5E7EB',
  testID,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  const trackStyle: ViewStyle = {
    ...styles.track,
    backgroundColor: trackColor,
  }

  const fillStyle: ViewStyle = {
    ...styles.fill,
    width: `${clampedValue}%` as unknown as number,
    backgroundColor: color,
  }

  return (
    <View style={trackStyle} testID={testID}>
      <View style={fillStyle} testID={testID ? `${testID}-fill` : 'progress-fill'} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
})
