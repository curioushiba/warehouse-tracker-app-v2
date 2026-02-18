import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { SyncStatus } from '@/types'
import { SyncStatusIndicator } from '../indicators/SyncStatusIndicator'
import { ConnectionStatusBar } from '../indicators/ConnectionStatusBar'
import { FailedSyncBanner } from '../indicators/FailedSyncBanner'

export interface MobileHeaderProps {
  title: string
  domainLetter?: string
  domainColor?: string
  syncStatus?: SyncStatus
  pendingCount?: number
  isOnline?: boolean
  onDomainLongPress?: () => void
  failedSyncCount?: number
  onFailedSyncPress?: () => void
  testID?: string
}

export function MobileHeader({
  title,
  domainLetter,
  domainColor,
  syncStatus,
  pendingCount,
  isOnline = true,
  onDomainLongPress,
  failedSyncCount = 0,
  onFailedSyncPress,
  testID,
}: MobileHeaderProps) {
  return (
    <View testID={testID}>
      <View style={styles.headerRow}>
        {domainLetter != null && (
          <TouchableOpacity
            testID={testID ? `${testID}-domain-badge-touchable` : undefined}
            onLongPress={onDomainLongPress}
            activeOpacity={0.7}
          >
            <View
              testID={testID ? `${testID}-domain-badge` : undefined}
              style={{ ...styles.domainBadge, backgroundColor: domainColor ?? '#6b7280' }}
            >
              <Text style={styles.domainLetter}>{domainLetter}</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.title}>{title}</Text>

        {syncStatus != null && (
          <SyncStatusIndicator
            status={syncStatus}
            pendingCount={pendingCount}
            testID={testID ? `${testID}-sync` : undefined}
          />
        )}
      </View>

      <ConnectionStatusBar
        isOnline={isOnline}
        testID={testID ? `${testID}-connection` : undefined}
      />

      <FailedSyncBanner
        count={failedSyncCount}
        onPress={onFailedSyncPress ?? (() => {})}
        testID={testID ? `${testID}-failed-sync` : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  domainBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
})
