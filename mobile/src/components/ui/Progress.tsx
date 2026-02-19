import React, { useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { useTheme, TIMING_CONFIG } from '@/theme'

export interface ProgressProps {
  value: number
  color?: string
  trackColor?: string
  testID?: string
}

export function Progress({
  value,
  color,
  trackColor,
  testID,
}: ProgressProps) {
  const { colors } = useTheme()
  const clampedValue = Math.min(100, Math.max(0, value))
  const animatedWidth = useSharedValue(clampedValue)

  useEffect(() => {
    animatedWidth.value = withTiming(clampedValue, TIMING_CONFIG)
  }, [clampedValue, animatedWidth])

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%` as unknown as number,
  }))

  const resolvedTrackColor = trackColor ?? colors.bgTertiary
  const resolvedFillColor = color ?? colors.brandPrimary

  const trackStyle: ViewStyle = {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: resolvedTrackColor,
  }

  const fillStyle: ViewStyle = {
    height: '100%',
    borderRadius: 4,
    backgroundColor: resolvedFillColor,
  }

  return (
    <View style={trackStyle} testID={testID}>
      <Animated.View
        style={[fillStyle, fillAnimatedStyle]}
        testID={testID ? `${testID}-fill` : 'progress-fill'}
      />
    </View>
  )
}
