import React from 'react'
import { View, Text } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  rightContent?: React.ReactNode
  testID?: string
}

export function ScreenHeader({ title, onBack, rightContent, testID }: ScreenHeaderProps) {
  const { colors, spacing, typography } = useTheme()

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfacePrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
      }}
    >
      {onBack && (
        <AnimatedPressable
          onPress={onBack}
          testID={testID ? `${testID}-back` : undefined}
          style={{ marginRight: spacing[2] }}
        >
          <ArrowLeft size={24} color={colors.iconBrand} />
        </AnimatedPressable>
      )}
      <Text
        testID={testID ? `${testID}-title` : undefined}
        style={{
          ...typography.xl,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
          flex: 1,
        }}
      >
        {title}
      </Text>
      {rightContent}
    </View>
  )
}
