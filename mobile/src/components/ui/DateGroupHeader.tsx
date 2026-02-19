import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'

interface DateGroupHeaderProps {
  date: string
  count?: number
  testID?: string
}

export function DateGroupHeader({ date, count, testID }: DateGroupHeaderProps) {
  const { colors, spacing, typography } = useTheme()

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
      }}
    >
      <Text
        testID={testID ? `${testID}-date` : undefined}
        style={{
          ...typography.sm,
          fontWeight: typography.weight.semibold,
          textTransform: 'uppercase',
          color: colors.textSecondary,
        }}
      >
        {date}
      </Text>
      {count != null && (
        <Text
          testID={testID ? `${testID}-count` : undefined}
          style={{
            ...typography.sm,
            color: colors.textTertiary,
          }}
        >
          {count}
        </Text>
      )}
    </View>
  )
}
