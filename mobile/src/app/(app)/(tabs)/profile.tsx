import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncErrorCount } from '@/hooks/useSyncErrorCount'
import { getDisplayName } from '@/lib/display-name'
import { getAllQueueCounts } from '@/lib/db/queue-counts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import type { ThemeMode } from '@/lib/storage/storage'

const DARK_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <Avatar
          name={displayName}
          size="xl"
          testID="profile-avatar"
        />
        <Text style={styles.displayName}>{displayName}</Text>
        <Badge
          label={roleBadge}
          colorScheme={roleBadgeColor as any}
          variant="subtle"
          testID="role-badge"
        />
        {user?.email && (
          <Text style={styles.email}>{user.email}</Text>
        )}
      </View>

      {/* Dark Mode Section */}
      <Card variant="elevated" testID="dark-mode-card">
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.darkModeRow}>
          {DARK_MODE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              testID={`dark-mode-${option.value}`}
              style={[
                styles.darkModeOption,
                settings.darkMode === option.value && styles.darkModeOptionActive,
              ]}
              onPress={() => updateSettings({ darkMode: option.value })}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.darkModeText,
                  settings.darkMode === option.value && styles.darkModeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Queue Status Section */}
      <Card variant="elevated" testID="queue-status-card">
        <Text style={styles.sectionTitle}>Sync Status</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Pending Items</Text>
          <Text style={styles.statusValue}>{totalQueueCount}</Text>
        </View>

        <TouchableOpacity
          testID="failed-sync-link"
          style={styles.statusRow}
          onPress={() => router.push('/sync-errors')}
          activeOpacity={0.7}
        >
          <Text style={styles.statusLabel}>Failed Syncs</Text>
          <View style={styles.failedSyncRow}>
            <Text
              style={[
                styles.statusValue,
                failedSyncCount > 0 && styles.statusValueError,
              ]}
            >
              {failedSyncCount}
            </Text>
            <Text style={styles.chevron}>{'>'}</Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Domain Section */}
      {domainConfig && (
        <Card variant="elevated" testID="domain-card">
          <Text style={styles.sectionTitle}>Current Domain</Text>
          <View style={styles.domainRow}>
            <View
              style={[
                styles.domainBadge,
                { backgroundColor: domainConfig.brandColor },
              ]}
            >
              <Text style={styles.domainLetter}>{domainConfig.letter}</Text>
            </View>
            <Text style={styles.domainName}>{domainConfig.displayName}</Text>
          </View>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Button
          label="Switch Domain"
          variant="outline"
          onPress={handleSwitchDomain}
          testID="switch-domain-button"
        />

        <View style={styles.spacer} />

        <Button
          label="Sign Out"
          variant="danger"
          onPress={handleSignOutPress}
          testID="sign-out-button"
        />
      </View>

      {/* Sign Out Warning Modal */}
      <Modal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Unsaved Changes"
        testID="sign-out-modal"
      >
        <Text style={styles.modalText}>
          You have {queueCount} pending transaction{queueCount !== 1 ? 's' : ''} that
          haven't been synced. Signing out will lose these changes.
        </Text>
        <View style={styles.modalActions}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  darkModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  darkModeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  darkModeOptionActive: {
    borderColor: '#01722f',
    backgroundColor: '#DCFCE7',
  },
  darkModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  darkModeTextActive: {
    color: '#01722f',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusValueError: {
    color: '#EF4444',
  },
  failedSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  domainBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  domainName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsSection: {
    paddingVertical: 8,
    gap: 12,
  },
  spacer: {
    height: 4,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
})
