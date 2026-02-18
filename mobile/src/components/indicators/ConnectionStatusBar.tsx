import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export interface ConnectionStatusBarProps {
  isOnline: boolean
  isSyncing?: boolean
  syncProgress?: number
  testID?: string
}

export function ConnectionStatusBar({
  isOnline,
  isSyncing = false,
  syncProgress,
  testID,
}: ConnectionStatusBarProps) {
  if (isOnline && !isSyncing) {
    return null
  }

  if (isSyncing) {
    return (
      <View testID={testID} style={styles.syncingBar}>
        <Text style={styles.text}>
          Syncing... {syncProgress != null ? `${syncProgress}%` : ''}
        </Text>
        <View style={styles.progressTrack}>
          <View
            testID={testID ? `${testID}-progress` : undefined}
            style={{ ...styles.progressFill, width: `${syncProgress ?? 0}%` }}
          />
        </View>
      </View>
    )
  }

  return (
    <View testID={testID} style={styles.offlineBar}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  offlineBar: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  syncingBar: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    marginTop: 4,
    width: '100%',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 1.5,
  },
})
