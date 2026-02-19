import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'
import type { SyncStatus } from '@/types'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
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
  const { colors, spacing, typography, shadows, radii } = useTheme()

  return (
    <View testID={testID}>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            backgroundColor: colors.surfacePrimary,
            gap: spacing[2.5],
          },
          shadows.sm,
        ]}
      >
        {domainLetter != null && (
          <AnimatedPressable
            testID={testID ? `${testID}-domain-badge-touchable` : undefined}
            onPress={onDomainLongPress}
          >
            <View
              testID={testID ? `${testID}-domain-badge` : undefined}
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: domainColor ?? colors.textSecondary,
              }}
            >
              <Text
                style={{
                  color: colors.textInverse,
                  ...typography.lg,
                  fontWeight: typography.weight.bold,
                }}
              >
                {domainLetter}
              </Text>
            </View>
          </AnimatedPressable>
        )}

        <Text
          style={{
            flex: 1,
            ...typography.xl,
            fontWeight: typography.weight.bold,
            color: colors.textPrimary,
          }}
        >
          {title}
        </Text>

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
