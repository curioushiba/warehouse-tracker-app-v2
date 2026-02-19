import React, { useEffect, useRef } from 'react'
import { Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import { useTheme } from '@/theme'

export interface FailedSyncBannerProps {
  count: number
  onPress: () => void
  testID?: string
}

export function FailedSyncBanner({ count, onPress, testID }: FailedSyncBannerProps) {
  const { colors, spacing, typography } = useTheme()
  const scale = useSharedValue(1)
  const prevCountRef = useRef(count)

  useEffect(() => {
    if (count > 0 && count !== prevCountRef.current) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 100 }),
        withTiming(1, { duration: 100 })
      )
    }
    prevCountRef.current = count
  }, [count, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (count === 0) {
    return null
  }

  const label =
    count === 1
      ? '1 failed transaction - Tap to view'
      : `${count} failed transactions - Tap to view`

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        style={{
          backgroundColor: colors.error,
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[3],
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.textInverse,
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
            fontWeight: typography.weight.semibold,
          }}
        >
          {label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  )
}
