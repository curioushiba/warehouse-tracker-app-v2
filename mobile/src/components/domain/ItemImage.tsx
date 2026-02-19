import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme, SHIMMER_DURATION } from '@/theme'

export interface ItemImageProps {
  uri?: string | null
  size?: number
  testID?: string
}

function Skeleton({ size, borderRadius }: { size: number; borderRadius: number }) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION }),
      -1,
      true
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      testID="item-img-skeleton"
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.bgTertiary,
        },
        animatedStyle,
      ]}
    />
  )
}

export function ItemImage({ uri, size = 64, testID }: ItemImageProps) {
  const { colors } = useTheme()
  const hasImage = !!uri
  const [isLoading, setIsLoading] = useState(true)
  const borderRadius = size * 0.15

  if (hasImage) {
    return (
      <View>
        {isLoading && <Skeleton size={size} borderRadius={borderRadius} />}
        <Image
          testID={`${testID ?? 'item-img'}-image`}
          source={{ uri }}
          style={[
            { width: size, height: size, borderRadius },
            isLoading ? { position: 'absolute', opacity: 0 } : undefined,
          ]}
          contentFit="cover"
          onLoad={() => setIsLoading(false)}
        />
      </View>
    )
  }

  return (
    <View
      testID={`${testID ?? 'item-img'}-placeholder`}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Package size={size * 0.4} color={colors.iconSecondary} />
    </View>
  )
}
