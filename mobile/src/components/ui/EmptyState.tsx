import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  message: string
  action?: { label: string; onPress: () => void }
  testID?: string
}

export function EmptyState({ icon, title, message, action, testID }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme()

  return (
    <View
      testID={testID}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[6],
      }}
    >
      <View style={{ marginBottom: spacing[4] }}>{icon}</View>
      <Text
        testID={testID ? `${testID}-title` : undefined}
        style={{
          ...typography.xl,
          fontWeight: typography.weight.semibold,
          color: colors.textSecondary,
          marginBottom: spacing[2],
        }}
      >
        {title}
      </Text>
      <Text
        testID={testID ? `${testID}-message` : undefined}
        style={{
          ...typography.base,
          color: colors.textTertiary,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      {action && (
        <View style={{ marginTop: spacing[4] }}>
          <Button
            label={action.label}
            onPress={action.onPress}
            variant="primary"
            size="md"
            testID={testID ? `${testID}-action` : undefined}
          />
        </View>
      )}
    </View>
  )
}
