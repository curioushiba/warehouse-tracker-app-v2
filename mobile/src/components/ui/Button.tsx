import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import type { ButtonVariant, Size } from '@/types'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: Size
  disabled?: boolean
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  testID?: string
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: '#01722f', text: '#ffffff' },
  secondary: { bg: '#faf5e9', text: '#01722f' },
  cta: { bg: '#ffcc00', text: '#1a1a1a' },
  outline: { bg: 'transparent', text: '#01722f', border: '#01722f' },
  ghost: { bg: 'transparent', text: '#01722f' },
  danger: { bg: '#dc3545', text: '#ffffff' },
  link: { bg: 'transparent', text: '#01722f' },
}

const SIZE_STYLES: Record<string, { height: number; px: number; fontSize: number }> = {
  xs: { height: 28, px: 8, fontSize: 12 },
  sm: { height: 34, px: 12, fontSize: 13 },
  md: { height: 42, px: 16, fontSize: 14 },
  lg: { height: 50, px: 20, fontSize: 16 },
  xl: { height: 56, px: 24, fontSize: 18 },
  '2xl': { height: 64, px: 28, fontSize: 20 },
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  loadingText,
  leftIcon,
  testID,
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md

  const containerStyle: ViewStyle = {
    backgroundColor: variantStyle.bg,
    height: sizeStyle.height,
    paddingHorizontal: sizeStyle.px,
    borderRadius: 22.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(variantStyle.border ? { borderWidth: 1, borderColor: variantStyle.border } : {}),
  }

  const textStyle: TextStyle = {
    color: variantStyle.text,
    fontSize: sizeStyle.fontSize,
    fontWeight: '600',
  }

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || isLoading}
      testID={testID}
      activeOpacity={0.7}
    >
      {isLoading ? (
        loadingText ? (
          <Text style={textStyle}>{loadingText}</Text>
        ) : (
          <ActivityIndicator
            testID="button-spinner"
            color={variantStyle.text}
            size="small"
          />
        )
      ) : (
        <>
          {leftIcon && (
            <View testID="button-left-icon" style={styles.iconContainer}>
              {leftIcon}
            </View>
          )}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 8,
  },
})
