import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

export interface FailedSyncBannerProps {
  count: number
  onPress: () => void
  testID?: string
}

export function FailedSyncBanner({ count, onPress, testID }: FailedSyncBannerProps) {
  if (count === 0) {
    return null
  }

  const label =
    count === 1
      ? '1 failed transaction - Tap to view'
      : `${count} failed transactions - Tap to view`

  return (
    <TouchableOpacity
      testID={testID}
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
