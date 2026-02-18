import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'

export interface ScanSuccessOverlayProps {
  item: { name: string; imageUrl?: string } | null
  isVisible: boolean
  testID?: string
}

export function ScanSuccessOverlay({ item, isVisible, testID }: ScanSuccessOverlayProps) {
  if (!isVisible || !item) {
    return null
  }

  return (
    <View style={styles.overlay} testID={testID}>
      {item.imageUrl ? (
        <Image
          testID={`${testID ?? 'overlay'}-image`}
          source={{ uri: item.imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View
          testID={`${testID ?? 'overlay'}-placeholder`}
          style={styles.placeholder}
        >
          <Package size={32} color="#9CA3AF" />
        </View>
      )}
      <Text style={styles.name}>{item.name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
})
