import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'

export interface SectionHeaderProps {
  label: string
  rightContent?: React.ReactNode
  testID?: string
}

export function SectionHeader({ label, rightContent, testID }: SectionHeaderProps) {
  const { colors, spacing, typography } = useTheme()

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[2],
        marginTop: spacing[4],
      }}
    >
      <Text
        style={{
          ...typography.xs,
          fontWeight: typography.weight.semibold,
          color: colors.textTertiary,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {rightContent && (
        <View testID={testID ? `${testID}-right` : undefined}>{rightContent}</View>
      )}
    </View>
  )
}
