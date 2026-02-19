import React from 'react'
import { View, Text, type ViewStyle, type TextStyle } from 'react-native'
import type { BadgeVariant, BadgeColorScheme } from '@/types'
import { useTheme, type SemanticColors } from '@/theme'

export interface BadgeProps {
  label: string
  colorScheme?: BadgeColorScheme
  variant?: BadgeVariant
  leftIcon?: React.ReactNode
  testID?: string
}

function getSolidColors(colors: SemanticColors): Record<BadgeColorScheme, { bg: string; text: string }> {
  return {
    primary: { bg: colors.badgePrimaryBg, text: colors.badgePrimaryText },
    secondary: { bg: colors.badgeSecondaryBg, text: colors.badgeSecondaryText },
    success: { bg: colors.badgeSuccessBg, text: colors.badgeSuccessText },
    warning: { bg: colors.badgeWarningBg, text: colors.badgeWarningText },
    error: { bg: colors.badgeErrorBg, text: colors.badgeErrorText },
    info: { bg: colors.badgeInfoBg, text: colors.badgeInfoText },
    neutral: { bg: colors.badgeNeutralBg, text: colors.badgeNeutralText },
  }
}

function getSubtleColors(colors: SemanticColors): Record<BadgeColorScheme, { bg: string; text: string }> {
  return {
    primary: { bg: colors.badgePrimarySubtleBg, text: colors.badgePrimarySubtleText },
    secondary: { bg: colors.badgeSecondarySubtleBg, text: colors.badgeSecondarySubtleText },
    success: { bg: colors.badgeSuccessSubtleBg, text: colors.badgeSuccessSubtleText },
    warning: { bg: colors.badgeWarningSubtleBg, text: colors.badgeWarningSubtleText },
    error: { bg: colors.badgeErrorSubtleBg, text: colors.badgeErrorSubtleText },
    info: { bg: colors.badgeInfoSubtleBg, text: colors.badgeInfoSubtleText },
    neutral: { bg: colors.badgeNeutralSubtleBg, text: colors.badgeNeutralSubtleText },
  }
}

export function Badge({
  label,
  colorScheme = 'neutral',
  variant = 'solid',
  leftIcon,
  testID,
}: BadgeProps) {
  const { colors, radii, spacing, typography } = useTheme()

  const solidMap = getSolidColors(colors)
  const subtleMap = getSubtleColors(colors)

  let containerStyle: ViewStyle
  let textColor: string

  switch (variant) {
    case 'solid': {
      const s = solidMap[colorScheme]
      containerStyle = { backgroundColor: s.bg }
      textColor = s.text
      break
    }
    case 'subtle': {
      const s = subtleMap[colorScheme]
      containerStyle = { backgroundColor: s.bg }
      textColor = s.text
      break
    }
    case 'outline': {
      const borderColor = solidMap[colorScheme].text
      containerStyle = { backgroundColor: 'transparent', borderWidth: 1, borderColor }
      textColor = solidMap[colorScheme].text
      break
    }
  }

  const baseStyle: ViewStyle = {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...containerStyle!,
  }

  const textStyle: TextStyle = {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.semibold,
    color: textColor!,
  }

  return (
    <View style={baseStyle} testID={testID}>
      {leftIcon && <View style={{ marginRight: spacing[1] }}>{leftIcon}</View>}
      <Text style={textStyle}>{label}</Text>
    </View>
  )
}
