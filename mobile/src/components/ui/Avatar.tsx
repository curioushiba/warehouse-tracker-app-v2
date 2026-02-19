import React from 'react'
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import { Image } from 'expo-image'
import { User } from 'lucide-react-native'
import type { Size } from '@/types'
import { useTheme } from '@/theme'

export interface AvatarProps {
  imageUri?: string
  name?: string
  size: Size
  testID?: string
}

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  '2xl': 96,
}

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({ imageUri, name, size, testID }: AvatarProps) {
  const { colors } = useTheme()
  const dimension = SIZE_MAP[size] ?? SIZE_MAP.md
  const fontSize = FONT_SIZE_MAP[size] ?? FONT_SIZE_MAP.md

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor: colors.brandSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  const textStyle: TextStyle = {
    fontSize,
    fontWeight: '600',
    color: colors.brandPrimary,
  }

  if (imageUri) {
    return (
      <View style={containerStyle} testID={testID}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          testID="avatar-image"
        />
      </View>
    )
  }

  if (name) {
    return (
      <View style={containerStyle} testID={testID}>
        <Text style={textStyle}>{getInitials(name)}</Text>
      </View>
    )
  }

  return (
    <View style={containerStyle} testID={testID}>
      <User size={dimension * 0.5} color={colors.iconSecondary} />
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
})
