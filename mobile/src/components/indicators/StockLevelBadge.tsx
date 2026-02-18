import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { StockLevel } from '@/types'

export interface StockLevelBadgeProps {
  level: StockLevel
  testID?: string
}

const LEVEL_CONFIG: Record<StockLevel, { label: string; backgroundColor: string }> = {
  critical: { label: 'Critical', backgroundColor: '#dc2626' },
  low: { label: 'Low', backgroundColor: '#f97316' },
  normal: { label: 'Normal', backgroundColor: '#16a34a' },
  overstocked: { label: 'Overstocked', backgroundColor: '#2563eb' },
}

export function StockLevelBadge({ level, testID }: StockLevelBadgeProps) {
  const config = LEVEL_CONFIG[level]

  return (
    <View
      testID={testID}
      style={{ ...styles.badge, backgroundColor: config.backgroundColor }}
    >
      <Text style={styles.text}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
})
