import React from 'react'
import { View, Text } from 'react-native'
import { useTheme, CARD_PRESS } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface StatCardProps {
  icon: React.ReactNode
  value: number | string
  label: string
  iconBgColor?: string
  onPress?: () => void
  testID?: string
}

export function StatCard({
  icon,
  value,
  label,
  iconBgColor,
  onPress,
  testID,
}: StatCardProps) {
  const { colors, spacing, typography, shadows, radii } = useTheme()

  const bgColor = iconBgColor ?? colors.brandSecondary

  const content = (
    <>
      <View
        testID={testID ? `${testID}-icon-circle` : undefined}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[3],
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          ...typography['2xl'],
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
          marginBottom: spacing[0.5],
        }}
      >
        {String(value)}
      </Text>
      <Text
        style={{
          ...typography.sm,
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </>
  )

  const cardStyle = {
    backgroundColor: colors.surfacePrimary,
    borderRadius: radii.lg,
    padding: spacing[4],
    ...shadows.sm,
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        hapticPattern="light"
        scaleValue={CARD_PRESS.toValue}
        style={cardStyle}
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    )
  }

  return (
    <View style={cardStyle} testID={testID}>
      {content}
    </View>
  )
}
