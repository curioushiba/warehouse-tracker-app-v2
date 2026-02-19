import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { ChevronRight, LogOut } from 'lucide-react-native'
import Constants from 'expo-constants'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncErrorCount } from '@/hooks/useSyncErrorCount'
import { useTheme } from '@/theme'
import { getDisplayName } from '@/lib/display-name'
import { getAllQueueCounts } from '@/lib/db/queue-counts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import type { ThemeMode } from '@/lib/storage/storage'

const DARK_MODE_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
  { label: 'Dark', value: 'dark' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const db = useSQLiteContext()
  const { user, profile, signOut } = useAuth()
  const { domainId, domainConfig, clearDomain } = useDomain()
  const { settings, updateSettings } = useSettings()
  const { queueCount } = useSyncQueue(
    db,
    user?.id ?? null,
    domainId ?? null,
    true // assume online for display
  )
  const { count: failedSyncCount } = useSyncErrorCount()
  const { colors, spacing, typography, radii, shadows, fontFamily } = useTheme()

  const [showSignOutModal, setShowSignOutModal] = useState(false)

  const displayName = getDisplayName(profile)
  const roleBadge = profile?.role === 'admin' ? 'Admin' : 'Employee'
  const roleBadgeColor = profile?.role === 'admin' ? 'info' : 'primary'

  // Queue counts summary
  const queueCounts = useMemo(() => {
    try {
      return getAllQueueCounts(db as never)
    } catch {
      return { creates: 0, edits: 0, archives: 0, images: 0, transactions: 0 }
    }
  }, [db])

  const totalQueueCount =
    queueCounts.creates +
    queueCounts.edits +
    queueCounts.archives +
    queueCounts.images +
    queueCounts.transactions

  const handleSwitchDomain = () => {
    clearDomain()
    router.replace('/domain-picker')
  }

  const handleSignOutPress = () => {
    if (queueCount > 0) {
      setShowSignOutModal(true)
    } else {
      signOut(db)
    }
  }

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false)
    signOut(db)
  }

  const appVersion = Constants.expoConfig?.version

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPrimary }}
      contentContainerStyle={{ paddingBottom: spacing[6] }}
    >
      {/* Hero Section */}
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing[6],
          paddingHorizontal: spacing[6],
          gap: spacing[2],
          backgroundColor: colors.surfacePrimary,
          borderBottomLeftRadius: radii.xl,
          borderBottomRightRadius: radii.xl,
          ...shadows.sm,
        }}
        testID="profile-hero"
      >
        <Avatar
          name={displayName}
          size="xl"
          testID="profile-avatar"
        />
        <Text
          style={{
            ...typography['2xl'],
            fontWeight: typography.weight.bold,
            fontFamily: fontFamily.heading,
            color: colors.textPrimary,
            marginTop: spacing[2],
          }}
        >
          {displayName}
        </Text>
        <Badge
          label={roleBadge}
          colorScheme={roleBadgeColor as any}
          variant="subtle"
          testID="role-badge"
        />
        {user?.email && (
          <Text style={{ ...typography.base, color: colors.textSecondary }}>
            {user.email}
          </Text>
        )}
      </View>

      {/* Content sections */}
      <View style={{ paddingHorizontal: spacing[4] }}>
        {/* APPEARANCE section */}
        <SectionHeader label="APPEARANCE" testID="section-appearance" />
        <SegmentedControl
          options={DARK_MODE_OPTIONS}
          value={settings.darkMode}
          onValueChange={(v) => updateSettings({ darkMode: v as ThemeMode })}
          fullWidth
          testID="dark-mode-control"
        />

        {/* SYNC & DATA section */}
        <SectionHeader label="SYNC & DATA" testID="section-sync" />
        <Card variant="elevated" testID="queue-status-card">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing[2.5],
              borderBottomWidth: 1,
              borderBottomColor: colors.bgTertiary,
            }}
          >
            <Text style={{ ...typography.base, color: colors.textSecondary }}>Pending Items</Text>
            <Text
              style={{
                ...typography.lg,
                fontWeight: typography.weight.semibold,
                color: colors.textPrimary,
              }}
            >
              {totalQueueCount}
            </Text>
          </View>

          <AnimatedPressable
            onPress={() => router.push('/sync-errors')}
            testID="failed-sync-link"
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing[2.5],
            }}
          >
            <Text style={{ ...typography.base, color: colors.textSecondary }}>Failed Syncs</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
              <Text
                style={{
                  ...typography.lg,
                  fontWeight: typography.weight.semibold,
                  color: failedSyncCount > 0 ? colors.error : colors.textPrimary,
                }}
              >
                {failedSyncCount}
              </Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </View>
          </AnimatedPressable>
        </Card>

        {/* CURRENT DOMAIN section */}
        {domainConfig && (
          <>
            <SectionHeader label="CURRENT DOMAIN" testID="section-domain" />
            <Card variant="elevated" testID="domain-card">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radii.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: domainConfig.brandColor,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textInverse,
                        ...typography.xl,
                        fontWeight: typography.weight.bold,
                      }}
                    >
                      {domainConfig.letter}
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...typography.lg,
                      fontWeight: typography.weight.semibold,
                      color: colors.textPrimary,
                    }}
                  >
                    {domainConfig.displayName}
                  </Text>
                </View>
                <Button
                  label="Switch"
                  variant="ghost"
                  size="sm"
                  onPress={handleSwitchDomain}
                  testID="switch-domain-button"
                />
              </View>
            </Card>
          </>
        )}

        {/* ACCOUNT section */}
        <SectionHeader label="ACCOUNT" testID="section-account" />
        <AnimatedPressable
          onPress={handleSignOutPress}
          hapticPattern="heavy"
          testID="sign-out-button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfacePrimary,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderRadius: radii.lg,
          }}
        >
          <LogOut size={20} color={colors.error} />
          <Text
            style={{
              ...typography.base,
              fontWeight: typography.weight.semibold,
              color: colors.error,
              flex: 1,
              marginLeft: spacing[3],
            }}
          >
            Sign Out
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </AnimatedPressable>
      </View>

      {/* Version footer */}
      {appVersion && (
        <Text
          testID="app-version"
          style={{
            ...typography.xs,
            color: colors.textTertiary,
            textAlign: 'center',
            padding: spacing[4],
          }}
        >
          PackTrack v{appVersion}
        </Text>
      )}

      {/* Sign Out Warning Modal */}
      <Modal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Unsaved Changes"
        testID="sign-out-modal"
      >
        <Text
          style={{
            ...typography.base,
            color: colors.textPrimary,
            lineHeight: 20,
            marginBottom: spacing[4],
          }}
        >
          You have {queueCount} pending transaction{queueCount !== 1 ? 's' : ''} that
          haven't been synced. Signing out will lose these changes.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3] }}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setShowSignOutModal(false)}
            testID="cancel-sign-out"
          />
          <Button
            label="Sign Out Anyway"
            variant="danger"
            onPress={handleConfirmSignOut}
            testID="confirm-sign-out"
          />
        </View>
      </Modal>
    </ScrollView>
  )
}
