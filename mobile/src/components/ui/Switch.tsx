import React from 'react'
import { View, Text, Switch as RNSwitch } from 'react-native'
import { useTheme } from '@/theme'

export interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  label?: string
  disabled?: boolean
  testID?: string
}

export function Switch({
  value,
  onValueChange,
  label,
  disabled = false,
  testID,
}: SwitchProps) {
  const { colors, spacing, typography } = useTheme()

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {label ? (
        <Text
          style={{
            ...typography.base,
            color: colors.textPrimary,
            flex: 1,
            marginRight: spacing[3],
          }}
          testID={testID ? `${testID}-label` : 'switch-label'}
        >
          {label}
        </Text>
      ) : null}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        testID={testID}
        trackColor={{ false: colors.switchTrackInactive, true: colors.switchTrackActive }}
        thumbColor={colors.switchThumb}
      />
    </View>
  )
}
