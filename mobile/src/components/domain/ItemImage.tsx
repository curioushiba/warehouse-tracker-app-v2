import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'

export interface ItemImageProps {
  uri?: string | null
  size?: number
  testID?: string
}

export function ItemImage({ uri, size = 64, testID }: ItemImageProps) {
  const hasImage = !!uri

  if (hasImage) {
    return (
      <Image
        testID={`${testID ?? 'item-img'}-image`}
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size * 0.15 }}
        contentFit="cover"
      />
    )
  }

  return (
    <View
      testID={`${testID ?? 'item-img'}-placeholder`}
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size * 0.15 },
      ]}
    >
      <Package size={size * 0.4} color="#9CA3AF" />
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
