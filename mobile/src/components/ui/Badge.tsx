import React from 'react'
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { BadgeVariant, BadgeColorScheme } from '@/types'

export interface BadgeProps {
  label: string
  colorScheme?: BadgeColorScheme
  variant?: BadgeVariant
  testID?: string
}

const SOLID_COLORS: Record<BadgeColorScheme, { bg: string; text: string }> = {
  primary: { bg: '#01722f', text: '#FFFFFF' },
  secondary: { bg: '#6366F1', text: '#FFFFFF' },
  success: { bg: '#16A34A', text: '#FFFFFF' },
  warning: { bg: '#EAB308', text: '#1F2937' },
  error: { bg: '#EF4444', text: '#FFFFFF' },
  info: { bg: '#3B82F6', text: '#FFFFFF' },
  neutral: { bg: '#6B7280', text: '#FFFFFF' },
}

const SUBTLE_COLORS: Record<BadgeColorScheme, { bg: string; text: string }> = {
  primary: { bg: '#DCFCE7', text: '#01722f' },
  secondary: { bg: '#E0E7FF', text: '#6366F1' },
  success: { bg: '#DCFCE7', text: '#16A34A' },
  warning: { bg: '#FEF9C3', text: '#A16207' },
  error: { bg: '#FEE2E2', text: '#EF4444' },
  info: { bg: '#DBEAFE', text: '#3B82F6' },
  neutral: { bg: '#F3F4F6', text: '#6B7280' },
}

const OUTLINE_COLORS: Record<BadgeColorScheme, { border: string; text: string }> = {
  primary: { border: '#01722f', text: '#01722f' },
  secondary: { border: '#6366F1', text: '#6366F1' },
  success: { border: '#16A34A', text: '#16A34A' },
  warning: { border: '#EAB308', text: '#A16207' },
  error: { border: '#EF4444', text: '#EF4444' },
  info: { border: '#3B82F6', text: '#3B82F6' },
  neutral: { border: '#6B7280', text: '#6B7280' },
}

export function Badge({
  label,
  colorScheme = 'neutral',
  variant = 'solid',
  testID,
}: BadgeProps) {
  const containerStyle: ViewStyle = {
    ...styles.base,
    ...getVariantStyle(variant, colorScheme),
  }

  const textStyle: TextStyle = {
    ...styles.text,
    color: getTextColor(variant, colorScheme),
  }

  return (
    <View style={containerStyle} testID={testID}>
      <Text style={textStyle}>{label}</Text>
    </View>
  )
}

function getVariantStyle(variant: BadgeVariant, colorScheme: BadgeColorScheme): ViewStyle {
  switch (variant) {
    case 'solid':
      return { backgroundColor: SOLID_COLORS[colorScheme].bg }
    case 'subtle':
      return { backgroundColor: SUBTLE_COLORS[colorScheme].bg }
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: OUTLINE_COLORS[colorScheme].border,
      }
  }
}

function getTextColor(variant: BadgeVariant, colorScheme: BadgeColorScheme): string {
  switch (variant) {
    case 'solid':
      return SOLID_COLORS[colorScheme].text
    case 'subtle':
      return SUBTLE_COLORS[colorScheme].text
    case 'outline':
      return OUTLINE_COLORS[colorScheme].text
  }
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
