import React from 'react'
import { View, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native'
import type { CardVariant } from '@/types'

export interface CardProps {
  children: React.ReactNode
  variant?: CardVariant
  onPress?: () => void
  testID?: string
}

const VARIANT_STYLES: Record<CardVariant, ViewStyle> = {
  elevated: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filled: {
    backgroundColor: '#F3F4F6',
  },
  unstyled: {},
}

export function Card({
  children,
  variant = 'elevated',
  onPress,
  testID,
}: CardProps) {
  const cardStyle: ViewStyle = {
    ...styles.base,
    ...VARIANT_STYLES[variant],
  }

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        testID={testID}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    )
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    padding: 16,
  },
})
