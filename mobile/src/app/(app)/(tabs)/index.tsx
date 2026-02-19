import React, { useEffect } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import Animated, { SlideInDown } from 'react-native-reanimated'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Package,
} from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useBatchScan } from '@/contexts/BatchScanContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncErrorCount } from '@/hooks/useSyncErrorCount'
import { useTheme } from '@/theme'
import { getDisplayName } from '@/lib/display-name'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/Button'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import { SyncStatusIndicator } from '@/components/indicators/SyncStatusIndicator'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatCard } from '@/components/ui/StatCard'
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
  const { items: batchItems } = useBatchScan()
  const { colors, spacing, typography, shadows, radii, fontFamily } = useTheme()

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

  const showSyncSection = queueCount > 0 || !isOnline

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top']}>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text
          style={{
            ...typography.xl,
            fontWeight: typography.weight.bold,
            fontFamily: fontFamily.heading,
            color: colors.textPrimary,
          }}
          testID="greeting-name"
        >
          Hello, {displayName}
        </Text>
        <Text
          style={{
            ...typography.sm,
            fontFamily: fontFamily.body,
            color: colors.textTertiary,
            marginBottom: spacing[6],
          }}
          testID="greeting-date"
        >
          {today}
        </Text>

        {/* Resume batch banner */}
        {batchItems.length > 0 && (
          <Animated.View entering={SlideInDown.springify()} testID="resume-batch-animated">
            <AnimatedPressable
              hapticPattern="light"
              onPress={() => router.push('/scan')}
              testID="resume-batch-banner"
              style={{
                backgroundColor: colors.warningBg,
                borderRadius: radii.lg,
                padding: spacing[4],
                marginBottom: spacing[4],
                borderWidth: 1,
                borderColor: colors.warning,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  ...typography.base,
                  fontWeight: typography.weight.semibold,
                  color: colors.warningText,
                  flex: 1,
                }}
              >
                You have {batchItems.length} item{batchItems.length !== 1 ? 's' : ''} in your batch — Tap to continue
              </Text>
              <ArrowRight size={20} color={colors.warningText} />
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <SectionHeader label="QUICK ACTIONS" testID="section-quick-actions" />
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] }}>
          <AnimatedPressable
            hapticPattern="light"
            onPress={handleCheckIn}
            testID="check-in-card"
            style={{
              flex: 1,
              height: 100,
              backgroundColor: colors.successBg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.checkIn,
              padding: spacing[4],
              justifyContent: 'center',
            }}
          >
            <ArrowDownToLine size={24} color={colors.checkIn} />
            <Text
              style={{
                ...typography.lg,
                fontWeight: typography.weight.bold,
                color: colors.textPrimary,
                marginTop: spacing[2],
              }}
            >
              Check In
            </Text>
            <Text
              style={{
                ...typography.xs,
                color: colors.textSecondary,
              }}
            >
              Receive stock
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            hapticPattern="light"
            onPress={handleCheckOut}
            testID="check-out-card"
            style={{
              flex: 1,
              height: 100,
              backgroundColor: colors.errorBg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.checkOut,
              padding: spacing[4],
              justifyContent: 'center',
            }}
          >
            <ArrowUpFromLine size={24} color={colors.checkOut} />
            <Text
              style={{
                ...typography.lg,
                fontWeight: typography.weight.bold,
                color: colors.textPrimary,
                marginTop: spacing[2],
              }}
            >
              Check Out
            </Text>
            <Text
              style={{
                ...typography.xs,
                color: colors.textSecondary,
              }}
            >
              Dispatch stock
            </Text>
          </AnimatedPressable>
        </View>

        {/* Stats Row */}
        <SectionHeader label="TODAY'S SUMMARY" testID="section-todays-summary" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing[4] }}
          contentContainerStyle={{ gap: spacing[3] }}
        >
          <StatCard
            value={queueCount}
            label="Pending"
            icon={<RefreshCw size={20} color={colors.warningText} />}
            iconBgColor={colors.warningBg}
            testID="stat-pending"
          />
          <StatCard
            value={syncErrorCount}
            label="Errors"
            icon={<AlertTriangle size={20} color={colors.errorText} />}
            iconBgColor={colors.errorBg}
            onPress={handleFailedSyncPress}
            testID="stat-errors"
          />
          <StatCard
            value={batchItems.length}
            label="In Batch"
            icon={<Package size={20} color={colors.brandPrimary} />}
            iconBgColor={colors.brandSecondary}
            testID="stat-batch"
          />
        </ScrollView>

        {/* Sync Status */}
        {showSyncSection && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surfacePrimary,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
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
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
