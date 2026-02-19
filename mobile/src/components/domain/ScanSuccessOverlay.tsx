import React from 'react'
import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { Check, Package } from 'lucide-react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useTheme } from '@/theme'

export interface ScanSuccessOverlayProps {
  item: { name: string; imageUrl?: string } | null
  isVisible: boolean
  testID?: string
}

export function ScanSuccessOverlay({ item, isVisible, testID }: ScanSuccessOverlayProps) {
  const { colors, spacing, typography, radii } = useTheme()

  if (!isVisible || !item) {
    return null
  }

  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: colors.overlayHeavy,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        gap: spacing[3],
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.full,
          backgroundColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={18} color={colors.textInverse} />
      </View>

      {item.imageUrl ? (
        <Image
          testID={`${testID ?? 'overlay'}-image`}
          source={{ uri: item.imageUrl }}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.md,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          testID={`${testID ?? 'overlay'}-placeholder`}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.md,
            backgroundColor: colors.bgTertiary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Package size={20} color={colors.iconSecondary} />
        </View>
      )}

      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          color: colors.textInverse,
          fontSize: typography.lg.fontSize,
          lineHeight: typography.lg.lineHeight,
          fontWeight: typography.weight.bold,
        }}
      >
        {item.name}
      </Text>
    </Animated.View>
  )
}
