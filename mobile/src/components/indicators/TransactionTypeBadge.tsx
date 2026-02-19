import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'

type TransactionType = 'in' | 'out' | 'adjustment'

export interface TransactionTypeBadgeProps {
  type: TransactionType
  testID?: string
}

const TYPE_LABELS: Record<TransactionType, string> = {
  in: 'CHECK IN',
  out: 'CHECK OUT',
  adjustment: 'ADJUSTMENT',
}

export function TransactionTypeBadge({ type, testID }: TransactionTypeBadgeProps) {
  const { colors, spacing, typography, radii } = useTheme()

  const colorMap: Record<TransactionType, string> = {
    in: colors.checkIn,
    out: colors.checkOut,
    adjustment: colors.adjustment,
  }

  return (
    <View
      testID={testID}
      style={{
        paddingHorizontal: spacing[2.5],
        paddingVertical: spacing[1],
        borderRadius: radii.sm,
        alignSelf: 'flex-start',
        backgroundColor: colorMap[type],
      }}
    >
      <Text
        style={{
          color: colors.textInverse,
          fontSize: typography.sm.fontSize,
          lineHeight: typography.sm.lineHeight,
          fontWeight: typography.weight.bold,
          letterSpacing: 0.5,
        }}
      >
        {TYPE_LABELS[type]}
      </Text>
    </View>
  )
}
