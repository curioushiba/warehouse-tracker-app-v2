import React, { useEffect } from 'react'
import { type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, SHIMMER_DURATION } from '@/theme'

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
  const { colors } = useTheme()
  const translateX = useSharedValue(-1)

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION }),
      -1,
      false,
    )
  }, [translateX])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * (typeof width === 'number' ? width : 200) }],
  }))

  const baseStyle: ViewStyle = {
    width: width as number,
    height: height as number,
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
    ...(borderRadius !== undefined ? { borderRadius } : {}),
  }

  return (
    <Animated.View style={baseStyle} testID={testID}>
      <Animated.View
        style={[
          {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[colors.surfaceSecondary, colors.surfaceTertiary, colors.surfaceSecondary]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
          testID={testID ? `${testID}-gradient` : 'skeleton-gradient'}
        />
      </Animated.View>
    </Animated.View>
  )
}
