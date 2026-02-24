import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { PRESS_SCALE, TIMING_CONFIG } from '@/theme/animations';
import { haptic, type HapticPattern } from '@/lib/haptics';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  hapticPattern?: HapticPattern | 'none';
  scaleValue?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function AnimatedPressable({
  onPress,
  hapticPattern = 'light',
  scaleValue = PRESS_SCALE,
  disabled,
  style,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(scaleValue, TIMING_CONFIG);
  }, [scale, scaleValue]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, TIMING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (hapticPattern !== 'none') haptic(hapticPattern);
      onPress?.(e);
    },
    [hapticPattern, onPress],
  );

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
