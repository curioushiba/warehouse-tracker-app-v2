import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { SyncStatus } from '@/types'

export interface SyncStatusIndicatorProps {
  status: SyncStatus
  pendingCount?: number
  testID?: string
}

const STATUS_CONFIG: Record<SyncStatus, { color: string; label: string }> = {
  synced: { color: '#16a34a', label: 'Synced' },
  syncing: { color: '#3b82f6', label: 'Syncing...' },
  pending: { color: '#f97316', label: 'pending' },
  offline: { color: '#dc2626', label: 'Offline' },
  error: { color: '#dc2626', label: 'Error' },
}

export function SyncStatusIndicator({
  status,
  pendingCount,
  testID,
}: SyncStatusIndicatorProps) {
  const config = STATUS_CONFIG[status]

  const label =
    status === 'pending' && pendingCount != null
      ? `${pendingCount} ${config.label}`
      : config.label

  return (
    <View testID={testID} style={styles.container}>
      <View
        testID={testID ? `${testID}-dot` : undefined}
        style={{ ...styles.dot, backgroundColor: config.color }}
      />
      <Text style={{ ...styles.text, color: config.color }}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
})
