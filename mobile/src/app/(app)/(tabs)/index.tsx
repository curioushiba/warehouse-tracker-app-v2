import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import Toast from 'react-native-toast-message'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncErrorCount } from '@/hooks/useSyncErrorCount'
import { getDisplayName } from '@/lib/display-name'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/Button'
import { SyncStatusIndicator } from '@/components/indicators/SyncStatusIndicator'
import type { SyncStatus } from '@/types'

export default function HomeScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ batchSuccess?: string }>()
  const db = useSQLiteContext()
  const { user, profile } = useAuth()
  const { domainId, domainConfig } = useDomain()
  const { isOnline } = useOnlineStatus()
  const { queueCount, isSyncing, syncQueue } = useSyncQueue(
    db,
    user?.id ?? null,
    domainId,
    isOnline
  )
  const { count: syncErrorCount } = useSyncErrorCount()

  const displayName = getDisplayName(profile)

  // Show batch success toast from URL params
  useEffect(() => {
    if (params.batchSuccess) {
      Toast.show({
        type: 'success',
        text1: `${params.batchSuccess} items submitted successfully`,
      })
    }
  }, [params.batchSuccess])

  // Derive sync status for header indicator
  const syncStatus: SyncStatus = !isOnline
    ? 'offline'
    : isSyncing
      ? 'syncing'
      : queueCount > 0
        ? 'pending'
        : 'synced'

  const handleCheckIn = () => {
    router.push({ pathname: '/scan', params: { type: 'in' } })
  }

  const handleCheckOut = () => {
    router.push({ pathname: '/scan', params: { type: 'out' } })
  }

  const handleFailedSyncPress = () => {
    router.push('/sync-errors')
  }

  const handleSync = () => {
    syncQueue()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MobileHeader
        title={domainConfig?.displayName ?? 'PackTrack'}
        domainLetter={domainConfig?.letter}
        domainColor={domainConfig?.brandColor}
        syncStatus={syncStatus}
        pendingCount={queueCount}
        isOnline={isOnline}
        failedSyncCount={syncErrorCount}
        onFailedSyncPress={handleFailedSyncPress}
        testID="header"
      />

      <View style={styles.content}>
        <Text style={styles.greeting}>Hello, {displayName}</Text>

        <View style={styles.actionsRow}>
          <View style={styles.actionButton}>
            <Button
              label="Check In"
              onPress={handleCheckIn}
              variant="primary"
              size="lg"
              testID="check-in-button"
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              label="Check Out"
              onPress={handleCheckOut}
              variant="danger"
              size="lg"
              testID="check-out-button"
            />
          </View>
        </View>

        <View style={styles.syncSection}>
          <SyncStatusIndicator
            status={syncStatus}
            pendingCount={queueCount}
            testID="sync-indicator"
          />
          {queueCount > 0 && (
            <Button
              label="Sync Now"
              onPress={handleSync}
              variant="outline"
              size="sm"
              isLoading={isSyncing}
              loadingText="Syncing..."
              testID="manual-sync-button"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  syncSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
})
