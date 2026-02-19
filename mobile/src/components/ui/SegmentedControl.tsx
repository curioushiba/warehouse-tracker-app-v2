import React, { useCallback } from 'react'
import { View, Text } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useTheme, SEGMENT_SLIDE } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface SegmentedControlOption {
  label: string
  value: string
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onValueChange: (value: string) => void
  size?: 'sm' | 'md'
  activeColor?: string
  activeTextColor?: string
  fullWidth?: boolean
  testID?: string
}

const SIZE_HEIGHT = { sm: 32, md: 40 } as const

export function SegmentedControl({
  options,
  value,
  onValueChange,
  size = 'md',
  activeColor,
  activeTextColor,
  fullWidth = false,
  testID,
}: SegmentedControlProps) {
  const { colors, spacing, typography, shadows, radii } = useTheme()

  const activeIndex = options.findIndex((o) => o.value === value)
  const segmentCount = options.length

  const indicatorLeft = useSharedValue(activeIndex >= 0 ? activeIndex / segmentCount : 0)

  React.useEffect(() => {
    const idx = options.findIndex((o) => o.value === value)
    if (idx >= 0) {
      indicatorLeft.value = withTiming(idx / segmentCount, { duration: SEGMENT_SLIDE })
    }
  }, [value, options, segmentCount, indicatorLeft])

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicatorLeft.value * 100}%` as any,
    width: `${100 / segmentCount}%` as any,
  }))

  const handlePress = useCallback(
    (optionValue: string) => {
      if (optionValue !== value) {
        onValueChange(optionValue)
      }
    },
    [value, onValueChange],
  )

  const height = SIZE_HEIGHT[size]
  const indicatorBg = activeColor ?? colors.surfacePrimary
  const activeText = activeTextColor ?? colors.textPrimary

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.surfaceTertiary,
        borderRadius: radii.lg,
        height,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: fullWidth ? 'stretch' : 'auto',
        padding: spacing[0.5],
        position: 'relative',
      }}
    >
      <Animated.View
        testID={testID ? `${testID}-indicator` : undefined}
        style={[
          {
            position: 'absolute',
            top: spacing[0.5],
            bottom: spacing[0.5],
            borderRadius: radii.lg - 2,
            backgroundColor: indicatorBg,
            ...shadows.sm,
          },
          indicatorStyle,
        ]}
      />
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <AnimatedPressable
            key={option.value}
            hapticPattern="light"
            onPress={() => handlePress(option.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%' as any,
              zIndex: 1,
            }}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <Text
              style={{
                ...typography.sm,
                fontWeight: isActive ? typography.weight.bold : typography.weight.medium,
                color: isActive ? activeText : colors.textSecondary,
              }}
            >
              {option.label}
            </Text>
          </AnimatedPressable>
        )
      })}
    </View>
  )
}
