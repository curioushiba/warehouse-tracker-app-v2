import React from 'react'
import { View, type ViewStyle } from 'react-native'
import type { CardVariant } from '@/types'
import { useTheme, CARD_PRESS } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface CardProps {
  children: React.ReactNode
  variant?: CardVariant
  compact?: boolean
  noPadding?: boolean
  onPress?: () => void
  testID?: string
}

export function Card({
  children,
  variant = 'elevated',
  compact = false,
  noPadding = false,
  onPress,
  testID,
}: CardProps) {
  const { colors, shadows, radii, spacing } = useTheme()

  const variantStyles: Record<CardVariant, ViewStyle> = {
    elevated: {
      backgroundColor: colors.surfaceElevated,
      ...shadows.md,
    },
    outline: {
      backgroundColor: colors.surfacePrimary,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    filled: {
      backgroundColor: colors.surfaceSecondary,
    },
    unstyled: {},
  }

  const padding = noPadding ? 0 : compact ? spacing[3] : spacing[4]

  const cardStyle: ViewStyle = {
    borderRadius: radii.lg,
    padding,
    ...variantStyles[variant],
  }

  if (onPress) {
    return (
      <AnimatedPressable
        style={cardStyle}
        onPress={onPress}
        scaleValue={CARD_PRESS.toValue}
        testID={testID}
      >
        {children}
      </AnimatedPressable>
    )
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  )
}
