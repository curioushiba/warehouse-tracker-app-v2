import React from 'react'
import {
  Text,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import type { ButtonVariant, Size } from '@/types'
import { useTheme } from '@/theme'
import { typography as typographyTokens } from '@/theme/tokens'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: Size
  disabled?: boolean
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  fullWidth?: boolean
  testID?: string
}

const SIZE_STYLES: Record<string, { height: number; px: number; fontSize: number }> = {
  xs: { height: 28, px: 8, fontSize: typographyTokens.sm.fontSize },
  sm: { height: 34, px: 12, fontSize: typographyTokens.sm.fontSize },
  md: { height: 42, px: 16, fontSize: typographyTokens.base.fontSize },
  lg: { height: 50, px: 20, fontSize: typographyTokens.lg.fontSize },
  xl: { height: 56, px: 24, fontSize: typographyTokens.xl.fontSize },
  '2xl': { height: 64, px: 28, fontSize: typographyTokens['2xl'].fontSize },
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
  fullWidth = false,
  testID,
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme()

  const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.brandPrimary, text: colors.brandText },
    secondary: { bg: colors.brandSecondary, text: colors.brandPrimary },
    cta: { bg: colors.ctaBg, text: colors.ctaText },
    outline: { bg: 'transparent', text: colors.brandPrimary, border: colors.brandPrimary },
    ghost: { bg: 'transparent', text: colors.brandPrimary },
    danger: { bg: colors.dangerBg, text: colors.dangerText },
    link: { bg: 'transparent', text: colors.brandPrimary },
  }

  const variantStyle = variantStyles[variant] ?? variantStyles.primary
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md

  const containerStyle: ViewStyle = {
    backgroundColor: variantStyle.bg,
    height: sizeStyle.height,
    paddingHorizontal: sizeStyle.px,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(variantStyle.border ? { borderWidth: 1, borderColor: variantStyle.border } : {}),
    ...(fullWidth ? { width: '100%' as unknown as number } : {}),
  }

  const textStyle: TextStyle = {
    color: variantStyle.text,
    fontSize: sizeStyle.fontSize,
    fontWeight: '600',
  }

  return (
    <AnimatedPressable
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || isLoading}
      testID={testID}
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
            <View testID="button-left-icon" style={{ marginRight: spacing[2] }}>
              {leftIcon}
            </View>
          )}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  )
}
