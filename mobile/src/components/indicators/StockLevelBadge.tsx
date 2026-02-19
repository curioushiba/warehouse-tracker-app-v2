import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'
import type { StockLevel } from '@/types'

export interface StockLevelBadgeProps {
  level: StockLevel
  testID?: string
}

const LEVEL_LABELS: Record<StockLevel, string> = {
  critical: 'Critical',
  low: 'Low',
  normal: 'Normal',
  overstocked: 'Overstocked',
}

export function StockLevelBadge({ level, testID }: StockLevelBadgeProps) {
  const { colors, spacing, typography, radii } = useTheme()

  const colorMap: Record<StockLevel, string> = {
    critical: colors.error,
    low: colors.warning,
    normal: colors.success,
    overstocked: colors.info,
  }

  return (
    <View
      testID={testID}
      style={{
        paddingHorizontal: spacing[2.5],
        paddingVertical: spacing[1],
        borderRadius: radii.sm,
        alignSelf: 'flex-start',
        backgroundColor: colorMap[level],
      }}
    >
      <Text
        style={{
          color: colors.textInverse,
          fontSize: typography.sm.fontSize,
          lineHeight: typography.sm.lineHeight,
          fontWeight: typography.weight.semibold,
        }}
      >
        {LEVEL_LABELS[level]}
      </Text>
    </View>
  )
}
