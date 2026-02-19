import React, { useState, forwardRef } from 'react'
import { View, TextInput, Text, type TextInputProps } from 'react-native'
import { useTheme } from '@/theme'

export type InputSize = 'sm' | 'md' | 'lg'

const SIZE_HEIGHTS: Record<InputSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
}

export interface InputProps {
  placeholder?: string
  onChangeText: (text: string) => void
  value: string
  error?: string
  label?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  disabled?: boolean
  secureTextEntry?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: TextInputProps['onSubmitEditing']
  size?: InputSize
  testID?: string
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    placeholder,
    onChangeText,
    value,
    error,
    label,
    leftIcon,
    rightIcon,
    disabled = false,
    secureTextEntry = false,
    autoCapitalize,
    returnKeyType,
    onSubmitEditing,
    size = 'md',
    testID,
  },
  ref
) {
  const { colors, spacing, radii, typography } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? colors.error
    : isFocused
      ? colors.borderFocus
      : colors.borderPrimary

  const height = SIZE_HEIGHTS[size]

  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Text
          style={{
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
            fontWeight: typography.weight.medium,
            color: colors.textPrimary,
            marginBottom: spacing[1],
          }}
          testID={testID ? `${testID}-label` : 'input-label'}
        >
          {label}
        </Text>
      ) : null}
      <View
        testID={testID ? `${testID}-wrapper` : 'input-wrapper'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor,
          borderRadius: radii.lg,
          backgroundColor: colors.surfacePrimary,
          paddingHorizontal: spacing[3],
          height,
        }}
      >
        {leftIcon && <View style={{ marginRight: spacing[2] }}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={{
            flex: 1,
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
            color: colors.textPrimary,
            padding: 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          onChangeText={onChangeText}
          value={value}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
        />
        {rightIcon && <View style={{ marginLeft: spacing[2] }}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text
          style={{
            color: colors.errorText,
            fontSize: typography.sm.fontSize,
            lineHeight: typography.sm.lineHeight,
            marginTop: spacing[1],
          }}
          testID={testID ? `${testID}-error` : 'input-error'}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
})
