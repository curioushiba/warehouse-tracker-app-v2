import React, { useCallback } from 'react'
import { type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { Pressable } from 'react-native'
import { PRESS_SCALE } from '@/theme/animations'
import { haptic, type HapticPattern } from '@/lib/haptics'

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable)

export interface AnimatedPressableProps {
  onPress?: () => void
  style?: ViewStyle | ViewStyle[]
  disabled?: boolean
  scaleValue?: number
  hapticPattern?: HapticPattern
  children: React.ReactNode
  testID?: string
}

export function AnimatedPressable({
  onPress,
  style,
  disabled = false,
  scaleValue = PRESS_SCALE.toValue,
  hapticPattern,
  children,
  testID,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(scaleValue, { duration: PRESS_SCALE.duration })
    if (hapticPattern) {
      haptic(hapticPattern)
    }
  }, [scale, scaleValue, hapticPattern])

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: PRESS_SCALE.duration })
  }, [scale])

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      testID={testID}
    >
      {children}
    </AnimatedPressableBase>
  )
}
